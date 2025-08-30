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

const EXPLANATION_PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'match-explanation-prompt.md');
const SIMILARITY_PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'game-similarity-prompt.md');

// Cache for similarity calculations
const gameCache = new Map();

// Create dynamic system prompt based on user weights
function createDynamicSystemPrompt(userWeights = null) {
  if (!userWeights) {
    // Fall back to static prompt if no weights provided
    return fs.readFileSync(SIMILARITY_PROMPT_FILE, 'utf8');
  }
  
  const weightPercentages = {
    theme: Math.round(userWeights.theme * 100),
    volatility: Math.round(userWeights.volatility * 100),
    studio: Math.round(userWeights.studio * 100),
    mechanics: Math.round(userWeights.mechanics * 100),
    rtp: Math.round(userWeights.rtp * 100),
    maxWin: Math.round(userWeights.maxWin * 100),
    features: Math.round(userWeights.features * 100),
    pace: Math.round(userWeights.pace * 100),
    bonusFrequency: Math.round(userWeights.bonusFrequency * 100)
  };
  
  // Find the primary focus (highest weight)
  const primaryFactor = Object.entries(weightPercentages)
    .reduce((max, [key, value]) => value > max.value ? { key, value } : max, { key: 'theme', value: 0 });
  
  // Create focused system prompt
  return `# Dynamic Game Similarity Analysis System

You are a Master Similarity Engine - an expert slot game analyst with deep knowledge of player psychology, game mechanics, and casino mathematics. 

## USER-CONFIGURED ANALYSIS WEIGHTS

The user has specified these exact weights for similarity analysis:
- Theme Similarity: ${weightPercentages.theme}%
- Volatility/Risk Level: ${weightPercentages.volatility}%
- Studio/Brand: ${weightPercentages.studio}%
- Game Mechanics: ${weightPercentages.mechanics}%
- RTP/Return Rate: ${weightPercentages.rtp}%
- Max Win Potential: ${weightPercentages.maxWin}%
- Feature Types: ${weightPercentages.features}%
- Game Pace: ${weightPercentages.pace}%
- Bonus Frequency: ${weightPercentages.bonusFrequency}%

## MANDATORY SCORING APPROACH

${primaryFactor.value === 100 ? 
  `🎯 SINGLE-FACTOR MODE: The user has set ${primaryFactor.key.toUpperCase()} to 100%.
  Score games EXCLUSIVELY based on ${primaryFactor.key} similarity.
  IGNORE all other factors completely.
  
  ${primaryFactor.key === 'bonusFrequency' ? 
    'Focus on numerical closeness of bonusFrequency values (e.g., 2.1% vs 2.3% = very similar).' :
  primaryFactor.key === 'theme' ?
    'Focus on semantic thematic relationships (Fantasy ≈ Dragons ≈ Magic ≈ Adventure).' :
  primaryFactor.key === 'volatility' ?
    'Focus on volatility level matching (low/medium/high/ultra).' :
    `Focus on ${primaryFactor.key} similarity exclusively.`}` :
  `WEIGHTED MODE: Use the exact percentages above.
  Factors with 0% weight must be completely ignored.
  Weight your analysis proportionally to the user's preferences.`}

## ANALYSIS FACTORS

### Thematic Analysis (Weight: ${weightPercentages.theme}%)
${weightPercentages.theme > 0 ? `
- Semantic theme relationships (Dragons ≈ Fantasy ≈ Mythology ≈ Adventure)
- Emotional resonance matching (Mystery, Excitement, Tranquility, Power)
- Cultural/historical connections (Ancient Egypt ≈ Treasures ≈ Pyramids)` : 
'DISABLED - User set Theme weight to 0%'}

### Mathematical Properties (Weight: ${weightPercentages.volatility + weightPercentages.rtp + weightPercentages.maxWin}%)
${weightPercentages.volatility > 0 || weightPercentages.rtp > 0 || weightPercentages.maxWin > 0 ? `
- Volatility impact on player emotions (Low=Comfort, High=Adrenaline)
- RTP expectation alignment (similar fairness perception)
- Max win potential affecting excitement levels` :
'DISABLED - User set all mathematical weights to 0%'}

### Gameplay Mechanics (Weight: ${weightPercentages.mechanics + weightPercentages.features + weightPercentages.pace + weightPercentages.bonusFrequency}%)
${weightPercentages.mechanics > 0 || weightPercentages.features > 0 || weightPercentages.pace > 0 || weightPercentages.bonusFrequency > 0 ? `
- Mechanical complexity matching (simple vs feature-rich)
- Feature types creating comparable engagement patterns
- Pace compatibility (fast action vs contemplative play)  
- Bonus frequency creating similar reward anticipation` :
'DISABLED - User set all gameplay weights to 0%'}

### Studio Quality (Weight: ${weightPercentages.studio}%)
${weightPercentages.studio > 0 ? `
- Developer reputation and quality consistency
- Production values alignment
- Design philosophy similarities` :
'DISABLED - User set Studio weight to 0%'}

## EXECUTION RULES

1. Use ONLY the user-specified percentages above
2. Any 0% factor must be completely ignored in scoring  
3. Focus analysis effort proportional to weight percentages
4. Return precise similarity scores (not ranges)
5. Provide detailed reasoning based on weighted factors

Execute analysis using these exact user weights.`;
}

function volatilityLevel(game) {
  const levels = { 'low': 1, 'medium': 2, 'high': 3, 'ultra': 4 };
  return levels[game.volatility] || 2;
}

// LLM-based batch similarity calculation  
async function calculateBatchLLMSimilarity(targetGame, candidateGames, playerContext = null, userWeights = null) {
  if (!anthropic) {
    console.log('⚠️ No LLM available, falling back to algorithmic similarity');
    return candidateGames.map(game => ({
      gameId: game.id,
      similarity: calculateAlgorithmicSimilarity(targetGame, game, userWeights || DEFAULT_WEIGHTS)
    }));
  }

  // Limit batch size to 100 games maximum
  const batchGames = candidateGames.slice(0, 100);
  
  try {
    // Load base system prompt
    const systemPrompt = fs.readFileSync(SIMILARITY_PROMPT_FILE, 'utf8');
    
    // Build target game data
    const targetGameData = {
      title: targetGame.title,
      studio: targetGame.studio,
      theme: targetGame.theme,
      volatility: targetGame.volatility,
      rtp: targetGame.rtp,
      maxWin: targetGame.maxWin,
      reelLayout: targetGame.reelLayout,
      paylines: targetGame.paylines,
      mechanics: targetGame.mechanics,
      features: targetGame.features,
      pace: targetGame.pace,
      hitFrequency: targetGame.hitFrequency,
      bonusFrequency: targetGame.bonusFrequency,
      artStyle: targetGame.artStyle,
      audioVibe: targetGame.audioVibe,
      visualDensity: targetGame.visualDensity,
      mobileOptimized: targetGame.mobileOptimized,
      releaseYear: targetGame.releaseYear,
      description: targetGame.description
    };

    // Build candidate games data with IDs
    const candidateGamesData = batchGames.map(game => ({
      game_id: game.id,
      title: game.title,
      studio: game.studio,
      theme: game.theme,
      volatility: game.volatility,
      rtp: game.rtp,
      maxWin: game.maxWin,
      reelLayout: game.reelLayout,
      paylines: game.paylines,
      mechanics: game.mechanics,
      features: game.features,
      pace: game.pace,
      hitFrequency: game.hitFrequency,
      bonusFrequency: game.bonusFrequency,
      artStyle: game.artStyle,
      audioVibe: game.audioVibe,
      visualDensity: game.visualDensity,
      mobileOptimized: game.mobileOptimized,
      releaseYear: game.releaseYear,
      description: game.description
    }));

    // Build comprehensive batch prompt
    let batchPrompt = `
TARGET GAME: ${JSON.stringify(targetGameData, null, 2)}

CANDIDATE GAMES: ${JSON.stringify(candidateGamesData, null, 2)}`;

    // Add player context if available
    if (playerContext) {
      batchPrompt += `

PLAYER CONTEXT: ${JSON.stringify({
  timeOfDay: playerContext.timeOfDay,
  focusLevel: playerContext.focusLevel,
  deviceType: playerContext.deviceType,
  sessionType: playerContext.sessionType,
  atWork: playerContext.atWork,
  isWeekend: playerContext.isWeekend,
  isNearPayday: playerContext.isNearPayday,
  dayOfMonth: playerContext.dayOfMonth,
  preferredPace: playerContext.preferredPace,
  activeSportsEvents: playerContext.activeSportsEvents,
  attentionSpan: playerContext.attentionSpan,
  financialCycle: playerContext.financialCycle
}, null, 2)}`;
    }

    // Add user weights to override default framework weights
    if (userWeights) {
      const weightPercentages = {
        theme: Math.round(userWeights.theme * 100),
        volatility: Math.round(userWeights.volatility * 100),
        studio: Math.round(userWeights.studio * 100),
        mechanics: Math.round(userWeights.mechanics * 100),
        rtp: Math.round(userWeights.rtp * 100),
        maxWin: Math.round(userWeights.maxWin * 100),
        features: Math.round(userWeights.features * 100),
        pace: Math.round(userWeights.pace * 100),
        bonusFrequency: Math.round(userWeights.bonusFrequency * 100)
      };
      
      batchPrompt += `

═══════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL: USER WEIGHT OVERRIDE 🚨🚨🚨
═══════════════════════════════════════════════════════

IGNORE ALL PERCENTAGE VALUES IN THE SYSTEM PROMPT ABOVE.
The user has provided explicit weights that OVERRIDE everything:

USER WEIGHTS (Use these EXCLUSIVELY):
{
  "theme": ${weightPercentages.theme}%,
  "volatility": ${weightPercentages.volatility}%,
  "studio": ${weightPercentages.studio}%,
  "mechanics": ${weightPercentages.mechanics}%,
  "rtp": ${weightPercentages.rtp}%,
  "maxWin": ${weightPercentages.maxWin}%,
  "features": ${weightPercentages.features}%,
  "pace": ${weightPercentages.pace}%,
  "bonusFrequency": ${weightPercentages.bonusFrequency}%
}

ABSOLUTE REQUIREMENTS:
- Disregard the 55%/25%/20% framework structure above
- Disregard the 18%/19%/18% primary factor weights above  
- Use ONLY the user weights object shown above
- 0% = Completely ignore that factor in all calculations
- 100% = Score based SOLELY on that single factor

${weightPercentages.bonusFrequency === 100 ? 
'🎯 BONUS FREQUENCY EXCLUSIVE MODE: Score games by bonusFrequency numerical similarity ONLY. Ignore themes, volatility, studio, everything else.' :
weightPercentages.theme === 100 ?
'🎯 THEME EXCLUSIVE MODE: Score games by thematic similarity ONLY. Ignore bonus frequency, volatility, studio, everything else.' :
'🎯 WEIGHTED MODE: Apply user percentages proportionally.'}

Execute using the user weights object above.`;
      
      console.log(`🎚️ Using dynamic weights for ${batchGames.length} games: Theme=${weightPercentages.theme}%, Volatility=${weightPercentages.volatility}%, Studio=${weightPercentages.studio}%, BonusFreq=${weightPercentages.bonusFrequency}%`);
      
      if (weightPercentages.bonusFrequency === 100) {
        console.log(`🎯 BONUS FREQUENCY FOCUS MODE: Analyzing games purely on bonus frequency similarity`);
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000, // Haiku's optimal token limit
      system: systemPrompt,
      messages: [{ role: 'user', content: batchPrompt }]
    });

    const results = JSON.parse(response.content[0].text);
    
    console.log(`🤖 Batch LLM Similarity: ${targetGame.title} vs ${batchGames.length} games completed`);
    console.log(`🔍 Sample results: ${results.slice(0, 3).map(r => `${r.game_id}=${r.similarity_score}%`).join(', ')}`);
    
    // Convert results to expected format
    return results.map(result => ({
      gameId: result.game_id,
      similarity: result.similarity_score / 100, // Convert to 0-1 range
      confidence: result.similarity_score, // Keep as percentage for consistency
      analysis: result
    }));
    
  } catch (error) {
    console.error('❌ Batch LLM similarity calculation failed:', error.message);
    console.error('Error details:', error);
    // Fallback to algorithmic method for all games
    return batchGames.map(game => {
      const similarity = calculateAlgorithmicSimilarity(targetGame, game, userWeights || DEFAULT_WEIGHTS);
      return {
        gameId: game.id,
        similarity: similarity,
        confidence: Math.round(similarity * 100),
        analysis: null
      };
    });
  }
}

// Legacy single comparison function (kept for backward compatibility)
async function calculateLLMSimilarity(game1, game2, playerContext = null, userWeights = null) {
  const batchResults = await calculateBatchLLMSimilarity(game1, [game2], playerContext, userWeights);
  return batchResults[0]?.similarity || 0;
}

// Original algorithmic similarity (renamed)
function calculateAlgorithmicSimilarity(game1, game2, weights = DEFAULT_WEIGHTS) {
  let score = 0;
  let debugInfo = [];
  
  // Check if any weight is 100% (1.0) - if so, only use that factor
  const is100PercentMode = Object.values(weights).some(w => Math.abs(w - 1.0) < 0.001);
  
  // Theme matching (40% default weight)
  let themeScore = 0;
  if (game1.theme && game2.theme && Array.isArray(game1.theme) && Array.isArray(game2.theme)) {
    if (weights.theme >= 0.999) {
      // 100% theme mode - use Jaccard similarity (intersection over union)
      const set1 = new Set(game1.theme);
      const set2 = new Set(game2.theme);
      const intersection = [...set1].filter(x => set2.has(x));
      const union = new Set([...set1, ...set2]);
      themeScore = union.size > 0 ? (intersection.length / union.size) : 0;
      debugInfo.push(`theme: ${themeScore.toFixed(3)} (100% mode - ${intersection.length}/${union.size} Jaccard)`);
    } else {
      // Regular weighted theme scoring
      const themeOverlap = game1.theme.filter(t => game2.theme.includes(t)).length;
      if (game1.theme.length > 0) {
        themeScore = (themeOverlap / game1.theme.length) * weights.theme;
        debugInfo.push(`theme: ${themeScore.toFixed(3)} (${themeOverlap}/${game1.theme.length} overlap)`);
      }
    }
  } else {
    debugInfo.push(`theme: 0 (missing data - g1:${!!game1.theme}, g2:${!!game2.theme})`);
  }
  score += themeScore;
  
  // Volatility matching (30% default weight)
  let volatilityScore = 0;
  if (weights.volatility >= 0.999) {
    // 100% volatility mode - exact match gets 100%, adjacent gets 50%, others get 0%
    const vol1 = volatilityLevel(game1);
    const vol2 = volatilityLevel(game2);
    if (vol1 === vol2) {
      volatilityScore = 1.0;
      debugInfo.push(`volatility: 1.000 (100% mode - exact match)`);
    } else if (Math.abs(vol1 - vol2) === 1) {
      volatilityScore = 0.5;
      debugInfo.push(`volatility: 0.500 (100% mode - adjacent)`);
    } else {
      debugInfo.push(`volatility: 0 (100% mode - no match)`);
    }
  } else {
    // Regular weighted volatility scoring
    const vol1 = volatilityLevel(game1);
    const vol2 = volatilityLevel(game2);
    if (vol1 === vol2) {
      volatilityScore = weights.volatility;
      debugInfo.push(`volatility: ${weights.volatility.toFixed(3)} (exact match ${game1.volatility})`);
    } else if (Math.abs(vol1 - vol2) === 1) {
      volatilityScore = weights.volatility * 0.5;
      debugInfo.push(`volatility: ${volatilityScore.toFixed(3)} (close match ${game1.volatility}/${game2.volatility})`);
    } else {
      debugInfo.push(`volatility: 0 (no match ${game1.volatility}/${game2.volatility})`);
    }
  }
  score += volatilityScore;
  
  // Studio matching (20% default weight)
  let studioScore = 0;
  if (weights.studio >= 0.999) {
    // 100% studio mode - binary match
    if (game1.studio && game2.studio && game1.studio === game2.studio) {
      studioScore = 1.0;
      debugInfo.push(`studio: 1.000 (100% mode - match)`);
    } else {
      debugInfo.push(`studio: 0 (100% mode - no match)`);
    }
  } else {
    // Regular weighted studio scoring
    if (game1.studio && game2.studio && game1.studio === game2.studio) {
      studioScore = weights.studio;
      debugInfo.push(`studio: ${weights.studio.toFixed(3)} (match: ${game1.studio})`);
    } else {
      debugInfo.push(`studio: 0 (${game1.studio || 'null'} vs ${game2.studio || 'null'})`);
    }
  }
  score += studioScore;
  
  // Mechanics matching (10% default weight)
  let mechanicsScore = 0;
  if (game1.mechanics && game2.mechanics && Array.isArray(game1.mechanics) && Array.isArray(game2.mechanics)) {
    if (weights.mechanics >= 0.999) {
      // 100% mechanics mode - use Jaccard similarity
      const set1 = new Set(game1.mechanics);
      const set2 = new Set(game2.mechanics);
      const intersection = [...set1].filter(x => set2.has(x));
      const union = new Set([...set1, ...set2]);
      mechanicsScore = union.size > 0 ? (intersection.length / union.size) : 0;
      debugInfo.push(`mechanics: ${mechanicsScore.toFixed(3)} (100% mode - ${intersection.length}/${union.size} Jaccard)`);
    } else {
      // Regular weighted mechanics scoring
      const mechanicsOverlap = game1.mechanics.filter(m => game2.mechanics.includes(m)).length;
      if (game1.mechanics.length > 0) {
        mechanicsScore = (mechanicsOverlap / game1.mechanics.length) * weights.mechanics;
        debugInfo.push(`mechanics: ${mechanicsScore.toFixed(3)} (${mechanicsOverlap}/${game1.mechanics.length} overlap)`);
      }
    }
  } else {
    debugInfo.push(`mechanics: 0 (missing data - g1:${!!game1.mechanics}, g2:${!!game2.mechanics})`);
  }
  score += mechanicsScore;
  
  // RTP matching - Players care about return rates
  let rtpScore = 0;
  const rtpWeight = weights.rtp || 0.05;
  if (game1.rtp && game2.rtp && rtpWeight > 0) {
    const rtpDiff = Math.abs(game1.rtp - game2.rtp);
    if (rtpDiff < 0.5) {
      rtpScore = rtpWeight; // Within 0.5% = full match
      debugInfo.push(`rtp: ${rtpWeight.toFixed(3)} (exact match ${game1.rtp}%)`);
    } else if (rtpDiff < 2) {
      rtpScore = rtpWeight * 0.5; // Within 2% = half match
      debugInfo.push(`rtp: ${(rtpWeight * 0.5).toFixed(3)} (close ${game1.rtp}% vs ${game2.rtp}%)`);
    } else {
      debugInfo.push(`rtp: 0 (${game1.rtp}% vs ${game2.rtp}%)`);
    }
  }
  score += rtpScore;
  
  // Max Win matching - Big win potential matters
  let maxWinScore = 0;
  const maxWinWeight = weights.maxWin || 0.05;
  if (game1.maxWin && game2.maxWin && maxWinWeight > 0) {
    const ratio = Math.min(game1.maxWin, game2.maxWin) / Math.max(game1.maxWin, game2.maxWin);
    if (ratio > 0.8) {
      maxWinScore = maxWinWeight; // Within 20% = full match
      debugInfo.push(`maxWin: ${maxWinWeight.toFixed(3)} (similar ${game1.maxWin}x vs ${game2.maxWin}x)`);
    } else if (ratio > 0.5) {
      maxWinScore = maxWinWeight * 0.5; // Within 50% = half match
      debugInfo.push(`maxWin: ${(maxWinWeight * 0.5).toFixed(3)} (moderate ${game1.maxWin}x vs ${game2.maxWin}x)`);
    } else {
      debugInfo.push(`maxWin: 0 (${game1.maxWin}x vs ${game2.maxWin}x)`);
    }
  }
  score += maxWinScore;
  
  // Features matching - Progressive vs standard is huge
  let featuresScore = 0;
  const featuresWeight = weights.features || 0.05;
  if (game1.features && game2.features && Array.isArray(game1.features) && Array.isArray(game2.features) && featuresWeight > 0) {
    // Check for critical features
    const hasProgressive1 = game1.features.some(f => f.toLowerCase().includes('progressive'));
    const hasProgressive2 = game2.features.some(f => f.toLowerCase().includes('progressive'));
    
    if (hasProgressive1 === hasProgressive2) {
      // Same progressive status - now check feature overlap
      const featureSet1 = new Set(game1.features);
      const featureSet2 = new Set(game2.features);
      const intersection = [...featureSet1].filter(x => featureSet2.has(x));
      const union = new Set([...featureSet1, ...featureSet2]);
      
      if (union.size > 0) {
        featuresScore = (intersection.length / union.size) * featuresWeight;
        debugInfo.push(`features: ${featuresScore.toFixed(3)} (${intersection.length}/${union.size} overlap, prog:${hasProgressive1})`);
      }
    } else {
      debugInfo.push(`features: 0 (progressive mismatch)`);
    }
  }
  score += featuresScore;
  
  // Pace matching - Game speed preference (critical)
  let paceScore = 0;
  const paceWeight = weights.pace || 0.03;
  if (game1.pace && game2.pace && paceWeight > 0) {
    if (game1.pace === game2.pace) {
      paceScore = paceWeight;
      debugInfo.push(`pace: ${paceWeight.toFixed(3)} (exact match ${game1.pace})`);
    } else if (
      (game1.pace === 'fast' && game2.pace === 'medium') ||
      (game1.pace === 'medium' && game2.pace === 'fast') ||
      (game1.pace === 'medium' && game2.pace === 'slow') ||
      (game1.pace === 'slow' && game2.pace === 'medium')
    ) {
      paceScore = paceWeight * 0.5;
      debugInfo.push(`pace: ${(paceWeight * 0.5).toFixed(3)} (adjacent ${game1.pace}/${game2.pace})`);
    } else {
      debugInfo.push(`pace: 0 (${game1.pace} vs ${game2.pace})`);
    }
  }
  score += paceScore;
  
  // Hit Frequency matching - Use actual user weight
  let hitFreqScore = 0;
  const hitFreqWeight = weights.hitFrequency || 0;
  if (game1.hitFrequency && game2.hitFrequency && hitFreqWeight > 0) {
    const freqDiff = Math.abs(game1.hitFrequency - game2.hitFrequency);
    if (freqDiff < 5) {
      hitFreqScore = hitFreqWeight; // Within 5% = full match
      debugInfo.push(`hitFreq: ${hitFreqWeight.toFixed(3)} (close ${game1.hitFrequency.toFixed(1)}%)`);
    } else if (freqDiff < 15) {
      hitFreqScore = hitFreqWeight * 0.5; // Within 15% = half match
      debugInfo.push(`hitFreq: ${(hitFreqWeight * 0.5).toFixed(3)} (moderate ${game1.hitFrequency.toFixed(1)}% vs ${game2.hitFrequency.toFixed(1)}%)`);
    } else {
      debugInfo.push(`hitFreq: 0 (${game1.hitFrequency.toFixed(1)}% vs ${game2.hitFrequency.toFixed(1)}%)`);
    }
  }
  score += hitFreqScore;
  
  // Bonus Frequency matching - How often bonuses trigger
  let bonusFreqScore = 0;
  const bonusFreqWeight = weights.bonusFrequency || 0.02;
  if (game1.bonusFrequency && game2.bonusFrequency && bonusFreqWeight > 0) {
    const bonusDiff = Math.abs(game1.bonusFrequency - game2.bonusFrequency);
    if (bonusDiff < 2) {
      bonusFreqScore = bonusFreqWeight; // Within 2% = full match
      debugInfo.push(`bonusFreq: ${bonusFreqWeight.toFixed(3)} (similar ${game1.bonusFrequency.toFixed(1)}%)`);
    } else if (bonusDiff < 5) {
      bonusFreqScore = bonusFreqWeight * 0.5; // Within 5% = half match
      debugInfo.push(`bonusFreq: ${(bonusFreqWeight * 0.5).toFixed(3)} (moderate ${game1.bonusFrequency.toFixed(1)}% vs ${game2.bonusFrequency.toFixed(1)}%)`);
    } else {
      debugInfo.push(`bonusFreq: 0 (${game1.bonusFrequency.toFixed(1)}% vs ${game2.bonusFrequency.toFixed(1)}%)`);
    }
  }
  score += bonusFreqScore;
  
  // Art Style matching - Use actual user weight
  let artStyleScore = 0;
  const artStyleWeight = weights.artStyle || 0;
  if (game1.artStyle && game2.artStyle && artStyleWeight > 0) {
    if (game1.artStyle === game2.artStyle) {
      artStyleScore = artStyleWeight;
      debugInfo.push(`artStyle: ${artStyleWeight.toFixed(3)} (match ${game1.artStyle})`);
    } else {
      debugInfo.push(`artStyle: 0 (${game1.artStyle} vs ${game2.artStyle})`);
    }
  }
  score += artStyleScore;
  
  // Audio Vibe matching - Use actual user weight
  let audioScore = 0;
  const audioWeight = weights.audioVibe || 0;
  if (game1.audioVibe && game2.audioVibe && audioWeight > 0) {
    if (game1.audioVibe === game2.audioVibe) {
      audioScore = audioWeight;
      debugInfo.push(`audio: ${audioWeight.toFixed(3)} (match ${game1.audioVibe})`);
    } else {
      debugInfo.push(`audio: 0 (${game1.audioVibe} vs ${game2.audioVibe})`);
    }
  }
  score += audioScore;
  
  // Visual Density matching - Use actual user weight
  let densityScore = 0;
  const densityWeight = weights.visualDensity || 0;
  if (game1.visualDensity && game2.visualDensity && densityWeight > 0) {
    if (game1.visualDensity === game2.visualDensity) {
      densityScore = densityWeight;
      debugInfo.push(`density: ${densityWeight.toFixed(3)} (match ${game1.visualDensity})`);
    } else {
      debugInfo.push(`density: 0 (${game1.visualDensity} vs ${game2.visualDensity})`);
    }
  }
  score += densityScore;
  
  // Reel Layout matching - Use actual user weight
  let reelScore = 0;
  const reelWeight = weights.reelLayout || 0;
  if (game1.reelLayout && game2.reelLayout && reelWeight > 0) {
    if (game1.reelLayout === game2.reelLayout) {
      reelScore = reelWeight;
      debugInfo.push(`reel: ${reelWeight.toFixed(3)} (match ${game1.reelLayout})`);
    } else {
      debugInfo.push(`reel: 0 (${game1.reelLayout} vs ${game2.reelLayout})`);
    }
  }
  score += reelScore;
  
  // Weights should always sum to 1.0 from UI auto-balancing
  const finalScore = Math.min(score, 1.0);
  
  // Log debug info for first few calculations
  if (Math.random() < 0.1) { // 10% chance to log
    console.log(`🔍 Similarity Debug: ${game1.title} vs ${game2.title}`);
    console.log(`🔍 ${debugInfo.join(', ')}`);
    console.log(`🔍 Final score: ${finalScore.toFixed(3)} (${Math.round(finalScore * 100)}%)`);
  }
  
  return finalScore;
}

async function getRecommendations(gameId, weights = DEFAULT_WEIGHTS, count = 5, gamesArray = null, playerContext = null, recommendationEngine = 'algo') {
  const games = gamesArray || loadGames();
  
  if (games.length === 0) {
    return [];
  }
  
  const targetGame = games.find(g => g.id === gameId);
  if (!targetGame) {
    throw new Error('Selected game not found');
  }
  
  // Adjust weights based on player context
  let contextAdjustedWeights = {...weights};
  if (playerContext) {
    contextAdjustedWeights = applyContextToWeights(weights, playerContext);
  }
  
  // Create cache key including context and engine mode
  const cacheKey = `${gameId}-${JSON.stringify(contextAdjustedWeights)}-${JSON.stringify(playerContext?.focusLevel || 'none')}-${recommendationEngine}`;
  
  // Check cache
  if (gameCache.has(cacheKey)) {
    return gameCache.get(cacheKey);
  }
  
  // Filter games based on context before scoring
  let eligibleGames = games.filter(g => g.id !== gameId);
  if (playerContext) {
    eligibleGames = filterGamesByContext(eligibleGames, playerContext, targetGame);
  }
  
  console.log('\n🎯 SIMILARITY ENGINE SELECTION:');
  console.log(`   ⚙️  Engine Type: ${recommendationEngine.toUpperCase()}`);
  console.log(`   📊 Eligible Games: ${eligibleGames.length}`);
  console.log(`   🎮 Target Game: "${targetGame.title}"`);
  console.log(`   🎚️  Context Weights Applied: ${!!playerContext}`);
  console.log(`   💾 Cache Key: ${cacheKey.substring(0, 50)}...`);
  
  // Log weight details
  console.log('\n🎚️  FINAL WEIGHTS FOR SIMILARITY ANALYSIS:');
  Object.entries(contextAdjustedWeights).forEach(([key, value]) => {
    const percentage = Math.round(value * 100);
    const status = value === 0 ? '🔇' : value === 1 ? '🔥' : '✓';
    console.log(`   ${status} ${key}: ${value.toFixed(3)} (${percentage}%)`);
  });
  
  // Calculate similarities (either LLM or algorithmic)
  const recommendations = [];
  
  if (recommendationEngine === 'llm') {
    console.log('\n🤖 LLM SEMANTIC ANALYSIS SELECTED:');
    console.log('   🧠 Using AI for semantic understanding of game similarities');
    console.log('   📈 Better at thematic, emotional, and contextual matches');
    console.log('   🎯 Will generate detailed analysis explanations');
    // LLM-based batch similarity (much faster and cheaper)
    console.log('\n🚀 STARTING LLM BATCH PROCESSING...');
    console.log(`   📦 Batch Size: ${eligibleGames.length} games`);
    console.log(`   🎯 Target: "${targetGame.title}" (${targetGame.theme?.join('/')} themes)`);
    console.log(`   ⚡ Processing mode: Batch API call for efficiency`);
    
    const batchStartTime = Date.now();
    const batchResults = await calculateBatchLLMSimilarity(targetGame, eligibleGames, playerContext, contextAdjustedWeights);
    const batchEndTime = Date.now();
    
    console.log(`   ✅ LLM batch completed in ${batchEndTime - batchStartTime}ms`);
    console.log(`   📊 Results received: ${batchResults.length} game similarities`);
    
    // Process batch results
    console.log('\n📊 PROCESSING LLM BATCH RESULTS:');
    let processedCount = 0;
    for (const result of batchResults) {
      const game = eligibleGames.find(g => g.id === result.gameId);
      if (game) {
        // Apply context-based score boosts/penalties
        let contextBonus = 0;
        if (playerContext) {
          contextBonus = calculateContextBonus(game, playerContext);
        }
        
        const finalScore = Math.min(result.similarity + contextBonus, 1.0);
        const finalConfidence = Math.round(Math.min((result.similarity + contextBonus) * 100, 100));
        
        recommendations.push({
          game,
          score: finalScore,
          confidence: finalConfidence,
          analysis: result.analysis // Include detailed LLM analysis
        });
        
        processedCount++;
        
        // Log high-scoring matches
        if (finalScore > 0.7 || processedCount <= 5) {
          console.log(`   ${processedCount}. "${game.title}" - ${Math.round(finalScore * 100)}% similarity ${contextBonus > 0 ? `(+${Math.round(contextBonus * 100)}% context bonus)` : ''}`);
        }
      }
    }
    console.log(`   ✅ Processed ${processedCount} LLM similarity results`);
  } else {
    console.log('\n📊 MATHEMATICAL ALGORITHM SELECTED:');
    console.log('   ⚡ Using fast mathematical similarity calculations');
    console.log('   📈 Better at precise numerical and categorical matches');
    console.log('   🎯 Will provide debug scoring breakdowns');
    
    // Algorithmic similarity (faster)
    console.log('\n🔢 STARTING ALGORITHMIC PROCESSING...');
    console.log(`   📦 Processing ${eligibleGames.length} games individually`);
    console.log(`   🎯 Target: "${targetGame.title}" (${targetGame.theme?.join('/')} themes)`);
    
    const algoStartTime = Date.now();
    let processedCount = 0;
    
    for (const game of eligibleGames) {
      const similarity = calculateAlgorithmicSimilarity(targetGame, game, contextAdjustedWeights);
      
      // Apply context-based score boosts/penalties
      let contextBonus = 0;
      if (playerContext) {
        contextBonus = calculateContextBonus(game, playerContext);
      }
      
      const finalScore = Math.min(similarity + contextBonus, 1.0);
      const finalConfidence = Math.round(Math.min((similarity + contextBonus) * 100, 100));
      
      recommendations.push({
        game,
        score: finalScore,
        confidence: finalConfidence,
        analysis: null // Algorithmic engine has no detailed analysis
      });
      
      processedCount++;
      
      // Log high-scoring matches
      if (finalScore > 0.7 || processedCount <= 5) {
        console.log(`   ${processedCount}. "${game.title}" - ${Math.round(finalScore * 100)}% similarity ${contextBonus > 0 ? `(+${Math.round(contextBonus * 100)}% context bonus)` : ''}`);
      }
    }
    
    const algoEndTime = Date.now();
    console.log(`   ✅ Algorithmic processing completed in ${algoEndTime - algoStartTime}ms`);
    console.log(`   📊 Processed ${processedCount} games with mathematical similarity`);
  }
  
  // Sort and limit results
  console.log('\n🏆 FINAL RESULTS PROCESSING:');
  console.log(`   📊 Total recommendations generated: ${recommendations.length}`);
  console.log(`   🔝 Requesting top ${count} results`);
  
  const sortedRecommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  
  console.log('\n🎯 TOP RECOMMENDATIONS SELECTED:');
  sortedRecommendations.forEach((rec, i) => {
    const similarity = Math.round(rec.score * 100);
    const hasAnalysis = !!rec.analysis;
    console.log(`   ${i+1}. "${rec.game.title}" - ${similarity}% match ${hasAnalysis ? '(with LLM analysis)' : '(algorithmic)'}`);
    if (rec.game.theme) {
      console.log(`      🎨 Theme: ${rec.game.theme.join(', ')}`);
    }
    if (rec.game.volatility) {
      console.log(`      🎲 Volatility: ${rec.game.volatility}`);
    }
  });
  
  // Cache results
  console.log(`\n💾 CACHING RESULTS:`);
  console.log(`   🔑 Cache key: ${cacheKey.substring(0, 30)}...`);
  gameCache.set(cacheKey, sortedRecommendations);
  console.log(`   📊 Cache size: ${gameCache.size} entries`);
  
  // Clear cache if it grows too large (memory management)
  if (gameCache.size > 100) {
    const oldestKey = gameCache.keys().next().value;
    gameCache.delete(oldestKey);
    console.log(`   🧹 Cleaned oldest cache entry to prevent memory bloat`);
  }
  
  console.log(`\n✅ RECOMMENDATION ENGINE COMPLETED: ${sortedRecommendations.length} results ready`);
  return sortedRecommendations;
}

// Adjust weights based on player context
function applyContextToWeights(baseWeights, context) {
  const adjusted = {...baseWeights};
  
  // Work hours or split attention = reduce volatility importance
  if (context.focusLevel === 'split-attention' || context.atWork) {
    adjusted.volatility *= 0.6;  // Less focus on volatility
    adjusted.theme *= 1.2;       // More focus on familiar themes
    adjusted.mechanics *= 0.8;   // Simpler mechanics preferred
  }
  
  // Tired/drowsy = simplify everything
  if (context.focusLevel === 'drowsy' || context.timeOfDay === 'late-night') {
    adjusted.mechanics *= 0.5;   // Much simpler games
    adjusted.volatility *= 0.7;  // Lower risk preference
  }
  
  // Near payday = higher risk tolerance
  if (context.isNearPayday || context.dayOfMonth <= 5) {
    adjusted.volatility *= 1.2;  // More open to volatility
    // Note: maxWin boost would go here if we had dynamic weight for it
  }
  
  // Weekend = exploration mode
  if (context.isWeekend) {
    adjusted.studio *= 0.8;      // Less brand loyalty
    adjusted.theme *= 1.1;       // More thematic exploration
  }
  
  // Normalize weights to sum to original total
  const originalSum = Object.values(baseWeights).reduce((a, b) => a + b, 0);
  const adjustedSum = Object.values(adjusted).reduce((a, b) => a + b, 0);
  const normalizer = originalSum / adjustedSum;
  
  Object.keys(adjusted).forEach(key => {
    adjusted[key] *= normalizer;
  });
  
  return adjusted;
}

// Filter games based on context
function filterGamesByContext(games, context, targetGame) {
  return games.filter(game => {
    // During work: skip ultra-high volatility
    if ((context.atWork || context.focusLevel === 'split-attention') && 
        game.volatility === 'ultra') {
      return false;
    }
    
    // When tired: skip complex games
    if (context.focusLevel === 'drowsy' && 
        game.features && game.features.length > 4) {
      return false;
    }
    
    // Mobile device: prefer mobile-optimized
    if (context.deviceType === 'mobile' && 
        game.mobileOptimized === false) {
      // Don't completely exclude, just deprioritize
      return Math.random() > 0.5;
    }
    
    // Late night: avoid high-energy themes
    if (context.timeOfDay === 'late-night' && 
        game.theme && game.theme.some(t => 
          ['Action', 'Combat', 'Racing', 'Sports'].includes(t))) {
      return false;
    }
    
    return true;
  });
}

// Calculate context-based bonus scores
function calculateContextBonus(game, context) {
  let bonus = 0;
  
  // Pace matching
  if (game.pace && context.preferredPace) {
    if (game.pace === context.preferredPace) {
      bonus += 0.05; // 5% bonus for pace match
    } else if (
      (game.pace === 'fast' && context.preferredPace === 'medium') ||
      (game.pace === 'medium' && context.preferredPace === 'fast')
    ) {
      bonus += 0.02; // 2% for close pace match
    }
  }
  
  // Time-appropriate themes
  if (context.timeOfDay === 'morning' && game.theme) {
    if (game.theme.some(t => ['Coffee', 'Breakfast', 'Fresh', 'Energy'].includes(t))) {
      bonus += 0.03;
    }
  }
  
  if (context.timeOfDay === 'late-night' && game.theme) {
    if (game.theme.some(t => ['Dreams', 'Stars', 'Moon', 'Mystical', 'Zen'].includes(t))) {
      bonus += 0.03;
    }
  }
  
  // Weekend bonus for adventure themes
  if (context.isWeekend && game.theme) {
    if (game.theme.some(t => ['Adventure', 'Quest', 'Exploration', 'Journey'].includes(t))) {
      bonus += 0.02;
    }
  }
  
  // Sports event synergy
  if (context.activeSportsEvents && game.theme) {
    if (game.theme.some(t => ['Sports', 'Football', 'Champions', 'Tournament'].includes(t))) {
      bonus += 0.04;
    }
  }
  
  return bonus;
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
  calculateSimilarity: calculateAlgorithmicSimilarity,
  calculateLLMSimilarity,
  calculateBatchLLMSimilarity,
  calculateAlgorithmicSimilarity,
  getRecommendations,
  generateMatchExplanation,
  volatilityLevel,
  clearCache
};