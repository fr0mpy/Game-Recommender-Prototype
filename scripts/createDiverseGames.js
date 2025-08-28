require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Create a diverse, realistic dataset of 100 slot games
function createDiverseGameDataset() {
  const themes = [
    'Ancient Egypt', 'Greek Mythology', 'Norse Mythology', 'Pirates', 'Adventure',
    'Fantasy', 'Dragons', 'Magic', 'Space', 'Sci-Fi', 'Western', 'Asian Culture',
    'Irish Luck', 'Fruit Classic', 'Gems & Diamonds', 'Ocean', 'Jungle', 'Safari',
    'Christmas', 'Halloween', 'Sports', 'Music', 'Movies', 'Horror', 'Romance',
    'Medieval', 'Vikings', 'Aztec', 'Mayan', 'Roman', 'Oriental', 'Japanese',
    'Chinese', 'Indian', 'Wild West', 'Steampunk', 'Cyberpunk', 'Retro'
  ];

  const studios = [
    'NetEnt', 'Microgaming', 'Playtech', 'Play\'n GO', 'Pragmatic Play',
    'Red Tiger Gaming', 'Blueprint Gaming', 'Big Time Gaming', 'Yggdrasil',
    'Push Gaming', 'Quickspin', 'Thunderkick', 'ELK Studios', 'No Limit City',
    'Relax Gaming', 'Iron Dog Studio', 'Hacksaw Gaming', 'Nolimit City',
    'Evolution Gaming', 'Scientific Games', 'IGT', 'Ainsworth', 'Aristocrat',
    'Bally Technologies', 'WMS Gaming', 'Konami Gaming', 'Merkur Gaming'
  ];

  const gameNames = [
    'Starburst', 'Gonzo\'s Quest', 'Book of Dead', 'Reactoonz', 'Sweet Bonanza',
    'The Dog House', 'Gates of Olympus', 'Jammin\' Jars', 'Razor Shark',
    'Money Train', 'Dead or Alive', 'Immortal Romance', 'Thunderstruck II',
    'Mega Moolah', 'Divine Fortune', 'Hall of Gods', 'Arabian Nights',
    'Jack and the Beanstalk', 'Twin Spin', 'South Park', 'Planet of the Apes',
    'Jurassic Park', 'Game of Thrones', 'The Phantom\'s Curse', 'Blood Suckers',
    'Dracula', 'Frankenstein', 'Jekyll and Hyde', 'The Invisible Man',
    'Creature from the Black Lagoon', 'Scarface', 'Narcos', 'Vikings Go Wild',
    'Valley of the Gods', 'Legacy of Dead', 'Rise of Olympus', 'Moon Princess',
    'Reactoonz 2', 'Gigantoonz', 'Play\'n GO', 'Fire Joker', 'Joker Pro',
    'Mystery Joker', 'Super Joker', 'Mega Joker', 'Double Joker', 'Wild Joker'
  ];

  const volatilityLevels = ['low', 'medium', 'high', 'ultra'];
  const paces = ['slow', 'medium', 'fast'];
  const artStyles = ['Realistic', 'Cartoon/animated', '3D rendered', 'Hand-drawn', 'Pixel art', 'Minimalist'];
  const audioVibes = ['Upbeat/energetic', 'Mystical/ambient', 'Epic/orchestral', 'Retro/chiptune', 'Relaxing', 'Intense'];

  const games = [];

  for (let i = 1; i <= 100; i++) {
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const secondTheme = Math.random() > 0.7 ? themes[Math.floor(Math.random() * themes.length)] : null;
    const gameThemes = secondTheme && secondTheme !== theme ? [theme, secondTheme] : [theme];
    
    const studio = studios[Math.floor(Math.random() * studios.length)];
    const volatility = volatilityLevels[Math.floor(Math.random() * volatilityLevels.length)];
    const pace = paces[Math.floor(Math.random() * paces.length)];
    
    // Generate unique name
    const baseName = gameNames[Math.floor(Math.random() * gameNames.length)];
    const variations = ['Deluxe', 'Megaways', 'Power', 'Extreme', 'Gold', 'Diamond', 'Royal', 'Legend'];
    const hasVariation = Math.random() > 0.6;
    const title = hasVariation ? `${baseName} ${variations[Math.floor(Math.random() * variations.length)]}` : baseName;
    
    // RTP based on volatility
    let rtp;
    switch(volatility) {
      case 'low': rtp = 94 + Math.random() * 2; break;
      case 'medium': rtp = 95 + Math.random() * 2; break;
      case 'high': rtp = 96 + Math.random() * 2; break;
      case 'ultra': rtp = 96.5 + Math.random() * 1.5; break;
    }
    
    // Max win based on volatility
    let maxWin;
    switch(volatility) {
      case 'low': maxWin = 500 + Math.floor(Math.random() * 1500); break;
      case 'medium': maxWin = 1000 + Math.floor(Math.random() * 4000); break;
      case 'high': maxWin = 2000 + Math.floor(Math.random() * 8000); break;
      case 'ultra': maxWin = 5000 + Math.floor(Math.random() * 45000); break;
    }
    
    const game = {
      id: `game-${i.toString().padStart(3, '0')}`,
      title: title,
      studio: studio,
      theme: gameThemes,
      volatility: volatility,
      rtp: parseFloat(rtp.toFixed(1)),
      maxWin: maxWin,
      reelLayout: ['5x3', '5x4', '6x4', '6x5'][Math.floor(Math.random() * 4)],
      paylines: [10, 20, 25, 30, 40, 50, 243, 1024][Math.floor(Math.random() * 8)],
      mechanics: generateMechanics(),
      features: generateFeatures(),
      pace: pace,
      hitFrequency: parseFloat((0.15 + Math.random() * 0.35).toFixed(3)),
      bonusFrequency: parseFloat((0.005 + Math.random() * 0.045).toFixed(3)),
      artStyle: artStyles[Math.floor(Math.random() * artStyles.length)],
      audioVibe: audioVibes[Math.floor(Math.random() * audioVibes.length)],
      visualDensity: ['minimal', 'standard', 'busy'][Math.floor(Math.random() * 3)],
      mobileOptimized: Math.random() > 0.1,
      releaseYear: 2020 + Math.floor(Math.random() * 5),
      description: generateDescription(title, gameThemes, volatility)
    };
    
    games.push(game);
  }
  
  return games;
}

