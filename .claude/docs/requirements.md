# Product Requirements Document

**Project:** Bally's R&D — LLM Slot Forge
**Date:** 27.8.25  
**Owner:** Jay Compson

---

## 1. Overview

This prototype demonstrates a slot game recommendation engine for Bally's R&D.

When a player finishes a game, the system suggests:

> "Because you played Game X, you might like…"

…followed by 3–5 similar games with confidence scores and LLM-generated explanations - in order of confidence.

The prototype is focused on:

- Defining a rich game dataset (fictional, LLM-generated)
- Building a similarity + recommendation engine
- Providing a simple interactive UI

## 2. Initial Objectives (from assessment brief)

1. **AI-Powered Data Generation**

   - Generate 100 fictional slot games via LLM
   - Save structured data (games.json)

2. **Similarity Engine**

   - Given one game, return 3–5 most similar

3. **UI Prototype**

   - Dropdown select game
   - Show recommendations
   - LLM explanation for each

4. **Communication**
   - Clean, modular code
   - README explaining schema and trade-offs

## 3. Extended Objectives

To make the prototype realistic for Bally's product needs, we extend beyond game-to-game similarity:

- **Player data:** sportsbook habits, volatility appetite, UX preferences
- **Context data:** payday, weekend, public holiday, device type
- **Confidence scoring:** blend content, player, and context signals
- **Dataset regeneration:** LLM prompt is editable and rerunnable from the UI

## 4. Datasets

### A) Game Dataset (games.json)

```typescript
interface Game {
  id: string;
  title: string;
  studio: string;
  theme: string[];
  sportsInfluence?: string;
  volatility: "low" | "medium" | "high" | "ultra";
  rtp: number;
  maxWin: number;
  reelLayout: string;
  paylines: number | "ways";
  mechanics: string[];
  features: string[];
  pace: "slow" | "medium" | "fast";
  hitFrequency: number;
  bonusFrequency: number;
  artStyle: string;
  audioVibe: string;
  visualDensity: "minimal" | "standard" | "busy";
  mobileOptimized: boolean;
  seasonalTag?: string;
  releaseYear: number;
  description: string;
  embedding?: number[];
}
```

### B) Player Dataset (players.json)

```typescript
interface PlayerProfile {
  favSports: string[];
  tablePrefs?: string[];
  volatilityPreference: "low" | "medium" | "high";
  avgBetSize: number;
  chaseJackpots: boolean;
  uiTheme: "light" | "dark" | "system";
  prefersReducedMotion: boolean;
  soundSetting: "on" | "muted";
  spinSpeed: "slow" | "normal" | "fast";
  autoplay: boolean;
  haptics: boolean;
  textSize: "small" | "default" | "large";
  sessionLength: number;
  replayedGames: string[];
  abandonedGames: string[];
  geoRegion: string;
  language: string;
}
```

### C) Context Dataset (context.json)

```typescript
interface PlayerContext {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  isWeekend: boolean;
  isPublicHoliday: boolean;
  isPayday: boolean;
  localEvent?: string; // e.g. "PremierLeagueWeekend"
  timeOfDay: "morning" | "afternoon" | "evening" | "lateNight";
  deviceType: "mobile" | "desktop" | "tablet";
}
```

## 5. LLM Data Generation

### Purpose

- Generate a rich, diverse dataset of 100 slot games
- Allow user visibility and control of the generation prompt
- Maintain schema consistency via validation

### Default Prompt (v2 - Enhanced)

**System Prompt:**
The comprehensive SlotForge Content Generator prompt is maintained in:
`slot-game-generator-system-prompt.md`

This enhanced prompt includes:

- Detailed persona as Expert Casino Game Designer
- Mathematical integrity requirements (RTP distribution, volatility correlations)
- Theme diversity mandates (12 categories with percentages)
- Studio personality archetypes (8-12 distinct studios)
- Mechanic distribution guidelines
- 6-phase generation methodology
- Validation checklists

