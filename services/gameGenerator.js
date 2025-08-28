const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { saveGames } = require('../utils/storage');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const PROMPT_FILE = path.join(__dirname, '..', 'slot-forge-system-prompt.md');

async function generateGames() {
  try {
    // Load the SlotForge prompt
    const prompt = fs.readFileSync(PROMPT_FILE, 'utf8');
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    console.log('Generating 100 games via OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 15000,
      temperature: 0.8,
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    const content = response.choices[0].message.content;
    
    // Parse JSON response from LLM
    const games = JSON.parse(content);
    
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
    
    if (error.message.includes('API key')) {
      throw new Error('OpenAI API key not configured. Please check your environment variables.');
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