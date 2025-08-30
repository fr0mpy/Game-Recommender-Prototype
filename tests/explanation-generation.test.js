const fs = require('fs');
const path = require('path');

// Mock the server's explanation generation function
function loadPrompt(filename) {
  try {
    const promptPath = path.join(__dirname, '..', 'prompts', filename);
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    console.error(`Failed to load prompt from ${filename}:`, error.message);
    return null;
  }
}

// Mock Anthropic client for testing
const mockAnthropic = {
  messages: {
    create: jest.fn()
  }
};

// Import the explanation generation logic (we'll extract this)
async function generateLLMExplanations(selectedGame, recommendations, weights, playerContext) {
  const Anthropic = require('@anthropic-ai/sdk');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const anthropic = mockAnthropic; // Use mock for testing

  try {
    // Load the existing recommendation explanation prompt
    const basePrompt = loadPrompt('recommendation-explanation-prompt.md');
    if (!basePrompt) {
      throw new Error('Could not load recommendation-explanation-prompt.md');
    }

    // Build the games list for the prompt
    const gamesList = recommendations.map((rec, index) => 
      `${index + 1}. "${rec.game.title}" - ${rec.game.themes.join('/')}, ${rec.game.volatility} volatility, ${rec.game.studio}`
    ).join('\n');

    // Calculate context values for the prompt template
    const timeContext = playerContext.currentTime || new Date().toLocaleTimeString();
    const focusLevel = playerContext.focusLevel || 'balanced';
    const focusReasoning = playerContext.focusReasoning || 'standard gaming session';
    const attentionSpan = playerContext.attentionSpan || 'moderate';
    const preferredPace = playerContext.preferredPace || 'balanced';
    const preferredVolatility = playerContext.preferredVolatility || 'medium';
    const sessionDescription = playerContext.sessionDescription || 'casual gaming';
    const budgetDescription = playerContext.budgetDescription || 'moderate budget';
    const budgetPressure = playerContext.budgetPressure || 'low';
    const deviceType = playerContext.deviceType || 'desktop';
    const sportsActive = playerContext.activeSports ? `Active sports: ${playerContext.activeSports}` : '';
    
    // Calculate day of month info
    const now = new Date();
    const dayOfMonth = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Fill in the prompt template with dynamic values
    const filledPrompt = basePrompt
      .replace('{{selectedGameTitle}}', selectedGame.title)
      .replace('{{selectedGameThemes}}', selectedGame.themes.join('/'))
      .replace('{{selectedGameVolatility}}', selectedGame.volatility)
      .replace('{{timeContext}}', timeContext)
      .replace('{{themeWeight}}', Math.round(weights.theme * 100))
      .replace('{{volatilityWeight}}', Math.round(weights.volatility * 100))
      .replace('{{studioWeight}}', Math.round(weights.studio * 100))
      .replace('{{mechanicsWeight}}', Math.round(weights.mechanics * 100))
      .replace('{{deviceType}}', deviceType)
      .replace('{{sportsActive}}', sportsActive)
      .replace('{{focusLevel}}', focusLevel)
      .replace('{{focusReasoning}}', focusReasoning)
      .replace('{{attentionSpan}}', attentionSpan)
      .replace('{{preferredPace}}', preferredPace)
      .replace('{{preferredVolatility}}', preferredVolatility)
      .replace('{{sessionDescription}}', sessionDescription)
      .replace('{{budgetDescription}}', budgetDescription)
      .replace('{{budgetPressure}}', budgetPressure)
      .replace('{{dayOfMonth}}', dayOfMonth)
      .replace('{{totalDaysInMonth}}', totalDaysInMonth)
      .replace('{{gamesList}}', gamesList);

    console.log('\n📝 SENDING LLM EXPLANATION REQUEST:');
    console.log(`   🎮 Selected: ${selectedGame.title}`);
    console.log(`   🎯 Recommendations: ${recommendations.length}`);

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: filledPrompt
        }
      ]
    });

    const explanationText = response.content[0].text;
    
    // Parse JSON response
    let explanations;
    try {
      explanations = JSON.parse(explanationText);
    } catch (parseError) {
      console.log('❌ Failed to parse JSON, extracting array...');
      // Try to extract JSON array from response
      const jsonMatch = explanationText.match(/\[(.*?)\]/s);
      if (jsonMatch) {
        explanations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON array from response');
      }
    }

    if (!Array.isArray(explanations)) {
      throw new Error('Response is not an array');
    }

    console.log(`✅ Successfully generated ${explanations.length} LLM explanations`);
    return explanations;

  } catch (error) {
    console.error('❌ LLM explanation generation failed:', error.message);
    throw error;
  }
}

