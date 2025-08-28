require("dotenv").config();
const express = require("express");
const path = require("path");

// Import services
const { loadGames, loadSettings, saveSettings, saveGames, saveSessionGames, hasSessionGames } = require("./utils/storage");
const {
  generateGames,
  generateMockGames,
} = require("./services/gameGenerator");
const { getRecommendations, generateMatchExplanation } = require("./services/similarityEngine");

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
    
    const prompt = `Generate concise recommendation explanations for slot games. Return ONLY a JSON array of explanations.

PLAYER CONTEXT:
- Selected game: "${selectedGame.title}" (${selectedGame.theme.join('/')}, ${selectedGame.volatility} volatility)
- Current time: ${timeContext}
- Player weights: Theme ${Math.round(weights.theme * 100)}%, Volatility ${Math.round(weights.volatility * 100)}%, Studio ${Math.round(weights.studio * 100)}%, Mechanics ${Math.round(weights.mechanics * 100)}%
- Device: ${playerContext?.deviceType || 'unknown'}
${playerContext?.temporal?.sportsSeason?.length ? `- Sports active: ${playerContext.temporal.sportsSeason.map(s => s.sport).join(', ')}` : ''}

PLAYER FOCUS & ATTENTION CONTEXT:
- Focus level: ${playTimeContext.focusLevel || 'unknown'} (${playTimeContext.reasoning || 'standard session'})
- Attention span: ${playTimeContext.attentionSpan || 'medium'}
- Preferred pace: ${playTimeContext.preferredPace || 'medium'} games
- Preferred volatility: ${playTimeContext.preferredVolatility || 'any'}
- Session type: ${playTimeContext.description || 'gaming session'}

FINANCIAL CYCLE CONTEXT:
- Budget phase: ${financialContext.description || 'standard period'}
- Budget pressure: ${financialContext.budgetPressure || 'low'}
- Day ${financialContext.dayOfMonth || '?'} of ${financialContext.totalDaysInMonth || '?'} in month

RECOMMENDED GAMES:
${gamesList}

Return JSON array with explanations (1-2 sentences each, natural language, no percentages):
["explanation for game 1", "explanation for game 2", ...]

IMPORTANT: Tailor recommendations to the player's current focus level, attention span, preferred pace/volatility, and financial cycle. For example:
- Low focus/distracted: Recommend engaging, easy-to-follow games
- Short attention span: Emphasize quick bonus features and fast-paced action
- Tired/late night: Suggest relaxing, low-stress games
- High budget pressure: Focus on entertainment value and lower volatility
- Post-payday comfort: Can suggest higher volatility exciting games
- Lunch break: Emphasize quick, immediately gratifying features

Focus on: contextually appropriate gameplay style, matching attention/focus needs, financial sensitivity, shared themes, volatility alignment.`;

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
app.get("/", (req, res) => {
  try {
    const games = loadGames(req.sessionId); // Load session-specific games if available
    const settings = loadSettings();

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
      customPrompt
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
      const games = loadGames(req.sessionId);
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
    console.log('🔍 SERVER: Calling generateGames...');
    
    const games = await generateGames(customPrompt, req.sessionId);
    console.log('✅ SERVER: generateGames completed successfully');
    console.log('🔍 SERVER: Generated games count:', games?.length);
    
    // Save generated games to SESSION ONLY - NEVER overwrite main games.json file
    saveSessionGames(req.sessionId, games); // Keep session copy for this user
    
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
      const games = loadGames(req.sessionId);
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


// Sync custom games from client to server session
app.post("/api/sync-custom-games", (req, res) => {
  try {
    const { games } = req.body;
    const sessionId = req.sessionId;
    
    if (!games || !Array.isArray(games)) {
      return res.status(400).json({ error: 'Invalid games data' });
    }
    
    // Save to session storage
    saveSessionGames(sessionId, games);
    
    res.json({ success: true, message: `Synced ${games.length} games` });
  } catch (error) {
    console.error('Failed to sync custom games:', error);
    res.status(500).json({ error: 'Failed to sync games' });
  }
});

// Get recommendations
app.post("/recommend", async (req, res) => {
  try {
    const { gameId, theme, volatility, studio, mechanics, sessionId } = req.body;
    
    // Use the session ID from form data if provided (for consistency)
    const effectiveSessionId = sessionId || req.sessionId;
    console.log(`🎯 Recommendation request - Form session: ${sessionId}, Request session: ${req.sessionId}, Using: ${effectiveSessionId}`);

    if (!gameId) {
      const games = loadGames();
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

    // Parse weights from form
    const weights = {
      theme: parseFloat(theme) || 0.4,
      volatility: parseFloat(volatility) || 0.3,
      studio: parseFloat(studio) || 0.2,
      mechanics: parseFloat(mechanics) || 0.1,
    };

    // Save user preferences
    saveSettings(weights);

    // Load games using the effective session ID
    const games = loadGames(effectiveSessionId);
    console.log(`📚 Loaded ${games.length} games for session ${effectiveSessionId}`);
    
    if (games.length === 0) {
      console.log('⚠️ No games found for session, falling back to default games');
      const fallbackGames = loadGames(); // Load default games
      const recommendations = getRecommendations(gameId, weights, 5, fallbackGames);
      const selectedGame = fallbackGames.find((g) => g.id === gameId);
      
      if (!selectedGame) {
        return res.render("index", {
          games: fallbackGames,
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
    }

    // Get recommendations using session-specific games
    const recommendations = getRecommendations(gameId, weights, 5, games);

    // Find selected game for display
    const selectedGame = games.find((g) => g.id === gameId);
    
    if (!selectedGame) {
      console.log(`❌ Game ${gameId} not found in ${games.length} games for session ${effectiveSessionId}`);
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

    // Start with loading state - all explanations will be generated by LLM
    const recommendationsWithExplanations = recommendations.map((rec) => {
      return {
        ...rec, 
        explanation: 'Generating personalized match analysis...',
        loading: true // Flag for frontend to know LLM enhancement is pending
      };
    });

    res.render("recommendations", {
      recommendations: recommendationsWithExplanations,
      selectedGame,
      weights,
      playerContext: req.playerContext,
      sessionId: req.sessionId,
      tokenUsage
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Export routes
app.get("/export/json", (req, res) => {
  try {
    const games = loadGames(req.sessionId);

    if (games.length === 0) {
      return res.redirect("/?error=No games available for export");
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", 'attachment; filename="games.json"');
    res.json(games);
  } catch (error) {
    renderError(res, error);
  }
});

app.get("/export/csv", (req, res) => {
  try {
    const games = loadGames(req.sessionId);

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
    const allGames = loadGames(req.sessionId);
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
