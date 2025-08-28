# Technical Specifications Addendum

## Critical Implementation Details for Developers

NOTE: ensure clear and maintainable separation of concerns.

### 1. LLM Integration Specifications

#### Provider & Model

- **Primary:** OpenAI GPT-4 Turbo (gpt-4-turbo-preview)
- **Fallback:** GPT-3.5 Turbo for cost savings during development
- **Alternative:** Anthropic Claude 3 (if OpenAI unavailable)

#### API Configuration

```typescript
const LLM_CONFIG = {
  maxTokens: 15000, // For 100 game generation
  temperature: 0.8, // Creativity vs consistency
  maxRetries: 3, // Retry failed requests
  timeout: 45000, // 45 second timeout
  costLimit: 5.0, // Max $ per generation
  explanationTokens: 150, // Per recommendation
};
```

#### Error Handling

```typescript
try {
  const response = await generateGames(prompt);
  const validated = validateWithZod(response);
  if (validated.length < 100) {
    // Request additional games to reach 100
  }
} catch (error) {
  if (error.code === "rate_limit") {
    // Exponential backoff
  } else if (error.code === "invalid_json") {
    // Attempt to fix JSON or retry
  }
  // Fall back to pre-generated sample dataset
  return loadSampleDataset();
}
```

### 2. Explanation Generation Strategy

#### Implementation Approach

- **Hybrid:** Pre-generate during recommendation calculation
- **Caching:** Store explanations with 1-hour TTL
- **Regeneration:** On-demand per card via button

#### Explanation Prompt Template

```typescript
const explanationPrompt = `
Game played: ${playedGame.title} (${playedGame.theme.join(", ")})
Recommended: ${recommendedGame.title}
Similarity score: ${score}
Key matches: ${matchingFeatures.join(", ")}

Generate a 1-2 sentence explanation for why this recommendation 
makes sense. Be specific about shared features. Keep under 30 words.
`;
```

### 3. Data Persistence Architecture

#### Storage Layers

```typescript
interface StorageStrategy {
  immediate: localStorage,     // Current dataset
  history: IndexedDB,          // Version history
  backup: sessionStorage,      // Temporary state
  export: JSON download        // User backup
}
```

#### Dataset Versioning

```typescript
interface DatasetVersion {
  version: number;
  timestamp: Date;
  prompt: string;
  promptSummary: string;
  games: Game[];
  checksum: string; // Validate integrity
}

const MAX_VERSIONS = 10; // Keep last 10 generations
```

### 4. Performance Requirements

#### Response Time SLAs

- Recommendation calculation: < 200ms
- Explanation generation: < 2000ms (async)
- Dataset generation: < 45 seconds
- UI interactions: < 100ms feedback
- Page load: < 3 seconds

#### Optimization Strategies

- Pre-calculate similarity matrix on dataset load
- Lazy-load explanations
- Virtual scrolling for large lists
- Debounce search inputs (300ms)
- Web Workers for heavy calculations

### 5. Testing Requirements

#### Unit Test Coverage

- Minimum 80% coverage for:
  - Scoring algorithm
  - Schema validation
  - Data generation

#### Test Cases

```typescript
// Test case example
describe("Recommendation Engine", () => {
  test("High volatility preference matches high volatility games", () => {
    const result = getRecommendations(
      highVolGame,
      allGames,
      { volatilityPreference: "high" },
      null,
      "content_player"
    );
    expect(result[0].game.volatility).toBe("high");
  });

  test("Sports context boosts sports games", () => {
    const result = getRecommendations(
      anyGame,
      allGames,
      null,
      { localEvent: "SuperBowl" },
      "all"
    );
    const sportsGames = result.filter((r) => r.game.theme.includes("Sports"));
    expect(sportsGames.length).toBeGreaterThan(2);
  });
});
```

### 6. Security Configuration

#### API Key Management

```typescript
// Server-side proxy endpoint
// Never expose API keys to client
app.post("/api/generate", authenticate, async (req, res) => {
  const { prompt } = req.body;
  const sanitized = sanitizePrompt(prompt);
  const result = await callLLM(sanitized, process.env.OPENAI_API_KEY);
  res.json(result);
});
```

#### Input Validation

- Sanitize prompt input (no code execution)
- Validate JSON schema strictly
- Rate limit: 10 generations per hour per session
- Max prompt length: 2000 characters

### 7. Edge Case Handling

#### Defensive Programming

