# Performance Testing Framework - Slot Forge

## Executive Summary

This document establishes comprehensive performance testing methodologies for Slot Forge's dual-engine AI recommendation system, with specific focus on the new dual explanation architecture and cost-performance optimization.

### Change Log

| Date       | Version | Description                              | Author    |
| ---------- | ------- | ---------------------------------------- | --------- |
| 2025-08-30 | 1.0     | Initial performance testing framework    | Winston   |

## Performance Testing Architecture

### Testing Pyramid for AI-Powered Systems

```
                    ┌─────────────────────────┐
                    │     E2E User Flows      │
                    │   (Full AI Pipeline)    │
                    └─────────────────────────┘
                  ┌───────────────────────────────┐
                  │     Integration Tests         │
                  │  (API + LLM + Database)       │
                  └───────────────────────────────┘
                ┌─────────────────────────────────────┐
                │         Component Tests             │
                │  (Similarity Engines, Explanations) │
                └─────────────────────────────────────┘
              ┌───────────────────────────────────────────┐
              │              Unit Tests                   │
              │     (Functions, Utilities, Parsers)      │
              └───────────────────────────────────────────┘
```

## Performance Test Categories

### 1. AI Model Performance Testing

#### **Content Generation Performance**

**Test Suite**: `game-generation-performance.js`
```javascript
// Performance test for game generation
const testScenarios = [
  { games: 1, expectedTime: 900, maxTime: 2000 },
  { games: 10, expectedTime: 10000, maxTime: 15000 },
  { games: 20, expectedTime: 18000, maxTime: 25000 },
  { games: 100, expectedTime: 91000, maxTime: 120000 }
];

async function testGenerationPerformance() {
  for (const scenario of testScenarios) {
    const startTime = Date.now();
    const games = await generateGames(scenario.games, "performance test themes");
    const duration = Date.now() - startTime;
    
    assert(duration < scenario.maxTime, 
      `Generation of ${scenario.games} games took ${duration}ms, expected <${scenario.maxTime}ms`);
    assert(games.length === scenario.games, 
      `Expected ${scenario.games} games, got ${games.length}`);
  }
}
```

#### **Similarity Engine Performance Comparison**

**Test Suite**: `similarity-engine-performance.js`
```javascript
// Comparative performance test: Algorithmic vs LLM
const testGames = loadTestGameSet(100); // Pre-loaded test games

async function compareSimilarityEngines() {
  const results = {
    algorithmic: { times: [], costs: [] },
    llm: { times: [], costs: [] }
  };
  
  // Test algorithmic engine
  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    const recs = await getRecommendations(
      testGames[0].id, defaultWeights, 5, testGames, playerContext, 'algorithmic'
    );
    results.algorithmic.times.push(Date.now() - startTime);
    results.algorithmic.costs.push(0); // No API costs
  }
  
  // Test LLM engine  
  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();
    const recs = await getRecommendations(
      testGames[0].id, defaultWeights, 5, testGames, playerContext, 'llm'
    );
    results.llm.times.push(Date.now() - startTime);
    results.llm.costs.push(calculateLLMCost(recs.tokenUsage));
  }
  
  return calculatePerformanceMetrics(results);
}
```

#### **Dual Explanation System Performance**

**Test Suite**: `explanation-performance.js`
```javascript
// Test both explanation methods
async function testExplanationPerformance() {
  const selectedGame = testGames[0];
  const recommendations = testGames.slice(1, 6);
  const weights = { theme: 1, volatility: 0, studio: 0, mechanics: 0 };
  
  // Smart template performance
  const smartStart = Date.now();
  const smartExplanations = recommendations.map(rec => 
    generateSmartExplanation(selectedGame, rec, weights)
  );
  const smartTime = Date.now() - smartStart;
  
  // LLM explanation performance  
  const llmStart = Date.now();
  const llmExplanations = await generateLLMExplanations(
    selectedGame, recommendations, weights, mockPlayerContext
  );
  const llmTime = Date.now() - llmStart;
  
  return {
    smartTemplate: { time: smartTime, cost: 0 },
    llmExplanation: { time: llmTime, cost: calculateExplanationCost(llmExplanations) }
  };
}
```

