const Database = require('better-sqlite3');
const path = require('path');

// Database file location
const DB_PATH = path.join(__dirname, '..', 'data', 'sessions.db');

// Initialize database connection
let db = null;

function initDatabase() {
  try {
    db = new Database(DB_PATH);
    
    // Create sessions table if it doesn't exist
    const createSessionsTable = db.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        games TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
    
    createSessionsTable.run();
    
    // Create index on expires_at for efficient cleanup
    const createExpiresIndex = db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON sessions(expires_at)
    `);
    
    createExpiresIndex.run();
    
    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // In serverless environments, database might not be writable
    // Fall back to memory storage
    db = null;
    return false;
  }
}

// Save session games to database
function saveSessionGames(sessionId, games) {
  if (!db && !initDatabase()) {
    console.log('⚠️ Database unavailable, skipping save');
    return false;
  }
  
  try {
    const now = Date.now();
    const expiresAt = now + (10 * 60 * 1000); // 10 minutes from now
    
    const insertSession = db.prepare(`
      INSERT OR REPLACE INTO sessions (id, games, created_at, updated_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = insertSession.run(
      sessionId,
      JSON.stringify(games),
      now,
      now,
      expiresAt
    );
    
    console.log(`✅ Database: Saved ${games.length} games for session ${sessionId}`);
    return true;
  } catch (error) {
    console.error(`❌ Database save failed for session ${sessionId}:`, error);
    return false;
  }
}

// Load session games from database
function loadSessionGames(sessionId) {
  if (!db && !initDatabase()) {
    console.log('⚠️ Database unavailable, returning empty array');
    return [];
  }
  
  try {
    const now = Date.now();
    
    // First, cleanup expired sessions
    cleanupExpiredSessions();
    
    const selectSession = db.prepare(`
      SELECT games FROM sessions 
      WHERE id = ? AND expires_at > ?
    `);
    
    const row = selectSession.get(sessionId, now);
    
    if (row) {
      const games = JSON.parse(row.games);
      console.log(`✅ Database: Loaded ${games.length} games for session ${sessionId}`);
      return games;
    } else {
      console.log(`⚠️ Database: No valid session found for ${sessionId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Database load failed for session ${sessionId}:`, error);
    return [];
  }
}

// Check if session has games
function hasSessionGames(sessionId) {
  if (!db && !initDatabase()) {
    return false;
  }
  
  try {
    const now = Date.now();
    
    const checkSession = db.prepare(`
      SELECT 1 FROM sessions 
      WHERE id = ? AND expires_at > ?
    `);
    
    const exists = checkSession.get(sessionId, now);
    return !!exists;
  } catch (error) {
    console.error(`❌ Database check failed for session ${sessionId}:`, error);
    return false;
  }
}

// Clear specific session
function clearSessionGames(sessionId) {
  if (!db && !initDatabase()) {
    console.log('⚠️ Database unavailable, skipping clear');
    return false;
  }
  
  try {
    const deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = deleteSession.run(sessionId);
    
    console.log(`✅ Database: Cleared session ${sessionId} (${result.changes} rows affected)`);
    return true;
  } catch (error) {
    console.error(`❌ Database clear failed for session ${sessionId}:`, error);
    return false;
  }
}

// Cleanup expired sessions (called automatically during reads)
function cleanupExpiredSessions() {
  if (!db) return;
  
  try {
    const now = Date.now();
    const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
    const result = deleteExpired.run(now);
    
    if (result.changes > 0) {
      console.log(`🧹 Database: Cleaned up ${result.changes} expired sessions`);
    }
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  }
}

// Get database stats (for debugging)
function getDatabaseStats() {
  if (!db && !initDatabase()) {
    return { available: false };
  }
  
  try {
    const now = Date.now();
    
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    const activeSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?').get(now);
    const expiredSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at <= ?').get(now);
    
    return {
      available: true,
      total: totalSessions.count,
      active: activeSessions.count,
      expired: expiredSessions.count
    };
  } catch (error) {
    console.error('❌ Database stats failed:', error);
    return { available: false, error: error.message };
  }
}

// Initialize database on module load
initDatabase();

module.exports = {
  saveSessionGames,
  loadSessionGames,
  hasSessionGames,
  clearSessionGames,
  cleanupExpiredSessions,
  getDatabaseStats
};