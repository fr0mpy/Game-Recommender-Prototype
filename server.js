require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

// Import services
const { loadGames, loadSettings, saveSettings, saveGames, saveCustomGames, hasCustomGames, redis } = require("./utils/storage");
const {
  generateGames,
  generateMockGames,
  generateGamesHybrid,
} = require("./services/gameGenerator");
const { getRecommendations, generateMatchExplanation } = require("./services/recommendationEngine");

// Load prompt from file
function loadPrompt(filename) {
  try {
    const promptPath = path.join(__dirname, 'prompts', filename);
    const content = fs.readFileSync(promptPath, 'utf8');
    
    // Extract the server implementation template section
    const templateStart = content.indexOf('# Server Implementation Template');
    if (templateStart !== -1) {
      return content.substring(templateStart).replace('# Server Implementation Template\n\n', '');
    }
    
    return content;
  } catch (error) {
    console.error(`Failed to load prompt from ${filename}:`, error.message);
    return null;
  }
}

// Generate LLM explanations using organized prompt structure
async function generateLLMExplanations(selectedGame, recommendations, weights, playerContext) {
  const Anthropic = require('@anthropic-ai/sdk');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Ensure we only process exactly 5 recommendations
  if (recommendations.length !== 5) {
    console.log(`⚠️ EXPLANATION: Expected 5 recommendations, got ${recommendations.length}`);
  }
  
  const top5Recommendations = recommendations.slice(0, 5);
  console.log(`🎯 EXPLANATION: Processing ${top5Recommendations.length} recommendations for explanations`);

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Load the fast explanation prompt
    const basePrompt = loadPrompt('fast-explanation-prompt.md');
    if (!basePrompt) {
      throw new Error('Could not load fast-explanation-prompt.md');
    }

    // Build the games list for the prompt - only top 5
    const gamesList = top5Recommendations.map((rec, index) => 
      `${index + 1}. "${rec.game.title}" - ${rec.game.themes.join('/')}, ${rec.game.volatility} volatility, ${rec.game.studio}`
    ).join('\n');

    // Simple prompt substitution for speed
    const filledPrompt = basePrompt
      .replace('{{selectedGameTitle}}', selectedGame.title)
      .replace('{{selectedGameThemes}}', selectedGame.themes.join('/'))
      .replace('{{selectedGameVolatility}}', selectedGame.volatility)
      .replace('{{selectedGameStudio}}', selectedGame.studio || 'Unknown')
      .replace('{{themeWeight}}', Math.round(weights.theme * 100))
      .replace('{{volatilityWeight}}', Math.round(weights.volatility * 100))
      .replace('{{studioWeight}}', Math.round(weights.studio * 100))
      .replace('{{mechanicsWeight}}', Math.round(weights.mechanics * 100))
      .replace('{{gamesList}}', gamesList);

    console.log('\n📝 SENDING LLM EXPLANATION REQUEST:');
    console.log(`   🎮 Selected: ${selectedGame.title}`);
    console.log(`   🎯 Recommendations: ${recommendations.length}`);
    console.log(`   ⚖️  Weights: Theme ${Math.round(weights.theme * 100)}%, Volatility ${Math.round(weights.volatility * 100)}%, Studio ${Math.round(weights.studio * 100)}%, Mechanics ${Math.round(weights.mechanics * 100)}%`);

    console.log(`\n🤖 CALLING ANTHROPIC API:`);
    console.log(`   🚀 Model: claude-3-haiku-20240307`);
    console.log(`   📏 Prompt Length: ${filledPrompt.length} chars`);
    console.log(`   ⏰ API Call Start: ${new Date().toISOString()}`);
    
    const apiCallStart = Date.now();
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Fastest model
      max_tokens: 300, // Reduced for speed - just need 5 short explanations
      temperature: 0.3, // Lower for more consistent/faster responses
      messages: [{ role: "user", content: filledPrompt }]
    });
    const apiCallEnd = Date.now();
    
    console.log(`\n✅ ANTHROPIC API RESPONSE:`);
    console.log(`   ⏱️  Duration: ${apiCallEnd - apiCallStart}ms`);
    console.log(`   📊 Input Tokens: ${response.usage?.input_tokens || 'unknown'}`);
    console.log(`   📤 Output Tokens: ${response.usage?.output_tokens || 'unknown'}`);
    console.log(`   📝 Response Length: ${response.content[0].text.length} chars`);
    console.log(`   🔍 Response Preview: "${response.content[0].text.substring(0, 150)}..."`);
    console.log(`   ⏰ Completed: ${new Date().toISOString()}`);

    const explanationText = response.content[0].text;
    
    // Parse JSON response
    let explanations;
    try {
      explanations = JSON.parse(explanationText);
    } catch (parseError) {
      console.log('❌ Failed to parse JSON, extracting array...');
      // Try to extract JSON array from response
      const jsonMatch = explanationText.match(/\[(.*?)\]/s);
      if (jsonMatch) {
        explanations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON array from response');
      }
    }

    if (!Array.isArray(explanations)) {
      throw new Error('Response is not an array');
    }

    // Ensure we return exactly 5 explanations to match recommendations
    const top5Explanations = explanations.slice(0, 5);
    
    // If we got fewer than 5, pad with fallback explanations
    while (top5Explanations.length < 5) {
      const missingIndex = top5Explanations.length;
      top5Explanations.push(`Great match based on your ${selectedGame.themes.join(' and ')} preferences.`);
      console.log(`⚠️ EXPLANATION: Added fallback explanation for position ${missingIndex + 1}`);
    }

    console.log(`✅ Successfully generated ${top5Explanations.length} LLM explanations (exactly 5)`);
    return top5Explanations;

  } catch (error) {
    console.error('❌ LLM explanation generation failed:', error.message);
    console.error('❌ Error type:', error.constructor.name);
    console.error('❌ Stack trace:', error.stack);
    
    // Log specific failure scenarios for debugging
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      console.error('🔑 API Key Issue: Check environment variables');
    } else if (error.message.includes('recommendation-explanation-prompt')) {
      console.error('📄 Prompt File Issue: Check prompts/ directory');
    } else if (error.message.includes('JSON')) {
      console.error('🔧 JSON Parse Issue: Claude returned malformed response');
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      console.error('🌐 Network Issue: Anthropic API unreachable');
    } else {
      console.error('🔍 Unknown LLM Error - investigate manually');
    }
    
    throw error;
  }
}