function generateMechanics() {
  const allMechanics = [
    'Wild', 'Scatter', 'Multiplier', 'Cascading Reels', 'Expanding Wilds',
    'Sticky Wilds', 'Random Wilds', 'Megaways', 'Hold & Win', 'Respins',
    'Pick Bonus', 'Wheel Bonus', 'Gamble Feature', 'Buy Feature', 'Cluster Pays',
    'Walking Wilds', 'Stacked Symbols', 'Mystery Symbols', 'Expanding Reels',
    'Extra Rows', 'Symbol Upgrade', 'Symbol Collection'
  ];
  
  const numMechanics = 2 + Math.floor(Math.random() * 4);
  const mechanics = [];
  for (let i = 0; i < numMechanics; i++) {
    const mechanic = allMechanics[Math.floor(Math.random() * allMechanics.length)];
    if (!mechanics.includes(mechanic)) {
      mechanics.push(mechanic);
    }
  }
  return mechanics;
}

function generateFeatures() {
  const allFeatures = [
    'Free Spins', 'Bonus Game', 'Progressive Jackpot', 'Mini Game', 'Pick Feature',
    'Wheel of Fortune', 'Cash Prize', 'Multiplier Trail', 'Symbol Collection',
    'Achievement System', 'Level Up', 'Unlock Features'
  ];
  
  const numFeatures = 1 + Math.floor(Math.random() * 3);
  const features = [];
  for (let i = 0; i < numFeatures; i++) {
    const feature = allFeatures[Math.floor(Math.random() * allFeatures.length)];
    if (!features.includes(feature)) {
      features.push(feature);
    }
  }
  return features;
}

function generateDescription(title, themes, volatility) {
  const themeDesc = themes.join(' and ');
  const volatilityDesc = volatility === 'ultra' ? 'extremely high-risk' : 
                        volatility === 'high' ? 'high-risk' :
                        volatility === 'medium' ? 'balanced' : 'low-risk';
  
  const descriptions = [
    `Experience the thrill of ${themeDesc} in this ${volatilityDesc} slot adventure with exciting bonus features.`,
    `Dive into the world of ${themeDesc} with ${title}, featuring ${volatilityDesc} gameplay and massive win potential.`,
    `${title} brings ${themeDesc} to life in this ${volatilityDesc} slot with innovative mechanics and stunning visuals.`,
    `Explore ${themeDesc} themes in this ${volatilityDesc} slot packed with engaging features and smooth gameplay.`,
    `${title} combines ${themeDesc} elements with ${volatilityDesc} action for an unforgettable gaming experience.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

async function saveDiverseDataset() {
  console.log('🎰 Creating diverse 100-game dataset...');
  
  try {
    const games = createDiverseGameDataset();
    
    // Save to default games file
    const defaultGamesPath = path.join(__dirname, '..', 'data', 'default-games.json');
    fs.writeFileSync(defaultGamesPath, JSON.stringify(games, null, 2));
    
    // Also copy to current games.json as initial state
    const currentGamesPath = path.join(__dirname, '..', 'data', 'games.json');
    fs.writeFileSync(currentGamesPath, JSON.stringify(games, null, 2));
    
    console.log(`✅ Successfully created and saved ${games.length} diverse games`);
    console.log(`📁 Default games saved to: ${defaultGamesPath}`);
    console.log(`📁 Current games updated: ${currentGamesPath}`);
    
    // Show sample
    console.log('\n📊 Sample games created:');
    games.slice(0, 3).forEach(game => {
      console.log(`- ${game.title} by ${game.studio} (${game.theme.join('/')}, ${game.volatility} volatility)`);
    });
    
    return games;
  } catch (error) {
    console.error('❌ Error creating diverse dataset:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  saveDiverseDataset()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { saveDiverseDataset };