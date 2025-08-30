require('dotenv').config();
const { generateGames } = require('../services/gameGenerator');
const fs = require('fs');
const path = require('path');

async function generateDefaultDataset() {
  console.log('🎰 Generating default 100-game dataset...');
  
  try {
    // Generate 100 games using our LLM prompts
    const games = await generateGames('Generate 100 diverse fictional slot games for our default dataset');
    
    // Save to default games file
    const defaultGamesPath = path.join(__dirname, '..', 'data', 'default-games.json');
    fs.writeFileSync(defaultGamesPath, JSON.stringify(games, null, 2));
    
    // Also copy to current games.json as initial state
    const currentGamesPath = path.join(__dirname, '..', 'data', 'games.json');
    fs.writeFileSync(currentGamesPath, JSON.stringify(games, null, 2));
    
    console.log(`✅ Successfully generated and saved ${games.length} default games`);
    console.log(`📁 Default games saved to: ${defaultGamesPath}`);
    console.log(`📁 Current games updated: ${currentGamesPath}`);
    
    return games;
  } catch (error) {
    console.error('❌ Error generating default dataset:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateDefaultDataset()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateDefaultDataset };