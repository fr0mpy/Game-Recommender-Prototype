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

    const prompt = `Generate concise recommendation explanations for slot games. Return ONLY a JSON array of explanations.

PLAYER CONTEXT:
- Selected game: "${selectedGame.title}" (${selectedGame.theme.join('/')}, ${selectedGame.volatility} volatility)
- Current time: ${timeContext}
- Player weights: Theme ${Math.round(weights.theme * 100)}%, Volatility ${Math.round(weights.volatility * 100)}%, Studio ${Math.round(weights.studio * 100)}%, Mechanics ${Math.round(weights.mechanics * 100)}%
- Device: ${playerContext?.deviceType || 'unknown'}
${playerContext?.temporal?.sportsSeason?.length ? `- Sports active: ${playerContext.temporal.sportsSeason.map(s => s.sport).join(', ')}` : ''}

RECOMMENDED GAMES:
${gamesList}

Return JSON array with explanations (1-2 sentences each, natural language, no percentages):
["explanation for game 1", "explanation for game 2", ...]

Focus on: time-appropriate gameplay, shared themes, volatility matching, bonus features, visual appeal.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
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
    tokenUsage
  });
}

// Routes

// Home page (with message handling)
app.get("/", (req, res) => {
  try {
    const games = loadGames(); // Always load from main file so fresh games appear in dropdown
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

    res.render("index", {
      games,
      settings,
      message,
      playerContext: req.playerContext,
      crossSell,
      sessionId: req.sessionId,
      tokenUsage
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Generate games via LLM
app.post("/generate", async (req, res) => {
  try {
    const customPrompt = req.body.customPrompt;
    const games = await generateGames(customPrompt);
    
    // Save generated games to both main file AND session
    saveGames(games); // Updates main games.json file for dropdown
    saveSessionGames(req.sessionId, games); // Keep session copy for this user
    
    console.log(`✅ Updated main games file with ${games.length} fresh games`);
    
    res.redirect("/?success=Games generated successfully");
  } catch (error) {
    const games = loadGames(req.sessionId);
    const settings = loadSettings();

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
      tokenUsage
    });
  }
});


// Get recommendations
app.post("/recommend", async (req, res) => {
  try {
    const { gameId, theme, volatility, studio, mechanics } = req.body;

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

    // Load games first
    const games = loadGames(req.sessionId);

    // Get recommendations using session-specific games
    const recommendations = getRecommendations(gameId, weights, 5, games);

    // Find selected game for display
    const selectedGame = games.find((g) => g.id === gameId);

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
      contextTracker.saveContexts();
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
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  renderError(res, err);
});

app.listen(PORT, () => {
  console.log(`🎰 Slot Forge running on port ${PORT}`);
  console.log(`📁 Visit http://localhost:${PORT} to start`);
  console.log(
    `🤖 Anthropic API Key: ${
      process.env.ANTHROPIC_API_KEY ? "Configured ✓" : "Missing ✗"
    }`
  );
});