### 2. Load Testing Framework

#### **Concurrent User Simulation**

**Test Suite**: `load-testing.js`
```javascript
// Simulate concurrent users with different usage patterns
const userPatterns = [
  { type: 'light', weight: 0.6, actions: ['recommend'] },
  { type: 'moderate', weight: 0.3, actions: ['generate:10', 'recommend'] },
  { type: 'heavy', weight: 0.1, actions: ['generate:100', 'recommend:multiple'] }
];

async function simulateConcurrentUsers(totalUsers, durationMinutes) {
  const users = [];
  
  for (let i = 0; i < totalUsers; i++) {
    const pattern = selectUserPattern(userPatterns);
    users.push({
      id: i,
      pattern: pattern,
      session: createSession(),
      actions: generateActionSequence(pattern, durationMinutes)
    });
  }
  
  // Execute all users concurrently
  const results = await Promise.allSettled(
    users.map(user => executeUserSession(user))
  );
  
  return analyzeLoadTestResults(results);
}
```

#### **Stress Testing - Breaking Point Analysis**

**Test Suite**: `stress-testing.js`
```javascript
// Find system breaking points
async function findBreakingPoint() {
  let currentLoad = 10;
  let maxSuccessfulLoad = 0;
  
  while (currentLoad <= 1000) {
    console.log(`Testing load: ${currentLoad} concurrent users`);
    
    const results = await Promise.race([
      simulateConcurrentUsers(currentLoad, 2), // 2-minute test
      new Promise(resolve => setTimeout(() => resolve('timeout'), 300000)) // 5-minute timeout
    ]);
    
    if (results === 'timeout' || results.errorRate > 0.05) {
      console.log(`Breaking point found at ${currentLoad} users`);
      break;
    }
    
    maxSuccessfulLoad = currentLoad;
    currentLoad = Math.ceil(currentLoad * 1.5);
  }
  
  return maxSuccessfulLoad;
}
```

### 3. Cost-Performance Optimization Testing

#### **Cost per Performance Unit Analysis**

**Test Suite**: `cost-performance-optimization.js`
```javascript
// Analyze cost-effectiveness of different configurations
const testConfigurations = [
  { 
    name: 'Budget Mode',
    similarity: 'algorithmic',
    explanation: 'smart',
    expectedCost: 1.31,
    expectedTime: 250
  },
  { 
    name: 'Hybrid Mode',
    similarity: 'algorithmic', 
    explanation: 'llm',
    expectedCost: 1.31,
    expectedTime: 2500
  },
  { 
    name: 'Premium Mode',
    similarity: 'llm',
    explanation: 'llm', 
    expectedCost: 1.56,
    expectedTime: 10000
  }
];

async function analyzeCostPerformance() {
  const results = [];
  
  for (const config of testConfigurations) {
    const metrics = await runPerformanceTest(config);
    results.push({
      ...config,
      actualCost: metrics.totalCost,
      actualTime: metrics.averageTime,
      costEfficiency: metrics.qualityScore / metrics.totalCost,
      timeEfficiency: metrics.qualityScore / metrics.averageTime
    });
  }
  
  return rankConfigurationsByEfficiency(results);
}
```

### 4. Quality Assurance Performance Testing

#### **Recommendation Quality vs Speed Trade-offs**

