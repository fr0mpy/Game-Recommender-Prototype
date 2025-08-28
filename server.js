require("dotenv").config();
const express = require("express");
const path = require("path");

// Import services
const { loadGames, loadSettings, saveSettings } = require("./utils/storage");
const {
  generateGames,
  generateMockGames,
} = require("./services/gameGenerator");
const { getRecommendations, generateMatchExplanation } = require("./services/similarityEngine");
const contextTracker = require("./services/contextTracker");
const { convertGamesToCSV } = require("./services/csvConverter");

const app = express();
const PORT = process.env.PORT || 3000;

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
  });
}

// Routes

// Home page (with message handling)
app.get("/", (req, res) => {
  try {
    const games = loadGames();
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
      sessionId: req.sessionId
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Generate games via LLM
app.post("/generate", async (req, res) => {
  try {
    const customPrompt = req.body.customPrompt;
    await generateGames(customPrompt);
    res.redirect("/?success=Games generated successfully");
  } catch (error) {
    const games = loadGames();
    const settings = loadSettings();

    res.render("index", {
      games,
      settings,
      message: {
        type: "error",
        text: error.message || "Failed to generate games",
      },
    });
  }
});

// Generate mock games for testing
app.post("/generate-mock", (req, res) => {
  try {
    generateMockGames();
    res.redirect("/?success=Mock games added for testing");
  } catch (error) {
    renderError(res, error);
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

    // Get recommendations
    const recommendations = getRecommendations(gameId, weights, 5);

    // Find selected game for display
    const games = loadGames();
    const selectedGame = games.find((g) => g.id === gameId);

    // Generate explanations with timeout and fallback
    const recommendationsWithExplanations = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Explanation timeout')), 2000)
          );
          
          const explanation = await Promise.race([
            generateMatchExplanation(selectedGame, rec.game, weights, rec.confidence),
            timeoutPromise
          ]);
          
          return { ...rec, explanation };
        } catch (error) {
          console.error('Error generating explanation for game:', rec.game.title, error.message);
          return { ...rec, explanation: `Strong ${Math.round(rec.confidence * 100)}% match with similar gameplay features.` };
        }
      })
    );

    res.render("recommendations", {
      recommendations: recommendationsWithExplanations,
      selectedGame,
      weights,
      playerContext: req.playerContext,
      sessionId: req.sessionId
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Export routes
app.get("/export/json", (req, res) => {
  try {
    const games = loadGames();

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
    const games = loadGames();

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
