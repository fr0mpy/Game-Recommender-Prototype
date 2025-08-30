# Source Tree - Slot Forge

## Project Structure

```
slot-forge/
├── server.js                          # Main Express application entry point (700+ lines)
├── package.json                       # Dependencies: @anthropic-ai/sdk, @upstash/redis, vercel, etc.
├── package-lock.json                  # Dependency lock file
├── vercel.json                        # Vercel serverless deployment configuration
├── .env                               # Environment variables (not in git)
├── .env.example                       # Environment template (API keys, Redis)
├── .gitignore                         # Git ignore file
├── server.log                         # Server runtime logs (development)
│
├── data/                              # Local fallback storage
│   ├── games.json                     # Default games dataset for fallback
│   └── recommendation-weights.json             # Local user weight preferences
│
├── utils/                             # Core utilities
│   └── storage.js                     # Redis storage + file I/O operations (270+ lines)
│
├── services/                          # Business logic services
│   ├── gameGenerator.js               # LLM integration with Anthropic Claude
│   ├── similarityEngine.js            # Weighted recommendation algorithm
│   ├── contextTracker.js              # Advanced player behavior analysis (500+ lines)
│   └── csvConverter.js                # CSV export functionality
│
├── views/                             # EJS templates
│   ├── index.ejs                      # Main UI with generation/recommendation (1200+ lines)
│   ├── recommendations.ejs            # Recommendation results display
│   ├── error.ejs                      # Error page with troubleshooting
│   └── partials/                      # Template components
│       ├── header.ejs                 # Common header with Tailwind
│       └── footer.ejs                 # Common footer
│
├── public/                            # Static assets
│   ├── favicon.ico                    # Site icon
│   └── test.html                      # Development testing page
│
├── scripts/                           # Data generation utilities
│   ├── generateGames.js               # Create default game dataset
│   ├── create-default-games.js        # Alternative generation script
│   ├── create-premium-games.js        # Premium game variants
│   └── createDiverseGames.js          # Diverse dataset creation
│
├── prompts/                           # LLM prompt engineering
│   ├── slot-forge-system-prompt.md   # Main generation prompt (800+ lines)
│   ├── slot-forge-generation-instructions.md # Generation rules
│   ├── match-explanation-prompt.md    # Recommendation explanations
│   └── json-output-format.md          # Output formatting guide
│
└── docs/                              # Technical documentation
    ├── DEVELOPER_GUIDE.md             # Complete developer reference
    ├── architecture/                  # Architecture specifications
    │   ├── tech-stack.md              # Technology decisions
    │   ├── coding-standards.md        # Development patterns
    │   └── source-tree.md             # This file
    ├── flows/                         # Process documentation
    │   ├── user-flows.md              # User interaction flows
    │   └── llm-flows.md               # AI processing flows
    └── stories/                       # Requirements and stories
        └── 1.1.game-recommender-poc.md # Main implementation story
```

## File Responsibilities

### Core Application Files

**`server.js`**

- Express app setup and configuration
- Route definitions (/, /generate, /recommend, /export/\*)
- Error handling middleware
- Server startup and port binding

**`package.json`**

- Project metadata and scripts
- Dependencies: @anthropic-ai/sdk, @upstash/redis, express, ejs, vercel
- Start script: `node server.js`
- Dev script: `nodemon server.js --ext js,ejs`

**`vercel.json`**

- Vercel serverless deployment configuration
- Routes all requests to server.js
- Uses @vercel/node build process

### Data Layer

**`data/games.json`**

- Default fallback dataset of slot games
- Used when Redis unavailable or for initial load
- Schema matches Game interface specification
- Persistent file for serverless compatibility

**`data/recommendation-weights.json`**

- User preference weights for recommendations
- Default: `{ theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1 }`
- Persists across sessions

### Utility Layer

**`utils/storage.js`**

