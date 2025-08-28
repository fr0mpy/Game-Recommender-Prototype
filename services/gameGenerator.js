const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { saveGames } = require('../utils/storage');

// Initialize Anthropic API
let anthropic = null;

if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const SYSTEM_PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'slot-forge-system-prompt.md');
const GENERATION_INSTRUCTIONS_FILE = path.join(__dirname, '..', 'prompts', 'slot-forge-generation-instructions.md');
const JSON_FORMAT_FILE = path.join(__dirname, '..', 'prompts', 'json-output-format.md');

// Chunked generation for large game requests
async function generateGamesInChunks(systemPrompt, generationInstructions, jsonFormatRules, customPrompt, totalCount, sessionId = null) {
  const chunkSize = 20; // 20 games per chunk - Claude 4 with 15K tokens can handle this
  const chunks = Math.ceil(totalCount / chunkSize);
  const allGames = [];
  let gameIdCounter = 1;

  console.log(`Generating ${totalCount} games in ${chunks} chunks of ${chunkSize} games each`);
  console.log('🚀 Using PARALLEL processing for maximum speed!');
  
  // Send progress update
  if (sessionId && global.sendProgressUpdate) {
    global.sendProgressUpdate(sessionId, {
      type: 'progress',  
      message: `Generating ${totalCount} games in ${chunks} chunks`,
      progress: 5,
      chunksTotal: chunks,
      chunksCompleted: 0
    });
  }

  // Create all chunk promises to run in parallel
  const chunkPromises = [];
  
  for (let i = 0; i < chunks; i++) {
    const isLastChunk = i === chunks - 1;
    const gamesInThisChunk = isLastChunk ? totalCount - (i * chunkSize) : chunkSize;
    const startingGameId = (i * chunkSize) + 1;
    
    console.log(`Preparing chunk ${i + 1}/${chunks}: ${gamesInThisChunk} games (starting from game-${startingGameId.toString().padStart(3, '0')})`);
    const chunkPrompt = `CRITICAL: You must output ONLY a valid JSON array. No explanations, no markdown, no text before or after.

Generate exactly ${gamesInThisChunk} games for chunk ${i + 1} of ${chunks}:
- Start game IDs from "game-${startingGameId.toString().padStart(3, '0')}"
- Ensure variety in themes, volatility, and studios
- ${customPrompt || 'Create diverse fictional slot games'}

${jsonFormatRules}

OUTPUT ONLY THE JSON ARRAY - NO OTHER TEXT:`;

    // Create promise for this chunk
    const chunkPromise = (async (chunkIndex) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Chunk ${chunkIndex + 1} timed out after 90 seconds`)), 90000)
        );

        console.log(`🔄 Starting chunk ${chunkIndex + 1}/${chunks} in parallel...`);
        
        const response = await Promise.race([
          anthropic.messages.create({
            model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet for superior JSON generation
            max_tokens: 15000, // Claude 4 Sonnet supports 15K output tokens
            temperature: 0.7 + (chunkIndex * 0.05), // Slightly vary temperature for diversity
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: chunkPrompt
            }]
          }),
          timeoutPromise
        ]);

        const content = response.content[0]?.text;
        if (!content) {
          throw new Error(`No response content for chunk ${chunkIndex + 1}`);
        }

        // Extract and parse JSON
        let jsonContent = content;
        const startIndex = content.indexOf('[');
        const endIndex = content.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonContent = content.substring(startIndex, endIndex + 1);
        }

        // Clean JSON
        jsonContent = jsonContent.trim()
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ');

        let chunkGames;
        try {
          chunkGames = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error(`JSON Parse Error for chunk ${chunkIndex + 1}:`, parseError.message);
          throw new Error(`Failed to parse JSON for chunk ${chunkIndex + 1}: ${parseError.message}`);
        }
        
        if (!Array.isArray(chunkGames)) {
          throw new Error(`Chunk ${chunkIndex + 1} response is not an array`);
        }

        console.log(`✅ Chunk ${chunkIndex + 1} completed: ${chunkGames.length} games`);
        return { chunkIndex, games: chunkGames, gamesInThisChunk };
        
      } catch (error) {
        console.error(`❌ Error in chunk ${chunkIndex + 1}:`, error.message);
        
        // Generate fallback games from default games.json
        const { loadGames } = require('../utils/storage');
        const defaultGames = loadGames(); // Load default games
        const fallbackGames = [];
        const startingId = (chunkIndex * chunkSize) + 1;
        
        // If we have default games, use random ones as fallback
        if (defaultGames.length > 0) {
          for (let j = 0; j < gamesInThisChunk; j++) {
            const randomIndex = Math.floor(Math.random() * defaultGames.length);
            const baseGame = defaultGames[randomIndex];
            fallbackGames.push({
              ...baseGame,
              id: `game-${(startingId + j).toString().padStart(3, '0')}`, // Keep requested ID format
              title: `${baseGame.title} (Custom)` // Mark as custom fallback
            });
          }
        } else {
          // Ultimate fallback if no default games
          for (let j = 0; j < gamesInThisChunk; j++) {
            fallbackGames.push({
              id: `game-${(startingId + j).toString().padStart(3, '0')}`,
              title: `Generated Game ${startingId + j}`,
              studio: 'Fallback Studios',
              theme: ['Generic'],
              volatility: 'medium',
              rtp: 95.0,
              maxWin: 1000,
              reelLayout: '5x3',
              paylines: 25,
              mechanics: ['Wild', 'Scatter'],
              features: ['Free Spins'],
              pace: 'medium',
              hitFrequency: 0.3,
              bonusFrequency: 0.01,
              artStyle: 'Cartoon/animated',
              audioVibe: 'Upbeat/energetic',
              visualDensity: 'standard',
              mobileOptimized: true,
              releaseYear: 2024,
              description: `Fallback generated game ${startingId + j} due to generation error`
            });
          }
        }
        
        console.log(`⚠️ Using fallback games for chunk ${chunkIndex + 1}`);
        return { chunkIndex, games: fallbackGames, gamesInThisChunk };
      }
    })(i);
    
    chunkPromises.push(chunkPromise);
  }
  
  console.log(`🚀 Starting ${chunks} chunks in PARALLEL...`);
  
  // Wait for all chunks to complete in parallel
  const chunkResults = await Promise.all(chunkPromises);
  
  // Sort results by chunk index to maintain order
  chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  // Combine all games in order
  chunkResults.forEach(result => {
    allGames.push(...result.games);
  });

  console.log(`✅ Parallel generation completed: ${allGames.length} total games`);
  
  // DO NOT SAVE - Games will be saved to session storage only by server.js
  return allGames;
}

// Validate prompt is for game generation only
function validateGameGenerationPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return { valid: true, sanitized: null };
  
  const lowercased = prompt.toLowerCase();
  
  // Check for non-game generation requests
  const nonGamePatterns = [
    /write.*(?:code|function|script|program)/,
    /create.*(?:website|app|application|database)/,
    /build.*(?:system|platform|tool)/,
    /explain.*(?:how to|concept|algorithm)/,
    /help.*(?:with|me)/,
    /what.*(?:is|are|does)/,
    /tell.*(?:me|about)/,
    /calculate|compute|solve/,
    /translate|convert/,
    /summarize|analyze/,
    /research|find.*information/,
    /send.*email|make.*call/,
    /access.*file|read.*document/,
    /install|download|update/
  ];
  
  // Check if request is clearly not about game generation
  const containsNonGameRequest = nonGamePatterns.some(pattern => pattern.test(lowercased));
  const containsGameKeywords = /(?:game|slot|casino|reel|spin|bet|win|bonus|jackpot|theme|volatility)/i.test(prompt);
  
  if (containsNonGameRequest && !containsGameKeywords) {
    return { 
      valid: false, 
      error: 'This tool can only generate slot games. Please enter a prompt requesting fictional slot game generation (e.g., "Generate 50 sports-themed slot games" or "Create ocean and pirate themed casino games").' 
    };
  }
  
  // Remove potential injection patterns but keep game generation content
  const cleaned = prompt
    .replace(/(?:ignore|disregard|forget)\s+(?:previous|above|system)/gi, '') // Remove ignore instructions
    .replace(/(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)/gi, '') // Remove role changes
    .replace(/(?:system|assistant|user):\s*/gi, '') // Remove role prefixes
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/<[^>]*>/g, '') // Remove HTML/XML tags
    .trim();
  
  // Only allow game generation focused content
  if (cleaned.length > 500) {
    return { valid: true, sanitized: cleaned.substring(0, 500) + '...' };
  }
  
  return { valid: true, sanitized: cleaned };
}

async function generateGames(customPrompt = null, sessionId = null) {
  try {
    // Load system, generation instructions, and JSON format prompts
    const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');
    const generationInstructions = fs.readFileSync(GENERATION_INSTRUCTIONS_FILE, 'utf8');
    const jsonFormatRules = fs.readFileSync(JSON_FORMAT_FILE, 'utf8');
    
    // Validate and sanitize custom prompt
    const validation = validateGameGenerationPrompt(customPrompt);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    const sanitizedPrompt = validation.sanitized;
    
    let requestedCount = 100; // Default from generator prompt
    if (sanitizedPrompt && sanitizedPrompt.trim()) {
      console.log('Using custom user prompt for generation...');
      // Extract number from custom prompt - should be 100 for default UI prompt
      const numberMatch = sanitizedPrompt.match(/\d+/);
      requestedCount = numberMatch ? parseInt(numberMatch[0]) : 100;
      console.log(`Custom prompt requesting ${requestedCount} games as specified`);
    }
    
    // Validate game count limits (1-100)
    if (requestedCount < 1) {
      throw new Error('Must generate at least 1 game');
    }
    if (requestedCount > 100) {
      throw new Error('Cannot generate more than 100 games. Please reduce your request.');
    }
    
    console.log(`✅ Validated game count: ${requestedCount} (within 1-100 limit)`);

    // Use Anthropic Claude Haiku
    if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    console.log('Generating games via Anthropic Claude 4 Sonnet...');
    
    // For large generations (>25 games), use chunked approach
    if (requestedCount > 25) {
      console.log(`Large generation (${requestedCount} games) - using chunked approach`);
      return await generateGamesInChunks(systemPrompt, generationInstructions, jsonFormatRules, sanitizedPrompt, requestedCount, sessionId);
    }
    
    // Single generation for smaller requests
    const userPrompt = sanitizedPrompt && sanitizedPrompt.trim() 
      ? `${generationInstructions}\n\nCUSTOM INSTRUCTIONS: ${sanitizedPrompt}\n\nGenerate exactly ${requestedCount} games.\n\n${jsonFormatRules}`
      : `${generationInstructions}\n\n${jsonFormatRules}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet for superior JSON generation
      max_tokens: 15000, // Claude 4 Sonnet supports 15K output tokens
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    // Track token usage - note: this requires the tokenUsage object to be passed in or made global

    const content = response.content[0]?.text;
    if (!content) {
      throw new Error('No response content from Anthropic');
    }

    console.log('Successfully used Anthropic Claude 4 Sonnet');

    if (!content) {
      throw new Error('No content received from API');
    }
    
    // Parse JSON response from LLM
    console.log('LLM Response Preview:', content.substring(0, 200) + '...');
    
    // Extract JSON from Claude's response (it might have explanatory text)
    let jsonContent = content;
    if (content.includes('[') && content.includes(']')) {
      const startIndex = content.indexOf('[');
      const endIndex = content.lastIndexOf(']') + 1;
      jsonContent = content.substring(startIndex, endIndex);
    }
    
    // Clean up any potential formatting issues
    jsonContent = jsonContent.trim();
    
    let games;
    try {
      games = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('JSON Content preview:', jsonContent.substring(0, 500) + '...');
      console.error('Attempting to fix JSON formatting...');
      
      // Try to fix common JSON issues
      let fixedJson = jsonContent
        .replace(/,\s*}/g, '}') // Remove trailing commas before }
        .replace(/,\s*]/g, ']') // Remove trailing commas before ]
        .replace(/([^"\\])"([^":])/g, '$1\\"$2') // Escape unescaped quotes
        .replace(/\n/g, ' ') // Remove newlines that might break JSON
        .replace(/\r/g, '') // Remove carriage returns
        .replace(/\t/g, ' '); // Replace tabs with spaces
      
      try {
        games = JSON.parse(fixedJson);
        console.log('Successfully parsed JSON after cleanup');
      } catch (secondError) {
        console.error('Second parse error:', secondError.message);
        console.error('Fixed JSON preview:', fixedJson.substring(0, 500) + '...');
        
        // Last resort: try to extract individual game objects or use existing games
        try {
          const gameMatches = fixedJson.match(/"id":\s*"[^"]+"/g);
          if (gameMatches && gameMatches.length > 0) {
            console.log(`Found ${gameMatches.length} potential game objects, but JSON parsing failed`);
          }
          
          // Check if there are existing games we can use
          const { loadGames } = require('../utils/storage');
          const existingGames = loadGames();
          if (existingGames.length > 0) {
            console.log(`Using existing ${existingGames.length} games as fallback`);
            return existingGames;
          } else {
            throw new Error(`Unable to parse JSON response: ${parseError.message}`);
          }
        } catch (fallbackError) {
          throw new Error(`Unable to parse JSON response: ${parseError.message}`);
        }
      }
    }
    
    if (!Array.isArray(games)) {
      throw new Error('LLM response is not an array of games');
    }

    if (games.length === 0) {
      throw new Error('LLM returned empty games array');
    }

    // DO NOT SAVE - Games will be saved to session storage only by server.js
    
    console.log(`Successfully generated ${games.length} games`);
    return games;
    
  } catch (error) {
    console.error('Game generation failed:', error);
    
    if (error.message.includes('JSON')) {
      throw new Error('Unable to parse games from LLM response. Please try again.');
    }
    
    if (error.message.includes('API key') || error.message.includes('Anthropic')) {
      throw new Error('Anthropic API key not configured. Please check your environment variables.');
    }
    
    throw new Error('Unable to generate games. Please try again later.');
  }
}

// Mock function for testing without API key
function generateMockGames() {
  const mockGames = [
    {
      id: '1',
      title: 'Dragon\'s Fortune',
      studio: 'Mock Studios',
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
      id: '2', 
      title: 'Wild West Gold Rush',
      studio: 'Mock Studios',
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
  
  // DO NOT SAVE - Mock games should not overwrite main games.json
  console.log(`Generated ${mockGames.length} mock games for testing`);
  return mockGames;
}

module.exports = {
  generateGames,
  generateMockGames
};