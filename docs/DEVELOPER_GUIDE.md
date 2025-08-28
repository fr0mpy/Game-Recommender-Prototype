# Slot Forge - Complete Developer Guide

## 📋 Document Overview

This document serves as the definitive reference for developers working on the Slot Forge project. It captures the **ACTUAL STATE** of the codebase, including architectural decisions, patterns, integrations, and technical constraints.

### Document Scope
**Project Focus**: Complete LLM-powered slot game recommendation engine as per Story 1.1  
**Architecture**: Ultra-lightweight Node.js web application with AI integration  
**Deployment**: Production-ready on Vercel with serverless compatibility  

### Change Log
| Date   | Version | Description                   | Author    |
| ------ | ------- | ----------------------------- | --------- |
| Aug 2025 | 2.0   | Updated for Redis & Vercel deployment | Winston   |
| Jan 2025 | 1.0   | Initial developer guide       | Winston   |

---

## 🚀 Quick Reference - Critical Files & Entry Points

### Essential Files for System Understanding

| **Category** | **File** | **Purpose** | **Criticality** |
|-------------|----------|-------------|-----------------|
| **Main Entry** | `server.js` | Express app with all routes and middleware | 🔴 Critical |
| **Core Storage** | `utils/storage.js` | Redis storage + file I/O with serverless compatibility | 🔴 Critical |
| **Game Generation** | `services/gameGenerator.js` | LLM integration for creating games | 🔴 Critical |
| **Similarity Engine** | `services/similarityEngine.js` | Recommendation algorithm core | 🔴 Critical |
| **Context Intelligence** | `services/contextTracker.js` | Advanced player behavior analysis | 🟡 Important |
| **Main UI** | `views/index.ejs` | Primary user interface with generation/recommendation | 🔴 Critical |
| **Configuration** | `package.json`, `vercel.json`, `.env.example` | Vercel deployment and Redis configuration | 🔴 Critical |

### Key Configuration Files
- **Dependencies**: `package.json` - 9 main dependencies (Express, EJS, Anthropic SDK, Redis, Vercel)
- **Serverless Config**: `vercel.json` - Production Vercel deployment configuration
- **Environment Template**: `.env.example` - API keys and Redis connection variables

---

## 🏗️ High Level Architecture

### Technical Stack Reality Check

| **Category** | **Technology** | **Version** | **Notes** |
|-------------|---------------|-------------|-----------|
| **Runtime** | Node.js | 18+ | Vercel serverless compatible |
| **Web Framework** | Express.js | ^5.1.0 | Main application server |
| **Template Engine** | EJS | ^3.1.10 | Server-side rendering only |
| **LLM Integration** | Anthropic SDK | ^0.60.0 | Claude Sonnet 4 for generation |
| **Alternative LLM** | OpenAI SDK | ^5.16.0 | Legacy/fallback support |
| **Redis Storage** | @upstash/redis | ^1.28.4 | Serverless-compatible Redis client |
| **Deployment** | Vercel CLI | ^46.0.5 | Serverless deployment platform |
| **Styling** | Tailwind CSS | CDN | No build process required |
| **Environment** | dotenv | ^17.2.1 | Configuration management |
| **Development** | nodemon | ^3.1.10 | Hot reload for development |
| **Deployment** | Vercel | ^46.0.5 | Serverless production hosting |

### Architecture Characteristics
- **Type**: Server-first monolithic web application
- **Rendering**: 100% server-side rendered (EJS templates)
- **Client JS**: Minimal - only for form enhancements and AJAX
- **Data Storage**: Redis (Upstash) for persistent custom games + local JSON fallbacks
- **Deployment**: Production on Vercel serverless with Redis database

---

## 📁 Source Tree and Module Organization

### Project Structure (Complete)

```text
slot-forge/
├── server.js                          # 🔴 Main Express application (700+ lines)
├── package.json                       # Dependencies and scripts
├── vercel.json                        # Serverless deployment config
├── .env.example                       # Environment template (API keys)
├── vercel.json                        # 🔴 Vercel deployment configuration
├── README.md                          # User-facing documentation
├── ASSESSMENT_COMPARISON.md           # Project analysis vs original brief
│
├── data/                              # 📁 Local fallback storage (default games)
│   ├── games.json                     # Default game dataset for fallback
│   └── user-settings.json             # Local user preference weights
│
├── utils/                             # 📁 Core utilities
│   └── storage.js                     # 🔴 Redis storage + file I/O (270+ lines)
│
├── services/                          # 📁 Business logic services
│   ├── gameGenerator.js               # 🔴 LLM game generation (200+ lines)
│   ├── similarityEngine.js            # 🔴 Recommendation algorithm (150+ lines)
│   ├── contextTracker.js              # 🟡 Player behavior analysis (500+ lines)
│   └── csvConverter.js                # 🟢 CSV export functionality
│
├── views/                             # 📁 EJS templates
│   ├── index.ejs                      # 🔴 Main UI (1200+ lines, complex)
│   ├── recommendations.ejs            # 🟡 Results display page
│   ├── error.ejs                      # Error handling page
│   └── partials/                      # Template components
│       ├── header.ejs                 # Common header with Tailwind
│       └── footer.ejs                 # Common footer
│
├── public/                            # 📁 Static assets
│   ├── favicon.ico                    # Site icon
│   └── test.html                      # Development testing page
│
├── scripts/                           # 📁 Data generation utilities
│   ├── generateDefaultGames.js        # 🟢 Create 100-game dataset
│   ├── create-default-games.js        # Alternative generation script
│   ├── create-premium-games.js        # Premium game variants
│   └── createDiverseGames.js          # Diverse dataset creation
│
├── prompts/                           # 📁 LLM prompt engineering
│   ├── slot-forge-system-prompt.md   # 🟡 Main generation prompt (800+ lines)
│   ├── slot-forge-generation-instructions.md # Generation rules
│   ├── match-explanation-prompt.md    # Recommendation explanations
│   └── json-output-format.md          # Output formatting guide
│
└── docs/                             # 📁 Technical documentation
    ├── architecture/                  # Architecture specifications
    │   ├── tech-stack.md             # Technology decisions
    │   ├── coding-standards.md       # Development patterns
    │   └── source-tree.md            # File organization
    ├── flows/                        # Process documentation
    │   ├── user-flows.md             # User interaction flows
    │   └── llm-flows.md              # AI processing flows
    └── stories/                      # Requirements and stories
        └── 1.1.game-recommender-poc.md # Main implementation story
```

### Key Modules Deep Dive

#### 🔴 Critical Modules

**`server.js`** (700+ lines)
- Express application setup and middleware
- All HTTP routes: `/`, `/generate`, `/recommend`, `/export/*`, `/api/*`
- Advanced context tracking middleware
- Server-sent events for real-time generation progress
- Token usage tracking and rate limiting
- Production error handling with user-friendly messages

**`utils/storage.js`** (270+ lines)
- Redis integration with Upstash client: `saveCustomGames()`, `clearCustomGames()`, `hasCustomGames()`
- File I/O fallbacks: `saveGames()`, `loadGames()`, `saveSettings()`, `loadSettings()`
- Serverless compatibility with Redis-first architecture
- Graceful degradation when Redis unavailable
- Default weight configuration and comprehensive error handling

**`services/gameGenerator.js`** (200+ lines)
- Anthropic Claude Sonnet 4 integration
- Advanced prompt engineering with structured JSON output
- Real-time progress tracking via Server-Sent Events
- Custom prompt handling (1-100 games with validation)
- Error recovery and graceful degradation
- Token usage tracking and optimization

**`services/similarityEngine.js`** (150+ lines)
- Weighted similarity algorithm: Theme (40%), Volatility (30%), Studio (20%), Mechanics (10%)
- Performance caching with `Map` for repeated calculations
- Top 5 recommendation selection with confidence scoring
- LLM-powered explanation generation with context awareness
- Advanced volatility level mapping: low→medium→high→ultra

#### 🟡 Important Modules

**`services/contextTracker.js`** (500+ lines)
- **Revolutionary Feature**: Deep player behavior analysis
- Work pattern detection (stealth gaming vs. dedicated leisure)
- Financial cycle awareness (payday timing, budget pressure)
- Attention span analysis (very-short to very-long sessions)
- Focus level detection (split-attention, drowsy, relaxed-engaged)
- Time-based context (work hours, lunch break, evening, late night)
- Device and system theme detection
- Confidence scoring for context quality