```typescript
function handleEdgeCases(games: Game[], params: any) {
  // Minimum viable dataset
  if (games.length < 20) {
    throw new Error("Insufficient games for recommendations");
  }

  // Handle ties in scoring
  if (recommendations.filter((r) => r.score === topScore).length > 5) {
    // Add secondary sort by release year
    recommendations.sort(
      (a, b) => b.score - a.score || b.game.releaseYear - a.game.releaseYear
    );
  }

  // No matches above threshold
  if (topScore < 0.3) {
    // Include "exploration" recommendations
    addRandomHighRatedGames(recommendations);
  }

  // Duplicate detection
  const uniqueGames = removeDuplicates(games, "title");

  return uniqueGames;
}
```

### 8. Development Environment

#### Required Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
ENABLE_DEBUG_MODE=true
RATE_LIMIT_PER_HOUR=10
MAX_DATASET_SIZE_KB=500
```

#### Package Dependencies (Ultra-Lightweight)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "ejs": "^3.1.0",
    "openai": "^4.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### 9. Deployment Configuration

#### Recommended Platform: Railway/Heroku/DigitalOcean

```javascript
// Simple Express server deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Environment Variables for Deployment

```bash
PORT=3000
OPENAI_API_KEY=your_actual_api_key
NODE_ENV=production
```

#### Alternative: Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 10. Monitoring & Analytics

#### Key Metrics to Track

```typescript
interface Analytics {
  generation: {
    attempts: number;
    failures: number;
    avgDuration: number;
    tokenUsage: number;
  };
  recommendations: {
    generated: number;
    clickThrough: number;
    regenerations: number;
    avgConfidence: number;
  };
  errors: {
    type: string;
    count: number;
    lastOccurred: Date;
  }[];
}
```

#### Error Reporting

```typescript
window.addEventListener("error", (e) => {
  reportToAnalytics({
    error: e.message,
    stack: e.error?.stack,
    context: getCurrentAppState(),
  });
});
```

## Quick Start for Developers

### Setup Steps

1. Clone repository
2. Copy `.env.example` to `.env.local`
3. Add OpenAI API key
4. Run `npm install`
5. Run `npm run dev`
6. Navigate to `http://localhost:3000`

### First Run Checklist

- [ ] Verify API key is valid
- [ ] Test dataset generation with default prompt
- [ ] Confirm recommendation calculation < 200ms
- [ ] Check all UI controls enable/disable correctly
- [ ] Validate responsive design on mobile
- [ ] Test error handling with invalid API key
- [ ] Verify dataset persistence across refresh

## Support & Troubleshooting

### Common Issues

1. **"Failed to generate dataset"**
   - Check API key validity
   - Verify internet connection
   - Check OpenAI API status
2. **"Recommendations taking too long"**
   - Dataset may be too large
   - Check browser console for errors
   - Try reducing dataset to 50 games
3. **"JSON parse error"**
   - LLM may have returned malformed JSON
   - Check the raw response in network tab
   - Fallback dataset should load automatically

### Contact

- Technical issues: Create GitHub issue
- Questions: Slack #game-recommender-prototype
- Urgent: Contact Jay Compson directly

## Implementation Steps (Ultra-Lightweight Server-Only Approach)

### Day 1: Core System Setup

#### Phase 1A: Project Foundation (2 hours)

```bash
# Initialize project
mkdir game-recommender-poc
cd game-recommender-poc
npm init -y

# Install minimal dependencies
npm install express ejs dotenv openai

# Create directory structure
mkdir data views public
mkdir views/partials
touch server.js
touch .env
```

#### Phase 1B: File Storage (30 minutes)

```javascript
// utils/storage.js - Simple file operations
function saveGames(games) {
  fs.writeFileSync("./data/games.json", JSON.stringify(games, null, 2));
}

function loadGames() {
  try {
    return JSON.parse(fs.readFileSync("./data/games.json", "utf8"));
  } catch {
    return [];
  }
}

function saveSettings(settings) {
  fs.writeFileSync(
    "./data/user-settings.json",
    JSON.stringify(settings, null, 2)
  );
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync("./data/user-settings.json", "utf8"));
  } catch {
    return { theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1 };
  }
}
```

#### Phase 1C: LLM Integration (1.5 hours)

```javascript
// services/gameGenerator.js
async function generateGames() {
  const prompt = fs.readFileSync(
    "./slot-game-generator-system-prompt.md",
    "utf8"
  );

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 15000,
    temperature: 0.8,
  });

  // Simple JSON parsing - trust LLM output for POC
  try {
    const games = JSON.parse(response.choices[0].message.content);
    saveGames(games);
    return games;
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    throw new Error("Invalid JSON response from LLM");
  }
}
```

