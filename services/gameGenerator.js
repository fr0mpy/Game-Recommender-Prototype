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

const SYSTEM_PROMPT_FILE = path.join(__dirname, '..', 'slot-forge-system-prompt.md');
const GENERATOR_PROMPT_FILE = path.join(__dirname, '..', 'slot-forge-generator-prompt.md');

// Chunked generation for large game requests
async function generateGamesInChunks(systemPrompt, generatorPrompt, customPrompt, totalCount) {
  const chunkSize = 20; // Generate 20 games per chunk to stay within token limits
  const chunks = Math.ceil(totalCount / chunkSize);
  const allGames = [];
  let gameIdCounter = 1;

  console.log(`Generating ${totalCount} games in ${chunks} chunks of ${chunkSize} games each`);

  for (let i = 0; i < chunks; i++) {
    const isLastChunk = i === chunks - 1;
    const gamesInThisChunk = isLastChunk ? totalCount - (i * chunkSize) : chunkSize;
    
    console.log(`Generating chunk ${i + 1}/${chunks}: ${gamesInThisChunk} games (starting from game-${gameIdCounter.toString().padStart(3, '0')})`);
    
    const chunkPrompt = `${generatorPrompt}\n\nCHUNK GENERATION INSTRUCTIONS:
- Generate exactly ${gamesInThisChunk} games for chunk ${i + 1} of ${chunks}
- Start game IDs from "game-${gameIdCounter.toString().padStart(3, '0')}"
- Ensure variety in themes, volatility, and studios
- ${customPrompt || 'Create diverse fictional slot games'}

IMPORTANT: Output only valid JSON array with exactly ${gamesInThisChunk} game objects. No explanatory text before or after the JSON array.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        temperature: 0.7 + (i * 0.05), // Slightly vary temperature for diversity
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: chunkPrompt
        }]
      });

      const content = response.content[0]?.text;
      if (!content) {
        throw new Error(`No response content for chunk ${i + 1}`);
      }

      // Parse the chunk
      let jsonContent = content;
      if (content.includes('[') && content.includes(']')) {
        const startIndex = content.indexOf('[');
        const endIndex = content.lastIndexOf(']') + 1;
        jsonContent = content.substring(startIndex, endIndex);
      }

      const chunkGames = JSON.parse(jsonContent.trim());
      
      if (!Array.isArray(chunkGames)) {
        throw new Error(`Chunk ${i + 1} response is not an array`);
      }

      console.log(`✓ Chunk ${i + 1} generated ${chunkGames.length} games successfully`);
      allGames.push(...chunkGames);
      gameIdCounter += gamesInThisChunk;

      // Small delay between chunks to avoid rate limits
      if (i < chunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`Error in chunk ${i + 1}:`, error.message);
      
      // If a chunk fails, generate mock games for this chunk
      const mockGames = [];
      for (let j = 0; j < gamesInThisChunk; j++) {
        mockGames.push({
          id: `game-${(gameIdCounter + j).toString().padStart(3, '0')}`,
          title: `Generated Game ${gameIdCounter + j}`,
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
          description: `Fallback generated game ${gameIdCounter + j} due to generation error`
        });
      }
      
      console.log(`⚠️ Using fallback games for chunk ${i + 1}`);
      allGames.push(...mockGames);
      gameIdCounter += gamesInThisChunk;
    }
  }

  console.log(`✓ Completed chunked generation: ${allGames.length} total games`);
  
  // Save all games at once
  saveGames(allGames);
  return allGames;
}

async function generateGames(customPrompt = null) {
  try {
    // Load system and generator prompts
    const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');
    const generatorPrompt = fs.readFileSync(GENERATOR_PROMPT_FILE, 'utf8');
    
    let requestedCount = 100; // Default from generator prompt
    if (customPrompt && customPrompt.trim()) {
      console.log('Using custom user prompt for generation...');
      // Extract number from custom prompt - should be 100 for default UI prompt
      const numberMatch = customPrompt.match(/\d+/);
      requestedCount = numberMatch ? parseInt(numberMatch[0]) : 100;
      console.log(`Custom prompt requesting ${requestedCount} games as specified`);
    }

    // Use Anthropic Claude Haiku
    if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    console.log('Generating games via Anthropic Claude Haiku...');
    
    // For large generations (>25 games), use chunked approach
    if (requestedCount > 25) {
      console.log(`Large generation (${requestedCount} games) - using chunked approach`);
      return await generateGamesInChunks(systemPrompt, generatorPrompt, customPrompt, requestedCount);
    }
    
    // Single generation for smaller requests
    const userPrompt = customPrompt && customPrompt.trim() 
      ? `${generatorPrompt}\n\nCUSTOM INSTRUCTIONS: ${customPrompt}\n\nIMPORTANT: Generate exactly ${requestedCount} games. Output only valid JSON array with exactly ${requestedCount} game objects. No explanatory text before or after the JSON array.`
      : generatorPrompt;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    content = response.content[0]?.text;
    if (!content) {
      throw new Error('No response content from Anthropic');
    }

    console.log('Successfully used Anthropic Claude Haiku');

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

    // Save generated games
    saveGames(games);
    
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
  
  saveGames(mockGames);
  console.log(`Generated ${mockGames.length} mock games for testing`);
  return mockGames;
}

module.exports = {
  generateGames,
  generateMockGames
};