describe('LLM Explanation Generation', () => {
  let mockSelectedGame;
  let mockRecommendations;
  let mockWeights;
  let mockPlayerContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up test data
    mockSelectedGame = {
      title: "Pirate's Treasure Quest",
      themes: ['Adventure', 'Pirates'],
      volatility: 'High',
      studio: 'Test Studios'
    };

    mockRecommendations = [
      {
        game: {
          title: 'Ocean Explorer',
          themes: ['Adventure', 'Ocean'],
          volatility: 'Medium',
          studio: 'Adventure Games'
        }
      },
      {
        game: {
          title: 'Treasure Hunter',
          themes: ['Adventure', 'Treasure'],
          volatility: 'High',
          studio: 'Quest Studios'
        }
      }
    ];

    mockWeights = {
      theme: 0.8,
      volatility: 0.6,
      studio: 0.4,
      mechanics: 0.5
    };

    mockPlayerContext = {
      currentTime: '14:30:00',
      focusLevel: 'high',
      deviceType: 'mobile'
    };

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  test('should load explanation prompt successfully', () => {
    const prompt = loadPrompt('recommendation-explanation-prompt.md');
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });

  test('should fail gracefully when prompt file is missing', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const prompt = loadPrompt('non-existent-file.md');
    expect(prompt).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load prompt from non-existent-file.md:'),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });

  test('should throw error when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    
    await expect(
      generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext)
    ).rejects.toThrow('ANTHROPIC_API_KEY not configured');
  });

  test('should build correct games list format', async () => {
    const mockResponse = {
      content: [{ text: JSON.stringify(['Explanation 1', 'Explanation 2']) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
    const prompt = callArgs.messages[0].content;
    
    expect(prompt).toContain('1. "Ocean Explorer" - Adventure/Ocean, Medium volatility, Adventure Games');
    expect(prompt).toContain('2. "Treasure Hunter" - Adventure/Treasure, High volatility, Quest Studios');
  });

  test('should use Claude 3 Haiku with correct parameters', async () => {
    const mockResponse = {
      content: [{ text: JSON.stringify(['Explanation 1', 'Explanation 2']) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: expect.any(String)
        }
      ]
    });
  });

  test('should parse valid JSON response correctly', async () => {
    const expectedExplanations = ['Great match!', 'Perfect choice!'];
    const mockResponse = {
      content: [{ text: JSON.stringify(expectedExplanations) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    const result = await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    expect(result).toEqual(expectedExplanations);
  });

  test('should handle malformed JSON by extracting array', async () => {
    const expectedExplanations = ['Explanation 1', 'Explanation 2'];
    const malformedResponse = `Some text before ["Explanation 1", "Explanation 2"] some text after`;
    const mockResponse = {
      content: [{ text: malformedResponse }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    const result = await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    expect(result).toEqual(expectedExplanations);
  });

  test('should throw error when response is not an array', async () => {
    const mockResponse = {
      content: [{ text: JSON.stringify({ invalid: 'object' }) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    await expect(
      generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext)
    ).rejects.toThrow('Response is not an array');
  });

  test('should handle API errors gracefully', async () => {
    const apiError = new Error('API rate limit exceeded');
    mockAnthropic.messages.create.mockRejectedValue(apiError);

    await expect(
      generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext)
    ).rejects.toThrow('API rate limit exceeded');
  });

  test('should include player context in prompt', async () => {
    const mockResponse = {
      content: [{ text: JSON.stringify(['Explanation 1', 'Explanation 2']) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
    const prompt = callArgs.messages[0].content;
    
    expect(prompt).toContain('14:30:00'); // timeContext
    expect(prompt).toContain('mobile'); // deviceType
  });

  test('should validate explanation count matches recommendation count', async () => {
    const tooFewExplanations = ['Only one explanation'];
    const mockResponse = {
      content: [{ text: JSON.stringify(tooFewExplanations) }]
    };
    mockAnthropic.messages.create.mockResolvedValue(mockResponse);

    const result = await generateLLMExplanations(mockSelectedGame, mockRecommendations, mockWeights, mockPlayerContext);

    // Should still return the explanations even if count doesn't match
    // The calling code should handle this mismatch
    expect(result).toEqual(tooFewExplanations);
    expect(result.length).toBeLessThan(mockRecommendations.length);
  });
});