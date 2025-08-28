# Slot Forge 🎰

> **Bally's R&D**: AI-Powered Slot Game Recommendation Engine

Intelligent slot game recommendations using deep contextual AI analysis. Generate custom games (1-100) and get personalized suggestions based on your current focus level, attention span, work patterns, and financial cycle timing.

## ✨ Key Features

### 🎮 Smart Game Generation (1-100 games)
- **AI-Powered**: Creates realistic slots using Anthropic Claude Sonnet 4
- **Custom Prompts**: Specify themes, volatility, studio preferences  
- **Validation**: Enforced 1-100 game limits with clear errors
- **Session Persistence**: Generated games saved throughout session

### 🧠 Deep Contextual Intelligence
- **Work Pattern Analysis**: Detects stealth gaming vs. dedicated leisure time
- **Attention Span Matching**: Very-short (work) to very-long (weekend)
- **Financial Cycle Awareness**: Payday comfort vs. end-of-month caution
- **Focus Level Detection**: Split-attention, drowsy, relaxed-engaged, etc.
- **AI Explanations**: Personalized reasoning for each recommendation

### ⚖️ Proportional Weight Sliders (Always 100%)
- **Theme** (40%): Similar theme importance
- **Volatility** (30%): Risk/reward pattern matching  
- **Studio** (20%): Developer preference
- **Mechanics** (10%): Bonus feature similarity
- **Auto-Balance**: Moving one adjusts others proportionally

## 🚀 Quick Start

```bash
# Clone and setup (2 minutes)
git clone <repo-url> && cd "Game Recommender Prototype"
npm install

# Add API key  
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Start server
npm start
```

**Open**: `http://localhost:3001`

### Basic Usage
1. **Generate**: "Generate 50 fantasy slots" → Click Generate
2. **Select**: Choose from dropdown (custom games replace defaults)  
3. **Adjust**: Move sliders (auto-balance to 100%)
4. **Recommend**: Click "Find Similar Games"
5. **Context**: View AI analysis of your current state

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
Generate 25 fantasy dragon slots
Create 10 high-volatility games for experienced players
Generate 50 sports slots for football season  
Create 5 relaxing low-volatility fruit games
Generate 100 diverse slots with various themes
```

## 🔧 Technical Details

**Stack**: Node.js + Express + EJS + Tailwind CSS + Anthropic Claude API

**Limits**:
- Games: 1-100 per request (validated client & server)
- Recommendations: 5 similar games  
- Sliders: 1% precision, always total 100%

**Context Factors**:
- Time patterns (work vs. leisure detection)
- Attention span analysis (very-short to very-long)
- Financial cycle timing (payday awareness)
- Focus level detection (split-attention to relaxed-engaged)
- Interruption risk assessment (high at work to minimal late night)

## 🚀 Deployment

**Serverless Ready**: Vercel, Netlify, traditional hosting

**Requirements**:
- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable
- ~50MB memory + generated game storage

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

**Generation Issues**: Check API key and credits
**Recommendation Errors**: Generate games first, refresh if needed  
**Slider Problems**: Clear localStorage, refresh page
**Context Issues**: Check browser console for analysis logs
**Session Issues**: See [Developer Guide](docs/DEVELOPER_GUIDE.md#technical-debt-and-known-constraints) for session management details

---

**Ultra-lightweight POC** • **Deep contextual intelligence** • **Built for Bally's R&D**