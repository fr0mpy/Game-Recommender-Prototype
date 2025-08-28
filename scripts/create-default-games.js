// Create 100 diverse generic default games
const fs = require('fs');
const path = require('path');

const themes = [
  ['Fantasy', 'Dragons'], ['Western', 'Gold Mining'], ['Ancient', 'Egypt'], 
  ['Pirates', 'Treasure'], ['Space', 'Aliens'], ['Underwater', 'Ocean'],
  ['Jungle', 'Adventure'], ['Norse', 'Vikings'], ['Magic', 'Wizards'],
  ['Gems', 'Jewels'], ['Fruits', 'Classic'], ['Animals', 'Safari'],
  ['Mystery', 'Detective'], ['Horror', 'Gothic'], ['Romance', 'Love'],
  ['Music', 'Rock'], ['Food', 'Cooking'], ['Travel', 'Exploration'],
  ['Medieval', 'Knights'], ['Futuristic', 'Cyberpunk']
];

const studios = [
  'Mythic Gaming', 'Frontier Studios', 'Cosmic Entertainment', 'Ocean Deep Games',
  'Adventure Studios', 'Norse Gaming', 'Enchanted Slots', 'Gem Works',
  'Classic Gaming', 'Wild Studios', 'Mystery House', 'Dark Moon Games',
  'Romance Studios', 'Rock Gaming', 'Gourmet Games', 'Explorer Entertainment',
  'Castle Gaming', 'Future Studios', 'Epic Games', 'Dream Works Gaming'
];

const volatilities = ['low', 'medium', 'high'];
const artStyles = ['Detailed 3D', 'Cartoon', '2D Illustrated', 'Photorealistic', 'Stylized'];
const audioVibes = ['Epic Fantasy', 'Country Western', 'Ambient Electronic', 'Orchestral', 'Rock', 'Jazz'];
const paces = ['slow', 'medium', 'fast'];
const mechanics = [
  ['Wild', 'Scatter'], ['Free Spins', 'Multiplier'], ['Expanding Reels', 'Cascade'],
  ['Pick Bonus', 'Respins'], ['Stacked Wilds', 'Mystery Symbol'], ['Megaways', 'Hold & Win']
];
const features = [
  ['Bonus Round', 'Progressive'], ['Free Spins', 'Wild Multiplier'], ['Pick Feature', 'Gamble'],
  ['Bonus Wheel', 'Cash Collect'], ['Super Stacks', 'Expanding Symbols'], ['Buy Feature', 'Ante Bet']
];

const games = [];

for (let i = 0; i < 100; i++) {
  const themeIndex = i % themes.length;
  const studioIndex = i % studios.length;
  const volatilityIndex = i % volatilities.length;
  
  const game = {
    id: `default-${(i + 1).toString().padStart(3, '0')}`,
    title: generateTitle(themes[themeIndex], i),
    studio: studios[studioIndex],
    theme: themes[themeIndex],
    volatility: volatilities[volatilityIndex],
    rtp: 94.5 + Math.random() * 3, // 94.5-97.5%
    maxWin: Math.floor((2000 + Math.random() * 8000) / 100) * 100, // 2000-10000, rounded to hundreds
    reelLayout: i % 3 === 0 ? '5x4' : '5x3',
    paylines: [20, 25, 30, 40, 50][i % 5],
    mechanics: mechanics[i % mechanics.length],
    features: features[i % features.length],
    pace: paces[i % paces.length],
    hitFrequency: 15 + Math.random() * 20, // 15-35%
    bonusFrequency: 0.5 + Math.random() * 2, // 0.5-2.5%
    artStyle: artStyles[i % artStyles.length],
    audioVibe: audioVibes[i % audioVibes.length],
    visualDensity: ['clean', 'standard', 'busy'][i % 3],
    mobileOptimized: true,
    releaseYear: 2023 + (i % 2),
    description: generateDescription(themes[themeIndex])
  };
  
  games.push(game);
}