// Unified function to generate all recommendation explanations in a single LLM call
async function generateAllRecommendationExplanations(selectedGame, recommendations, weights, playerContext, allGames) {
  const Anthropic = require('@anthropic-ai/sdk');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    // Return basic explanations without API
    return recommendations.map((rec, index) => ({
      index: index,
      explanation: `Great match based on similar ${rec.game.volatility} volatility and engaging gameplay.`,
      success: false
    }));
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    // Get current time context
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let timeContext = '';
    if (hour >= 12 && hour <= 14 && !isWeekend) {
      timeContext = 'lunch break - looking for quick, engaging gameplay';
    } else if (hour >= 17 && hour <= 23) {
      timeContext = 'evening relaxation - perfect time for immersive gaming sessions';
    } else if (hour >= 9 && hour <= 17 && !isWeekend) {
      timeContext = 'work hours - seeking brief, exciting gaming moments';
    } else if (isWeekend) {
      timeContext = 'weekend leisure - ideal for extended gaming sessions';
    } else {
      timeContext = 'late night gaming - looking for engaging entertainment';
    }

    // Build recommendations list for the prompt
    const gamesList = recommendations.map((rec, i) => 
      `${i + 1}. "${rec.game.title}" - ${rec.game.theme.join('/')} themes, ${rec.game.volatility} volatility, ${rec.game.pace} pace, RTP ${rec.game.rtp}%, max win ${rec.game.maxWin}x`
    ).join('\n');

    const playTimeContext = playerContext?.temporal?.playTimeContext || {};
    const financialContext = playTimeContext.financialCycle || {};
    
    // Load prompt template from file
    let promptTemplate = loadPrompt('recommendation-explanation.md');
    
    if (!promptTemplate) {
      // Fallback to basic prompt if file loading fails
      promptTemplate = 'Generate concise recommendation explanations for slot games based on player context.';
    }

    // Replace template variables with actual values
    const prompt = promptTemplate
      .replace('{{selectedGameTitle}}', selectedGame.title)
      .replace('{{selectedGameThemes}}', selectedGame.theme.join('/'))
      .replace('{{selectedGameVolatility}}', selectedGame.volatility)
      .replace('{{timeContext}}', timeContext)
      .replace('{{themeWeight}}', Math.round(weights.theme * 100))
      .replace('{{volatilityWeight}}', Math.round(weights.volatility * 100))
      .replace('{{studioWeight}}', Math.round(weights.studio * 100))
      .replace('{{mechanicsWeight}}', Math.round(weights.mechanics * 100))
      .replace('{{deviceType}}', playerContext?.deviceType || 'unknown')
      .replace('{{sportsActive}}', playerContext?.temporal?.sportsSeason?.length ? `- Sports active: ${playerContext.temporal.sportsSeason.map(s => s.sport).join(', ')}` : '')
      .replace('{{focusLevel}}', playTimeContext.focusLevel || 'unknown')
      .replace('{{focusReasoning}}', playTimeContext.reasoning || 'standard session')
      .replace('{{attentionSpan}}', playTimeContext.attentionSpan || 'medium')
      .replace('{{preferredPace}}', playTimeContext.preferredPace || 'medium')
      .replace('{{preferredVolatility}}', playTimeContext.preferredVolatility || 'any')
      .replace('{{sessionDescription}}', playTimeContext.description || 'gaming session')
      .replace('{{budgetDescription}}', financialContext.description || 'standard period')
      .replace('{{budgetPressure}}', financialContext.budgetPressure || 'low')
      .replace('{{dayOfMonth}}', financialContext.dayOfMonth || '?')
      .replace('{{totalDaysInMonth}}', financialContext.totalDaysInMonth || '?')
      .replace('{{gamesList}}', gamesList);

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500, // Increased for richer contextual explanations
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Track token usage
    if (response.usage) {
      tokenUsage.totalTokens += response.usage.input_tokens + response.usage.output_tokens;
      tokenUsage.operationsCount += 1;
      tokenUsage.lastUpdated = Date.now();
    }

    const responseText = response.content[0]?.text?.trim();
    let explanationsArray;
    
    try {
      explanationsArray = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse LLM response as JSON:', parseError);
      return recommendations.map((rec, index) => ({
        index: index,
        explanation: `Great match for your ${selectedGame.theme.join(' and ')} preferences with similar ${rec.game.volatility} volatility gameplay.`,
        success: false
      }));
    }

    // Return formatted explanations
    return explanationsArray.map((explanation, index) => ({
      index: index,
      explanation: explanation || `Great match for your gaming preferences.`,
      success: true
    }));

  } catch (error) {
    console.error('Error generating explanations:', error);
    // Return basic explanations on error
    return recommendations.map((rec, index) => ({
      index: index,
      explanation: `Great match for your ${selectedGame.theme.join(' and ')} preferences with similar ${rec.game.volatility} volatility gameplay.`,
      success: false
    }));
  }
}
const contextTracker = require("./services/contextTracker");
const { convertGamesToCSV } = require("./services/csvConverter");

const app = express();
const PORT = process.env.PORT || 3000;

