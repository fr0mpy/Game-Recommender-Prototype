# LLM Testing Strategy - Slot Forge

## Overview

Testing LLM (Large Language Model) responses presents unique challenges compared to traditional software testing. This document explains our approach to validating LLM functionality in the Slot Forge recommendation system.

## The LLM Testing Challenge

Traditional software testing validates **deterministic** outputs - the same input always produces the same output. LLMs are **non-deterministic** by design, making traditional assertion testing inadequate.

### Key Challenges:
- **Variability**: Same input may produce different outputs
- **Creativity**: LLMs generate novel content, not predictable responses  
- **Context Sensitivity**: Responses change based on subtle prompt variations
- **Quality Assessment**: How do you measure "good" vs "bad" LLM output?

## Our LLM Testing Approach

### 1. **Contract-Based Testing** (Most Reliable)

Instead of testing exact content, we test **structure and format**:

```javascript
test('LLM explanations have required structure', async () => {
  const explanations = await generateLLMExplanations(game, recs, weights, context);
  
  // Test structure, not content
  expect(explanations).toBeArray();
  expect(explanations).toHaveLength(5);
  
  explanations.forEach(explanation => {
    expect(explanation).toBeTruthy();
    expect(explanation.length).toBeGreaterThan(30);    // Minimum length
    expect(explanation).toMatch(/[.!]/);               // Proper sentences
    expect(explanation).not.toContain('undefined');   // No template errors
  });
});
```

**Why This Works**: We validate the LLM meets our **contract requirements** without caring about specific creative content.

### 2. **Keyword and Pattern Validation**

Test that LLM responses contain **expected elements** based on inputs:

```javascript
test('LLM mentions dominant weight factors', async () => {
  const weights = { bonusFrequency: 1.0, theme: 0.0 };
  const explanations = await generateLLMExplanations(game, recs, weights, context);
  
  explanations.forEach(explanation => {
    // Should mention the dominant factor
    expect(explanation.toLowerCase()).toContain('bonus frequency');
    
    // Should not emphasize disabled factors
    expect(explanation.toLowerCase()).not.toContain('theme matching');
    
    // Should include percentage information
    expect(explanation).toMatch(/\d+\.?\d*%/);
  });
});
```

**Why This Works**: We validate the LLM **respects our input parameters** and includes relevant information.

### 3. **Golden Dataset Regression Testing** 

Maintain a curated set of **known good responses** for regression protection:

```javascript
const goldenResponses = [
  {
    scenario: 'bonus-frequency-dominant',
    input: { weights: { bonusFrequency: 1.0 }, gameId: 'game-001' },
    expectedKeywords: ['bonus frequency', 'trigger rate', 'similar'],
    qualityThreshold: 0.85 // 85% semantic similarity to stored response
  }
];

test('LLM maintains quality baseline', async () => {
  for (const golden of goldenResponses) {
    const explanation = await generateLLMExplanations(/*golden.input*/);
    
    // Check keywords present
    const hasKeywords = golden.expectedKeywords.every(
      keyword => explanation[0].toLowerCase().includes(keyword.toLowerCase())
    );
    expect(hasKeywords).toBe(true);
    
    // Optional: Use another LLM to validate semantic similarity
    const similarity = await calculateSemanticSimilarity(explanation[0], golden.baselineResponse);
    expect(similarity).toBeGreaterThan(golden.qualityThreshold);
  }
});
```

**Why This Works**: Protects against **quality degradation** while allowing creative variation.

### 4. **Behavioral Consistency Testing**

Test that **different inputs produce appropriately different outputs**:

```javascript
test('different contexts produce different reasoning', async () => {
  const workContext = { sessionType: 'work', attentionSpan: 'short' };
  const leisureContext = { sessionType: 'leisure', attentionSpan: 'long' };
  
  const workExplanations = await generateLLMExplanations(game, recs, weights, workContext);
  const leisureExplanations = await generateLLMExplanations(game, recs, weights, leisureContext);
  
  // Should be different reasoning for different contexts
  expect(workExplanations[0]).not.toBe(leisureExplanations[0]);
  
  // Work context should mention appropriate factors
  expect(workExplanations[0].toLowerCase()).toMatch(/work|quick|pause|attention/);
  expect(leisureExplanations[0].toLowerCase()).toMatch(/leisure|immersive|complex|focus/);
});
```

**Why This Works**: Validates the LLM **adapts appropriately** to different scenarios.

### 5. **Error Handling and Fallback Testing**

Test system behavior when LLM fails:

```javascript
test('graceful fallback when LLM fails', async () => {
  // Mock LLM to throw error
  jest.spyOn(anthropic.messages, 'create').mockRejectedValue(new Error('API Error'));
  
  const result = await getRecommendationsWithExplanations(gameId, weights, context);
  
  // Should fall back to smart templates, not crash
  expect(result.explanations[0]).toContain('Perfect bonus frequency match');
  expect(result.source).toBe('smart-template-fallback');
  expect(result.error).toBeUndefined(); // User sees no error
});
```

**Why This Works**: Ensures **reliability** when LLM services are unavailable.

