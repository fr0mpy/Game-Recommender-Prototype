# 🎰 Slot Forge

**Bally's R&D AI-Powered Casino Game Recommendation Engine**

A sophisticated prototype that demonstrates how AI can enhance casino game recommendations by combining content similarity, player context, and temporal awareness to deliver personalized gaming suggestions. Built for the European market with comprehensive context tracking and instant performance.

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/fr0mpy/Slot-Forge
cd Slot-Forge
npm install

# Set up your AI API key
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=your_key_here

# Start the development server
npm run dev
# Open http://localhost:3001 (instant page loads with 100 pre-generated games)
```

---

## 🎯 What This Prototype Demonstrates

### **Core Concept**

When a casino player finishes playing a slot game, the system suggests:

> _"Because you played **Dragon's Fortune**, you might like..."_

...followed by 3-5 similar games with **confidence scores** and **AI-generated explanations**.

### **Why This Matters for Bally's**

- **Increased Player Engagement**: Keep players in the gaming ecosystem longer
- **Cross-Sell Opportunities**: Leverage Bally Sports data for targeted recommendations
- **Personalization**: Adapt recommendations based on player context and behavior
- **Revenue Optimization**: Guide players to games they're most likely to enjoy and play

---

## ✨ Latest Improvements (August 2025)

### **Production-Ready Reliability & UX**
- **Vercel Deployment Fixed**: Resolved file system issues for serverless deployment
- **100 Generic Default Games**: Ships with diverse themes (fantasy, adventure, sci-fi, western, etc.) instead of sports-only
- **Session-Based Game Management**: Generated games replace defaults only for current session
- **Double-Click Protection**: Prevents concurrent generations and button hanging issues
- **Dynamic Context Tracking**: Real user data tracking without static files
- **Custom Prompt Persistence**: User inputs persist after generation (e.g., "ALIEN FOCUSED" stays in field)

### **Revolutionary Speed & Performance Improvements**
- **Parallel Chunk Processing**: All chunks now generate simultaneously instead of sequentially
- **5x Speed Improvement**: 100-game generation reduced from 6.7 minutes to 1.3 minutes
- **Claude 4 Sonnet Integration**: Latest model with 15K token output limit for superior JSON generation
- **100% AI Success Rate**: Eliminated fallback games with reliable parallel processing
- **Smart Load Balancing**: Distributes generation load across multiple concurrent API calls

### **Enhanced AI Security & Reliability**
- **Non-Game Request Filtering**: Blocks requests for code writing, explanations, etc. with red error messages
- **Prompt Injection Protection**: Sanitizes user inputs while preserving legitimate game generation requests
- **Enhanced JSON Parsing**: Improved error recovery with robust cleanup for malformed AI responses
- **Modular Prompt Architecture**: Separated system prompts, generation instructions, and JSON formatting rules
- **Extended Timeout Handling**: 90-second timeouts per chunk with parallel processing

### **Custom Generation Features**
- **Thematic Specialization**: Custom prompts like "ALIEN FOCUSED" or "ocean and pirate themed" work perfectly
- **Session Isolation**: Generated games don't affect other users - each session gets its own game set
- **Smart Input Validation**: Allows creative game requests while blocking non-game generation attempts
- **Prompt Simplification**: Default changed from "Generate 100 fictional slot games using AI" to "Generate 100 slot games"

### **Enhanced Player Context Analysis**
- **Dynamic Session Tracking**: No static files - each user gets real-time context analysis
- **Real-time System Detection**: Automatically detects user's system theme (dark/light mode) and timezone
- **European Market Focus**: Updated holidays and sports seasons for EU audience (Premier League, Champions League, Euros, Oktoberfest, etc.)
- **Advanced Context Confidence Scoring**: 30-100% confidence based on available data quality
- **Client-Side Detection**: JavaScript automatically captures and sends timezone/theme data to server

### **Performance & Reliability**
- **Instant Page Loads**: No LLM calls on home page - uses static 100-game dataset
- **Smart Timeout Handling**: 60-second timeouts on chunked generation with graceful fallbacks
- **Robust Error Recovery**: All LLM failures fall back to rule-based alternatives
- **Static Game Dataset**: 100 high-quality pre-generated games available immediately
- **Enhanced JSON Cleanup**: Advanced parsing with support for common formatting issues

### **Enhanced User Experience**
- **Improved Visual Design**: Professional styling with opacity variations for depth
- **Better Context Display**: Three-column layout showing Device & System, Traffic Source, and Time & Location
- **Bally Sports Integration**: Prominent detection and highlighting of Bally Sports referrers
- **Responsive Mobile Support**: Works seamlessly on all device types
- **Clickable Header**: Slot Forge header now links to home page for better navigation

---

## 🏗️ System Architecture

### **Three-Layer Intelligence System**

```
🎮 Game Content Layer     →  Theme, volatility, mechanics similarity
🧠 Player Context Layer   →  Sports preferences (X-Sell), session history, device
🌍 Temporal Context Layer →  Holidays, seasons, time of day, events
                             ↓
                        🎯 Unified Recommendations
