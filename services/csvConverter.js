// CSV conversion service for game data export
// Converts game objects to CSV format with all relevant fields

function convertGamesToCSV(games) {
  if (!games || games.length === 0) {
    throw new Error('No games provided for CSV conversion');
  }

  // Define CSV headers based on Game interface
  const headers = [
    'id',
    'title', 
    'studio',
    'theme',
    'volatility',
    'rtp',
    'maxWin',
    'reelLayout',
    'paylines',
    'mechanics',
    'features',
    'pace',
    'hitFrequency',
    'bonusFrequency',
    'artStyle',
    'audioVibe',
    'visualDensity',
    'mobileOptimized',
    'seasonalTag',
    'releaseYear',
    'description'
  ];

  // Convert games data to CSV rows
  const rows = games.map(game => {
    return headers.map(header => {
      let value = game[header];
      
      // Handle array fields (theme, mechanics, features)
      if (Array.isArray(value)) {
        value = value.join('; ');
      }
      
      // Handle undefined/null values
      if (value === undefined || value === null) {
        value = '';
      }
      
      // Handle boolean values
      if (typeof value === 'boolean') {
        value = value ? 'true' : 'false';
      }
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      
      return value;
    });
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

module.exports = { convertGamesToCSV };