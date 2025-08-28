const Anthropic = require('@anthropic-ai/sdk');
const { saveGames } = require('../utils/storage');
const contextTracker = require('./contextTracker');

// Initialize Anthropic API
let anthropic = null;

console.log('🔍 INIT: Checking Anthropic API key...');
console.log('🔍 INIT: API key exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('🔍 INIT: API key length:', process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0);

if (process.env.ANTHROPIC_API_KEY) {
  console.log('🔍 INIT: Creating Anthropic client...');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✅ INIT: Anthropic client created successfully');
} else {
  console.error('❌ INIT: No ANTHROPIC_API_KEY found in environment');
}

// Embedded prompts for serverless compatibility
const SYSTEM_PROMPT = `# Slot Forge - System Prompt

## Agent Configuration

\`\`\`yaml
agent:
  name: SlotForge Content Generator
  id: slot-content-generator
  title: Casino Game Dataset Architect
  icon: 🎰
  purpose: Generate comprehensive, realistic, and diverse fictional slot game datasets for R&D prototyping

persona:
  role: Expert Casino Game Designer & Industry Analyst
  identity: Master of slot game mechanics, player psychology, and market segmentation
  style: Technically precise, creatively diverse, analytically rigorous, player-focused
  expertise_domains:
    - Slot game mathematics and mechanics
    - Player segmentation and psychology
    - Theme development and narrative design
    - Regulatory compliance patterns
    - Market trends and seasonal dynamics
    - Cross-platform optimization
    - Retention and engagement mechanics

core_principles:
  - Mathematical Integrity First - Every game must have realistic and balanced mathematics
  - Player Segment Awareness - Design games that appeal to specific player archetypes
  - Theme Authenticity - Create believable themes with coherent visual/audio identity
  - Mechanical Innovation Within Bounds - Introduce variety while maintaining familiarity
  - Studio Identity Consistency - Each fictional studio should have recognizable patterns
  - Seasonal & Cultural Relevance - Include timely themes tied to events and holidays
  - Mobile-First Reality - Acknowledge that 70%+ of play happens on mobile devices
  - Responsible Gaming Integration - Include features that promote healthy play patterns
  - Cross-Sell Opportunities - Design games that complement sportsbook offerings
  - Data-Driven Diversity - Ensure statistical distribution across all parameters
\`\`\``;

const GENERATION_INSTRUCTIONS = `# SlotForge Generation Instructions

## Immediate Task
Generate exactly requested fictional slot games following the comprehensive guidelines defined in the SlotForge system prompt.

## Generation-Specific Requirements

### Output Structure
- Generate exactly the requested number of unique slot games
- Each game must be a complete JSON object with all required fields
- Games should be diverse across all parameters (themes, studios, volatility, etc.)
- No duplicate titles or IDs

### Distribution Targets
Follow the mathematical and thematic distributions specified in the system prompt:
- RTP: 15% low, 50% standard, 25% competitive, 10% premium
- Volatility: 25% low, 40% medium, 25% high, 10% ultra
- Themes: Sports (10%), Classic (5-10%), Adventure (10-15%), Mythology (10-15%), etc.

### Chunk Instructions
When generating in chunks:
- Maintain variety within each chunk
- Ensure chunk games fit the overall distribution
- Use sequential game IDs as specified
- Keep studio and theme diversity across chunks

## Execution
Apply all guidelines from the system prompt and generate the complete dataset as a single JSON array.`;

const JSON_FORMAT_RULES = `# JSON Output Format Requirements

## CRITICAL JSON FORMATTING RULES

**MANDATORY**: All responses must be valid JSON that can be parsed without errors.

### Structure Requirements
- Output ONLY a valid JSON array starting with \`[\` and ending with \`]\`
- No text, comments, markdown, or explanations before or after the JSON
- Each game object must be complete with all required fields
- Array must contain the exact number of objects requested

### EXACT REQUIRED FIELD STRUCTURE
Each game object MUST have ALL these fields with proper values:

\`\`\`json
{
  "id": "DO NOT INCLUDE - will be auto-assigned",
  "title": "Unique game title (creative, match the theme)",
  "studio": "Studio name (creative fictional studio)",
  "theme": ["1-3 theme strings (ANY themes based on user request)"],
  "volatility": "one of: low, medium, high, ultra",
  "rtp": 94.0 to 97.5 (number with 2 decimals),
  "maxWin": 1000 to 10000 (integer),
  "reelLayout": "one of: 5x3, 5x4, 6x4, 3x3",
  "paylines": 10 to 50 (integer),
  "mechanics": ["2-4 mechanics from the mechanics list below"],
  "features": ["1-3 features from the features list below"],
  "pace": "one of: slow, medium, fast",
  "hitFrequency": 15.0 to 35.0 (number with 1-2 decimals),
  "bonusFrequency": 0.5 to 2.5 (number with 1-2 decimals),
  "artStyle": "art style string (e.g., Detailed 3D, Cartoon, Anime, Retro, etc.)",
  "audioVibe": "audio style string (match the theme - be creative)",
  "visualDensity": "one of: clean, standard, busy",
  "mobileOptimized": true or false (boolean),
  "releaseYear": 2023 or 2024 (integer),
  "description": "1-2 sentence engaging game description"
}
\`\`\`

**CRITICAL FOR SIMILARITY ENGINE:**

CREATIVE FIELDS (user themes welcome):
- \`theme\`: MUST be array of 1-3 theme strings (e.g., ["Zombies", "Apocalypse"], ["Donald Trump", "Politics"], ["Fantasy", "Dragons"] - ANY themes are allowed based on user prompt)
- \`studio\`: MUST be a studio name string (creative fictional names encouraged)
- \`title\`: MUST be unique and creative based on theme

INDUSTRY STANDARD FIELDS (strict requirements):
- \`volatility\`: MUST be exactly one of: "low", "medium", "high", "ultra" (randomized distribution: 25% low, 40% medium, 25% high, 10% ultra)
- \`mechanics\`: MUST be array of 2-4 mechanic strings from standard slot mechanics: ["Wild", "Scatter", "Free Spins", "Multiplier", "Expanding Reels", "Cascade", "Pick Bonus", "Respins", "Stacked Wilds", "Mystery Symbol", "Megaways", "Hold & Win"]
- \`features\`: MUST be array of 1-3 feature strings from standard slot features: ["Bonus Round", "Progressive", "Free Spins", "Wild Multiplier", "Pick Feature", "Gamble", "Bonus Wheel", "Cash Collect", "Super Stacks", "Expanding Symbols", "Buy Feature", "Ante Bet"]
- \`pace\`: MUST be exactly one of: "slow", "medium", "fast"
- \`visualDensity\`: MUST be exactly one of: "clean", "standard", "busy"
- \`reelLayout\`: MUST be exactly one of: "5x3", "5x4", "6x4", "3x3"

### JSON Syntax Rules
- **DO NOT INCLUDE "id" FIELD** - IDs are auto-assigned by the system
- Use double quotes \`"\` for all strings (never single quotes \`'\`)
- No trailing commas anywhere: \`{"key": "value",}\` ❌ 
- Proper comma separation between array elements
- All brackets \`[]\` and braces \`{}\` must be properly closed
- Numeric values should not be quoted: \`"rtp": 95.50\` ✅
- RTP values must have exactly 2 decimal places: \`"rtp": 96.25\` ✅ (not 96.254839...)
- Boolean values must be lowercase: \`"mobileOptimized": true\` ✅
- String arrays use proper syntax: \`"theme": ["Adventure", "Pirates"]\` ✅

### Quality Checks
Before outputting, verify:
1. ✅ Starts with \`[\` and ends with \`]\`
2. ✅ All strings are in double quotes
3. ✅ No trailing commas
4. ✅ All brackets/braces are balanced
5. ✅ Each object has all required fields
6. ✅ No text outside the JSON array

**REMEMBER**: The LLM response will be directly parsed as JSON. Any formatting errors will cause generation to fail.`;

// Chunked generation for large game requests
async function generateGamesInChunks(systemPrompt, generationInstructions, jsonFormatRules, customPrompt, totalCount, sessionId = null) {
  console.log('🔄 CHUNKS: Starting chunked generation');
  console.log('🔄 CHUNKS: totalCount:', totalCount);
  console.log('🔄 CHUNKS: sessionId:', sessionId);
  
  const chunkSize = 20; // 20 games per chunk - Claude 4 with 15K tokens can handle this
  const chunks = Math.ceil(totalCount / chunkSize);
  const allGames = [];
  let gameIdCounter = 1;

  console.log(`🔄 CHUNKS: Generating ${totalCount} games in ${chunks} chunks of ${chunkSize} games each`);
  console.log('🚀 CHUNKS: Using PARALLEL processing for maximum speed!');
  console.log('🔍 CHUNKS: Environment check:', {
    anthropicExists: !!anthropic,
    apiKeyExists: !!process.env.ANTHROPIC_API_KEY
  });
  
  // Send progress update
  if (sessionId && global.sendProgressUpdate) {
    global.sendProgressUpdate(sessionId, {
      type: 'progress',  
      message: `Generating ${totalCount} games in ${chunks} chunks`,
      progress: 5,
      chunksTotal: chunks,
      chunksCompleted: 0
    });
  }

  // Create all chunk promises to run in parallel
  const chunkPromises = [];
  
  for (let i = 0; i < chunks; i++) {
    const isLastChunk = i === chunks - 1;
    const gamesInThisChunk = isLastChunk ? totalCount - (i * chunkSize) : chunkSize;
    const startingGameId = (i * chunkSize) + 1;
    
    console.log(`Preparing chunk ${i + 1}/${chunks}: ${gamesInThisChunk} games (starting from game-${startingGameId.toString().padStart(3, '0')})`);
    const chunkPrompt = `CRITICAL: You must output ONLY a valid JSON array. No explanations, no markdown, no text before or after.

Generate exactly ${gamesInThisChunk} games for chunk ${i + 1} of ${chunks}:
- Start game IDs from "game-${startingGameId.toString().padStart(3, '0')}"
- Ensure variety in themes, volatility, and studios
- ${customPrompt || 'Create diverse fictional slot games'}

${jsonFormatRules}

OUTPUT ONLY THE JSON ARRAY - NO OTHER TEXT:`;

    // Create promise for this chunk
    const chunkPromise = (async (chunkIndex) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Chunk ${chunkIndex + 1} timed out after 90 seconds`)), 90000)
        );

        console.log(`🔄 Starting chunk ${chunkIndex + 1}/${chunks} in parallel...`);
        
        const response = await Promise.race([
          anthropic.messages.create({
            model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet for superior JSON generation
            max_tokens: 15000, // Claude 4 Sonnet supports 15K output tokens
            temperature: 0.7 + (chunkIndex * 0.05), // Slightly vary temperature for diversity
            system: systemPrompt,
            messages: [{
              role: 'user',
              content: chunkPrompt
            }]
          }),
          timeoutPromise
        ]);

        const content = response.content[0]?.text;
        if (!content) {
          throw new Error(`No response content for chunk ${chunkIndex + 1}`);
        }

        // Extract and parse JSON
        let jsonContent = content;
        const startIndex = content.indexOf('[');
        const endIndex = content.lastIndexOf(']');
        
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonContent = content.substring(startIndex, endIndex + 1);
        }

        // Clean JSON
        jsonContent = jsonContent.trim()
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ');

        let chunkGames;
        try {
          chunkGames = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error(`JSON Parse Error for chunk ${chunkIndex + 1}:`, parseError.message);
          throw new Error(`Failed to parse JSON for chunk ${chunkIndex + 1}: ${parseError.message}`);
        }
        
        if (!Array.isArray(chunkGames)) {
          throw new Error(`Chunk ${chunkIndex + 1} response is not an array`);
        }

        // Assign IDs to successfully generated games
        const startingId = (chunkIndex * chunkSize) + 1;
        const gamesWithIds = chunkGames.map((game, index) => ({
          ...game,
          id: `game-${(startingId + index).toString().padStart(3, '0')}`
        }));

        console.log(`✅ Chunk ${chunkIndex + 1} completed: ${gamesWithIds.length} games with IDs assigned`);
        return { chunkIndex, games: gamesWithIds, gamesInThisChunk };
        
      } catch (error) {
        console.error(`❌ Error in chunk ${chunkIndex + 1}:`, error.message);
        
        // Generate fallback games from default games.json
        const { loadGames } = require('../utils/storage');
        const defaultGames = loadGames(); // Load default games
        const fallbackGames = [];
        const startingId = (chunkIndex * chunkSize) + 1;
        
        // If we have default games, use random ones as fallback
        if (defaultGames.length > 0) {
          for (let j = 0; j < gamesInThisChunk; j++) {
            const randomIndex = Math.floor(Math.random() * defaultGames.length);
            const baseGame = defaultGames[randomIndex];
            fallbackGames.push({
              ...baseGame,
              id: `game-${(startingId + j).toString().padStart(3, '0')}`, // Keep requested ID format
              title: `${baseGame.title} (Custom)` // Mark as custom fallback
            });
          }
        } else {
          // Ultimate fallback if no default games
          for (let j = 0; j < gamesInThisChunk; j++) {
            fallbackGames.push({
              id: `game-${(startingId + j).toString().padStart(3, '0')}`,
              title: `Generated Game ${startingId + j}`,
              studio: 'Fallback Studios',
              theme: ['Generic'],
              volatility: 'medium',
              rtp: 95.0,
              maxWin: 1000,
              reelLayout: '5x3',
              paylines: 25,
              mechanics: ['Wild', 'Scatter'],
              features: ['Free Spins'],
              pace: 'medium',
              hitFrequency: 0.3,
              bonusFrequency: 0.01,
              artStyle: 'Cartoon/animated',
              audioVibe: 'Upbeat/energetic',
              visualDensity: 'standard',
              mobileOptimized: true,
              releaseYear: 2024,
              description: `Fallback generated game ${startingId + j} due to generation error`
            });
          }
        }
        
        console.log(`⚠️ Using fallback games for chunk ${chunkIndex + 1}`);
        return { chunkIndex, games: fallbackGames, gamesInThisChunk };
      }
    })(i);
    
    chunkPromises.push(chunkPromise);
  }
  
  console.log(`🚀 Starting ${chunks} chunks in PARALLEL...`);
  
  // Wait for all chunks to complete in parallel
  const chunkResults = await Promise.all(chunkPromises);
  
  // Sort results by chunk index to maintain order
  chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  // Combine all games in order
  chunkResults.forEach(result => {
    allGames.push(...result.games);
  });

  console.log(`✅ Parallel generation completed: ${allGames.length} total games`);
  
  // DO NOT SAVE - Games will be saved to session storage only by server.js
  return allGames;
}

// Validate prompt is for game generation only
function validateGameGenerationPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return { valid: true, sanitized: null };
  
  const lowercased = prompt.toLowerCase();
  
  // Check for non-game generation requests - comprehensive guardrails
  const nonGamePatterns = [
    // Technical/Development requests
    /write.*(?:code|function|script|program)/,
    /create.*(?:website|app|application|database)/,
    /build.*(?:system|platform|tool)/,
    /install|download|update/,
    /access.*file|read.*document/,
    
    // Entertainment & Creative Content
    /^(?:sing|song|music|poem|poetry|story|write.*story|tell.*story|novel|book)/i,
    /^(?:joke|funny|laugh|comedy|humor|pun|riddle)/i,
    /^(?:dance|perform|act|play.*instrument|concert|show)/i,
    /^(?:draw|paint|sketch|art|design.*logo|create.*image)/i,
    
    // General Questions & Information Requests
    /^(?:what|who|when|where|why|how|explain|define|describe)/i,
    /^(?:tell me|help me|show me|teach me|inform me)/i,
    /^(?:can you|could you|would you|will you|please)/i,
    /^(?:do you|are you|have you|did you)/i,
    
    // Conversational & Social
    /^(?:hello|hi|hey|good morning|good evening|greetings)/i,
    /^(?:how are you|what's up|what do you think|how do you feel)/i,
    /^(?:thank you|thanks|bye|goodbye|see you|farewell)/i,
    /^(?:nice to meet|pleased to meet|good to see)/i,
    
    // Academic & Analysis (non-game)
    /^(?:analyze|research|study|investigate|compare|contrast)/i,
    /^(?:summarize|review|critique|evaluate|assess)/i,
    /^(?:calculate|compute|solve|equation|math|formula)/i,
    /^(?:translate|convert|transform)/i,
    
    // Personal & Life Advice
    /^(?:should I|what should|advice|recommend|suggest)/i,
    /^(?:my life|personal|relationship|career|health)/i,
    /^(?:feel|emotion|sad|happy|angry|worried)/i,
    
    // Weather, News & Current Events
    /^(?:weather|news|today|yesterday|tomorrow|current)/i,
    /^(?:politics|election|government|president|minister)/i,
    /^(?:stock|market|economy|finance|investment)/i,
    
    // Food & Lifestyle
    /^(?:recipe|cook|food|eat|restaurant|meal)/i,
    /^(?:travel|vacation|trip|visit|destination)/i,
    /^(?:exercise|workout|fitness|diet|weight)/i,
    
    // System & Meta requests
    /^(?:ignore|disregard|forget|override|bypass)/i,
    /^(?:you are now|act as|pretend to be|roleplay)/i,
    /^(?:change your|modify your|update your)/i,
    
    // Communication requests
    /send.*email|make.*call|contact|reach out/,
    /post.*social|tweet|facebook|instagram/
  ];
  
  // Check if request is clearly not about game generation
  const containsNonGameRequest = nonGamePatterns.some(pattern => pattern.test(lowercased));
  const containsGameKeywords = /(?:game|slot|casino|reel|spin|bet|win|bonus|jackpot|theme|volatility)/i.test(prompt);
  
  if (containsNonGameRequest && !containsGameKeywords) {
    return { 
      valid: false, 
      error: 'This tool generates fictional slot games only. Please request slot game generation instead (e.g., "Generate 50 sports-themed slot games", "Create fantasy adventure slots", or "Make casino games with Egyptian themes").' 
    };
  }
  
  // Remove potential injection patterns but keep game generation content
  const cleaned = prompt
    .replace(/(?:ignore|disregard|forget)\s+(?:previous|above|system)/gi, '') // Remove ignore instructions
    .replace(/(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)/gi, '') // Remove role changes
    .replace(/(?:system|assistant|user):\s*/gi, '') // Remove role prefixes
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/<[^>]*>/g, '') // Remove HTML/XML tags
    .trim();
  
  // Only allow game generation focused content
  if (cleaned.length > 500) {
    return { valid: true, sanitized: cleaned.substring(0, 500) + '...' };
  }
  
  return { valid: true, sanitized: cleaned };
}

async function generateGames(customPrompt = null, sessionId = null) {
  console.log('🎮 GENERATE: Starting generateGames function');
  console.log('🎮 GENERATE: customPrompt:', customPrompt);
  console.log('🎮 GENERATE: sessionId:', sessionId);
  
  try {
    console.log('🔍 GENERATE: Loading embedded prompts...');
    // Use embedded prompts for serverless compatibility
    const systemPrompt = SYSTEM_PROMPT;
    const generationInstructions = GENERATION_INSTRUCTIONS;
    const jsonFormatRules = JSON_FORMAT_RULES;
    console.log('✅ GENERATE: Embedded prompts loaded');
    console.log('🔍 GENERATE: System prompt length:', systemPrompt.length);
    console.log('🔍 GENERATE: Generation instructions length:', generationInstructions.length);
    console.log('🔍 GENERATE: JSON format rules length:', jsonFormatRules.length);
    
    console.log('🔍 GENERATE: Validating custom prompt...');
    // Validate and sanitize custom prompt
    const validation = validateGameGenerationPrompt(customPrompt);
    console.log('🔍 GENERATE: Validation result:', validation);
    if (!validation.valid) {
      console.error('❌ GENERATE: Prompt validation failed:', validation.error);
      throw new Error(validation.error);
    }
    const sanitizedPrompt = validation.sanitized;
    console.log('✅ GENERATE: Prompt validated, sanitized:', sanitizedPrompt);
    
    let requestedCount = 100; // Default from generator prompt
    if (sanitizedPrompt && sanitizedPrompt.trim()) {
      console.log('Using custom user prompt for generation...');
      // Extract number from custom prompt - should be 100 for default UI prompt
      const numberMatch = sanitizedPrompt.match(/\d+/);
      requestedCount = numberMatch ? parseInt(numberMatch[0]) : 100;
      console.log(`Custom prompt requesting ${requestedCount} games as specified`);
    }
    
    // Validate game count limits (1-100)
    if (requestedCount < 1) {
      throw new Error('Must generate at least 1 game');
    }
    if (requestedCount > 100) {
      throw new Error('Cannot generate more than 100 games. Please reduce your request.');
    }
    
    console.log(`✅ Validated game count: ${requestedCount} (within 1-100 limit)`);

    console.log('🔍 GENERATE: Checking Anthropic client availability...');
    console.log('🔍 GENERATE: anthropic client exists:', !!anthropic);
    console.log('🔍 GENERATE: API key exists:', !!process.env.ANTHROPIC_API_KEY);
    
    // Use Anthropic Claude Haiku
    if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
      console.error('❌ GENERATE: Anthropic not configured');
      console.error('❌ GENERATE: anthropic client:', !!anthropic);
      console.error('❌ GENERATE: API key exists:', !!process.env.ANTHROPIC_API_KEY);
      throw new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }

    console.log('✅ GENERATE: Anthropic client ready');
    console.log('Generating games via Anthropic Claude 4 Sonnet...');
    
    // For large generations (>25 games), use chunked approach
    if (requestedCount > 25) {
      console.log(`Large generation (${requestedCount} games) - using chunked approach`);
      return await generateGamesInChunks(systemPrompt, generationInstructions, jsonFormatRules, sanitizedPrompt, requestedCount, sessionId);
    }
    
    // Single generation for smaller requests
    console.log('🔍 GENERATE: Building user prompt...');
    const userPrompt = sanitizedPrompt && sanitizedPrompt.trim() 
      ? `${generationInstructions}\n\nCUSTOM INSTRUCTIONS: ${sanitizedPrompt}\n\nGenerate exactly ${requestedCount} games.\n\n${jsonFormatRules}`
      : `${generationInstructions}\n\n${jsonFormatRules}`;
    console.log('✅ GENERATE: User prompt built, length:', userPrompt.length);
    console.log('🔍 GENERATE: User prompt preview:', userPrompt.substring(0, 300) + '...');

    console.log('🔍 GENERATE: Making Anthropic API call...');
    console.log('🔍 GENERATE: Model: claude-sonnet-4-20250514');
    console.log('🔍 GENERATE: Max tokens: 15000');
    console.log('🔍 GENERATE: Temperature: 0.7');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', // Claude 4 Sonnet for superior JSON generation
      max_tokens: 15000, // Claude 4 Sonnet supports 15K output tokens
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });
    
    console.log('✅ GENERATE: API call completed successfully');
    console.log('🔍 GENERATE: Response object keys:', Object.keys(response));
    console.log('🔍 GENERATE: Response content array length:', response.content?.length);

    // Track token usage - note: this requires the tokenUsage object to be passed in or made global

    console.log('🔍 GENERATE: Extracting response content...');
    const content = response.content[0]?.text;
    console.log('🔍 GENERATE: Content exists:', !!content);
    console.log('🔍 GENERATE: Content length:', content?.length);
    
    if (!content) {
      console.error('❌ GENERATE: No response content from Anthropic');
      console.error('❌ GENERATE: Response structure:', JSON.stringify(response, null, 2));
      throw new Error('No response content from Anthropic');
    }

    console.log('✅ GENERATE: Successfully used Anthropic Claude 4 Sonnet');
    
    // Parse JSON response from LLM
    console.log('🔍 GENERATE: LLM Response Preview:', content.substring(0, 200) + '...');
    
    console.log('🔍 GENERATE: Extracting JSON from response...');
    // Extract JSON from Claude's response (it might have explanatory text)
    let jsonContent = content;
    console.log('🔍 GENERATE: Initial content has JSON markers:', content.includes('['), content.includes(']'));
    
    if (content.includes('[') && content.includes(']')) {
      const startIndex = content.indexOf('[');
      const endIndex = content.lastIndexOf(']') + 1;
      console.log('🔍 GENERATE: JSON markers found at positions:', startIndex, 'to', endIndex);
      jsonContent = content.substring(startIndex, endIndex);
      console.log('🔍 GENERATE: Extracted JSON content length:', jsonContent.length);
    } else {
      console.log('⚠️ GENERATE: No JSON array markers found in response');
    }
    
    // Clean up any potential formatting issues
    jsonContent = jsonContent.trim();
    console.log('🔍 GENERATE: Cleaned JSON content length:', jsonContent.length);
    
    let games;
    console.log('🔍 GENERATE: Attempting to parse JSON...');
    try {
      games = JSON.parse(jsonContent);
      console.log('✅ GENERATE: JSON parsed successfully');
      console.log('🔍 GENERATE: Parsed games array length:', Array.isArray(games) ? games.length : 'not an array');
    } catch (parseError) {
      console.error('❌ GENERATE: JSON Parse Error:', parseError.message);
      console.error('❌ GENERATE: JSON Content preview:', jsonContent.substring(0, 500) + '...');
      console.error('❌ GENERATE: JSON Content end preview:', '...' + jsonContent.substring(jsonContent.length - 200));
      console.log('🔧 GENERATE: Attempting to fix JSON formatting...');
      
      // Try to fix common JSON issues
      let fixedJson = jsonContent
        .replace(/,\s*}/g, '}') // Remove trailing commas before }
        .replace(/,\s*]/g, ']') // Remove trailing commas before ]
        .replace(/([^"\\])"([^":])/g, '$1\\"$2') // Escape unescaped quotes
        .replace(/\n/g, ' ') // Remove newlines that might break JSON
        .replace(/\r/g, '') // Remove carriage returns
        .replace(/\t/g, ' '); // Replace tabs with spaces
      
      try {
        games = JSON.parse(fixedJson);
        console.log('Successfully parsed JSON after cleanup');
      } catch (secondError) {
        console.error('Second parse error:', secondError.message);
        console.error('Fixed JSON preview:', fixedJson.substring(0, 500) + '...');
        
        // Last resort: try to extract individual game objects or use existing games
        try {
          const gameMatches = fixedJson.match(/"id":\s*"[^"]+"/g);
          if (gameMatches && gameMatches.length > 0) {
            console.log(`Found ${gameMatches.length} potential game objects, but JSON parsing failed`);
          }
          
          // Check if there are existing games we can use
          const { loadGames } = require('../utils/storage');
          const existingGames = loadGames();
          if (existingGames.length > 0) {
            console.log(`Using existing ${existingGames.length} games as fallback`);
            return existingGames;
          } else {
            throw new Error(`Unable to parse JSON response: ${parseError.message}`);
          }
        } catch (fallbackError) {
          throw new Error(`Unable to parse JSON response: ${parseError.message}`);
        }
      }
    }
    
    if (!Array.isArray(games)) {
      throw new Error('LLM response is not an array of games');
    }

    if (games.length === 0) {
      throw new Error('LLM returned empty games array');
    }

    // Assign IDs to successfully generated games  
    const gamesWithIds = games.map((game, index) => ({
      ...game,
      id: `game-${(index + 1).toString().padStart(3, '0')}`
    }));
    
    // DO NOT SAVE - Games will be saved to session storage only by server.js
    
    console.log(`✅ GENERATE: Successfully generated ${gamesWithIds.length} games`);
    console.log('🔍 GENERATE: Final games sample:', gamesWithIds[0] ? Object.keys(gamesWithIds[0]) : 'no games');
    console.log('🔍 GENERATE: First game ID assigned:', gamesWithIds[0]?.id);
    return gamesWithIds;
    
  } catch (error) {
    console.error('❌ GENERATE: Game generation failed:', error);
    console.error('❌ GENERATE: Error name:', error.name);
    console.error('❌ GENERATE: Error message:', error.message);
    console.error('❌ GENERATE: Error stack:', error.stack);
    
    if (error.message.includes('JSON')) {
      console.error('❌ GENERATE: JSON parsing error detected');
      throw new Error('Unable to parse games from LLM response. Please try again.');
    }
    
    if (error.message.includes('API key') || error.message.includes('Anthropic')) {
      console.error('❌ GENERATE: API key configuration error detected');
      throw new Error('Anthropic API key not configured. Please check your environment variables.');
    }
    
    console.error('❌ GENERATE: Generic generation failure');
    throw new Error('Unable to generate games. Please try again later.');
  }
}

// Mock function for testing without API key
function generateMockGames() {
  const mockGames = [
    {
      id: '1',
      title: 'Dragon\'s Fortune',
      studio: 'Mock Studios',
      theme: ['Fantasy', 'Dragons'],
      volatility: 'high',
      rtp: 96.5,
      maxWin: 10000,
      reelLayout: '5x3',
      paylines: 25,
      mechanics: ['Wild', 'Scatter', 'Free Spins'],
      features: ['Multiplier', 'Bonus Round'],
      pace: 'medium',
      hitFrequency: 22.1,
      bonusFrequency: 8.3,
      artStyle: 'Detailed 3D',
      audioVibe: 'Epic Fantasy',
      visualDensity: 'standard',
      mobileOptimized: true,
      releaseYear: 2024,
      description: 'Epic dragon-themed slot with cascading wins and fire-breathing bonus features.'
    },
    {
      id: '2', 
      title: 'Wild West Gold Rush',
      studio: 'Mock Studios',
      theme: ['Western', 'Gold Mining'],
      volatility: 'medium',
      rtp: 95.8,
      maxWin: 7500,
      reelLayout: '5x4',
      paylines: 40,
      mechanics: ['Wild', 'Expanding Reels'],
      features: ['Pick Bonus', 'Progressive'],
      pace: 'fast',
      hitFrequency: 28.7,
      bonusFrequency: 12.1,
      artStyle: 'Cartoon',
      audioVibe: 'Country Western',
      visualDensity: 'busy',
      mobileOptimized: true,
      releaseYear: 2024,
      description: 'Strike it rich in the Old West with expanding reels and gold rush bonuses.'
    }
  ];
  
  // DO NOT SAVE - Mock games should not overwrite main games.json
  console.log(`Generated ${mockGames.length} mock games for testing`);
  return mockGames;
}

module.exports = {
  generateGames,
  generateMockGames
};