```

### **Component Overview**

#### **1. AI Game Generation** (`services/gameGenerator.js`)

- Generates 100+ fictional slot games using **Claude 4 (3.5 Sonnet)**
- Rich game metadata: themes, volatility, RTP, mechanics, features
- Ensures mathematical consistency and market distribution
- **Model Choice**: Claude 4 for complex JSON generation (8192 token limit, 100% reliability)

#### **2. Similarity Engine** (`services/similarityEngine.js`)

- **Content-based filtering** with configurable weights
- **AI-generated explanations** using **Claude 3 Haiku** (fast, cost-effective)
- Smart caching for performance optimization
- **Model Choice**: Haiku for quick explanation generation (low latency)

#### **3. Context Tracker** (`services/contextTracker.js`)

- **Player profiling**: Device, referrer, session history
- **Temporal awareness**: Holidays, sports seasons, time patterns
- **Confidence scoring**: 30-100% based on data quality
- **Bally's Sports integration**: Cross-sell opportunity detection

#### **4. Web Interface** (EJS Templates)

- **Real-time context display**: Shows confidence and factors
- **Interactive controls**: Adjustable similarity weights
- **Responsive design**: Works on mobile and desktop

---

## 🧠 How the AI Components Work

### **Dual-Model Architecture**

**🎯 Optimized Model Selection:**
- **Claude 4 Sonnet**: Game generation (complex JSON, 15K token limit, 100% reliability)
- **Claude 3 Haiku**: Recommendations explanations (fast, cost-effective, 4096 token limit)

This hybrid approach balances **quality** (Claude 4 for complex tasks) with **speed/cost** (Haiku for simple tasks).

**⚡ Revolutionary Performance:**
- **Parallel Processing**: 5 chunks of 20 games run simultaneously
- **Speed**: 100 games in 77 seconds (vs 400 seconds sequential)
- **Reliability**: 100% AI-generated success rate

### **Game Generation Process**

1. **System Prompt**: Comprehensive SlotForge persona with mathematical requirements
2. **User Prompt**: Custom generation instructions (default: 100 diverse games)  
3. **Model**: Claude 4 Sonnet for 100% reliable JSON generation (15K tokens)
4. **Parallel Processing**: 20 games per chunk, all chunks run simultaneously
5. **Performance**: 5x speed improvement through concurrent API calls
6. **JSON Validation**: Smart parsing with error recovery
7. **Schema Compliance**: Ensures all games match required structure

```javascript
// Example generated game
{
  "id": "game-001",
  "title": "Dragon's Fortune",
  "studio": "Mystic Reels",
  "theme": ["Fantasy", "Dragons"],
  "volatility": "high",
  "rtp": 96.5,
  "mechanics": ["Wild", "Scatter", "Free Spins"],
  "description": "Epic dragon-themed slot with cascading wins..."
}
```

### **Recommendation Algorithm**

**Multi-Signal Scoring:**

- **Theme Similarity** (40%): Exact + partial theme matches
- **Volatility Matching** (30%): Same or adjacent risk levels
- **Studio Preference** (20%): Developer consistency
- **Mechanics Overlap** (10%): Shared gameplay features

**Enhanced with Context:**

- **Holiday Themes**: Christmas games in December, Halloween in October
- **Sports Seasons**: Football games during Prem, Championship, Euros
- **Time-based**: Evening vs. workday recommendations, weekends, payday
- **Cross-sell**: Sports betting to casino game transitions

### **AI Explanation Generation**

Each recommendation includes a natural language explanation:

> _"Both games feature Egyptian adventure themes with treasure-hunting mechanics and cascading reels that create exciting win chains."_

Generated using a specialized prompt focusing on player appeal and strongest similarities.

---

## 📊 Player Context Intelligence

### **Confidence Scoring System**

The system calculates a **0-100% confidence score** based on available data:

| **Data Source**       | **Confidence Boost**    | **What It Provides**           |
| --------------------- | ----------------------- | ------------------------------ |
| Bally Sports Referrer | +25%                    | Strong cross-sell signal       |
| Search Engine Traffic | +15%                    | Organic discovery context      |
| Session History       | +5% per visit (max 20%) | Returning player patterns      |
| Geographic/Timezone   | +10%                    | Location-aware recommendations |
| Stored Preferences    | +15%                    | Personalized weight settings   |
| Device Detection      | +5%                     | Mobile vs desktop optimization |

### **Temporal Context Awareness**

**Active Holiday Detection (EU Focus):**

- Christmas (Dec 20-26): Promotes holiday-themed games
- Halloween (Oct 29-Nov 1): Highlights horror/dark themes
- Oktoberfest (Sep 16-Oct 3): German beer and celebration themes
- Europe Day (May 8-10): Unity and European themes
- Guy Fawkes (Nov 4-6): British bonfire themes
- _+ 8 other major EU holidays_

**Sports Season Integration (European Markets):**

- **Premier League** (Aug-May): Football-themed game promotion during peak season
- **Champions League** (Sep-May): Elite European football tournaments
- **Euros/World Cup**: Major international tournament themes
- **Formula 1** (Mar-Nov): Racing and speed themes during F1 season
- **Wimbledon** (July): Tennis championship themes
- **Rugby Six Nations** (Feb-Mar): Rugby tournament promotion

**Play Time Context:**

- **Work Hours** (9am-5pm weekdays): "Casual play" mode
- **Evening** (5pm-11pm): "Prime gaming time"
- **Weekend Days**: "Leisure time" extended sessions
- **Late Night** (12am-4am): "Night owl" gaming patterns

---

## 🎮 User Experience Flow

### **1. Landing Page**

```
🎯 Player Context Analysis
├─ Confidence: 65% (Medium data quality)
├─ ✓ Desktop device  ✓ Evening session  ✓ NFL season active
└─ 🏈 Sports Cross-sell Opportunity: NFL betting detected
```

### **2. Game Selection**

- Dropdown with 100+ AI-generated games
- Shows: "Game Title - Studio (Volatility, RTP%)"
- Configurable similarity weights with live sliders

### **3. Recommendation Results**

```
🔍 Similar Games

