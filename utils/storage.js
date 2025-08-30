const fs = require('fs');
const path = require('path');

const GAMES_FILE = path.join(__dirname, '..', 'data', 'games.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'user-settings.json');

// Vercel KV for serverless-compatible session storage
let redis = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    console.log('✅ Upstash Redis connected');
  }
} catch (error) {
  console.log('⚠️ Upstash Redis not available:', error.message);
}

// Note: Session-based storage removed in favor of Redis global storage

// Note: Custom games directory approach removed due to Vercel "no fs" constraint
// Keeping function for backwards compatibility but returns false
function ensureCustomGamesDir() {
  console.log('⚠️ Custom games directory creation disabled (Vercel no-fs constraint)');
  return false;
}

// Default weight configuration - normalized to 100%
const DEFAULT_WEIGHTS = {
  theme: 0.31,           // ~31%
  volatility: 0.23,      // ~23%
  studio: 0.15,          // ~15%
  mechanics: 0.08,       // ~8%
  rtp: 0.04,             // ~4%
  maxWin: 0.04,          // ~4%
  features: 0.04,        // ~4%
  pace: 0.03,            // ~3%
  bonusFrequency: 0.02,  // ~2%
  hitFrequency: 0.02,    // ~2%
  artStyle: 0.02,        // ~2%
  audioVibe: 0.01,       // ~1%
  visualDensity: 0.005,  // ~0.5%
  reelLayout: 0.005      // ~0.5%
  // Total: 100%
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

async function loadGames(sessionId = null) {
  try {
    // 1. Try Redis first for custom games (global storage)
    if (redis) {
      try {
        const customGames = await redis.get('custom:games');
        if (customGames && Array.isArray(customGames)) {
          console.log(`✅ Loaded ${customGames.length} custom games from Redis`);
          console.log(`🔍 Redis loaded - first game ID: ${customGames[0]?.id}, has ID: ${!!customGames[0]?.id}`);
          console.log(`🔍 Redis loaded - first game title: ${customGames[0]?.title}`);
          return customGames;
        }
      } catch (redisError) {
        console.log(`⚠️ Redis error: ${redisError.message}, falling back to defaults`);
      }
    }

    // 2. Fall back to default games.json
    if (fs.existsSync(GAMES_FILE)) {
      const data = fs.readFileSync(GAMES_FILE, 'utf8');
      const games = JSON.parse(data);
      console.log(`✅ Loaded ${games.length} default games from games.json`);
      return games;
    }

    // 3. Return generic default games if no file exists
    console.log(`⚠️ Using built-in default games`);
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

// Simple Redis storage for custom games
async function saveCustomGames(games) {
  // Debug: Check if games have IDs before saving
  console.log(`🔍 Saving ${games.length} custom games - first game ID: ${games[0]?.id}, has ID: ${!!games[0]?.id}`);
  console.log(`🔍 All games have IDs: ${games.every(g => !!g.id)}`);
  
  // Store in Redis with no expiration (persistent custom games)
  if (redis) {
    try {
      await redis.set('custom:games', games);
      console.log(`✅ Saved ${games.length} custom games to Redis`);
      
      // Immediately verify the save worked
      const verifyGames = await redis.get('custom:games');
      if (verifyGames && Array.isArray(verifyGames)) {
        console.log(`✅ Redis save verification successful: ${verifyGames.length} games retrieved`);
        console.log(`🔍 Redis retrieved - first game ID: ${verifyGames[0]?.id}, has ID: ${!!verifyGames[0]?.id}`);
      } else {
        console.log(`⚠️ Redis save verification failed: ${verifyGames ? typeof verifyGames : 'null'}`);
      }
    } catch (redisError) {
      console.log(`⚠️ Redis storage save error: ${redisError.message}`);
      throw new Error('Failed to save custom games');
    }
  } else {
    console.log(`⚠️ Redis not available - cannot save custom games`);
    throw new Error('Redis storage not available');
  }
  
  console.log(`✅ Custom games saved successfully to Redis`);
}

async function clearCustomGames() {
  // Clear custom games from Redis
  if (redis) {
    try {
      await redis.del('custom:games');
      console.log(`✅ Cleared custom games from Redis`);
    } catch (redisError) {
      console.log(`⚠️ Redis clear error: ${redisError.message}`);
      throw new Error('Failed to clear custom games');
    }
  } else {
    console.log(`⚠️ Redis not available - cannot clear custom games`);
    throw new Error('Redis storage not available');
  }
}

async function hasCustomGames() {
  // Check if custom games exist in Redis
  if (redis) {
    try {
      const customGames = await redis.get('custom:games');
      const hasGames = customGames && Array.isArray(customGames) && customGames.length > 0;
      console.log(`🔍 Redis custom games check: ${hasGames}, count: ${customGames?.length || 0}`);
      return hasGames;
    } catch (redisError) {
      console.log(`⚠️ Redis check error: ${redisError.message}`);
      return false;
    }
  } else {
    console.log(`⚠️ Redis not available`);
    return false;
  }
}

module.exports = {
  saveGames,
  loadGames,
  saveSettings,
  loadSettings,
  saveCustomGames,
  clearCustomGames,
  hasCustomGames,
  DEFAULT_WEIGHTS,
  redis  // Export Redis client for debugging
};