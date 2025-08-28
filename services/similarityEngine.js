const { loadGames, DEFAULT_WEIGHTS } = require('../utils/storage');

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

function clearCache() {
  gameCache.clear();
}

module.exports = {
  calculateSimilarity,
  getRecommendations,
  volatilityLevel,
  clearCache
};