**`views/index.ejs`** (1200+ lines) 
- Complex main interface with multiple interactive sections
- Real-time weight slider balancing (always totals 100%)
- Dynamic game generation with progress feedback
- Custom prompt handling with validation
- Session synchronization between localStorage and server
- Advanced context visualization panels
- Export functionality integration
- Responsive design with Tailwind CSS

---

## 🗃️ Data Models and Storage

### Core Data Models

#### Game Schema (Comprehensive)
```javascript
interface Game {
  id: string;                          // Unique identifier
  title: string;                       // Game name
  studio: string;                      // Developer/publisher
  theme: string[];                     // Array of themes (Fantasy, Sports, etc.)
  volatility: "low" | "medium" | "high" | "ultra"; // Risk level
  rtp: number;                         // Return to Player percentage (2 decimals)
  maxWin: number;                      // Maximum win multiplier
  reelLayout: string;                  // e.g., "5x3", "5x4"
  paylines: number | "ways";           // Payline count or "ways to win"
  mechanics: string[];                 // Game mechanics (Wild, Scatter, etc.)
  features: string[];                  // Special features (Bonus Round, Free Spins)
  pace: "slow" | "medium" | "fast";    // Game pacing
  hitFrequency: number;                // Win frequency percentage
  bonusFrequency: number;              // Bonus trigger frequency
  artStyle: string;                    // Visual style description
  audioVibe: string;                   // Audio theme description
  visualDensity: "minimal" | "standard" | "busy"; // UI complexity
  mobileOptimized: boolean;            // Mobile compatibility
  seasonalTag?: string;                // Optional seasonal tagging
  releaseYear: number;                 // Publication year
  description: string;                 // Marketing description
}
```

#### User Settings Schema
```javascript
interface UserSettings {
  theme: number;     // 0-1 decimal (default: 0.4)
  volatility: number; // 0-1 decimal (default: 0.3)
  studio: number;    // 0-1 decimal (default: 0.2)
  mechanics: number; // 0-1 decimal (default: 0.1)
}
// Note: Always sum to 1.0 (100%)
```

### Storage Patterns

#### Redis Storage (Primary - Production)
- **Custom Games**: Stored in Upstash Redis with key `custom:games`
- **Persistence**: Permanent storage across serverless cold starts
- **Connection**: `@upstash/redis` client with REST API
- **Fallback**: Local JSON files when Redis unavailable

#### File-Based Storage (Fallback)
- **Default Games**: `data/games.json` - Default game dataset for fallbacks
- **Settings**: `data/user-settings.json` - User preference weights
- **Format**: Pretty-printed JSON with 2-space indentation
- **Serverless Handling**: Read-only compatibility, graceful degradation

#### Redis Storage Implementation
```javascript
// Upstash Redis client setup
let redis = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
} catch (error) {
  console.log('⚠️ Redis not available:', error.message);
}

// Usage patterns:
await saveCustomGames(games);          // Store custom games globally in Redis
await loadGames();                     // Load from Redis or fallback to local
await hasCustomGames();                // Check Redis for custom games
await clearCustomGames();              // Clear Redis custom games (reset feature)
```

#### Storage Functions (utils/storage.js)
```javascript
// Redis operations (primary storage)
static saveCustomGames(games)          // Store custom games in Redis
static loadGames()                     // Load from Redis or fallback to local JSON
static hasCustomGames()                // Check Redis for custom games existence
static clearCustomGames()              // Clear custom games from Redis

// File operations (fallback and local preferences)
saveGames(games)                       // Save to local data/games.json
saveSettings(settings)                 // Save user preferences locally
loadSettings()                         // Load user preferences with defaults

// Environment detection
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
```

---

## 🔗 Integration Points and External Dependencies

### External Services Integration

| **Service** | **Purpose** | **Integration** | **Key Files** | **Fallback** |
|------------|-------------|----------------|---------------|--------------|
| **Anthropic Claude** | Game generation + explanations | REST API via SDK | `gameGenerator.js`, `server.js` | Mock games, basic explanations |
| **OpenAI GPT** | Legacy LLM support | REST API via SDK | `gameGenerator.js` | Graceful degradation |
| **Vercel Platform** | Serverless hosting | Build/deployment | `vercel.json` | Traditional Node.js hosting |

### Internal Integration Architecture

