---
name: generate-brief
description: Generate executive portfolio brief with metrics and recommendations
triggers:
  - generate brief
  - portfolio report
  - executive summary
---

# Portfolio Brief Generator

Creates comprehensive markdown reports analyzing portfolio health.

## Usage

```bash
npm run build

node -e "
const { generateBrief } = require('./dist/skills/brief-generator');

const result = generateBrief(
  './output/docs/shards',
  './output/docs/cognitive_metrics.json',
  './output/docs'
);
console.log('Generated:', result.filepath);
"
```

## What It Does

1. Loads all project shards from output directory
2. Analyzes portfolio metrics (alignment, drift, activity)
3. Identifies red list projects needing attention
4. Ranks top performers
5. Generates strategic recommendations

## Output

Creates `Portfolio_Brief_YYYY-MM-DD.md` with:
- Global Precision Score
- Executive Summary
- Red List (projects needing attention)
- Cluster Distribution
- Top Performers
- Strategic Recommendations
