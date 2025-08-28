const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'user-settings.json');

// Import database service for session storage
const db = require('../services/database');

// Fallback in-memory storage if database unavailable
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
    // Detect serverless environment (read-only filesystem)
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      // In serverless environments, we can't write to filesystem
      // Store in session memory instead
      console.log(`⚠️ Serverless environment detected - storing ${games.length} games in memory only`);
      return;
    }
    
    const dataDir = path.dirname(GAMES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Save to games file
    fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
    
    console.log(`✅ Saved ${games.length} games to games.json`);
  } catch (error) {
    console.error('Failed to save games (will use memory storage):', error);
    // Don't throw error in serverless - just log and continue
  }
}

function loadGames(sessionId = null) {
  try {
    // If sessionId provided, try database first, then memory fallback
    if (sessionId) {
      // 1. Try loading from database (persistent across cold starts)
      const dbGames = db.loadSessionGames(sessionId);
      if (dbGames.length > 0) {
        // Cache in memory for faster subsequent access
        sessionGames.set(sessionId, dbGames);
        return dbGames;
      }
      
      // 2. Fallback: Check in-memory (if database unavailable)
      if (sessionGames.has(sessionId)) {
        console.log(`✅ Loaded ${sessionGames.get(sessionId).length} games from memory fallback for session: ${sessionId}`);
        return sessionGames.get(sessionId);
      }
      
      console.log(`⚠️ No session games found for: ${sessionId}, falling back to defaults`);
    }

    // Load from default games.json
    if (fs.existsSync(GAMES_FILE)) {
      const data = fs.readFileSync(GAMES_FILE, 'utf8');
      return JSON.parse(data);
    }

    // Return generic default games if no file exists
    return getDefaultGames();
  } catch (error) {
    console.error('Failed to load games:', error);
    return getDefaultGames();
  }
}

// Generic default games for initial load
function getDefaultGames() {
  return [
    {
      id: 'default-001',
      title: 'Dragon\'s Fortune',
      studio: 'Mythic Gaming',
      theme: ['Fantasy', 'Dragons'],
      volatility: 'high',
      rtp: 96.5,
      maxWin: 10000,
      reelLayout: '5x3',
      paylines: 25,
      mechanics: ['Wild', 'Scatter', 'Free Spins'],
      features: ['Multiplier', 'Bonus Round'],
      pace: 'medium',
      hitFrequency: 22.1,
      bonusFrequency: 8.3,
      artStyle: 'Detailed 3D',
      audioVibe: 'Epic Fantasy',
      visualDensity: 'standard',
      mobileOptimized: true,
      releaseYear: 2024,
      description: 'Epic dragon-themed slot with cascading wins and fire-breathing bonus features.'
    },
    {
      id: 'default-002',
      title: 'Wild West Gold Rush',
      studio: 'Frontier Studios',
      theme: ['Western', 'Gold Mining'],
      volatility: 'medium',
      rtp: 95.8,
      maxWin: 7500,
      reelLayout: '5x4',
      paylines: 40,
      mechanics: ['Wild', 'Expanding Reels'],
      features: ['Pick Bonus', 'Progressive'],
      pace: 'fast',
      hitFrequency: 28.7,
      bonusFrequency: 12.1,
      artStyle: 'Cartoon',
      audioVibe: 'Country Western',
      visualDensity: 'busy',
      mobileOptimized: true,
      releaseYear: 2024,
      description: 'Strike it rich in the Old West with expanding reels and gold rush bonuses.'
    }
  ];
}

function saveSettings(settings) {
  try {
    // Skip file writes in serverless/production environments
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      console.log('⚠️ Serverless environment detected - skipping settings file write');
      console.log('💾 User settings received but not persisted (serverless limitation):', settings);
      return; // Gracefully skip file write in serverless
    }
    
    const dataDir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log('✅ Settings saved successfully to disk');
  } catch (error) {
    console.error('Failed to save settings:', error);
    
    // For serverless read-only filesystem errors, fail gracefully
    if (error.code === 'EROFS' || error.code === 'EACCES') {
      console.log('⚠️ Read-only filesystem detected - settings not persisted but request continues');
      return; // Don't throw error, just continue
    }
    
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

// Session-based game storage functions with database persistence
function saveSessionGames(sessionId, games) {
  // 1. Store in database (persistent across cold starts)
  const dbSaved = db.saveSessionGames(sessionId, games);
  
  // 2. Also store in memory for fast access
  sessionGames.set(sessionId, games);
  
  if (dbSaved) {
    console.log(`✅ Saved ${games.length} games for session: ${sessionId} (database + memory)`);
  } else {
    console.log(`⚠️ Database save failed, using memory only for session: ${sessionId}`);
  }
}

function clearSessionGames(sessionId) {
  // Clear from database
  const dbCleared = db.clearSessionGames(sessionId);
  
  // Clear from memory
  sessionGames.delete(sessionId);
  
  if (dbCleared) {
    console.log(`✅ Cleared session games from database and memory for: ${sessionId}`);
  } else {
    console.log(`⚠️ Database clear failed, cleared memory only for: ${sessionId}`);
  }
}

function hasSessionGames(sessionId) {
  // Check database first (most reliable)
  if (db.hasSessionGames(sessionId)) {
    return true;
  }
  
  // Fallback: Check memory
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