**User Message:**

> Generate 100 fictional online slot games following the SlotForge Content Generator guidelines.
> Each game must be a JSON object that conforms exactly to this schema:
> { … Game schema shown above … }
> Output only valid JSON object of 100 objects. No prose, no comments.

### POC: Dataset Generation

**For the POC:** Pre-generate games.json using the SlotForge prompt from `slot-game-generator-system-prompt.md`

### Validation

**Validation Strategy: Trust with Error Handling**

For POC speed and simplicity, we trust the LLM output and handle errors gracefully:

**Approach:**

- **Trust LLM**: The comprehensive SlotForge prompt produces reliable JSON
- **Simple parsing**: Use native JSON.parse() with try/catch
- **Graceful degradation**: Show user-friendly errors if parsing fails
- **Manual spot-checks**: Verify a few games manually during development

**Implementation:**

```javascript
try {
  const games = JSON.parse(llmResponse);
  if (!Array.isArray(games) || games.length === 0) {
    throw new Error("Invalid games array");
  }
  return games;
} catch (error) {
  console.error("LLM response parsing failed:", error);
  throw new Error("Unable to generate valid games. Please try again.");
}
```

**Quality assurance through prompt engineering instead of runtime validation:**

- RTP between 92–98 (distributed across market segments)
- maxWin between 500–50,000 (correlated with volatility)
- Unique titles (no duplicates)
- Volatility distribution: low 20-25%, medium 35-40%, high 25-30%, ultra 10-15%
- At least 10% sports themes (direct and sports-influenced)
- Hit frequency inversely correlated with volatility
- 85%+ mobile optimized

## 6. Recommendation Engine

### Core Algorithm

The recommendation engine uses a multi-signal scoring system that combines content similarity, player preferences, and contextual factors.

### Inputs

1. **Played Game ID** - The game the player just finished
2. **Player Profile** (optional) - Historical preferences and behavior patterns
3. **Context Flags** (optional) - Current session context (time, device, events)
4. **Game Dataset** - The full catalog of 100 games to recommend from

### Scoring Components

#### POC Scoring Components

**Base Similarity (Game↔Game)** - Implemented in POC

the following weights also are configurable in the UI. These are just the defaults

- **Theme overlap** (40% weight): Exact match = 1.0, partial = 0.5
- **Volatility match** (30% weight): Same level = 1.0, adjacent = 0.5
- **Studio match** (20% weight): Same studio = 1.0
- **Mechanic similarity** (10% weight): Common features count

### POC Scoring Implementation

```typescript
function calculateSimilarity(game1: Game, game2: Game): number {
  let score = 0;

  // Theme matching (40%)
  const themeOverlap = game1.theme.filter((t) =>
    game2.theme.includes(t)
  ).length;
  score += (themeOverlap / game1.theme.length) * 0.4;

  // Volatility matching (30%)
  if (game1.volatility === game2.volatility) score += 0.3;
  else if (Math.abs(volatilityLevel(game1) - volatilityLevel(game2)) === 1)
    score += 0.15;

  // Studio (20%)
  if (game1.studio === game2.studio) score += 0.2;

  // Mechanics (10%)
  const mechanicOverlap = game1.mechanics.filter((m) =>
    game2.mechanics.includes(m)
  ).length;
  score += (mechanicOverlap / Math.max(game1.mechanics.length, 1)) * 0.1;

  return score;
}

// Convert to confidence percentage
const confidence = Math.round(score * 100);
```

### Output Structure

```typescript
interface Recommendation {
  game: Game; // Full game object
  score: number; // Raw similarity score (0-1)
  confidence: number; // Confidence percentage (0-100)
  explanation: string; // LLM-generated reason
  debugBreakdown?: {
    // Optional detailed scoring
    baseSimilarity: number;
    playerAlignment: number;
    contextAlignment: number;
    components: Record<string, number>;
  };
  flags: string[]; // Special indicators
}
```

**Flags include:**

