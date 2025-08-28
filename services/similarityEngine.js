const { loadGames, DEFAULT_WEIGHTS } = require('../utils/storage');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Initialize Anthropic API
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const EXPLANATION_PROMPT_FILE = path.join(__dirname, '..', 'match-explanation-prompt.md');

// Cache for similarity calculations
const gameCache = new Map();

function volatilityLevel(game) {
  const levels = { 'low': 1, 'medium': 2, 'high': 3, 'ultra': 4 };
  return levels[game.volatility] || 2;
}

function calculateSimilarity(game1, game2, weights = DEFAULT_WEIGHTS) {
  let score = 0;
  
  // Theme matching (40% default weight)
  if (game1.theme && game2.theme && Array.isArray(game1.theme) && Array.isArray(game2.theme)) {
    const themeOverlap = game1.theme.filter(t => game2.theme.includes(t)).length;
    if (game1.theme.length > 0) {
      score += (themeOverlap / game1.theme.length) * weights.theme;
    }
  }
  
  // Volatility matching (30% default weight)
  const vol1 = volatilityLevel(game1);
  const vol2 = volatilityLevel(game2);
  if (vol1 === vol2) {
    score += weights.volatility;
  } else if (Math.abs(vol1 - vol2) === 1) {
    score += weights.volatility * 0.5;
  }
  
  // Studio matching (20% default weight)
  if (game1.studio && game2.studio && game1.studio === game2.studio) {
    score += weights.studio;
  }
  
  // Mechanics matching (10% default weight)
  if (game1.mechanics && game2.mechanics && Array.isArray(game1.mechanics) && Array.isArray(game2.mechanics)) {
    const mechanicsOverlap = game1.mechanics.filter(m => game2.mechanics.includes(m)).length;
    if (game1.mechanics.length > 0) {
      score += (mechanicsOverlap / game1.mechanics.length) * weights.mechanics;
    }
  }
  
  return Math.min(score, 1.0);
}

function getRecommendations(gameId, weights = DEFAULT_WEIGHTS, count = 5) {
  const games = loadGames();
  
  if (games.length === 0) {
    return [];
  }
  
  const targetGame = games.find(g => g.id === gameId);
  if (!targetGame) {
    throw new Error('Selected game not found');
  }
  
  // Create cache key
  const cacheKey = `${gameId}-${JSON.stringify(weights)}`;
  
  // Check cache
  if (gameCache.has(cacheKey)) {
    return gameCache.get(cacheKey);
  }
  
  const recommendations = games
    .filter(g => g.id !== gameId)
    .map(game => {
      const similarity = calculateSimilarity(targetGame, game, weights);
      return {
        game,
        score: similarity,
        confidence: Math.round(similarity * 100)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  
  // Cache results
  gameCache.set(cacheKey, recommendations);
  
  // Clear cache if it grows too large (memory management)
  if (gameCache.size > 100) {
    const oldestKey = gameCache.keys().next().value;
    gameCache.delete(oldestKey);
  }
  
  return recommendations;
}

async function generateMatchExplanation(selectedGame, recommendedGame, weights, confidence) {
  if (!anthropic) {
    // Fallback to basic explanation if no API key
    return generateBasicExplanation(selectedGame, recommendedGame, confidence);
  }

  try {
    // Load the explanation prompt
    const systemPrompt = fs.readFileSync(EXPLANATION_PROMPT_FILE, 'utf8');
    
    const userPrompt = `Selected Game: ${selectedGame.title} by ${selectedGame.studio}
- Theme: ${selectedGame.theme?.join(', ') || 'N/A'}
- Volatility: ${selectedGame.volatility}
- RTP: ${selectedGame.rtp}%
- Mechanics: ${selectedGame.mechanics?.join(', ') || 'N/A'}

Recommended Game: ${recommendedGame.title} by ${recommendedGame.studio}
- Theme: ${recommendedGame.theme?.join(', ') || 'N/A'}  
- Volatility: ${recommendedGame.volatility}
- RTP: ${recommendedGame.rtp}%
- Mechanics: ${recommendedGame.mechanics?.join(', ') || 'N/A'}

Explain why "${recommendedGame.title}" is a good match for someone who likes "${selectedGame.title}".`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    return response.content[0]?.text?.trim() || generateBasicExplanation(selectedGame, recommendedGame, confidence);
  } catch (error) {
    console.error('Error generating match explanation:', error);
    return generateBasicExplanation(selectedGame, recommendedGame, confidence);
  }
}

function generateBasicExplanation(selectedGame, recommendedGame, confidence) {
  const similarities = [];
  
  // Check theme overlap
  if (selectedGame.theme && recommendedGame.theme) {
    const sharedThemes = selectedGame.theme.filter(t => recommendedGame.theme.includes(t));
    if (sharedThemes.length > 0) {
      similarities.push(`shared ${sharedThemes.join(', ')} themes`);
    }
  }
  
  // Check volatility match
  if (selectedGame.volatility === recommendedGame.volatility) {
    similarities.push(`same ${recommendedGame.volatility} volatility`);
  }
  
  // Check studio match
  if (selectedGame.studio === recommendedGame.studio) {
    similarities.push(`same studio (${recommendedGame.studio})`);
  }
  
  // Check mechanics overlap
  if (selectedGame.mechanics && recommendedGame.mechanics) {
    const sharedMechanics = selectedGame.mechanics.filter(m => recommendedGame.mechanics.includes(m));
    if (sharedMechanics.length > 0) {
      similarities.push(`similar mechanics (${sharedMechanics.slice(0, 2).join(', ')})`);
    }
  }
  
  if (similarities.length === 0) {
    return `This ${confidence}% match offers a similar gaming experience with comparable features.`;
  }
  
  return `Strong ${confidence}% match due to ${similarities.slice(0, 2).join(' and ')}.`;
}

function clearCache() {
  gameCache.clear();
}

module.exports = {
  calculateSimilarity,
  getRecommendations,
  generateMatchExplanation,
  volatilityLevel,
  clearCache
};