## Slot Forge Specific LLM Tests

### Game Generation Validation
```javascript
test('generates valid game schema', async () => {
  const games = await generateGames(5, 'space adventure themes');
  
  games.forEach(game => {
    // Validate required properties exist
    expect(game).toHaveValidGameSchema();
    
    // Validate theme matches request
    expect(game.theme.some(t => t.toLowerCase().includes('space'))).toBe(true);
    
    // Validate realistic values
    expect(game.rtp).toBeGreaterThan(85);
    expect(game.rtp).toBeLessThan(99);
  });
});
```

### Similarity Analysis Validation
```javascript
test('LLM provides semantic similarity reasoning', async () => {
  const recommendations = await getRecommendations(gameId, weights, 5, games, context, 'llm');
  
  recommendations.forEach(rec => {
    expect(rec.analysis).toHaveProperty('similarity_score');
    expect(rec.analysis).toHaveProperty('primary_factors');
    expect(rec.analysis).toHaveProperty('context_reasoning');
    
    // Reasoning should be substantial
    expect(rec.analysis.primary_factors.length).toBeGreaterThan(20);
    expect(rec.analysis.context_reasoning.length).toBeGreaterThan(20);
  });
});
```

### Weight Integration Validation
```javascript
test('LLM respects dynamic weight preferences', async () => {
  const themeWeights = { theme: 0.8, volatility: 0.2 };
  const volatilityWeights = { theme: 0.2, volatility: 0.8 };
  
  const themeRecs = await getRecommendations(gameId, themeWeights, 5, games, context, 'llm');
  const volatilityRecs = await getRecommendations(gameId, volatilityWeights, 5, games, context, 'llm');
  
  // Different weights should produce different top recommendations
  expect(themeRecs[0].game.id).not.toBe(volatilityRecs[0].game.id);
  
  // Analysis should mention the dominant factors
  expect(themeRecs[0].analysis.primary_factors.toLowerCase()).toContain('theme');
  expect(volatilityRecs[0].analysis.primary_factors.toLowerCase()).toContain('volatility');
});
```

## Why Traditional Testing Patterns Fail with LLMs

### ❌ **Exact String Matching**
```javascript
// DON'T DO THIS
expect(llmResponse).toBe("This game is similar because...");
```
**Problem**: LLM will never produce identical strings, test will always fail.

### ❌ **Brittle Content Assertions**
```javascript
// DON'T DO THIS  
expect(llmResponse).toContain("exactly 73% similar");
```
**Problem**: LLM might say "73.2% similar" or "roughly 73% similar", test fails.

### ❌ **Testing Creative Content Quality**
```javascript
// DON'T DO THIS
expect(llmResponse).toBeCreativeAndEngaging();
```
**Problem**: No programmatic way to measure creativity or engagement.

## Best Practices for LLM Testing

### ✅ **Test Contracts, Not Content**
Focus on structure, format, and required elements rather than exact content.

### ✅ **Use Ranges and Patterns**
Test for patterns (`/\d+%/`) and ranges (`>30 characters`) rather than exact values.

### ✅ **Validate Input Respect**
Ensure LLM responses reflect the input parameters you provided.

### ✅ **Test Error Handling**
Always test what happens when LLM APIs fail or return malformed data.

### ✅ **Use Mock Data Strategically**
Mock LLM responses for unit tests, use real LLM calls for integration tests.

### ✅ **Maintain Golden Datasets**
Keep examples of good responses for regression testing and quality baselines.

## Monitoring LLM Quality in Production

### Real-Time Metrics
- **Response Time**: Track LLM API response times
- **Error Rate**: Monitor API failures and fallback usage
- **Cost Tracking**: Monitor token usage and API costs
- **User Engagement**: Track user interaction with LLM-generated content

### Quality Indicators
- **Content Length**: Ensure responses meet minimum/maximum length requirements
- **Keyword Presence**: Verify responses contain expected domain-relevant terms
- **Format Compliance**: Validate JSON structure and required fields
- **Fallback Rate**: Monitor how often fallback systems are triggered

## Tools and Libraries

### Testing Frameworks
- **Jest**: Primary testing framework
- **Supertest**: API endpoint testing
- **Mock Libraries**: For mocking LLM API responses

### LLM Testing Utilities
- **Custom Matchers**: Create Jest matchers for common LLM validations
- **Semantic Similarity**: Libraries for comparing text meaning
- **Content Analysis**: Tools for analyzing text quality and relevance

## Conclusion

Testing LLMs requires a **behavioral approach** rather than exact output matching. Focus on:
1. **Structure validation** (contract testing)
2. **Input respect** (parameter influence testing)  
3. **Quality baselines** (regression protection)
4. **Error resilience** (fallback testing)
5. **Behavioral consistency** (different inputs → appropriate outputs)

This approach ensures your LLM integration is **reliable, predictable, and user-friendly** while preserving the creative capabilities that make LLMs valuable.

---

**Remember**: The goal isn't to constrain the LLM's creativity, but to ensure it **reliably delivers value** within your application's requirements.