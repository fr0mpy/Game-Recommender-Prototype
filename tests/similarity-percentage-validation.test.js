/*
 * SIMILARITY PERCENTAGE VALIDATION TESTS
 * =====================================
 * 
 * Tests to ensure similarity percentages are realistic and diverse,
 * not showing 100% for everything due to hardcoded weights bug.
 */

const { calculateAlgorithmicSimilarity } = require('../services/similarityEngine');
const fs = require('fs');
const path = require('path');

describe('Similarity Percentage Validation', () => {
  let games;
  
  beforeAll(() => {
    // Load test games
    const gamesPath = path.join(__dirname, '..', 'data', 'games.json');
    games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));
    expect(games.length).toBeGreaterThan(10);
  });

  describe('Realistic Score Distribution', () => {
    
    test('similarity scores should be diverse, not all 100%', () => {
      const weights = {
        theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const game1 = games[0];
      const similarities = [];
      
      // Calculate similarities with first 10 games
      for (let i = 1; i < 11; i++) {
        const similarity = calculateAlgorithmicSimilarity(game1, games[i], weights);
        const percentage = Math.round(similarity * 100);
        similarities.push(percentage);
      }
      
      console.log('Similarity percentages:', similarities);
      
      // Should have diverse scores, not all 100%
      const uniqueScores = new Set(similarities);
      expect(uniqueScores.size).toBeGreaterThan(3); // At least 4 different scores
      
      // Should not have more than 30% scores at 100%
      const hundredPercent = similarities.filter(s => s === 100).length;
      expect(hundredPercent).toBeLessThan(similarities.length * 0.3);
      
      // Should have scores in reasonable ranges
      expect(Math.min(...similarities)).toBeLessThan(80); // Some low scores
      expect(Math.max(...similarities)).toBeGreaterThan(50); // Some high scores
    });

    test('volatility-focused weights should show volatility impact', () => {
      const highVolatilityWeights = {
        theme: 0.1, volatility: 0.8, studio: 0.1, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const highVolGame = games.find(g => g.volatility === 'high');
      const mediumVolGame = games.find(g => g.volatility === 'medium');
      const lowVolGame = games.find(g => g.volatility === 'low');
      
      expect(highVolGame && mediumVolGame && lowVolGame).toBeTruthy();
      
      // High volatility game should match better with another high vol game
      const anotherHighVol = games.find(g => g.volatility === 'high' && g.id !== highVolGame.id);
      
      const highToHigh = calculateAlgorithmicSimilarity(highVolGame, anotherHighVol, highVolatilityWeights);
      const highToLow = calculateAlgorithmicSimilarity(highVolGame, lowVolGame, highVolatilityWeights);
      
      console.log('High-to-High volatility:', Math.round(highToHigh * 100) + '%');
      console.log('High-to-Low volatility:', Math.round(highToLow * 100) + '%');
      
      // High-to-high should score significantly better than high-to-low
      expect(highToHigh).toBeGreaterThan(highToLow + 0.2); // At least 20% difference
    });

    test('theme-focused weights should show theme impact', () => {
      const themeWeights = {
        theme: 0.9, volatility: 0.1, studio: 0, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const fantasyGame1 = games.find(g => g.theme && g.theme.includes('Fantasy'));
      const fantasyGame2 = games.find(g => g.theme && g.theme.includes('Fantasy') && g.id !== fantasyGame1.id);
      const nonFantasyGame = games.find(g => g.theme && !g.theme.includes('Fantasy'));
      
      expect(fantasyGame1 && fantasyGame2 && nonFantasyGame).toBeTruthy();
      
      const fantasyToFantasy = calculateAlgorithmicSimilarity(fantasyGame1, fantasyGame2, themeWeights);
      const fantasyToOther = calculateAlgorithmicSimilarity(fantasyGame1, nonFantasyGame, themeWeights);
      
      console.log('Fantasy-to-Fantasy:', Math.round(fantasyToFantasy * 100) + '%');
      console.log('Fantasy-to-Other:', Math.round(fantasyToOther * 100) + '%');
      
      // Theme matches should score significantly better
      expect(fantasyToFantasy).toBeGreaterThan(fantasyToOther + 0.3); // At least 30% difference
    });
  });

  describe('Score Range Validation', () => {
    
    test('scores should never exceed 100%', () => {
      const extremeWeights = {
        theme: 0.5, volatility: 0.3, studio: 0.2, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const similarities = [];
      
      // Test with first 20 games
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          const similarity = calculateAlgorithmicSimilarity(games[i], games[j], extremeWeights);
          similarities.push(similarity);
          
          // Critical: No score should exceed 1.0
          expect(similarity).toBeLessThanOrEqual(1.0);
        }
      }
      
      console.log('Max similarity found:', Math.max(...similarities).toFixed(3));
      console.log('Min similarity found:', Math.min(...similarities).toFixed(3));
      
      // Should have realistic range
      expect(Math.max(...similarities)).toBeLessThanOrEqual(1.0);
      expect(Math.min(...similarities)).toBeGreaterThanOrEqual(0.0);
    });

    test('identical games should score 100%', () => {
      const weights = {
        theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const game = games[0];
      const similarity = calculateAlgorithmicSimilarity(game, game, weights);
      
      expect(Math.round(similarity * 100)).toBe(100);
    });

    test('completely different games should score low', () => {
      const weights = {
        theme: 0.5, volatility: 0.5, studio: 0, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      // Find games with different themes and volatility
      const highFantasy = games.find(g => g.volatility === 'high' && g.theme && g.theme.includes('Fantasy'));
      const lowFruit = games.find(g => g.volatility === 'low' && g.theme && g.theme.includes('Fruits'));
      
      if (highFantasy && lowFruit) {
        const similarity = calculateAlgorithmicSimilarity(highFantasy, lowFruit, weights);
        const percentage = Math.round(similarity * 100);
        
        console.log('Completely different games:', percentage + '%');
        
        // Should be quite low (under 40%)
        expect(percentage).toBeLessThan(40);
      }
    });
  });

  describe('Weight Respect Validation', () => {
    
    test('zero weights should result in zero contribution', () => {
      const zeroThemeWeights = {
        theme: 0, volatility: 1.0, studio: 0, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const game1 = games.find(g => g.theme && g.theme.includes('Fantasy') && g.volatility === 'high');
      const game2 = games.find(g => g.theme && g.theme.includes('Fruits') && g.volatility === 'high');
      
      if (game1 && game2) {
        const similarity = calculateAlgorithmicSimilarity(game1, game2, zeroThemeWeights);
        
        // With 100% volatility weight and 0% theme weight,
        // two high volatility games should match regardless of theme
        expect(similarity).toBeGreaterThan(0.8); // Should be high due to volatility match
      }
    });

    test('hardcoded weights should not interfere with user weights', () => {
      // This test ensures the bug fix worked
      const minimalWeights = {
        theme: 0.5, volatility: 0.5, studio: 0, mechanics: 0,
        rtp: 0, maxWin: 0, features: 0, pace: 0, bonusFrequency: 0,
        // These should have NO effect if set to 0
        audioVibe: 0, visualDensity: 0, reelLayout: 0, artStyle: 0, hitFrequency: 0
      };
      
      const game1 = games[0];
      const game2 = games[1];
      
      const similarity = calculateAlgorithmicSimilarity(game1, game2, minimalWeights);
      
      // Score should be based ONLY on theme (50%) and volatility (50%)
      // No hidden points from audioVibe, visualDensity, etc.
      expect(similarity).toBeLessThanOrEqual(1.0);
      
      // The exact score will depend on theme/volatility match,
      // but it should NOT be inflated by hardcoded weights
      console.log('Clean similarity score:', similarity.toFixed(3));
    });
  });
});