#### Request Flow Patterns
1. **Game Generation Flow**:
   ```text
   User Form → POST /generate → gameGenerator.js → Anthropic API → saveSessionGames() → Redirect
   ```

2. **Recommendation Flow**:
   ```text
   User Selection → POST /recommend → loadGames(sessionId) → similarityEngine.js → 
   Context Analysis → LLM Explanations → Render Results
   ```

3. **Session Management Flow**:
   ```text
   Client localStorage ↔ /api/sync-custom-games ↔ sessionGames Map ↔ /recommend endpoint
   ```

#### Critical Integration Points

**Session ID Management**:
```javascript
// Middleware in server.js (lines 168-195)
app.use((req, res, next) => {
  if (!req.headers['x-session-id']) {
    req.sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  } else {
    req.sessionId = req.headers['x-session-id'];
  }
  res.setHeader('X-Session-ID', req.sessionId);
  next();
});
```

**Context Tracking Integration**:
```javascript
// Advanced player analysis (contextTracker.js)
req.playerContext = contextTracker.trackPlayerContext(req.sessionId, {
  referrer: req.get('Referer'),
  userAgent: req.get('User-Agent'),
  timezone: req.get('X-Timezone'),
  deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop'
});
```

---

## 🔧 Development and Deployment

### Local Development Setup

#### Prerequisites
- Node.js 18+
- Anthropic API key (recommended) or OpenAI API key
- Git for version control

#### Setup Steps
```bash
# 1. Clone repository
git clone <repository-url>
cd "Game Recommender Prototype"

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials:
# ANTHROPIC_API_KEY=your_anthropic_key_here
# KV_REST_API_URL=your_upstash_redis_url
# KV_REST_API_TOKEN=your_upstash_token
# PORT=3001

# 4. Generate initial dataset (optional - for local fallback)
node scripts/generateDefaultGames.js

# 5. Start development server
npm run dev
# Or: npm start (without hot reload)
```

#### Development Commands
```bash
npm run dev          # Development with nodemon (hot reload)
npm start           # Production mode
node scripts/generateDefaultGames.js  # Create 100-game dataset
```

### Build and Deployment Process

#### Serverless Deployment (Vercel)
- **Automatic**: Git push triggers deployment
- **Configuration**: `vercel.json` routes all requests to `server.js`
- **Environment**: Set `ANTHROPIC_API_KEY` in Vercel dashboard
- **Build**: No build step required (zero-config deployment)

#### Traditional Hosting
- **Process**: Single Node.js process (`node server.js`)
- **Port**: Environment variable `PORT` (default: 3000)
- **Assets**: Served from `/public` directory
- **Dependencies**: All production deps in `package.json`

#### Environment Configuration
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...           # Primary LLM provider
KV_REST_API_URL=https://...            # Upstash Redis REST API URL
KV_REST_API_TOKEN=...                  # Upstash Redis authentication token
PORT=3001                             # Server port (default: 3000)

