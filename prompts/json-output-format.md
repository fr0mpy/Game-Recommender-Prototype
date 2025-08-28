# JSON Output Format Requirements

## CRITICAL JSON FORMATTING RULES

**MANDATORY**: All responses must be valid JSON that can be parsed without errors.

### Structure Requirements
- Output ONLY a valid JSON array starting with `[` and ending with `]`
- No text, comments, markdown, or explanations before or after the JSON
- Each game object must be complete with all required fields
- Array must contain the exact number of objects requested

### JSON Syntax Rules
- Use double quotes `"` for all strings (never single quotes `'`)
- No trailing commas anywhere: `{"key": "value",}` ❌ 
- Proper comma separation between array elements
- All brackets `[]` and braces `{}` must be properly closed
- Numeric values should not be quoted: `"rtp": 95.5` ✅
- Boolean values must be lowercase: `"mobileOptimized": true` ✅
- String arrays use proper syntax: `"theme": ["Adventure", "Pirates"]` ✅

### Quality Checks
Before outputting, verify:
1. ✅ Starts with `[` and ends with `]`
2. ✅ All strings are in double quotes
3. ✅ No trailing commas
4. ✅ All brackets/braces are balanced
5. ✅ Each object has all required fields
6. ✅ No text outside the JSON array

### Example Valid Output
```json
[
  {
    "id": "game-001",
    "title": "Treasure Quest",
    "studio": "Adventure Games Ltd",
    "theme": ["Pirates", "Adventure"],
    "volatility": "medium",
    "rtp": 95.8,
    "maxWin": 5000,
    "mobileOptimized": true
  }
]
```

### Common Errors to Avoid
- ❌ `Here is the JSON:` (text before JSON)
- ❌ `{"title": 'Game Name'}` (single quotes)
- ❌ `{"title": "Game",}` (trailing comma)
- ❌ `{"title": "Game"}` (missing required fields)
- ❌ `[{"title": "Game"} {"title": "Game2"}]` (missing comma)

**REMEMBER**: The LLM response will be directly parsed as JSON. Any formatting errors will cause generation to fail.