**Test Suite**: `quality-performance-tradeoff.js`
```javascript
// Test recommendation quality under different performance constraints
async function testQualitySpeedTradeoffs() {
  const testScenarios = [
    { timeout: 100, expectedQuality: 0.6 },   // Ultra-fast mode
    { timeout: 1000, expectedQuality: 0.8 },  // Standard mode  
    { timeout: 5000, expectedQuality: 0.9 },  // High-quality mode
    { timeout: 15000, expectedQuality: 0.95 } // Premium mode
  ];
  
  const results = [];
  
  for (const scenario of testScenarios) {
    const recommendations = await Promise.race([
      getRecommendationsWithQualityScore(testGame, scenario.timeout),
      new Promise(resolve => setTimeout(() => resolve({ quality: 0, timeout: true }), scenario.timeout))
    ]);
    
    results.push({
      timeout: scenario.timeout,
      actualQuality: recommendations.quality,
      expectedQuality: scenario.expectedQuality,
      timedOut: recommendations.timeout || false
    });
  }
  
  return analyzeQualityTradeoffs(results);
}
```

### 5. Memory and Resource Usage Testing

#### **Memory Leak Detection**

**Test Suite**: `memory-performance.js`
```javascript
// Monitor memory usage during extended operations
async function detectMemoryLeaks() {
  const initialMemory = process.memoryUsage();
  const memorySnapshots = [initialMemory];
  
  // Run 1000 recommendation cycles
  for (let i = 0; i < 1000; i++) {
    await getRecommendations(testGames[i % testGames.length].id, 
      randomizeWeights(), 5, testGames, mockPlayerContext, 'llm');
    
    if (i % 100 === 0) {
      memorySnapshots.push(process.memoryUsage());
      // Force garbage collection if available
      if (global.gc) global.gc();
    }
  }
  
  const finalMemory = process.memoryUsage();
  
  return analyzeMemoryUsage({
    initial: initialMemory,
    snapshots: memorySnapshots,
    final: finalMemory
  });
}
```

#### **Redis Connection Performance**

**Test Suite**: `redis-performance.js`
```javascript
// Test Redis operations under load
async function testRedisPerformance() {
  const operations = [
    { name: 'save-100-games', operation: () => saveCustomGames(generate100Games()) },
    { name: 'load-games', operation: () => loadGames() },
    { name: 'save-settings', operation: () => saveSettings(randomWeights()) },
    { name: 'load-settings', operation: () => loadSettings() },
    { name: 'clear-games', operation: () => clearCustomGames() }
  ];
  
  const results = {};
  
  for (const op of operations) {
    const times = [];
    
    // Run each operation 50 times
    for (let i = 0; i < 50; i++) {
      const start = Date.now();
      await op.operation();
      times.push(Date.now() - start);
    }
    
    results[op.name] = {
      average: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: percentile(times, 0.95)
    };
  }
  
  return results;
}
```

## Automated Performance Monitoring

### **Real-Time Performance Tracking**

#### **Performance Middleware Implementation**
```javascript
// Add to server.js for continuous monitoring
const performanceMonitor = (req, res, next) => {
  req.startTime = Date.now();
  req.initialMemory = process.memoryUsage();
  
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - req.startTime;
    const finalMemory = process.memoryUsage();
    
    // Log performance metrics
    logPerformanceMetrics({
      route: req.route?.path || req.path,
      method: req.method,
      duration,
      memoryDelta: finalMemory.heapUsed - req.initialMemory.heapUsed,
      statusCode: res.statusCode,
      responseSize: Buffer.byteLength(body, 'utf8')
    });
    
    originalSend.call(this, body);
  };
  
  next();
};
```

#### **Performance Dashboard Metrics**
```javascript
// Continuous performance tracking
const performanceMetrics = {
  requests: {
    total: 0,
    byRoute: {},
    averageTime: 0,
    p95Time: 0
  },
  ai: {
    generationTime: { average: 0, count: 0 },
    similarityTime: { average: 0, count: 0 },
    explanationTime: { average: 0, count: 0 }
  },
  costs: {
    daily: 0,
    perUser: 0,
    tokenUsage: global.tokenUsage
  },
  system: {
    memoryUsage: () => process.memoryUsage(),
    uptime: () => process.uptime(),
    redisConnections: 0
  }
};
```

