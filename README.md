# Slot Forge 🎰

> **Bally's R&D**: AI-Powered Slot Game Recommendation Engine

Intelligent slot game recommendations using deep contextual AI analysis. Generate custom games and get personalized suggestions based on your current focus level, attention span, work patterns, and financial cycle timing.

## ✨ Key Features

### 🎮 AI Game Generation
- **LLM-Powered**: Creates realistic slots using Anthropic Claude Sonnet 4
- **Custom Prompts**: Specify themes, volatility, studio preferences or creative overrides
- **Redis Storage**: Persistent custom games across serverless deployments
- **Complete Schema**: Generated games include all fields for accurate similarity scoring

### 🧠 Deep Contextual Intelligence
- **Work Pattern Analysis**: Detects stealth gaming vs. dedicated leisure time
- **Attention Span Matching**: Very-short (work) to very-long (weekend)
- **Financial Cycle Awareness**: Payday comfort vs. end-of-month caution
- **Focus Level Detection**: Split-attention, drowsy, relaxed-engaged, etc.
- **AI Explanations**: Personalized reasoning for each recommendation

### ⚖️ Dynamic Similarity Scoring
- **Theme** (40%): Similar theme importance
- **Volatility** (30%): Risk/reward pattern matching  
- **Studio** (20%): Developer preference
- **Mechanics** (10%): Bonus feature similarity
- **Weighted Algorithm**: Produces unique match percentages based on user priorities

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo-url> && cd "Game Recommender Prototype"
npm install

# Environment setup
echo "ANTHROPIC_API_KEY=your_key_here" > .env
echo "KV_REST_API_URL=your_upstash_redis_url" >> .env  
echo "KV_REST_API_TOKEN=your_upstash_token" >> .env

# Start server
npm start
```

**Open**: `http://localhost:3001`

### Usage Flow
1. **Generate**: "Generate 5 horror games" → Click Generate
2. **Select**: Choose from dropdown (custom games stored in Redis)  
3. **Adjust**: Move weight sliders to prioritize similarity factors
4. **Recommend**: Click "Find Similar Games" 
5. **Analyze**: View personalized AI explanations for each match

## 🧠 Deep Context Analysis

The AI analyzes your current situation and adapts recommendations:

### Work Hours (9-5 weekdays)
- **Reality**: Stealth gaming, supervisor watching, need alt-tab quickly
- **Recommendations**: Fast-paced, instant gratification, easy pause/resume
- **Volatility**: Low-medium (can't afford emotional investment at work)
- **Features**: Simple mechanics, muted audio, minimal surprises

### Lunch Break (12-2 weekdays)  
- **Reality**: Dedicated fun time, rushed but focused
- **Recommendations**: High-excitement, maximum entertainment per minute
- **Volatility**: High (this is your "treat time")
- **Features**: Frequent bonuses, big win potential, celebration animations

### Evening (5-11pm)
- **Reality**: True leisure time, full attention available
- **Recommendations**: Immersive themes, complex bonus rounds  
- **Volatility**: Player choice (open to exploration)
- **Features**: Story elements, varied gameplay, rich experiences

### Late Night (12-4am)
- **Reality**: Wind-down, possibly avoiding sleep
- **Recommendations**: Calming, meditative, predictable
- **Volatility**: Low (avoid adrenaline spikes)
- **Features**: Soothing visuals, soft audio, hypnotic patterns

### Weekend (10am-4pm)
- **Reality**: "Treat myself" mentality, marathon sessions possible
- **Recommendations**: Premium experiences, feature-rich games
- **Volatility**: High (weekend indulgence)
- **Features**: Exploration-worthy, social elements, complex mechanics

## 💰 Financial Cycle Intelligence

### Post-Payday (Days 1-5)
- **Mindset**: Optimistic, risk-tolerant, "treat myself" mode
- **Recommendations**: Higher volatility, premium features, big win messaging

### Mid-Month (Days 10-20)
- **Mindset**: Comfortable, balanced approach
- **Recommendations**: Standard volatility, varied experiences

### Pre-Payday (Days 21+)
- **Mindset**: Budget-conscious, entertainment-focused
- **Recommendations**: Lower volatility, emphasize fun over wins

### End-of-Month (Last 5 days)  
- **Mindset**: Cautious, may feel guilty about gambling
- **Recommendations**: Entertainment value focus, avoid big win messaging

## 💡 Example Prompts

```
Generate 5 horror games with zombies, vampires, and witches
Create 10 high-volatility games for experienced players  
Generate 25 sports slots for football season
Create fantasy dragon slots with magical themes
Generate diverse slots with creative custom themes
```

## 🔧 Technical Architecture

**Stack**: Node.js + Express + EJS + Tailwind CSS + Anthropic Claude API + Upstash Redis

**Storage**: 
- Redis (Upstash) for persistent custom games in serverless environments
- Session-based context tracking for recommendations

**Similarity Algorithm**:
- Weighted scoring: Theme (40%) + Volatility (30%) + Studio (20%) + Mechanics (10%)
- Produces unique match percentages (e.g., 48%, 36%, 33%, 31%)
- Dynamic weight adjustment affects ranking order

**Context Analysis**:
- Real-time temporal pattern detection (work vs. leisure)
- Financial cycle awareness (payday vs. end-of-month)
- Attention span and focus level assessment
- Device and usage pattern recognition

## 🚀 Deployment

**Production**: Vercel with Upstash Redis

**Requirements**:
- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` for Redis storage

## 📚 Developer Resources

### 🏗️ Architecture & Development
- **[Complete Developer Guide](docs/DEVELOPER_GUIDE.md)** - Comprehensive technical documentation
  - Project structure and file organization
  - Data flows and integration points  
  - API reference and technical patterns
  - Development setup and deployment
  - Technical debt and known constraints

### 📋 Technical Documentation
- **[Tech Stack](docs/architecture/tech-stack.md)** - Technology choices and rationale
- **[Coding Standards](docs/architecture/coding-standards.md)** - Development patterns and rules
- **[User Flows](docs/flows/user-flows.md)** - User interaction documentation
- **[LLM Flows](docs/flows/llm-flows.md)** - AI processing workflows

### 🎯 Project Analysis  
- **[Assessment Comparison](ASSESSMENT_COMPARISON.md)** - Project vs. original Bally's brief analysis

## 🔍 Troubleshooting

**Generation Issues**: Check ANTHROPIC_API_KEY and credits  
**Redis Errors**: Verify KV_REST_API_URL and KV_REST_API_TOKEN are set
**Recommendation Errors**: Generate custom games first, check Redis connection at `/api/debug-redis`  
**Context Issues**: Check browser console for temporal analysis logs
**Similarity Scoring**: Weight sliders affect ranking - adjust to see different results

---

**AI-Powered Slot Recommendations** • **Redis Serverless Storage** • **Built for Bally's R&D**