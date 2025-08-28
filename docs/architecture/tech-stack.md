# Tech Stack - Game Recommender Prototype

## Technology Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Backend Language | JavaScript (Node.js) | 18+ | Server runtime | Simple, fast development for POC |
| Backend Framework | Express.js | ^4.18.0 | Web server | Minimal setup, proven performance |
| Template Engine | EJS | ^3.1.0 | Server-side rendering | Simple templating, no build step |
| LLM Integration | OpenAI API | ^4.0.0 | Game generation & explanations | Best-in-class LLM capabilities |
| Environment Config | dotenv | ^16.3.0 | Environment variables | Standard Node.js configuration |
| Data Storage | JSON Files | N/A | File-based persistence | No database complexity for POC |
| Frontend Styling | Tailwind CSS | ^3.3.0 (CDN) | Rapid styling | Fast development, no build process |
| Development Tool | nodemon | ^3.0.0 | Hot reload | Developer experience |

## Key Technology Decisions

### Ultra-Lightweight Approach
- **No TypeScript** - JavaScript for maximum simplicity
- **No Build Process** - Direct file serving and EJS rendering
- **No Database** - JSON file storage for POC speed
- **CDN Dependencies** - Tailwind via CDN, no bundling

### Server-First Architecture
- **EJS Templates** - Server-rendered HTML pages
- **Form-Based Interactions** - Standard HTML forms, minimal client JS
- **File-Based Storage** - `games.json`, `user-settings.json`
- **In-Memory Caching** - Similarity calculations cached in RAM

### Deployment Ready
- **Express.js** - Production-ready web server
- **Environment Variables** - 12-factor app compliance
- **Error Handling** - Graceful degradation for all failure modes
- **Simple Deployment** - Single process, minimal dependencies