function generateTitle(theme, index) {
  const titles = [
    // Fantasy themed
    'Dragon\'s Fortune', 'Mystic Realms', 'Enchanted Forest', 'Crystal Kingdom', 'Magic Quest',
    'Fairy Tale Spins', 'Wizard\'s Tower', 'Phoenix Rising', 'Unicorn Dreams', 'Magical Crystals',
    // Western themed  
    'Gold Rush Valley', 'Wild West Showdown', 'Cowboy\'s Luck', 'Desert Fortune', 'Saloon Riches',
    'Bandit\'s Bounty', 'Sheriff\'s Gold', 'Outlaw\'s Escape', 'Mining Fever', 'Frontier Justice',
    // Ancient themed
    'Pharaoh\'s Gold', 'Temple of Riches', 'Egyptian Treasures', 'Pyramid Quest', 'Cleopatra\'s Jewels',
    'Ancient Scrolls', 'Sphinx Secrets', 'Tomb Raiders', 'Hieroglyph Hunt', 'Nile Treasures',
    // Pirates themed
    'Treasure Island', 'Pirate\'s Bounty', 'Skull & Crossbones', 'Captain\'s Gold', 'Black Pearl',
    'Jolly Roger', 'Buccaneer\'s Loot', 'Parrot\'s Prize', 'Kraken\'s Curse', 'Ship of Gold',
    // Space themed
    'Galactic Fortune', 'Star Quest', 'Cosmic Riches', 'Alien Worlds', 'Space Odyssey',
    'Nebula Navigator', 'Asteroid Belt', 'Solar Flare', 'Rocket Riches', 'Interstellar',
    // Underwater themed
    'Ocean\'s Treasure', 'Atlantis Gold', 'Deep Sea Riches', 'Mermaid\'s Fortune', 'Coral Kingdom',
    'Submarine Voyage', 'Whale Song', 'Shark Attack', 'Tidal Wave', 'Shipwreck Gold',
    // Jungle themed
    'Amazon Quest', 'Jungle Treasures', 'Wild Expedition', 'Temple Raiders', 'Rainforest Riches',
    'Monkey Business', 'Tiger\'s Eye', 'Vine Swing', 'Tribal Totems', 'Lost City',
    // Norse themed
    'Viking\'s Gold', 'Valhalla Riches', 'Norse Legend', 'Thor\'s Hammer', 'Odin\'s Fortune',
    'Berserker Rage', 'Longship Voyage', 'Rune Stones', 'Mjolnir Power', 'Asgard Gates',
    // Magic themed
    'Spell Caster', 'Magic Crystals', 'Enchanted Spells', 'Mystic Powers', 'Potion Master',
    'Crystal Ball', 'Magic Wand', 'Cauldron Brew', 'Sorcerer\'s Stone', 'Arcane Mysteries',
    // Gems themed
    'Diamond Dreams', 'Jewel Quest', 'Precious Stones', 'Crystal Cascade', 'Gem Hunter',
    'Ruby Rush', 'Emerald Empire', 'Sapphire Skies', 'Opal Oracle', 'Platinum Prize'
  ];
  
  // Ensure unique titles by using index directly
  return titles[index % titles.length];
}

function generateDescription(theme) {
  const descriptions = {
    'Fantasy': 'Epic fantasy adventure with magical creatures and enchanted rewards.',
    'Western': 'Strike it rich in the Old West with expanding reels and gold rush bonuses.',
    'Ancient': 'Uncover ancient treasures and pharaoh\'s gold in this Egyptian adventure.',
    'Pirates': 'Set sail for treasure with pirate captains and hidden gold.',
    'Space': 'Explore alien worlds and cosmic rewards in this space odyssey.',
    'Underwater': 'Dive deep for ocean treasures and mermaid\'s bounty.',
    'Jungle': 'Navigate the wild jungle to discover ancient temple treasures.',
    'Norse': 'Join Viking warriors in their quest for Valhalla\'s riches.',
    'Magic': 'Cast powerful spells and unlock mystical rewards.',
    'Gems': 'Hunt for precious gems and sparkling diamond wins.'
  };
  
  return descriptions[theme[0]] || 'An exciting slot adventure with great rewards and features.';
}

// Write the games to file
const filePath = path.join(__dirname, '..', 'data', 'games.json');
fs.writeFileSync(filePath, JSON.stringify(games, null, 2));
console.log(`✅ Created ${games.length} diverse default games in games.json`);