[85% Match] Enchanted Gems - Mystic Reels
🎨 Fantasy  ⚡ Medium Volatility  💰 95.8% RTP
"Both games feature magical themes with expanding symbols
and free spin bonuses for balanced excitement."
```

### **4. Context-Aware Suggestions**

- **Holiday Boost**: Christmas games get +20% during December
- **Sports Cross-sell**: Football themes promoted to Bally Sports users
- **Time Sensitivity**: Different games for evening vs. workday sessions

---

## 🚀 Running the System

### **Prerequisites**

- Node.js 16+
- Anthropic API Key (supports both Claude 4 and Claude 3 Haiku)

### **Environment Setup**

```bash
# Required environment variables (.env)
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001                           # Optional, defaults to 3000
NODE_ENV=development               # Optional
```

### **Development Commands**

```bash
npm start          # Production server
npm run dev        # Development with nodemon
npm test           # Run test suite (if implemented)
```

### **Key Endpoints**

- `GET /` - Main interface with context analysis
- `POST /generate` - Generate new games via AI
- `POST /recommend` - Get personalized recommendations
- `GET /export/json` - Download game dataset
- `GET /export/csv` - Export games as spreadsheet

---

## 📁 Project Structure

```
Slot Forge/
├── services/
│   ├── gameGenerator.js         # AI game generation
│   ├── similarityEngine.js     # Recommendation algorithm
│   ├── contextTracker.js       # Player context analysis
│   └── csvConverter.js          # Data export utilities
├── utils/
│   └── storage.js               # File-based data persistence
├── views/
│   ├── index.ejs                # Main interface
│   ├── recommendations.ejs      # Results display
│   └── partials/                # Shared templates
├── data/
│   ├── games.json              # AI-generated game dataset
│   ├── user-settings.json      # Player preferences
│   └── player-context.json     # Session tracking data
├── prompts/
│   ├── slot-forge-system-prompt.md      # Core AI personality and constraints
│   ├── slot-forge-generation-instructions.md # Specific generation tasks
│   ├── json-output-format.md            # JSON formatting requirements
│   └── match-explanation-prompt.md      # Recommendation explanations
└── server.js                    # Express application entry point
```

---

## 🔧 Configuration & Customization

### **Similarity Weight Tuning**

Adjust the recommendation algorithm via UI sliders:

- **Theme Similarity**: 0-100% (default: 40%)
- **Volatility Matching**: 0-100% (default: 30%)
- **Studio Preference**: 0-100% (default: 20%)
- **Mechanics Overlap**: 0-100% (default: 10%)

### **AI Game Generation**

Customize the generation prompt via the web interface with built-in security:

```
Default: "Generate 100 fictional slot games using AI"
Custom: "Create 50 sports-themed games for football season"
Sports Example: "Generate 100 fictional slot games - MUST BE SPORTS FOCUSSED"
```

**Security Features:**
- Prompt injection protection sanitizes malicious inputs
- Content filtering preserves legitimate requests while blocking harmful patterns
- Input validation prevents role manipulation and system override attempts

### **Context Tracking**

The system automatically tracks:

- Session IDs and visit counts (localStorage)
- Device and browser information
- Referrer sources (especially Bally Sports)
- Temporal context (holidays, seasons, time)

---

## 🚦 Production Readiness

### **What's Production-Ready**

✅ **AI Integration**: Robust Claude API integration with fallbacks  
✅ **Error Handling**: Graceful degradation and user-friendly messages  
✅ **Context Tracking**: Comprehensive player profiling system  
✅ **Data Persistence**: File-based storage with cleanup routines  
✅ **Responsive UI**: Mobile-first design with Tailwind CSS

### **What Needs Enhancement for Production**

🔄 **Database**: Replace file storage with PostgreSQL/MongoDB  
🔄 **Caching**: Add Redis for recommendation result caching  
🔄 **Authentication**: Integrate with Bally's user system  
🔄 **Analytics**: Add comprehensive event tracking  
🔄 **A/B Testing**: Framework for algorithm optimization  
🔄 **Compliance**: Responsible gaming features and data privacy

### **Scalability Considerations**

- **Vector Embeddings**: For semantic game similarity beyond keywords
- **Machine Learning**: Replace rule-based scoring with trained models
- **Real-time Events**: WebSocket integration for live recommendations
- **Microservices**: Split into recommendation, context, and generation services

---

## 📈 Success Metrics (for Production)

### **Player Engagement**

- Click-through rate on recommendations
- Time spent exploring recommended games
- Return session frequency after recommendations

### **Revenue Impact**

- Revenue per recommended game session
- Cross-sell conversion from sports betting
- Player lifetime value improvement

### **System Performance**

- Recommendation generation time (<200ms target)
- Context confidence score distribution
- AI explanation quality ratings

---

## 🤖 AI & Machine Learning Components

### **Current Implementation**

- **Claude 4 Sonnet**: Complex JSON game generation (100% reliability, 15K tokens, parallel processing)
- **Claude 3 Haiku**: Fast explanation generation (low latency, cost-effective)
- **Rule-based Algorithm**: Transparent, configurable similarity scoring
- **Context Awareness**: Temporal and behavioral pattern recognition

### **Future ML Opportunities**

- **Collaborative Filtering**: "Players like you also enjoyed..."
- **Deep Learning Embeddings**: Semantic understanding of game descriptions
- **Reinforcement Learning**: Optimize recommendations based on player feedback
- **Natural Language Processing**: Advanced explanation generation

---

## 💡 Business Applications

### **For Bally's Casino Division**

- **Player Retention**: Keep players engaged with personalized suggestions
- **Game Discovery**: Help players find new favorites from large catalogs
- **Revenue Optimization**: Guide players to higher-value gaming experiences

### **For Bally's Sports Integration**

- **Cross-platform Engagement**: Sports betters → Casino games
- **Seasonal Campaigns**: NFL season → football-themed slots
- **Event-driven Marketing**: March Madness → basketball game promotions

### **For Game Developers**

- **Market Research**: Understanding player preferences and trends
- **Game Design Insights**: Popular theme and mechanic combinations
- **Performance Analytics**: Which games succeed in recommendations

---

## 🔍 Technical Deep Dive

### **Game Generation Process**

1. **Prompt Engineering**: Detailed 400+ line system prompt with mathematical constraints
2. **Schema Validation**: 18 required fields with type checking and range validation
3. **Market Distribution**: Ensures realistic RTP, volatility, and theme distributions
4. **Content Quality**: Prevents duplicate titles and maintains thematic consistency

### **Recommendation Algorithm**

```javascript
// Simplified scoring logic
function calculateSimilarity(game1, game2, weights) {
  let score = 0;

  // Theme matching with partial credit
  const themeOverlap = countSharedElements(game1.theme, game2.theme);
  score += (themeOverlap / game1.theme.length) * weights.theme;

  // Volatility proximity scoring
  score +=
    volatilityMatch(game1.volatility, game2.volatility) * weights.volatility;

  // Studio and mechanics similarity
  score += studioMatch(game1.studio, game2.studio) * weights.studio;
  score +=
    mechanicsOverlap(game1.mechanics, game2.mechanics) * weights.mechanics;

  return Math.min(score, 1.0); // Cap at 100%
}
```

### **Context Integration**

```javascript
// Enhanced scoring with context
function getEnhancedRecommendations(gameId, playerContext) {
  const baseRecommendations = getSimilarGames(gameId);

  return baseRecommendations.map((rec) => ({
    ...rec,
    contextBoost: calculateContextBoost(rec.game, playerContext),
    explanation: generateContextualExplanation(rec.game, playerContext),
    flags: determineRecommendationFlags(rec.game, playerContext),
  }));
}
```

---

## 📞 Support & Development

### **Getting Help**

- Check the `requirements.md` for detailed specifications
- Review `technical-specifications.md` for architecture details
- Examine the prompt files for AI behavior customization

### **Contributing**

This is a research prototype for Bally's R&D. For production deployment:

1. Implement proper user authentication
2. Add comprehensive testing suite
3. Set up monitoring and logging
4. Integrate with existing Bally's infrastructure

### **Contact**

**Project Owner**: Jay Compson  
**Purpose**: Bally's R&D AI Game Recommendation Research  
**Status**: Functional Prototype (August 2025)

---

## 🎯 Key Takeaway

This prototype demonstrates that **AI-powered game recommendations** can be significantly enhanced by combining **content similarity**, **player context awareness**, and **temporal intelligence**.

The system doesn't just suggest similar games—it understands **when** and **why** to suggest them based on player behavior, seasonal events, and cross-platform opportunities within the Bally's ecosystem.

**Ready to revolutionize casino game discovery! 🎰**
