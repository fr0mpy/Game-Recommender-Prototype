# Source Tree - Slot Forge

## Project Structure

```
slot-forge/
├── server.js                          # Main Express application entry point
├── package.json                       # Dependencies: express, ejs, dotenv, openai
├── package-lock.json                  # Dependency lock file
├── .env                               # Environment variables (not in git)
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore file
│
├── data/                              # File-based storage (gitignored)
│   ├── games.json                     # Generated slot games dataset
│   └── user-settings.json             # User weight preferences
│
├── utils/                             # Utility functions
│   └── storage.js                     # File I/O operations (saveGames, loadGames, etc.)
│
├── services/                          # Business logic
│   ├── gameGenerator.js               # LLM integration for game generation
│   ├── similarityEngine.js            # Recommendation calculation logic
│   └── csvConverter.js                # CSV export functionality
│
├── views/                             # EJS templates
│   ├── index.ejs                      # Home page with game selection
│   ├── recommendations.ejs            # Recommendation results page
│   ├── error.ejs                      # Error page template
│   └── partials/                      # Reusable template components
│       ├── header.ejs                 # Common header
│       └── footer.ejs                 # Common footer
│
├── public/                            # Static assets
│   ├── style.css                      # Custom CSS (if needed beyond Tailwind CDN)
│   └── favicon.ico                    # Site icon
│
├── docs/                              # Documentation
│   ├── requirements.md                # PRD requirements
│   ├── technical-specifications.md    # Implementation details
│   ├── user-flows.md                  # User interaction flows
│   ├── llm-flows.md                   # LLM processing flows
│   └── architecture/                  # Architecture documentation
│       ├── tech-stack.md              # Technology choices
│       ├── coding-standards.md        # Development rules
│       └── source-tree.md             # This file
│
└── slot-game-generator-system-prompt.md  # LLM generation prompt
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
- Minimal dependencies: express, ejs, dotenv, openai
- Start script: `node server.js`
- Dev script: `nodemon server.js`

### Data Layer

**`data/games.json`**

- Generated dataset of 100 fictional slot games
- Schema matches interface from requirements.md
- Created by LLM, consumed by similarity engine
- Gitignored - regenerated as needed

**`data/user-settings.json`**

- User preference weights for recommendations
- Default: `{ theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1 }`
- Persists across sessions

### Utility Layer

**`utils/storage.js`**

- `saveGames(games)` - Write games to JSON file
- `loadGames()` - Read games from JSON file
- `saveSettings(settings)` - Write user preferences
- `loadSettings()` - Read user preferences with defaults
- All file I/O goes through these functions

### Services Layer

**`services/gameGenerator.js`**

- `generateGames()` - Call OpenAI API with SlotForge prompt
- JSON parsing with error handling
- Integration with storage utilities

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
cp .env.example .env # Configure environment
npm run dev          # Start with nodemon
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

- `.env.example` - Template for required environment variables
- `.env` - Local development configuration (gitignored)
- Production uses platform environment variables

### Build Process

- **No build required** - Direct file execution
- Static assets served directly from `/public`
- Templates rendered server-side at request time

### Dependencies

- **Production**: express, ejs, dotenv, openai
- **Development**: nodemon (optional)
- **No frontend build tools** - CDN-based styling

This structure supports rapid development, easy deployment, and clear separation of concerns while maintaining the ultra-lightweight architecture.