- `saveCustomGames(games)` - Store custom games in Redis
- `loadGames()` - Load from Redis or fallback to local JSON
- `hasCustomGames()` - Check Redis for custom games
- `clearCustomGames()` - Clear Redis custom games (reset feature)
- `saveSettings(settings)` - Write local user preferences
- `loadSettings()` - Read user preferences with defaults
- Upstash Redis client integration with graceful fallback

### Services Layer

**`services/gameGenerator.js`**

- `generateGames()` - Call Anthropic Claude API with SlotForge prompt
- Advanced prompt engineering with structured JSON output
- Real-time progress tracking via Server-Sent Events
- Custom prompt handling (1-100 games with validation)
- Integration with Redis storage utilities

**`services/contextTracker.js`**

- Advanced player behavior analysis (500+ lines)
- Work pattern detection (stealth gaming vs. leisure)
- Financial cycle awareness (payday timing, budget pressure)
- Attention span analysis and focus level detection
- Time-based context (work hours, evening, late night)
- Device and system theme detection with confidence scoring

**`services/similarityEngine.js`**

- `calculateSimilarity(game1, game2, weights)` - Core algorithm
- `getRecommendations(gameId, weights, count)` - Main recommendation function
- `volatilityLevel(game)` - Helper for volatility matching
- Caching logic for performance

**`services/csvConverter.js`**

- `convertToCSV(games)` - Transform JSON to CSV format
- Header generation and data serialization
- Used by export endpoints

### View Layer

**`views/index.ejs`**

- Home page template
- Game generation form
- Game selection dropdown
- Weight configuration sliders
- Export links

**`views/recommendations.ejs`**

- Recommendation results display
- Game cards with confidence scores
- Metadata badges (theme, volatility, RTP)
- Back navigation

**`views/error.ejs`**

- Error message display
- Retry options
- User-friendly error handling

**`views/partials/`**

- Reusable template components
- Common header/footer elements
- Consistent styling and navigation

### Static Assets

**`public/style.css`**

- Custom CSS overrides (minimal)
- Project-specific styling beyond Tailwind
- Optional - most styling via Tailwind CDN

## Development Workflow

### Local Development

```bash
npm install          # Install dependencies
cp .env.example .env # Configure environment (API keys + Redis)
npm run dev          # Start with nodemon (hot reload)
```

### File Creation Order

1. Create project structure directories
2. Set up `package.json` and dependencies
3. Create `utils/storage.js` for file operations
4. Build `services/` modules
5. Create EJS templates in `views/`
6. Set up `server.js` with routes
7. Test and refine

### Testing Strategy

- **Manual Testing**: Use browser to test all flows
- **Error Testing**: Invalid API keys, malformed JSON
- **Performance Testing**: Large datasets, concurrent users
- **File System Testing**: Missing files, permission errors

## Deployment Structure

### Environment Files

- `.env.example` - Template for API keys and Redis connection
- `.env` - Local development configuration (gitignored)
- Production uses Vercel environment variables for Redis and API keys

### Deployment Process

**Vercel Serverless**:
- **No build required** - Direct Node.js execution
- Automatic deployment on git push
- Environment variables set in Vercel dashboard
- Redis connection via Upstash integration

**Local Development**:
- Static assets served from `/public`
- Templates rendered server-side at request time
- Hot reload with nodemon

### Current Dependencies

**Production**:
- `@anthropic-ai/sdk` - Primary LLM integration
- `@upstash/redis` - Serverless Redis client
- `express` - Web framework
- `ejs` - Template engine
- `dotenv` - Environment configuration
- `vercel` - Deployment CLI
- `openai` - Legacy LLM support

**Development**:
- `nodemon` - Hot reload development server

**Architecture Benefits**:
- **Serverless Ready**: Zero-config Vercel deployment
- **Redis Persistence**: Custom games survive cold starts
- **Graceful Degradation**: Falls back to local storage when Redis unavailable
- **No Build Process**: Direct file execution with CDN-based styling
- **Ultra-Lightweight**: Minimal dependencies, maximum performance

This structure supports rapid development, serverless deployment, and persistent data storage while maintaining architectural simplicity.
