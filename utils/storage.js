const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'user-settings.json');
const TEMP_GAMES_DIR = path.join(__dirname, '..', 'data', 'temp-sessions');

// In-memory session storage for temporary games
const sessionGames = new Map();

// Temporary file storage with cleanup mechanism
const sessionCleanupTimers = new Map();
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes

// Ensure temp directory exists
function ensureTempDir() {
  try {
    if (!fs.existsSync(TEMP_GAMES_DIR)) {
      fs.mkdirSync(TEMP_GAMES_DIR, { recursive: true });
    }
  } catch (error) {
    console.log('Could not create temp directory (serverless limitation):', error.message);
  }
}

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
    // If sessionId provided, try multiple sources in priority order
    if (sessionId) {
      // 1. Check in-memory first (fastest)
      if (sessionGames.has(sessionId)) {
        console.log(`✅ Loaded ${sessionGames.get(sessionId).length} games from memory for session: ${sessionId}`);
        return sessionGames.get(sessionId);
      }
      
      // 2. Try loading from temporary file (persistence across cold starts)
      const tempSessionFile = path.join(TEMP_GAMES_DIR, `${sessionId}.json`);
      if (fs.existsSync(tempSessionFile)) {
        const tempData = fs.readFileSync(tempSessionFile, 'utf8');
        const tempGames = JSON.parse(tempData);
        
        // Restore to memory for fast access
        sessionGames.set(sessionId, tempGames);
        resetSessionTimeout(sessionId); // Reset cleanup timer
        
        console.log(`✅ Restored ${tempGames.length} games from temp file for session: ${sessionId}`);
        return tempGames;
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

// Session-based game storage functions with dual persistence
function saveSessionGames(sessionId, games) {
  // 1. Store in memory (fast access)
  sessionGames.set(sessionId, games);
  
  // 2. Store in temporary file (survives cold starts)
  try {
    ensureTempDir();
    const tempSessionFile = path.join(TEMP_GAMES_DIR, `${sessionId}.json`);
    fs.writeFileSync(tempSessionFile, JSON.stringify(games, null, 2));
    
    // Set cleanup timer (10 minutes)
    resetSessionTimeout(sessionId);
    
    console.log(`✅ Saved ${games.length} games for session: ${sessionId} (memory + temp file)`);
  } catch (error) {
    console.log(`⚠️ Could not save temp file (serverless limitation), using memory only: ${error.message}`);
  }
}

function clearSessionGames(sessionId) {
  // Clear from memory
  sessionGames.delete(sessionId);
  
  // Clear temp file
  try {
    const tempSessionFile = path.join(TEMP_GAMES_DIR, `${sessionId}.json`);
    if (fs.existsSync(tempSessionFile)) {
      fs.unlinkSync(tempSessionFile);
    }
  } catch (error) {
    console.log(`Could not delete temp file: ${error.message}`);
  }
  
  // Clear cleanup timer
  if (sessionCleanupTimers.has(sessionId)) {
    clearTimeout(sessionCleanupTimers.get(sessionId));
    sessionCleanupTimers.delete(sessionId);
  }
  
  console.log(`✅ Cleared session games and temp file for: ${sessionId}`);
}

function hasSessionGames(sessionId) {
  // Check memory first
  if (sessionGames.has(sessionId)) {
    return true;
  }
  
  // Check temp file exists
  try {
    const tempSessionFile = path.join(TEMP_GAMES_DIR, `${sessionId}.json`);
    return fs.existsSync(tempSessionFile);
  } catch (error) {
    return false;
  }
}

// Reset session timeout (10 minutes from now)
function resetSessionTimeout(sessionId) {
  // Clear existing timer
  if (sessionCleanupTimers.has(sessionId)) {
    clearTimeout(sessionCleanupTimers.get(sessionId));
  }
  
  // Set new cleanup timer
  const timer = setTimeout(() => {
    console.log(`🕒 Session timeout: cleaning up ${sessionId}`);
    clearSessionGames(sessionId);
  }, SESSION_TIMEOUT);
  
  sessionCleanupTimers.set(sessionId, timer);
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