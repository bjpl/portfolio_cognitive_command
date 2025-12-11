---
name: drift-analysis
description: Detect alignment drift between intent and implementation
triggers:
  - check drift
  - analyze drift
  - alignment check
---

# Drift Analysis Skill

Compares stated intent against actual implementation using semantic analysis.

## Usage

```bash
npm run build

node -e "
const { detectDrift } = require('./dist/skills/drift-detector');

(async () => {
  const result = await detectDrift(
    'Add user authentication with JWT tokens',
    'src/auth.ts src/middleware/jwt.ts Added login endpoint'
  );
  console.log(JSON.stringify(result, null, 2));
})();
"
```

## What It Does

1. Generates semantic embeddings for intent and implementation
2. Calculates cosine similarity between vectors
3. Flags drift if alignment < 70%
4. Provides recommendations for realignment

## Returns

- `alignmentScore` - 0-1 similarity score
- `driftAlert` - true if needs attention
- `highPrecision` - confidence in analysis
