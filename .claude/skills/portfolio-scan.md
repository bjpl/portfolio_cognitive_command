---
name: portfolio-scan
description: Scan repositories and generate portfolio intelligence reports
triggers:
  - scan repos
  - portfolio scan
  - analyze projects
---

# Portfolio Scan Skill

Scans git repositories and generates intelligence reports.

## Usage

```bash
# Build first
npm run build

# Then run via node
node -e "
const { scanRepos } = require('./dist/skills/repo-scanner');
const { generateEmbedding } = require('./dist/skills/semantic-analyzer');

(async () => {
  const repos = await scanRepos(process.cwd(), 2);
  console.log(JSON.stringify(repos, null, 2));
})();
"
```

## What It Does

1. Recursively scans for git repositories
2. Extracts commit history and activity metrics
3. Classifies as ACTIVE (commits in 7 days) or DORMANT
4. Returns structured JSON with repo metadata

## Available Functions

- `scanRepos(basePath, maxDepth)` - Find all repos
- `getCommitHistory(repoPath, limit)` - Get commit log
- `getChangedFiles(repoPath, since)` - List changed files