## Performance Test Execution Framework

### **Test Runner Configuration**

#### **package.json Scripts**
```json
{
  "scripts": {
    "test:performance": "node tests/performance/run-all-tests.js",
    "test:load": "node tests/performance/load-testing.js",
    "test:stress": "node tests/performance/stress-testing.js", 
    "test:cost": "node tests/performance/cost-performance-optimization.js",
    "test:memory": "node tests/performance/memory-performance.js --expose-gc",
    "test:ci": "npm run test:performance && npm run test:load",
    "monitor:performance": "node scripts/performance-monitor.js"
  }
}
```

#### **Continuous Integration Integration**
```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday 6 AM

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run performance tests
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        KV_REST_API_URL: ${{ secrets.KV_REST_API_URL }}
        KV_REST_API_TOKEN: ${{ secrets.KV_REST_API_TOKEN }}
      run: |
        npm run test:performance
        npm run test:cost
        
    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: tests/results/
```

### **Performance Benchmarking Standards**

#### **Acceptance Criteria**

| Metric | Target | Warning | Critical |
|--------|---------|---------|----------|
| Home page load | <2s | 2-3s | >3s |
| Game generation (10) | <15s | 15-25s | >25s |  
| Algorithmic recommendations | <500ms | 0.5-1s | >1s |
| LLM recommendations | <12s | 12-20s | >20s |
| Smart explanations | <100ms | 100-250ms | >250ms |
| LLM explanations | <5s | 5-8s | >8s |
| Memory usage (1h) | <200MB | 200-500MB | >500MB |

#### **Cost Performance Standards**

| User Type | Target Cost | Warning | Critical |
|-----------|-------------|---------|----------|
| Light user | <$0.50 | $0.50-1.00 | >$1.00 |
| Moderate user | <$1.50 | $1.50-2.50 | >$2.50 |
| Heavy user | <$5.00 | $5.00-10.00 | >$10.00 |
| Daily budget | <$500 | $500-750 | >$750 |

## Performance Optimization Recommendations

### **Immediate Optimizations** (0-30 days)

#### **1. Explanation Batching**
```javascript
// Batch all explanations in single LLM call
async function batchLLMExplanations(games, context) {
  const prompt = buildBatchExplanationPrompt(games, context);
  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2000, // Accommodate 5 explanations
    messages: [{ role: "user", content: prompt }]
  });
  
  return parseExplanationArray(response.content[0].text);
}
```

#### **2. Smart Caching Implementation**
```javascript
// Cache similarity results for popular games
const similarityCache = new Map();

async function getCachedSimilarity(game1Id, game2Id, weights) {
  const cacheKey = `${game1Id}-${game2Id}-${JSON.stringify(weights)}`;
  
  if (similarityCache.has(cacheKey)) {
    return similarityCache.get(cacheKey);
  }
  
  const result = await calculateSimilarity(game1Id, game2Id, weights);
  similarityCache.set(cacheKey, result);
  
  return result;
}
```

### **Medium-Term Optimizations** (30-90 days)

#### **1. Predictive Loading**
- Pre-generate popular game combinations
- Prefetch likely next recommendations
- Cache context analysis for returning users

#### **2. Adaptive Model Selection**
- Use Haiku for simple cases, Sonnet for complex
- Dynamic timeout adjustment based on user patience
- Smart fallback chains

### **Long-Term Strategy** (90+ days)

#### **1. Edge Computing**
- Deploy smaller models to CDN edges
- Local processing for simple calculations
- Smart routing between edge and cloud

#### **2. Custom Model Training**
- Fine-tune models for specific game types
- Reduce token usage with specialized prompts
- Create lightweight explanation models

---

This performance testing framework provides comprehensive monitoring, optimization strategies, and automated testing for the Slot Forge AI system, ensuring optimal cost-performance balance as the system scales.