#### Phase 1D: Similarity Engine (3 hours)

```javascript
// services/similarityEngine.js
function calculateSimilarity(game1, game2, weights = DEFAULT_WEIGHTS) {
  let score = 0;

  // Theme matching (configurable weight)
  const themeOverlap = game1.theme.filter((t) =>
    game2.theme.includes(t)
  ).length;
  score += (themeOverlap / game1.theme.length) * weights.theme;

  // Volatility matching
  if (game1.volatility === game2.volatility) score += weights.volatility;
  else if (Math.abs(volatilityLevel(game1) - volatilityLevel(game2)) === 1) {
    score += weights.volatility * 0.5;
  }

  // Studio and mechanics...
  return Math.min(score, 1.0);
}

function getRecommendations(gameId, weights, count = 5) {
  const games = loadGames();
  const targetGame = games.find((g) => g.id === gameId);

  const recommendations = games
    .filter((g) => g.id !== gameId)
    .map((game) => ({
      game,
      score: calculateSimilarity(targetGame, game, weights),
      confidence: Math.round(
        calculateSimilarity(targetGame, game, weights) * 100
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return recommendations;
}
```

### Day 2: Server-Rendered UI

#### Phase 2A: Express Server Setup (1 hour)

```javascript
// server.js
const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  const games = loadGames();
  const settings = loadSettings();
  res.render("index", { games, settings });
});

app.post("/generate", async (req, res) => {
  try {
    await generateGames();
    res.redirect("/?generated=true");
  } catch (error) {
    res.render("error", { error: error.message });
  }
});

app.post("/recommend", (req, res) => {
  const { gameId, ...weights } = req.body;
  const recommendations = getRecommendations(gameId, weights);
  res.render("recommendations", { recommendations, selectedGame: gameId });
});
```

#### Phase 2B: EJS Templates (3 hours)

```html
<!-- views/index.ejs -->
<!DOCTYPE html>
<html>
  <head>
    <title>Slot Forge</title>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet" />
  </head>
  <body class="bg-gray-100">
    <div class="container mx-auto p-4">
      <h1 class="text-3xl font-bold">Slot Forge</h1>

      <!-- Generate Games Section -->
      <div class="bg-white p-4 rounded shadow mb-4">
        <h2 class="text-xl font-semibold mb-2">Generate Dataset</h2>
        <form method="POST" action="/generate">
          <button
            type="submit"
            class="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Generate 100 Games
          </button>
        </form>
        <p class="text-sm text-gray-600 mt-2">
          Current dataset: <%= games.length %> games
        </p>
      </div>

      <!-- Game Selection & Weight Configuration -->
      <div class="bg-white p-4 rounded shadow mb-4">
        <h2 class="text-xl font-semibold mb-2">Get Recommendations</h2>
        <form method="POST" action="/recommend">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2">Select Game:</label>
            <select name="gameId" class="w-full border rounded px-3 py-2">
              <option value="">Choose a game...</option>
              <% games.forEach(game => { %>
              <option value="<%= game.id %>">
                <%= game.title %> - <%= game.studio %> (<%= game.volatility %>)
              </option>
              <% }) %>
            </select>
          </div>

          <!-- Weight Configuration -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium mb-1"
                >Theme Weight:</label
              >
              <input
                type="range"
                name="theme"
                min="0"
                max="1"
                step="0.1"
                value="0.4"
                class="w-full"
              />
              <span class="text-xs text-gray-500">40%</span>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >Volatility Weight:</label
              >
              <input
                type="range"
                name="volatility"
                min="0"
                max="1"
                step="0.1"
                value="0.3"
                class="w-full"
              />
              <span class="text-xs text-gray-500">30%</span>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >Studio Weight:</label
              >
              <input
                type="range"
                name="studio"
                min="0"
                max="1"
                step="0.1"
                value="0.2"
                class="w-full"
              />
              <span class="text-xs text-gray-500">20%</span>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1"
                >Mechanics Weight:</label
              >
              <input
                type="range"
                name="mechanics"
                min="0"
                max="1"
                step="0.1"
                value="0.1"
                class="w-full"
              />
              <span class="text-xs text-gray-500">10%</span>
            </div>
          </div>

          <button
            type="submit"
            class="bg-green-500 text-white px-4 py-2 rounded"
          >
            Get Recommendations
          </button>
        </form>
      </div>

      <!-- Export Section -->
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-2">Export Data</h2>
        <a
          href="/export/json"
          class="bg-purple-500 text-white px-4 py-2 rounded inline-block mr-2"
        >
          Download JSON
        </a>
        <a
          href="/export/csv"
          class="bg-purple-500 text-white px-4 py-2 rounded inline-block"
        >
          Download CSV
        </a>
      </div>
    </div>
  </body>
</html>
```

