const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'user-settings.json');

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

function loadGames() {
  try {
    if (!fs.existsSync(GAMES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(GAMES_FILE, 'utf8');
    return JSON.parse(data);
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

module.exports = {
  saveGames,
  loadGames,
  saveSettings,
  loadSettings,
  DEFAULT_WEIGHTS
};