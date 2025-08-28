const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');
const DEFAULT_GAMES_FILE = path.join(__dirname, '..', 'data', 'default-games.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'user-settings.json');

// In-memory session storage for temporary games
const sessionGames = new Map();

// Default weight configuration
const DEFAULT_WEIGHTS = {
  theme: 0.4,
  volatility: 0.3,
  studio: 0.2,
  mechanics: 0.1
};

function saveGames(games) {
  try {
    const dataDir = path.dirname(GAMES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
  } catch (error) {
    console.error('Failed to save games:', error);
    throw new Error('Unable to save games data');
  }
}

function loadGames(sessionId = null) {
  try {
    // If sessionId provided and has session games, return those
    if (sessionId && sessionGames.has(sessionId)) {
      return sessionGames.get(sessionId);
    }

    // Try to load default games first
    if (fs.existsSync(DEFAULT_GAMES_FILE)) {
      const data = fs.readFileSync(DEFAULT_GAMES_FILE, 'utf8');
      return JSON.parse(data);
    }

    // Fallback to current games.json
    if (fs.existsSync(GAMES_FILE)) {
      const data = fs.readFileSync(GAMES_FILE, 'utf8');
      return JSON.parse(data);
    }

    return [];
  } catch (error) {
    console.error('Failed to load games:', error);
    return [];
  }
}

function saveSettings(settings) {
  try {
    const dataDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Unable to save user settings');
  }
}

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return DEFAULT_WEIGHTS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_WEIGHTS;
  }
}

// Session-based game storage functions
function saveSessionGames(sessionId, games) {
  sessionGames.set(sessionId, games);
  console.log(`Saved ${games.length} games for session: ${sessionId}`);
}

function clearSessionGames(sessionId) {
  sessionGames.delete(sessionId);
  console.log(`Cleared session games for: ${sessionId}`);
}

function hasSessionGames(sessionId) {
  return sessionGames.has(sessionId);
}

module.exports = {
  saveGames,
  loadGames,
  saveSettings,
  loadSettings,
  saveSessionGames,
  clearSessionGames,
  hasSessionGames,
  DEFAULT_WEIGHTS
};