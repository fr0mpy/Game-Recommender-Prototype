require("dotenv").config();
const express = require("express");
const path = require("path");

// Import services
const { loadGames, loadSettings, saveSettings } = require("./utils/storage");
const {
  generateGames,
  generateMockGames,
} = require("./services/gameGenerator");
const { getRecommendations } = require("./services/similarityEngine");
const { convertGamesToCSV } = require("./services/csvConverter");

const app = express();
const PORT = process.env.PORT || 3000;

// Express configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

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

    res.render("index", {
      games,
      settings,
      message,
    });
  } catch (error) {
    renderError(res, error);
  }
});

// Generate games via LLM
app.post("/generate", async (req, res) => {
  try {
    await generateGames();
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
app.post("/recommend", (req, res) => {
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

    res.render("recommendations", {
      recommendations,
      selectedGame,
      weights,
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
    `🔑 OpenAI API Key: ${
      process.env.OPENAI_API_KEY ? "Configured ✓" : "Missing ✗"
    }`
  );
});