// Token tracking system
let tokenUsage = {
  totalTokens: 0,
  operationsCount: 0,
  lastUpdated: Date.now()
};

// Track active generations per session to prevent concurrent requests
const activeGenerations = new Set();

// Express configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Context tracking middleware
app.use((req, res, next) => {
  // Generate session ID if not present
  if (!req.headers['x-session-id']) {
    req.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  } else {
    req.sessionId = req.headers['x-session-id'];
  }

  // Track player context
  const contextData = {
    referrer: req.get('Referer'),
    userAgent: req.get('User-Agent'),
    sessionCount: 1, // Would be tracked in real implementation
    timezone: req.get('X-Timezone') || req.get('Timezone') || 'unknown',
    ballysSports: req.cookies?.ballysSports ? JSON.parse(req.cookies.ballysSports) : null,
    hasStoredPreferences: !!(req.cookies?.gamePreferences),
    deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
    systemTheme: req.get('X-System-Theme') || req.get('Sec-CH-Prefers-Color-Scheme') || 'unknown',
    acceptLanguage: req.get('Accept-Language') || 'en-US'
  };

  req.playerContext = contextTracker.trackPlayerContext(req.sessionId, contextData);
  
  // Add session ID to response for client-side tracking
  res.setHeader('X-Session-ID', req.sessionId);
  
  next();
});

// Helper function to render error page
function renderError(res, error) {
  console.error("Application error:", error);
  res.status(500).render("error", {
    error: error.message || "An unexpected error occurred",
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    tokenUsage: tokenUsage || { totalTokens: 0, operationsCount: 0 }
  });
}

// Routes

