# Coding Standards - Game Recommender Prototype

## Critical Development Rules

### File Organization
- **Utils First**: All file operations go in `utils/storage.js`
- **Services Pattern**: Business logic in `services/` directory
- **Single Responsibility**: Each file has one clear purpose
- **No Nested Complexity**: Keep file structure flat and simple

### Error Handling
- **Graceful Degradation**: Always provide fallback behavior
- **User-Friendly Messages**: Never expose technical errors to users
- **Logging**: Console.error for debugging, user messages for UI
- **Try-Catch Required**: Wrap all async operations and file I/O

### Data Management
- **Trust LLM Output**: No runtime validation, handle JSON parse errors gracefully
- **File-Based Storage**: Use `saveGames()`, `loadGames()`, `saveSettings()`, `loadSettings()`
- **No Direct File Access**: Always use storage utility functions
- **Atomic Writes**: Use `JSON.stringify(data, null, 2)` for readable files

### LLM Integration
- **Single Prompt File**: Use existing `slot-game-generator-system-prompt.md`
- **Error Recovery**: Catch JSON parse errors, show user-friendly message
- **No Retries**: For POC, single attempt with graceful failure
- **Token Limits**: Respect max_tokens: 15000 for generation

### Server-Side Rendering
- **EJS Templates**: Use `.ejs` extension, render on server
- **Form-Based Flow**: POST forms, redirect on success
- **No Client JavaScript**: Keep interactions server-side where possible
- **Tailwind CDN**: Use CDN link, no build process

### Route Organization
```javascript
// Pattern: Verb + clear purpose
app.get('/', renderHomePage)
app.post('/generate', generateGamesAndRedirect)  
app.post('/recommend', calculateAndRenderRecommendations)
app.get('/export/json', downloadGamesJSON)
```

### Variable Naming
- **camelCase**: JavaScript variables and functions
- **kebab-case**: CSS classes and HTML attributes  
- **UPPER_CASE**: Constants and environment variables
- **Descriptive Names**: `calculateSimilarity()` not `calc()`

### Function Standards
- **Pure Functions**: Similarity calculations take inputs, return outputs
- **Single Purpose**: Each function does one thing well
- **Early Returns**: Handle edge cases first, main logic last
- **No Side Effects**: File operations separate from calculations

### Performance Rules
- **Cache Calculations**: Use `gameCache` Map for repeated similarity scores
- **Pre-calculate**: Load games once at startup, not per request
- **Minimal Loops**: Avoid nested iterations where possible
- **Memory Efficient**: Clear caches when they grow large

### Required Patterns

#### Error Handling Pattern
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('User-friendly message here');
}
```

#### File Storage Pattern
```javascript
// Always use utility functions
const games = loadGames();
const settings = loadSettings();
saveGames(updatedGames);
saveSettings(newSettings);
```

#### Route Handler Pattern
```javascript
app.post('/endpoint', async (req, res) => {
  try {
    const result = await businessLogicFunction(req.body);
    res.redirect('/success');
  } catch (error) {
    res.render('error', { error: error.message });
  }
});
```

## Forbidden Practices

### Never Do
- ❌ Direct `fs.readFileSync()` outside storage utils
- ❌ Complex client-side JavaScript
- ❌ Runtime validation libraries  
- ❌ Database dependencies
- ❌ TypeScript compilation
- ❌ Build processes or bundling
- ❌ External API calls beyond OpenAI
- ❌ Session storage or cookies (use server-side state)

### Code Quality
- **No Comments**: Code should be self-documenting
- **Consistent Indentation**: 2 spaces, no tabs
- **Semicolons**: Always use semicolons
- **Single Quotes**: Use single quotes for strings
- **Template Literals**: Use backticks for multi-line or interpolated strings

## Project-Specific Rules

### Game Data Structure
- **Trust Schema**: Games from LLM match expected structure
- **ID Generation**: Use simple incrementing IDs or LLM-provided IDs
- **Theme Arrays**: Always arrays, even for single themes
- **Numeric Validation**: Ensure RTP is number, not string

### Similarity Engine
- **Default Weights**: `{ theme: 0.4, volatility: 0.3, studio: 0.2, mechanics: 0.1 }`
- **Score Range**: Always 0-1, convert to percentage for display
- **Top 5 Results**: Return exactly 5 recommendations
- **No Duplicates**: Filter out the selected game from results

### UI Standards
- **Semantic HTML**: Use proper form elements, labels, buttons
- **Responsive Design**: Mobile-first approach with Tailwind
- **Loading States**: Show feedback during LLM generation
- **Error States**: Clear error messages with retry options
- **Accessibility**: Proper ARIA labels, keyboard navigation

These standards ensure consistent, maintainable code that matches our ultra-lightweight architecture.