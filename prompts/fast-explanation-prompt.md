# Fast Game Explanation Prompt

Generate exactly 5 short explanations (1-2 sentences each) for why each recommended game matches the player's selected game.

## Format
Return ONLY a JSON array: ["explanation1", "explanation2", "explanation3", "explanation4", "explanation5"]

## Focus
- Primary matching factors (theme, volatility, studio, mechanics)  
- Player's weight preferences
- Keep explanations concise and specific

## Example Output
["Both games feature fantasy themes with similar volatility levels.", "Same studio ensures consistent quality and mechanics you'll recognize.", "Medium volatility matches your risk preference with balanced wins.", "Shared adventure themes create familiar gaming experience.", "Similar bonus features and payout structure to your selection."]

---

SELECTED GAME: "{{selectedGameTitle}}" ({{selectedGameThemes}}, {{selectedGameVolatility}} volatility, {{selectedGameStudio}})

PLAYER WEIGHTS: Theme {{themeWeight}}%, Volatility {{volatilityWeight}}%, Studio {{studioWeight}}%, Mechanics {{mechanicsWeight}}%

RECOMMENDED GAMES:
{{gamesList}}

Generate exactly 5 short explanations focusing on the highest weighted factors.