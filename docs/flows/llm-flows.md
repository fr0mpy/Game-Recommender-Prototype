# LLM Flows - Slot Forge

## Core LLM Flows

### 1. Generate Game Dataset

```
User Request � LLM receives schema � Generate 100 slot games � Return JSON array
```

LLM creates 100 fictional slot games following the comprehensive system prompt guidelines.

### 2. Process Recommendation Query

```
Selected Game + User Weights � LLM analyzes attributes � Calculate similarities � Return ranked recommendations
```

LLM processes game attributes and user-configured weights to recommend similar games.

### 3. Explain Recommendations

```
Recommendation Results � LLM analyzes matching factors � Generate explanations � Return reasoning
```

LLM provides explanations for why specific games were recommended based on similarity factors.
