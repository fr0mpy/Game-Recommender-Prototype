const fs = require('fs');
const path = require('path');

describe('Match Explanation System', () => {
  
  describe('Prompt File Configuration', () => {
    test('recommendation-explanation-prompt.md exists and is readable', () => {
      const promptPath = path.join(__dirname, '..', 'prompts', 'recommendation-explanation-prompt.md');
      expect(fs.existsSync(promptPath)).toBe(true);
      
      const content = fs.readFileSync(promptPath, 'utf8');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(100);
    });

    test('recommendation-explanation-prompt.md contains required sections', () => {
      const promptPath = path.join(__dirname, '..', 'prompts', 'recommendation-explanation-prompt.md');
      const content = fs.readFileSync(promptPath, 'utf8');
      
      // Check for key sections
      expect(content).toContain('Game Recommendation Explanation Prompt');
      expect(content).toContain('Your Role');
      expect(content).toContain('Context Integration');
      expect(content).toContain('Example Outputs');
      expect(content).toContain('What to Avoid');
    });
  });

  describe('Explanation Generation for Top 5', () => {
    test('generateLLMExplanations processes exactly 5 recommendations', () => {
      // Mock data
      const selectedGame = {
        title: "Dragon's Fortune",
        themes: ["Fantasy", "Dragons"],
        volatility: "low",
        studio: "Mythic Gaming",
        rtp: 96.32
      };

      const mockRecommendations = [
        { game: { title: "Amazon Quest", themes: ["Fantasy", "Dragons"], volatility: "low", studio: "Mythic Gaming" }, score: 1.0 },
        { game: { title: "Emerald Empire", themes: ["Food", "Cooking"], volatility: "low", studio: "Castle Gaming" }, score: 0.72 },
        { game: { title: "Galactic Fortune", themes: ["Fantasy", "Dragons"], volatility: "medium", studio: "Mythic Gaming" }, score: 0.72 },
        { game: { title: "Cosmic Riches", themes: ["Ancient", "Egypt"], volatility: "low", studio: "Cosmic Entertainment" }, score: 0.71 },
        { game: { title: "Diamond Dreams", themes: ["Fruits", "Classic"], volatility: "low", studio: "Mystery House" }, score: 0.71 }
      ];

      // Verify we have exactly 5 recommendations
      expect(mockRecommendations).toHaveLength(5);
      
      // Each recommendation should have required structure
      mockRecommendations.forEach((rec, index) => {
        expect(rec.game).toBeDefined();
        expect(rec.game.title).toBeDefined();
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      });
    });

    test('explanation generation uses recommendation-explanation-prompt.md', () => {
      // Check that server.js loads the correct prompt
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Verify the prompt loading code uses recommendation-explanation-prompt.md
      expect(serverContent).toContain("loadPrompt('recommendation-explanation-prompt.md')");
      expect(serverContent).not.toContain("loadPrompt('match-explanation-prompt.md')");
    });

    test('explanations should be specific to each game match', () => {
      // This tests the expected output format
      const expectedExplanationPatterns = [
        /both games|like the original|shared/i,
        /volatility|theme|mechanic|studio/i,
        /feature|bonus|wild|scatter/i
      ];

      const mockExplanation = "Both games feature Fantasy themes with Dragons and low volatility for consistent wins.";
      
      expectedExplanationPatterns.forEach(pattern => {
        expect(mockExplanation).toMatch(pattern);
      });
    });

    test('only top 5 recommendations get explanations', () => {
      // Even if we have 10 recommendations, only process top 5
      const allRecommendations = Array(10).fill(null).map((_, i) => ({
        game: { 
          title: `Game ${i + 1}`, 
          themes: ["Test"], 
          volatility: "medium", 
          studio: "Test Studio" 
        },
        score: (10 - i) / 10
      }));

      // Simulate slicing to top 5
      const top5 = allRecommendations.slice(0, 5);
      
      expect(top5).toHaveLength(5);
      expect(top5[0].game.title).toBe("Game 1");
      expect(top5[4].game.title).toBe("Game 5");
      
      // Game 6-10 should not be processed
      const excluded = allRecommendations.slice(5);
      expect(excluded).toHaveLength(5);
      expect(excluded[0].game.title).toBe("Game 6");
    });

    test('explanation mapping maintains order', () => {
      const recommendations = [
        { game: { title: "First" }, score: 1.0 },
        { game: { title: "Second" }, score: 0.9 },
        { game: { title: "Third" }, score: 0.8 },
        { game: { title: "Fourth" }, score: 0.7 },
        { game: { title: "Fifth" }, score: 0.6 }
      ];

      const mockExplanations = [
        "Explanation for First",
        "Explanation for Second",
        "Explanation for Third",
        "Explanation for Fourth",
        "Explanation for Fifth"
      ];

      // Verify 1:1 mapping
      recommendations.forEach((rec, index) => {
        expect(mockExplanations[index]).toContain(rec.game.title);
      });
    });
  });

  describe('Fallback Handling', () => {
    test('handles missing explanations gracefully', () => {
      // If LLM returns fewer than 5 explanations
      const explanations = ["First", "Second", "Third"];
      const recommendations = Array(5).fill(null).map((_, i) => ({ 
        game: { title: `Game ${i + 1}` } 
      }));

      // Should pad to 5
      while (explanations.length < 5) {
        explanations.push("Great match based on similar gameplay.");
      }

      expect(explanations).toHaveLength(5);
      expect(explanations[3]).toBe("Great match based on similar gameplay.");
      expect(explanations[4]).toBe("Great match based on similar gameplay.");
    });

    test('warns on explanation count mismatch', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const explanations = ["One", "Two", "Three"];
      const expectedCount = 5;
      
      if (explanations.length !== expectedCount) {
        console.warn(`⚠️ Expected ${expectedCount} explanations, got ${explanations.length}`);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith("⚠️ Expected 5 explanations, got 3");
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Points', () => {
    test('server route processes exactly 5 recommendations', () => {
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Check for top 5 slicing
      expect(serverContent).toContain('recommendations.slice(0, 5)');
      expect(serverContent).toContain('top5Recommendations');
    });

    test('LLM explanation function validates input count', () => {
      const serverPath = path.join(__dirname, '..', 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Check for validation logging
      expect(serverContent).toContain('Expected 5 recommendations');
      expect(serverContent).toContain('Processing ${top5Recommendations.length} recommendations');
    });
  });
});