- `"same-studio"` - From same developer
- `"seasonal-match"` - Matches current season/event
- `"player-favorite-theme"` - Aligns with favSports
- `"high-confidence"` - Score > 85%
- `"exploration"` - Intentionally different suggestion

## 7. UI Requirements (POC)

### Simple Layout

**Header**

- Title: "Slot Forge"
- Dataset info: "100 games loaded"

### Main Interface

#### Game Selection

```
[🎰 Select a game...        ▼] [🎲 Random]
```

- Dropdown with all 100 games
- Shows: "Game Title - Studio (Volatility)"
- Random button for quick testing

#### Results Display

**5 recommendation cards in a simple grid:**

```
[Game Title]              85% Match
Studio Name
[Theme] [Volatility] [RTP: 95.2%]

"Similar theme and volatility to your selection"
```

**Card shows:**

- Game title and studio
- Confidence percentage (color-coded)
- Key metadata chips
- Simple explanation text

## 8. POC Deliverables

### Essential Files

#### 1. Data Generation Script

**File:** `generate.js` or `generate.ts`

```javascript
// Simple Node.js script
const games = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: slotForgePrompt }],
  max_tokens: 15000,
});

fs.writeFileSync("./data/games.json", JSON.stringify(games));
```

#### 2. Similarity Algorithm

**File:** `similarity.js`

- Core recommendation logic
- Returns top 5 similar games
- Simple scoring based on theme/volatility/studio

#### 3. Simple Web Interface

**Structure:**

```
index.html          # Main UI
app.js              # UI logic + similarity calls
style.css           # Basic styling
data/games.json     # Generated dataset
```

### Data Files

#### Primary Dataset

**File:** `games.json`

- 100 games generated using SlotForge prompt
- Static file for POC (no regeneration needed)
- ~200KB, validated against schema

### Documentation

#### README.md

**Sections:**

- Quick start (how to run)
- What the POC demonstrates
- Next steps for full implementation
- Technical approach and trade-offs

**Future Production Files (Not in POC):**

- Player profiles and context data
- Advanced UI components
- Backend API endpoints
- Comprehensive test suites
- Production deployment configs

## 9. Production Roadmap (Beyond POC)

### Phase 1: Enhanced Intelligence

- **Vector embeddings** for semantic similarity
- **Machine learning** models replacing rule-based scoring
- **Real-time adaptation** based on user behavior

### Phase 2: Data Integration

- **Sportsbook connection** for cross-sell opportunities
- **Player behavior tracking** from actual gameplay
- **Dynamic context** awareness (events, weather, time)

### Phase 3: Personalization

- **Multi-armed bandit** optimization
- **Cohort analysis** and player segmentation
- **A/B testing** framework for algorithms

### Phase 4: Production Scale

- **Microservices architecture**
- **Real-time analytics** and dashboards
- **Compliance** and responsible gaming features
- **Global deployment** with localization

**The POC demonstrates core concepts that validate the feasibility of this full roadmap.**

---

## Appendix: Example Data

### games.json

```json
[
  {
    "id": "game-001",
    "title": "Goal Frenzy",
    "studio": "Sunfire Gaming",
    "theme": ["Sports", "Football"],
    "sportsInfluence": "Football",
    "volatility": "high",
    "rtp": 95.2,
    "maxWin": 5000,
    "reelLayout": "5x3",
    "paylines": 25,
    "mechanics": ["Free Spins", "Multipliers"],
    "features": ["Bonus Buy", "Sticky Wilds"],
    "pace": "fast",
    "hitFrequency": 0.24,
    "bonusFrequency": 0.05,
    "artStyle": "3D realistic",
    "audioVibe": "Epic",
    "visualDensity": "standard",
    "mobileOptimized": true,
    "seasonalTag": "WorldCup",
    "releaseYear": 2024,
    "description": "A football-themed slot with stadium sounds, high volatility, and multipliers during free spins."
  }
]
```

---

📄 **End of Document**