// Home page (with message handling)
app.get("/", async (req, res) => {
  try {
    const games = await loadGames(); // Load custom games from Redis or defaults
    const settings = loadSettings();
    const customGamesExist = await hasCustomGames(); // Check if custom games exist in Redis

    let message = null;
    if (req.query.success) {
      message = { type: "success", text: req.query.success };
    } else if (req.query.error) {
      message = { type: "error", text: req.query.error };
    }

    // Use basic context summary (no LLM call needed on page load)
    req.playerContext.contextSummary = contextTracker.generateBasicContextSummary(req.playerContext);

    // Detect Bally's Sports cross-sell opportunities
    const crossSell = contextTracker.detectBallysSportsCrossSell(req.playerContext);

    // Get preserved custom prompt from query params
    const customPrompt = req.query.prompt ? decodeURIComponent(req.query.prompt) : 'Generate 100 slot games';

    res.render("index", {
      games,
      settings,
      message,
      playerContext: req.playerContext,
      crossSell,
      sessionId: req.sessionId,
      tokenUsage,
      customPrompt,
      customGamesExist
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Generate games via LLM
app.post("/generate", async (req, res) => {
  console.log('🚀 SERVER: /generate route hit');
  console.log('🚀 SERVER: Request body:', req.body);
  console.log('🚀 SERVER: Session ID:', req.sessionId);
  console.log('🚀 SERVER: User Agent:', req.headers['user-agent']);
  console.log('🚀 SERVER: Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    API_KEY_EXISTS: !!process.env.ANTHROPIC_API_KEY
  });
  
  try {
    // Prevent concurrent generations for the same session
    if (activeGenerations.has(req.sessionId)) {
      console.log(`🚫 SERVER: Generation already in progress for session: ${req.sessionId}`);
      const games = await loadGames(req.sessionId);
      const settings = loadSettings();
      return res.render("index", {
        games,
        settings,
        message: {
          type: "error",
          text: "Generation already in progress. Please wait for the current generation to complete.",
        },
        playerContext: req.playerContext,
        crossSell: null,
        sessionId: req.sessionId,
        tokenUsage,
        customPrompt: req.body?.customPrompt || 'Generate 100 slot games'
      });
    }

    console.log('✅ SERVER: No concurrent generation, proceeding...');
    // Mark session as having active generation
    activeGenerations.add(req.sessionId);
    
    const customPrompt = req.body.customPrompt;
    console.log('🔍 SERVER: Custom prompt:', customPrompt);
    
    // Determine generation mode from radio button selection - FORCE HYBRID (HAIKU 3) AS DEFAULT
    const generationMode = req.body.generationMode || 'hybrid'; // DEFAULT: Claude 3 Haiku (Fast Mode)
    console.log('🔍 SERVER: Generation mode selected:', generationMode);
    
    let games;
    switch (generationMode) {
      case 'hybrid':
        console.log('🚀 SERVER: Using hybrid generation (Claude 3 Haiku + batching)...');
        games = await generateGamesHybrid(customPrompt, req.sessionId);
        break;
        
      case 'traditional':
        console.log('🎯 SERVER: Using premium generation (Claude 4 Sonnet)...');
        games = await generateGames(customPrompt, req.sessionId);
        break;
        
      case 'mock':
        console.log('⚡ SERVER: Using mock generation (development mode)...');
        games = generateMockGames();
        break;
        
      default:
        console.log('🚀 SERVER: Unknown mode, defaulting to hybrid generation...');
        games = await generateGamesHybrid(customPrompt, req.sessionId);
    }
    console.log('✅ SERVER: generateGames completed successfully');
    console.log('🔍 SERVER: Generated games count:', games?.length);
    
    // Save generated games to Redis - replaces any existing custom games
    await saveCustomGames(games);
    
    console.log(`✅ Generated ${games.length} fresh games for session ${req.sessionId}`);
    
    // Clear active generation lock
    activeGenerations.delete(req.sessionId);
    
    // Check if this is an AJAX request
    const isAjaxRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
    
    console.log('X-Requested-With:', req.headers['x-requested-with']);
    console.log('Is AJAX:', isAjaxRequest);
    
    if (isAjaxRequest) {
      // Return JSON for localStorage storage (AJAX request)
      console.log('Returning JSON response');
      res.json({
        success: true,
        games: games,
        message: 'Games generated successfully',
        prompt: customPrompt || 'Generate 100 slot games'
      });
    } else {
      // Traditional form submission - redirect with success message
      console.log('Redirecting to home page');
      const encodedMessage = encodeURIComponent('Games generated successfully');
      const encodedPrompt = encodeURIComponent(customPrompt || 'Generate 100 slot games');
      res.redirect(`/?success=${encodedMessage}&prompt=${encodedPrompt}`);
    }
  } catch (error) {
    console.error('❌ SERVER: Generation failed with error:', error);
    console.error('❌ SERVER: Error name:', error.name);
    console.error('❌ SERVER: Error message:', error.message);
    console.error('❌ SERVER: Error stack:', error.stack);
    
    // Clear active generation lock on error
    activeGenerations.delete(req.sessionId);
    console.log('🔧 SERVER: Cleared active generation lock for session:', req.sessionId);
    
    // Check if this is an AJAX request for error handling too
    const isAjaxRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
    console.log('🔍 SERVER: Is AJAX request:', isAjaxRequest);
    
    if (isAjaxRequest) {
      // Return JSON error for AJAX request
      console.log('📤 SERVER: Returning JSON error response for AJAX');
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate games"
      });
    } else {
      // Traditional error page for non-AJAX requests
      console.log('📤 SERVER: Returning error page for traditional request');
      const games = await loadGames(req.sessionId);
      const settings = loadSettings();
      console.log('🔍 SERVER: Loaded games count for error page:', games?.length);
      console.log('🔍 SERVER: Loaded settings for error page:', settings);

      res.render("index", {
        games,
        settings,
        message: {
          type: "error",
          text: error.message || "Failed to generate games",
        },
        playerContext: req.playerContext,
        crossSell: null,
        sessionId: req.sessionId,
        tokenUsage,
        customPrompt: req.body?.customPrompt || 'Generate 100 slot games'
      });
    }
  }
});


// Redis connection test endpoint
app.get("/api/debug-redis", async (req, res) => {
  const debug = {
    redisExists: !!redis,
    envVars: {
      kvRestUrl: !!process.env.KV_REST_API_URL,
      kvRestToken: !!process.env.KV_REST_API_TOKEN,
      redisUrl: !!process.env.REDIS_URL
    },
    timestamp: new Date().toISOString()
  };
  
  if (redis) {
    try {
      await redis.set('test:ping', 'pong');
      const result = await redis.get('test:ping');
      debug.redisTest = result === 'pong' ? 'SUCCESS' : `FAILED: got ${result}`;
      await redis.del('test:ping');
    } catch (error) {
      debug.redisTest = `ERROR: ${error.message}`;
    }
  } else {
    debug.redisTest = 'REDIS_CLIENT_NOT_AVAILABLE';
  }
  
  res.json(debug);
});

// View Redis database contents (for debugging)
app.get("/api/view-redis", async (req, res) => {
  if (!redis) {
    return res.json({ error: 'Redis client not available' });
  }

  try {
    const data = {};
    
    // Check for custom games
    const customGames = await redis.get('custom:games');
    data.customGames = {
      exists: !!customGames,
      count: customGames ? customGames.length : 0,
      sample: customGames ? customGames.slice(0, 2) : null
    };
    
    // Check for any test keys
    const testPing = await redis.get('test:ping');
    data.testKeys = { 'test:ping': testPing };
    
    data.timestamp = new Date().toISOString();
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate session games are available
app.post("/api/validate-session-games", async (req, res) => {
  try {
    const { gameIds } = req.body;
    const sessionId = req.sessionId;
    
    const customGames = await loadGames();
    const hasCustom = await hasCustomGames();
    
    const validation = {
      hasCustomGames: hasCustom,
      customGameCount: customGames.length,
      missingGameIds: []
    };
    
    if (gameIds && Array.isArray(gameIds)) {
      validation.missingGameIds = gameIds.filter(id => !customGames.find(g => g.id === id));
    }
    
    console.log(`🔍 Custom games validation: ${validation.customGameCount} games, missing: ${validation.missingGameIds.length}`);
    
    res.json(validation);
  } catch (error) {
    console.error('❌ Failed to validate session games:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// Get recommendations
app.post("/recommend", async (req, res) => {
  try {
    console.log('\n🔥 ===== NEW RECOMMENDATION REQUEST ===== 🔥');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('🎮 Session ID:', req.sessionId);
    console.log('📍 Request from IP:', req.ip);
    console.log('🖥️  User-Agent:', req.get('User-Agent'));
    console.log('🌍 Host:', req.get('host'));
    console.log('🔧 Node.js Version:', process.version);
    console.log('📦 Environment:', process.env.NODE_ENV || 'development');
    console.log('🚀 Deployment Check: This should show recent fixes if deployed correctly');
    
    const { gameId, theme, volatility, studio, mechanics, rtp, maxWin, features, pace, bonusFrequency, recommendationEngine, hitFrequency, artStyle, audioVibe, visualDensity, reelLayout } = req.body;
    
    console.log('\n📋 RAW FORM DATA RECEIVED:');
    console.log('🎯 Game ID:', gameId);
    console.log('🏷️  Recommendation Engine:', recommendationEngine);
    console.log('📊 Raw Form Values:');
    console.log('   • theme:', theme, '(type:', typeof theme, ')');
    console.log('   • volatility:', volatility, '(type:', typeof volatility, ')');
    console.log('   • studio:', studio, '(type:', typeof studio, ')');
    console.log('   • mechanics:', mechanics, '(type:', typeof mechanics, ')');
    console.log('   • rtp:', rtp, '(type:', typeof rtp, ')');
    console.log('   • maxWin:', maxWin, '(type:', typeof maxWin, ')');
    console.log('   • features:', features, '(type:', typeof features, ')');
    console.log('   • pace:', pace, '(type:', typeof pace, ')');
    console.log('   • bonusFrequency:', bonusFrequency, '(type:', typeof bonusFrequency, ')');
    console.log('   • hitFrequency:', hitFrequency, '(type:', typeof hitFrequency, ')');
    console.log('   • artStyle:', artStyle, '(type:', typeof artStyle, ')');
    console.log('   • audioVibe:', audioVibe, '(type:', typeof audioVibe, ')');
    console.log('   • visualDensity:', visualDensity, '(type:', typeof visualDensity, ')');
    console.log('   • reelLayout:', reelLayout, '(type:', typeof reelLayout, ')');

    if (!gameId) {
      console.log('❌ ERROR: No game ID provided, returning to index');
      const games = await loadGames();
      const settings = loadSettings();
      return res.render("index", {
        games,
        settings,
        message: {
          type: "error",
          text: "Please select a game to get recommendations",
        },
        playerContext: req.playerContext,
        crossSell: null,
        sessionId: req.sessionId,
        tokenUsage,
        customPrompt: 'Generate 100 slot games'
      });
    }
    
    console.log('\n🔧 WEIGHT PARSING PROCESS:');
    console.log('📏 Converting form values to numeric weights...');

    // Parse weights from form - preserve user's 0% settings
    const weights = {
      theme: theme !== undefined ? parseFloat(theme) : 0.31,
      volatility: volatility !== undefined ? parseFloat(volatility) : 0.23,
      studio: studio !== undefined ? parseFloat(studio) : 0.15,
      mechanics: mechanics !== undefined ? parseFloat(mechanics) : 0.08,
      rtp: rtp !== undefined ? parseFloat(rtp) : 0.04,
      maxWin: maxWin !== undefined ? parseFloat(maxWin) : 0.04,
      features: features !== undefined ? parseFloat(features) : 0.04,
      pace: pace !== undefined ? parseFloat(pace) : 0.03,
      bonusFrequency: bonusFrequency !== undefined ? parseFloat(bonusFrequency) : 0.02,
      hitFrequency: hitFrequency !== undefined ? parseFloat(hitFrequency) : 0.02,
      artStyle: artStyle !== undefined ? parseFloat(artStyle) : 0.02,
      audioVibe: audioVibe !== undefined ? parseFloat(audioVibe) : 0.01,
      visualDensity: visualDensity !== undefined ? parseFloat(visualDensity) : 0.005,
      reelLayout: reelLayout !== undefined ? parseFloat(reelLayout) : 0.005
    };
    
    console.log('\n✅ FINAL PARSED WEIGHTS:');
    Object.entries(weights).forEach(([key, value]) => {
      const percentage = Math.round(value * 100);
      const isZero = value === 0;
      const isMax = value === 1;
      const status = isZero ? '🔇 DISABLED' : isMax ? '🔥 MAX' : '✓';
      console.log(`   ${status} ${key}: ${value.toFixed(3)} (${percentage}%)`);
    });
    
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    console.log(`📊 Total weight sum: ${totalWeight.toFixed(3)} (${Math.round(totalWeight * 100)}%)`);
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.log('⚠️  WARNING: Weights do not sum to 100%, normalization may be required');
    }

    // Save user preferences
    console.log('\n💾 SAVING USER PREFERENCES...');
    saveSettings(weights);
    console.log('✅ User weights saved to disk/storage');

    // Load games from Redis or defaults
    console.log('\n📚 LOADING GAMES DATABASE...');
    const games = await loadGames();
    console.log(`✅ Loaded ${games.length} total games for analysis`);
    
    // Find and log selected game details
    const selectedGame = games.find(g => g.id === gameId);
    if (selectedGame) {
      console.log('\n🎯 SELECTED GAME DETAILS:');
      console.log(`   🏷️  Title: "${selectedGame.title}"`);
      console.log(`   🎨 Theme: ${selectedGame.theme?.join(', ')}`);
      console.log(`   🎲 Volatility: ${selectedGame.volatility}`);
      console.log(`   🏢 Studio: ${selectedGame.studio}`);
      console.log(`   💰 RTP: ${selectedGame.rtp}%`);
      console.log(`   🎊 Bonus Frequency: ${selectedGame.bonusFrequency}%`);
      console.log(`   ⚡ Pace: ${selectedGame.pace}`);
    } else {
      console.log(`❌ ERROR: Selected game ${gameId} not found in games database`);
    }

    // Get recommendations with player context and engine mode
    console.log('\n🚀 STARTING RECOMMENDATION ENGINE...');
    console.log(`🏷️  Engine Type: ${recommendationEngine?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`⚙️  Mode: ${recommendationEngine === 'llm' ? 'AI Semantic Analysis' : 'Mathematical Algorithm'}`);
    console.log(`🔍 Target: Find 5 similar games to "${selectedGame?.title}"`);
    console.log(`🎯 Context: Session ${req.sessionId}`);
    
    const startTime = Date.now();
    const recommendations = await getRecommendations(gameId, weights, 5, games, req.playerContext, recommendationEngine);
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`⏱️  Processing completed in ${processingTime}ms (${(processingTime/1000).toFixed(2)}s)`);
    console.log(`📊 Recommendations returned: ${recommendations?.length || 0}`);
    
    if (recommendations && recommendations.length > 0) {
      console.log('\n🎯 RECOMMENDATION RESULTS SUMMARY:');
      recommendations.forEach((rec, i) => {
        const similarity = Math.round((rec.similarity || 0) * 100);
        console.log(`   ${i+1}. "${rec.game?.title}" - ${similarity}% similarity`);
        if (rec.confidence) {
          console.log(`      🎯 Confidence: ${Math.round(rec.confidence * 100)}%`);
        }
        if (rec.analysis) {
          console.log(`      📝 Analysis: ${rec.analysis.substring(0, 100)}...`);
        }
      });
    }

    // Check selectedGame again after processing (should already exist from earlier)
    if (!selectedGame) {
      console.log(`❌ Game ${gameId} not found in ${games.length} games`);
      console.log('Available game IDs:', games.map(g => g.id).slice(0, 10));
      return res.render("index", {
        games,
        settings: loadSettings(),
        message: {
          type: "error",
          text: "Selected game not found. Please refresh and try again.",
        },
        playerContext: req.playerContext,
        crossSell: null,
        sessionId: req.sessionId,
        tokenUsage,
        customPrompt: 'Generate 100 slot games'
      });
    }

    // Smart weight-aware explanations based on user preferences
    function generateSmartExplanation(selectedGame, recommendedGame, weights) {
      console.log('\n🔍 SMART EXPLANATION GENERATION DETAILED LOG:');
      console.log(`📊 Selected Game: "${selectedGame.title}" (${selectedGame.theme?.join('/')} themes, ${selectedGame.volatility} volatility)`);
      console.log(`📊 Recommended Game: "${recommendedGame.title}" (${recommendedGame.theme?.join('/')} themes, ${recommendedGame.volatility} volatility)`);
      console.log(`📊 User Weights:`, JSON.stringify(weights, null, 2));
      
      const dominantFactors = [];
      const explanationParts = [];
      
      // DETAILED WEIGHT ANALYSIS
      console.log('\n🎚️ WEIGHT ANALYSIS:');
      const weightEntries = Object.entries(weights).map(([key, value]) => ({ key, value, percentage: Math.round(value * 100) }));
      const sortedWeights = weightEntries.sort((a, b) => b.value - a.value);
      
      // Find dynamic thresholds
      const maxWeight = sortedWeights[0].value;
      const secondHighest = sortedWeights[1].value;
      const dynamicThreshold = Math.max(maxWeight * 0.8, 0.15); // At least 15% or 80% of max
      
      console.log(`   Max weight: ${maxWeight.toFixed(4)} (${Math.round(maxWeight * 100)}%)`);
      console.log(`   Dynamic threshold: ${dynamicThreshold.toFixed(4)} (${Math.round(dynamicThreshold * 100)}%)`);
      
      sortedWeights.forEach(({ key, value, percentage }) => {
        const isDominant = value >= dynamicThreshold;
        const isSignificant = value >= 0.1;
        const status = isDominant ? '🔥 PRIMARY' : isSignificant ? '✅ SECONDARY' : '🔇 LOW';
        console.log(`   ${status} ${key}: ${value.toFixed(4)} (${percentage}%)`);
      });
      
      // Identify primary factors using dynamic threshold
      console.log('\n🎯 CHECKING PRIMARY FACTORS (dynamic threshold):');
      if (weights.bonusFrequency >= dynamicThreshold) {
        console.log('   🎲 BONUS FREQUENCY is primary factor');
        dominantFactors.push('bonusFrequency');
        const bonusMatch = selectedGame.bonusFrequency && recommendedGame.bonusFrequency && 
          Math.abs(selectedGame.bonusFrequency - recommendedGame.bonusFrequency) < 0.2;
        console.log(`      Selected bonus: ${selectedGame.bonusFrequency?.toFixed(2)}%, Recommended bonus: ${recommendedGame.bonusFrequency?.toFixed(2)}%`);
        console.log(`      Difference: ${Math.abs((selectedGame.bonusFrequency || 0) - (recommendedGame.bonusFrequency || 0)).toFixed(2)}%, Match: ${bonusMatch}`);
        
        const bonusExplanation = bonusMatch ? 
          `Perfect bonus frequency match at ${recommendedGame.bonusFrequency?.toFixed(1) || 'N/A'}%, identical to ${selectedGame.title}'s bonus trigger rate.` :
          `Similar bonus frequency pattern (${recommendedGame.bonusFrequency?.toFixed(1) || 'N/A'}% vs ${selectedGame.bonusFrequency?.toFixed(1) || 'N/A'}%) providing comparable bonus anticipation.`;
        explanationParts.push(bonusExplanation);
        console.log(`      Generated explanation: "${bonusExplanation}"`);
      }
      
      if (weights.theme >= dynamicThreshold && selectedGame.theme && recommendedGame.theme) {
        console.log('   🎨 THEME is primary factor');
        dominantFactors.push('theme');
        const sharedThemes = selectedGame.theme.filter(t => recommendedGame.theme.includes(t));
        console.log(`      Selected themes: [${selectedGame.theme.join(', ')}]`);
        console.log(`      Recommended themes: [${recommendedGame.theme.join(', ')}]`);
        console.log(`      Shared themes: [${sharedThemes.join(', ')}] (${sharedThemes.length} matches)`);
        
        const themeExplanation = sharedThemes.length > 0 ?
          `Perfect thematic match with shared ${sharedThemes.join(' and ')} themes.` :
          `Complementary ${recommendedGame.theme.join('/')} theme offering similar atmospheric appeal.`;
        explanationParts.push(themeExplanation);
        console.log(`      Generated explanation: "${themeExplanation}"`);
      }
      
      if (weights.volatility >= dynamicThreshold) {
        console.log('   ⚡ VOLATILITY is primary factor');
        dominantFactors.push('volatility');
        const volatilityMatch = selectedGame.volatility === recommendedGame.volatility;
        console.log(`      Selected volatility: ${selectedGame.volatility}, Recommended volatility: ${recommendedGame.volatility}`);
        console.log(`      Exact match: ${volatilityMatch}`);
        
        const volatilityExplanation = volatilityMatch ?
          `Identical ${recommendedGame.volatility} volatility level matching your risk preference perfectly.` :
          `${recommendedGame.volatility} volatility providing similar payout patterns and gaming excitement.`;
        explanationParts.push(volatilityExplanation);
        console.log(`      Generated explanation: "${volatilityExplanation}"`);
      }
      
      if (weights.studio >= dynamicThreshold) {
        console.log('   🏢 STUDIO is primary factor');
        dominantFactors.push('studio');
        const studioMatch = selectedGame.studio === recommendedGame.studio;
        console.log(`      Selected studio: ${selectedGame.studio}, Recommended studio: ${recommendedGame.studio}`);
        console.log(`      Same studio: ${studioMatch}`);
        
        const studioExplanation = studioMatch ?
          `Same studio (${recommendedGame.studio}) ensuring consistent quality and game feel.` :
          `${recommendedGame.studio}'s development style matches the quality you enjoyed in ${selectedGame.title}.`;
        explanationParts.push(studioExplanation);
        console.log(`      Generated explanation: "${studioExplanation}"`);
      }
      
      // Add analysis for other significant factors
      const secondaryFactors = [];
      if (weights.mechanics >= 0.1 && weights.mechanics < dynamicThreshold) {
        if (selectedGame.mechanics && recommendedGame.mechanics) {
          const sharedMechanics = selectedGame.mechanics.filter(m => recommendedGame.mechanics.includes(m));
          if (sharedMechanics.length > 0) {
            secondaryFactors.push(`${sharedMechanics.slice(0,2).join('/')} mechanics`);
          }
        }
      }
      
      if (weights.rtp >= 0.1 && weights.rtp < dynamicThreshold) {
        if (selectedGame.rtp && recommendedGame.rtp && Math.abs(selectedGame.rtp - recommendedGame.rtp) < 1) {
          secondaryFactors.push(`similar ${recommendedGame.rtp}% RTP`);
        }
      }
      
      console.log('\n🎯 FINAL EXPLANATION DECISION:');
      console.log(`   Primary factors found: ${dominantFactors.length} (${dominantFactors.join(', ')})`);
      console.log(`   Secondary factors: ${secondaryFactors.join(', ')}}`);
      console.log(`   Explanation parts generated: ${explanationParts.length}`);
      explanationParts.forEach((part, i) => console.log(`      ${i+1}. "${part}"`));
      
      let finalExplanation;
      
      if (dominantFactors.length > 1) {
        finalExplanation = `Excellent match on your top priorities: ${explanationParts.join(' Additionally, ')}.`;
        console.log(`   ✅ Using MULTI-PRIMARY explanation: "${finalExplanation}"`);
      } else if (dominantFactors.length === 1) {
        finalExplanation = explanationParts[0] || 'Great match based on your preferences.';
        if (secondaryFactors.length > 0) {
          finalExplanation += ` Plus ${secondaryFactors.join(' and ')}.`;
        }
        console.log(`   ✅ Using SINGLE-PRIMARY explanation: "${finalExplanation}"`);
      } else {
        // Enhanced fallback with actual analysis
        const fallbackParts = [];
        
        // Check theme similarity even if not dominant
        if (selectedGame.theme && recommendedGame.theme) {
          const sharedThemes = selectedGame.theme.filter(t => recommendedGame.theme.includes(t));
          if (sharedThemes.length > 0) {
            fallbackParts.push(`${sharedThemes.join('/')} theme similarity`);
          }
        }
        
        // Check volatility match
        if (selectedGame.volatility === recommendedGame.volatility) {
          fallbackParts.push(`matching ${recommendedGame.volatility} volatility`);
        }
        
        // Check studio match
        if (selectedGame.studio === recommendedGame.studio) {
          fallbackParts.push(`same studio (${recommendedGame.studio})`);
        }
        
        if (fallbackParts.length > 0) {
          finalExplanation = `Strong match based on ${fallbackParts.join(' and ')} providing a similar gaming experience.`;
        } else {
          finalExplanation = `Complementary match offering variety while respecting your balanced weight preferences across multiple game factors.`;
        }
        
        console.log(`   ⚠️ Using FALLBACK explanation (no primary factors above threshold ${dynamicThreshold.toFixed(3)}): "${finalExplanation}"`);
        console.log(`   ⚠️ FALLBACK ANALYSIS: theme match=${selectedGame.theme && recommendedGame.theme ? selectedGame.theme.filter(t => recommendedGame.theme.includes(t)).length > 0 : false}, volatility match=${selectedGame.volatility === recommendedGame.volatility}, studio match=${selectedGame.studio === recommendedGame.studio}`);
        console.log(`   ⚠️ All weights were below dynamic threshold of ${Math.round(dynamicThreshold * 100)}%`);
      }
      
      console.log(`\n✅ FINAL SMART EXPLANATION: "${finalExplanation}"`);
      return finalExplanation;
    }

    // Generate explanations based on recommendation engine
    let recommendationsWithExplanations;
    
    if (recommendationEngine === 'llm') {
      // For LLM recommendations, use LLM-generated explanations
      console.log('\n🤖 GENERATING LLM EXPLANATIONS...');
      console.log(`🎯 Using existing recommendation-explanation-prompt.md with dynamic weights`);
      
      try {
        // Ensure we only process top 5 recommendations
        const top5Recommendations = recommendations.slice(0, 5);
        console.log(`🎯 LLM: Processing exactly ${top5Recommendations.length} recommendations`);
        
        // Generate LLM explanations using existing prompt
        const explanations = await generateLLMExplanations(selectedGame, top5Recommendations, weights, req.playerContext);
        
        recommendationsWithExplanations = top5Recommendations.map((rec, index) => {
          return {
            ...rec,
            explanation: explanations[index] || 'Contextually matched based on your preferences.',
            loading: false
          };
        });
        
        console.log(`✅ Generated ${explanations.length} LLM explanations`);
      } catch (error) {
        console.log(`❌ LLM explanation generation failed: ${error.message}`);
        console.log(`🔄 Falling back to smart explanations`);
        
        // Fallback to smart explanations - ensure top 5 only
        const top5Recommendations = recommendations.slice(0, 5);
        console.log(`🔄 FALLBACK: Processing ${top5Recommendations.length} recommendations with smart explanations`);
        
        recommendationsWithExplanations = top5Recommendations.map((rec) => {
          const smartExplanation = generateSmartExplanation(selectedGame, rec.game, weights);
          return {
            ...rec, 
            explanation: smartExplanation,
            loading: false
          };
        });
      }
    } else {
      // For algorithmic recommendations, use smart JavaScript explanations
      console.log('\n⚙️ GENERATING ALGORITHMIC EXPLANATIONS...');
      console.log(`🎯 Using JavaScript-based smart explanation templates`);
      
      recommendationsWithExplanations = recommendations.map((rec) => {
        const smartExplanation = generateSmartExplanation(selectedGame, rec.game, weights);
        return {
          ...rec, 
          explanation: smartExplanation,
          loading: false
        };
      });
      
      console.log(`✅ Generated ${recommendationsWithExplanations.length} algorithmic explanations`);
    }

    // Check if custom games exist for template
    const customGamesExist = await hasCustomGames();
    
    res.render("recommendations", {
      recommendations: recommendationsWithExplanations,
      selectedGame,
      weights,
      playerContext: req.playerContext,
      sessionId: req.sessionId,
      tokenUsage,
      customGamesExist
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Export routes
app.get("/export/json", async (req, res) => {
  try {
    const games = await loadGames(req.sessionId);

    if (games.length === 0) {
      return res.redirect("/?error=No games available for export");
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="default-games.json"');
    res.json(games);
  } catch (error) {
    renderError(res, error);
  }
});

app.get("/export/csv", async (req, res) => {
  try {
    const games = await loadGames(req.sessionId);

    if (games.length === 0) {
      return res.redirect("/?error=No games available for export");
    }

    const csvContent = convertGamesToCSV(games);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="games.csv"');
    res.send(csvContent);
  } catch (error) {
    renderError(res, error);
  }
});

// API endpoint to get token usage
app.get("/api/token-usage", (req, res) => {
  res.json(tokenUsage);
});

// Server-Sent Events endpoint for generation progress
app.get("/api/generation-progress/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Store SSE connection for this session
  if (!global.sseConnections) global.sseConnections = new Map();
  global.sseConnections.set(sessionId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Progress tracking started' })}\n\n`);
  
  // Cleanup on disconnect
  req.on('close', () => {
    global.sseConnections.delete(sessionId);
  });
});

// Helper function to send progress updates
function sendProgressUpdate(sessionId, data) {
  if (global.sseConnections && global.sseConnections.has(sessionId)) {
    const res = global.sseConnections.get(sessionId);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// API endpoint to update client context
app.post("/api/update-context", (req, res) => {
  try {
    const { timezone, systemTheme, userAgent, language } = req.body;
    const sessionId = req.sessionId;
    
    if (sessionId && contextTracker.contexts[sessionId]) {
      // Update existing context
      contextTracker.contexts[sessionId].timezone = timezone || 'unknown';
      contextTracker.contexts[sessionId].systemTheme = systemTheme || 'unknown';
      contextTracker.contexts[sessionId].userAgent = userAgent;
      contextTracker.contexts[sessionId].acceptLanguage = language;
      // Context saved in memory only - session-based for each unique user
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating context:', error);
    res.json({ success: false });
  }
});

// API endpoint to generate all recommendation explanations with unified LLM call
app.post("/api/enhance-explanations", async (req, res) => {
  try {
    const { selectedGameId, recommendations, weights, playerContext } = req.body;
    
    // Load all games for context (using session if available)
    const allGames = await loadGames(req.sessionId);
    const selectedGame = allGames.find(g => g.id === selectedGameId);
    
    if (!selectedGame || !recommendations || !Array.isArray(recommendations)) {
      return res.json({ success: false, error: 'Invalid request data' });
    }

    // Generate all explanations in a single LLM call
    const explanations = await generateAllRecommendationExplanations(
      selectedGame, 
      recommendations, 
      weights, 
      playerContext,
      allGames
    );

    res.json({ 
      success: true, 
      explanations: explanations 
    });

  } catch (error) {
    console.error('Error generating explanations:', error);
    res.json({ success: false, error: 'Server error' });
  }
});

// Reset games API endpoint
app.post("/api/reset-games", async (req, res) => {
  try {
    // Clear custom games from Redis
    const { clearCustomGames } = require("./utils/storage");
    await clearCustomGames();
    
    console.log('✅ Custom games cleared, reset to defaults');
    res.json({ success: true, message: 'Games reset to defaults' });
  } catch (error) {
    console.error('❌ Failed to reset games:', error);
    res.status(500).json({ success: false, error: 'Failed to reset games' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("error", {
    error: `Page not found: ${req.originalUrl}`,
    stack: undefined,
    tokenUsage: tokenUsage || { totalTokens: 0, operationsCount: 0 }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  renderError(res, err);
});

// Make sendProgressUpdate globally available
global.sendProgressUpdate = sendProgressUpdate;

app.listen(PORT, () => {
  console.log(`🎰 Slot Forge running on port ${PORT}`);
  console.log(`📁 Visit http://localhost:${PORT} to start`);
  console.log(
    `🤖 Anthropic API Key: ${
      process.env.ANTHROPIC_API_KEY ? "Configured ✓" : "Missing ✗"
    }`
  );
});
