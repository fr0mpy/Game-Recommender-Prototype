# SlotForge Generation Instructions

## Immediate Task
Generate exactly 100 fictional slot games following the comprehensive guidelines defined in the SlotForge system prompt.

## Generation-Specific Requirements

### Output Structure
- Generate exactly 100 unique slot games
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
Apply all guidelines from the system prompt and generate the complete dataset as a single JSON array.