# Optional
OPENAI_API_KEY=sk-...                 # Fallback LLM provider
NODE_ENV=production                   # Environment mode
VERCEL=1                             # Serverless detection (auto-set)
```

---

## 🚨 Technical Debt and Known Constraints

### Critical Technical Debt

1. **Serverless Memory Loss** (High Impact)
   - **Issue**: In-memory `sessionGames` Map cleared on cold starts
   - **Workaround**: Client-side localStorage sync before each recommendation
   - **Location**: `utils/storage.js:8`, `views/index.ejs:1060-1090`
   - **Impact**: Custom games must be re-synced frequently

2. **Mixed LLM Providers** (Medium Impact)
   - **Issue**: Code supports both Anthropic and OpenAI APIs inconsistently
   - **Current State**: Primary Anthropic, legacy OpenAI references remain
   - **Files Affected**: `gameGenerator.js`, `server.js`, `package.json`
   - **Risk**: Confusion about which provider is active

3. **Complex Main Template** (Medium Impact)
   - **Issue**: `views/index.ejs` is 1200+ lines with mixed concerns
   - **Components**: HTML, JavaScript, styling, form handling, AJAX
   - **Risk**: Difficult to maintain and debug
   - **Refactor Needed**: Split into smaller components/partials

4. **No Automated Testing** (High Impact)
   - **Issue**: No unit tests, integration tests, or automated validation
   - **Coverage**: 0% automated test coverage
   - **Manual Testing**: Primary QA method
   - **Risk**: Regressions not caught early

### Workarounds and Gotchas

#### Serverless Filesystem Constraints
```javascript
// In utils/storage.js - Detects read-only filesystem
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (isServerless) {
  console.log('⚠️ Serverless environment detected - skipping file write');
  return; // Graceful degradation
}
```

#### Session Persistence Workaround
```javascript
// Client-side sync before recommendations (index.ejs:1060-1090)
const customGames = loadCustomGames();
if (customGames && customGames.length > 0) {
  const syncResult = await syncCustomGamesToServer(customGames);
  if (!syncResult) {
    alert('Failed to sync games to server. Please try again.');
    return false;
  }
}
```

#### Weight Slider Auto-Balancing
```javascript
// Ensures sliders always total 100% (index.ejs:700+)
function balanceSliders(changedSliderId) {
  // Proportionally adjust other sliders when one changes
  // Complex algorithm maintains 100% total at all times
}
```

---

## 🧪 Testing Strategy and Quality Assurance

### Current Testing Reality

#### Test Coverage Status
- **Unit Tests**: 0% (No test framework configured)
- **Integration Tests**: 0% (No automated API testing)
- **E2E Tests**: 0% (No browser automation)
- **Manual Testing**: Primary quality assurance method

#### Manual Testing Areas
1. **Game Generation**:
   - Valid API key → Successful generation
   - Invalid/missing API key → Graceful fallback
   - Custom prompts (1-100 games) → Proper validation
   - Edge cases: Empty prompts, special characters

2. **Recommendation Engine**:
   - Game selection from dropdown → 5 similar games returned
   - Weight slider adjustment → Proportional rebalancing
   - Custom vs. default games → Proper dataset selection
   - Edge cases: Missing games, invalid selections

3. **Session Management**:
   - Custom game persistence across page refreshes
   - Session sync between localStorage and server
   - Serverless cold start recovery
   - Multiple tab/session isolation

4. **Context Intelligence**:
   - Time-based recommendations (work vs. leisure)
   - Financial cycle awareness (payday timing)
   - Device detection and theme adaptation
   - Context confidence scoring accuracy

### Testing Recommendations for Future Development

#### Suggested Test Framework Setup
```javascript
// package.json additions needed:
{
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "puppeteer": "^21.0.0"
  },
  "scripts": {
    "test": "jest",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

#### Priority Test Areas
1. **Storage Operations** (`utils/storage.js`)
2. **Similarity Algorithm** (`services/similarityEngine.js`)
3. **Session Management** (server.js middleware)
4. **LLM Integration** (`services/gameGenerator.js`)
5. **API Endpoints** (server.js routes)

---

## 🚦 Advanced Features and Context Intelligence

### Revolutionary Context Tracking System

#### Player Behavior Analysis (`services/contextTracker.js`)
The system implements advanced AI-powered player context analysis:

**Work Pattern Detection**:
```javascript
// Detects stealth gaming vs. dedicated leisure time
if (hour >= 9 && hour <= 17 && !isWeekend) {
  context = {
    focusLevel: 'split-attention',
    attentionSpan: 'very-short',
    preferredPace: 'fast',
    interruptionRisk: 'high',
    reasoning: 'work hours - supervisor may be watching'
  };
}
```

**Financial Cycle Intelligence**:
```javascript
// Payday awareness affects volatility recommendations
const dayOfMonth = now.getDate();
const financialCycle = {
  budgetPressure: dayOfMonth > 25 ? 'high' : dayOfMonth < 5 ? 'low' : 'medium',
  description: dayOfMonth < 5 ? 'post-payday comfort' : 'end-of-month caution'
};
```

**Attention Span Mapping**:
- **Very-short** (work, interruptions): Fast-paced, instant gratification
- **Short** (lunch break): High excitement, maximum entertainment
- **Medium** (evening): Balanced, exploratory gameplay
- **Long** (weekend): Immersive experiences, complex mechanics
- **Very-long** (late night): Meditative, calming experiences

### Dynamic Weight Balancing System

#### Proportional Slider Algorithm
The weight sliders implement sophisticated auto-balancing:

```javascript
// Real-time proportional adjustment (index.ejs:700+)
function updateSliders() {
  const sliders = ['theme', 'volatility', 'studio', 'mechanics'];
  let total = sliders.reduce((sum, name) => sum + parseFloat(document.getElementById(name).value), 0);
  
  // Proportionally adjust to maintain 100% total
  sliders.forEach(name => {
    const slider = document.getElementById(name);
    slider.value = (parseFloat(slider.value) / total * 100).toFixed(1);
  });
}
```

### Real-Time Generation Progress

#### Server-Sent Events Implementation
```javascript
// server.js:540-561 - SSE endpoint for live progress updates
app.get("/api/generation-progress/:sessionId", (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  global.sseConnections.set(sessionId, res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
});
```

---

## 📚 API Reference and Endpoints

### HTTP Routes Documentation

#### Core Application Routes

**`GET /`** - Home Page
- **Purpose**: Main application interface
- **Response**: Rendered `index.ejs` with games, settings, player context
- **Query Params**: 
  - `success` - Success message display
  - `error` - Error message display  
  - `prompt` - Preserved custom prompt
- **Session Handling**: Loads session-specific games if available

**`POST /generate`** - Game Generation
- **Purpose**: LLM-powered game creation (1-100 games)
- **Body**: `{ customPrompt: string }`
- **Response**: JSON (AJAX) or redirect (traditional form)
- **Features**: Progress tracking, session storage, concurrent generation prevention
- **Error Handling**: Graceful degradation with fallback games

**`POST /recommend`** - Similarity Recommendations  
- **Purpose**: Generate 5 similar game recommendations
- **Body**: `{ gameId, theme, volatility, studio, mechanics, sessionId }`
- **Response**: Rendered `recommendations.ejs`
- **Features**: Context-aware explanations, weight customization
- **Validation**: Game existence, session sync verification

#### API Endpoints

**`POST /api/sync-custom-games`** - Session Synchronization
- **Purpose**: Sync localStorage games to server session
- **Headers**: `X-Session-ID: sessionId`
- **Body**: `{ games: Game[] }`
- **Response**: `{ success: boolean, message: string }`
- **Critical**: Prevents "Selected game not found" errors

**`GET /api/generation-progress/:sessionId`** - Real-Time Updates
- **Purpose**: Server-Sent Events for generation progress
- **Response**: `text/event-stream`
- **Events**: `connected`, `progress`, `complete`, `error`

**`POST /api/enhance-explanations`** - LLM Explanations
- **Purpose**: Generate context-aware recommendation explanations
- **Body**: `{ selectedGameId, recommendations, weights, playerContext }`
- **Response**: `{ success: boolean, explanations: string[] }`
- **Features**: Unified LLM call for all 5 explanations

#### Export Routes

**`GET /export/json`** - JSON Download
- **Purpose**: Download session games as JSON file
- **Response**: `application/json` with download headers
- **Filename**: `games.json`

**`GET /export/csv`** - CSV Download
- **Purpose**: Download session games as CSV file  
- **Service**: `csvConverter.js` handles transformation
- **Response**: `text/csv` with download headers
- **Filename**: `games.csv`

### Error Handling Patterns

#### Route Error Handling
```javascript
// Standard pattern used across all routes
app.post("/route", async (req, res) => {
  try {
    const result = await businessLogicFunction(req.body);
    res.redirect("/success");
  } catch (error) {
    renderError(res, error); // Renders user-friendly error page
  }
});
```

#### AJAX vs. Traditional Form Handling
```javascript
// Detects request type and responds appropriately
const isAjaxRequest = req.headers['x-requested-with'] === 'XMLHttpRequest';
if (isAjaxRequest) {
  res.json({ success: true, data: result });
} else {
  res.redirect(`/?success=${encodeURIComponent('Operation successful')}`);
}
```

---

## 🔄 System Flows and Process Documentation

### Complete User Journey Flows

#### 1. Game Generation Flow
```text
User Input → Form Validation → POST /generate → Session Check → 
LLM API Call → Progress Updates (SSE) → JSON Parse → Session Storage → 
UI Update → Success Feedback
```

**Key Checkpoints**:
- Concurrent generation prevention (activeGenerations Set)
- Custom prompt validation (1-100 games)
- API error handling with mock fallback
- Session persistence with localStorage sync

#### 2. Recommendation Flow  
```text
Game Selection → Weight Adjustment → Client Validation → Session Sync → 
POST /recommend → Load Games → Similarity Calculation → Context Analysis → 
LLM Explanation → Result Rendering
```

**Critical Path**:
- Session game availability check
- Weight slider proportional balancing
- Context-aware explanation generation
- Real-time recommendation enhancement

#### 3. Context Intelligence Flow
```text
Request → Middleware → Device Detection → Time Analysis → 
Financial Cycle Calculation → Attention Span Assessment → 
Focus Level Detection → Context Confidence Scoring → 
Recommendation Customization
```

**Intelligence Factors**:
- Work vs. leisure time detection
- Budget pressure assessment (day of month)
- Device and system theme analysis
- Historical pattern recognition

### Technical Process Flows

#### Session Management Process
```text
Page Load → Session ID Generation/Retrieval → Context Tracking → 
Game Loading (Session → Default) → UI Initialization → 
User Interaction → Session Sync → Data Persistence
```

#### LLM Integration Process
```text
Prompt Engineering → Token Limit Check → API Authentication → 
Request Submission → Progress Monitoring → Response Validation → 
JSON Parsing → Error Recovery → Result Storage
```

#### Similarity Algorithm Process
```text
Game Selection → Feature Extraction → Weight Application → 
Score Calculation → Ranking → Top 5 Selection → 
Confidence Scoring → Context Enhancement → Result Formatting
```

---

## 📝 Developer Onboarding Checklist

### Essential Understanding (First Day)

- [ ] **Clone and Setup**: Get local environment running
- [ ] **Core Architecture**: Understand server.js structure and routing
- [ ] **Data Flow**: Trace game generation → recommendation → export flow
- [ ] **Storage Pattern**: Master utils/storage.js usage patterns
- [ ] **Session Management**: Understand sessionId handling and persistence

### Advanced Concepts (First Week)

- [ ] **Context Intelligence**: Study contextTracker.js behavior analysis
- [ ] **LLM Integration**: Understand prompt engineering and API handling  
- [ ] **Similarity Engine**: Master the weighted recommendation algorithm
- [ ] **Serverless Constraints**: Learn production deployment considerations
- [ ] **Error Handling**: Understand graceful degradation patterns

### Expert Level (First Month)

- [ ] **Performance Optimization**: Caching strategies and memory management
- [ ] **Advanced UI**: Complex EJS templating with JavaScript integration
- [ ] **Production Debugging**: Vercel deployment and monitoring
- [ ] **Technical Debt**: Understand constraints and workaround patterns
- [ ] **Context Enhancement**: Contribute to intelligence system improvements

---

## 🎯 Quick Start Commands

### Development
```bash
npm run dev           # Start with hot reload
npm start            # Production mode
node scripts/generateDefaultGames.js  # Create dataset
```

### Testing (Manual)
```bash
# Test game generation
curl -X POST http://localhost:3001/generate -d "customPrompt=Generate 10 fantasy slots"

# Test recommendation
curl -X POST http://localhost:3001/recommend -d "gameId=default-001&theme=0.4&volatility=0.3"

# Test export
curl http://localhost:3001/export/json > games.json
curl http://localhost:3001/export/csv > games.csv
```

### Debugging
```bash
DEBUG=app:* npm run dev     # Verbose logging
NODE_ENV=development npm start  # Development error messages
```

---

## 🔮 Future Enhancement Areas

### Immediate Opportunities
1. **Test Framework**: Add Jest unit testing for core algorithms
2. **Component Refactoring**: Split large EJS templates into partials  
3. **Performance Monitoring**: Add metrics and performance tracking
4. **Error Logging**: Implement structured logging system

### Medium-Term Improvements
1. **Database Integration**: Replace file storage with proper database
2. **User Authentication**: Add user accounts and preference persistence
3. **A/B Testing**: Context intelligence algorithm optimization
4. **Mobile App**: React Native or PWA implementation

### Long-Term Vision
1. **Real Casino Integration**: Connect to actual game catalogs
2. **ML Enhancement**: Train custom models on player behavior
3. **Multi-Tenant**: Support multiple casino operators
4. **Analytics Dashboard**: Business intelligence for operators

---

**Document Maintainer**: Winston (Architect Agent)  
**Last Updated**: January 2025  
**Next Review**: Quarterly or upon major changes  
**Status**: Living Document - Update with code changes