#### Phase 2C: Recommendations Display (2 hours)

```html
<!-- views/recommendations.ejs -->
<div class="bg-white p-4 rounded shadow">
  <h2 class="text-2xl font-semibold mb-4">Recommendations</h2>

  <% if (recommendations.length === 0) { %>
  <p class="text-gray-500">No recommendations found.</p>
  <% } else { %>
  <div class="grid gap-4">
    <% recommendations.forEach((rec, index) => { %>
    <div
      class="border rounded p-4 <%= rec.confidence >= 80 ? 'border-green-500' : rec.confidence >= 60 ? 'border-yellow-500' : 'border-gray-300' %>"
    >
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold"><%= rec.game.title %></h3>
        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          <%= rec.confidence %>% Match
        </span>
      </div>

      <p class="text-gray-600 mb-2"><%= rec.game.studio %></p>

      <div class="flex flex-wrap gap-2 mb-3">
        <% rec.game.theme.forEach(theme => { %>
        <span class="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
          <%= theme %>
        </span>
        <% }) %>
        <span class="bg-purple-200 text-purple-700 px-2 py-1 rounded text-xs">
          <%= rec.game.volatility %>
        </span>
        <span class="bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs">
          RTP: <%= rec.game.rtp %>%
        </span>
      </div>

      <p class="text-sm text-gray-600"><%= rec.game.description %></p>
    </div>
    <% }) %>
  </div>
  <% } %>

  <div class="mt-4">
    <a href="/" class="bg-gray-500 text-white px-4 py-2 rounded">
      Back to Selection
    </a>
  </div>
</div>
```

### Day 3: Export & Polish

#### Phase 3A: Export Functionality (1 hour)

```javascript
// routes/export.js
app.get("/export/json", (req, res) => {
  const games = loadGames();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=games.json");
  res.send(JSON.stringify(games, null, 2));
});

app.get("/export/csv", (req, res) => {
  const games = loadGames();
  const csv = convertToCSV(games);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=games.csv");
  res.send(csv);
});
```

#### Phase 3B: Error Handling & Optimization (2 hours)

```javascript
// Enhanced error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    error: "Something went wrong. Please try again.",
  });
});

// Performance optimizations
const gameCache = new Map();
function getCachedRecommendations(gameId, weights) {
  const key = `${gameId}-${JSON.stringify(weights)}`;
  if (gameCache.has(key)) return gameCache.get(key);

  const recommendations = getRecommendations(gameId, weights);
  gameCache.set(key, recommendations);
  return recommendations;
}
```

#### Phase 3C: Deployment Preparation (1 hour)

```javascript
// package.json scripts
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}

// Environment variables
PORT=3000
OPENAI_API_KEY=your_api_key_here
NODE_ENV=production
```

### Complete File Structure

```
game-recommender-poc/
├── server.js                    # Main Express server
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── data/                        # File-based storage
│   ├── games.json              # Generated games
│   └── user-settings.json      # Weight preferences
├── utils/
│   └── storage.js              # File operations
├── services/
│   ├── gameGenerator.js        # LLM integration
│   └── similarityEngine.js     # Recommendation logic
├── views/
│   ├── index.ejs               # Main interface
│   ├── recommendations.ejs     # Results display
│   ├── error.ejs              # Error page
│   └── partials/
│       ├── header.ejs          # Common header
│       └── footer.ejs          # Common footer
├── public/
│   └── style.css              # Custom styles (optional)
└── slot-game-generator-system-prompt.md
```

### Total Implementation Time: 2.5 Days

- **Day 1:** Core backend functionality (7 hours - saved 1 hour by removing Zod)
- **Day 2:** Server-rendered UI (6 hours)
- **Day 3:** Export, polish, deployment (4 hours)

**Dependencies Reduced to Absolute Minimum:**

- `express` - Web server
- `ejs` - Server-side templates
- `dotenv` - Environment variables
- `openai` - LLM API calls

This ultra-lightweight approach delivers all PRD requirements with minimal complexity and maximum development speed. No validation library needed - we trust the LLM output and handle errors gracefully.
