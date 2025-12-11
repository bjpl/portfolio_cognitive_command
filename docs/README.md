# Portfolio Cognitive Command

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/portfolio-cognitive-command)
[![Coverage](https://img.shields.io/badge/coverage-79%25-yellowgreen.svg)](./coverage)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/portfolio-cognitive-command/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

AI-powered portfolio analysis with semantic clustering, drift detection, and cognitive linking. Transform your repository portfolio into actionable intelligence.

---

## 🌟 Features Overview

### Core Capabilities

- **📊 Repository Scanning**: Automatically discover and scan Git repositories across your project directories
- **🧠 Semantic Analysis**: Generate AI embeddings using OpenAI's models for intelligent project clustering
- **🎯 Drift Detection**: Identify semantic drift between AI reasoning and implementation
- **🔗 Cognitive Linking**: Connect commits to AI agent sessions for full traceability
- **📈 Dashboard Generation**: Create interactive HTML dashboards with project visualizations
- **📝 Portfolio Briefs**: Auto-generate executive summaries in markdown format
- **📋 Progress Ledgers**: Track project evolution with detailed activity logs
- **💾 AgentDB Integration**: Unified persistence layer with MCP memory integration

### Intelligence Features

- **Semantic Clustering**: Group projects by technology, purpose, and activity patterns
- **GOAP World State Tracking**: Goal-Oriented Action Planning integration
- **Session Capture**: Record AI agent interactions and decision chains
- **Drift Alerts**: Real-time detection of reasoning-implementation mismatches
- **Precision Scoring**: Quantify portfolio alignment and quality metrics

---

## 📦 Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: v2.0.0 or higher
- **OpenAI API Key**: For semantic analysis (optional, falls back to keyword-based)

### Install via npm

```bash
npm install -g portfolio-cognitive-command
```

### Install from source

```bash
git clone https://github.com/yourusername/portfolio-cognitive-command.git
cd portfolio-cognitive-command
npm install
npm run build
npm link
```

### Environment Configuration

Create a `.env` file in your project root:

```bash
# Required for semantic analysis
OPENAI_API_KEY=sk-your-api-key-here

# Optional configuration
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
USE_OPENAI_API=true

# Paths
SCAN_DIR=/path/to/your/projects
AGENTDB_PATH=./data/agentdb.json
OUTPUT_DIR=./output

# Analysis thresholds
DRIFT_THRESHOLD=0.7
MIN_CLUSTER_SIZE=2
MAX_CLUSTER_SIZE=10

# System
VERBOSE=false
LOG_LEVEL=info
FALLBACK_TO_KEYWORDS=true
```

---

## 🚀 Quick Start

### Run Complete Pipeline

Execute all phases in one command:

```bash
pcc all
```

This will:
1. Scan repositories in your project directory
2. Generate semantic embeddings and shards
3. Create an interactive HTML dashboard
4. Export cognitive metrics and reports

### View Results

```bash
# Check pipeline status
pcc status

# Open dashboard in browser
open output/docs/dashboard.html
```

---

## 📋 CLI Commands

### Phase Commands

#### `pcc scan`
Scan repositories and generate Phase 1 manifest.

```bash
# Scan current directory
pcc scan

# Scan specific directory with custom depth
pcc scan --dir /path/to/projects --max-depth 5

# Options:
#   -d, --dir <path>       Directory to scan (default: current directory)
#   -m, --max-depth <n>    Maximum directory depth (default: 3)
```

**Output**: `output/docs/phase1_manifest.json`

---

#### `pcc analyze`
Run semantic analysis and generate project shards.

```bash
# Analyze all repositories
pcc analyze

# Analyze active repositories only
pcc analyze --active-only

# Link to AgentDB
pcc analyze --agent-db ./data/agentdb.json

# Options:
#   --manifest <path>      Path to manifest file
#   --agent-db <path>      Path to AgentDB directory (optional)
#   --active-only          Only analyze active repositories
```

**Output**: `output/docs/shards/*.json`

---

#### `pcc dashboard`
Generate interactive HTML dashboard from shards.

```bash
# Generate dashboard
pcc dashboard

# Custom output location
pcc dashboard --output ./custom-dashboard.html

# Options:
#   --shards <path>        Path to shards directory
#   --output <path>        Output path for dashboard
```

**Output**: `output/docs/dashboard.html`

---

#### `pcc metrics`
Generate cognitive metrics JSON file.

```bash
# Export metrics
pcc metrics

# Custom paths
pcc metrics --shards ./shards --output ./metrics.json

# Options:
#   --shards <path>        Path to shards directory
#   --output <path>        Output path for metrics
```

**Output**:
- `output/docs/cognitive_metrics.json`
- `output/docs/portfolio_brief.md`
- `output/docs/progress_ledger.md`

---

#### `pcc all`
Run complete pipeline (all phases sequentially).

```bash
# Run full pipeline
pcc all

# With custom configuration
pcc all --dir ~/projects --active-only --agent-db ./data/agentdb.json

# Options:
#   -d, --dir <path>       Directory to scan
#   -m, --max-depth <n>    Maximum directory depth
#   --agent-db <path>      Path to AgentDB directory
#   --active-only          Only analyze active repositories
```

---

#### `pcc status`
Show current pipeline status and file locations.

```bash
pcc status
```

**Example output**:
```
📋 Portfolio Cognitive Command - Status
════════════════════════════════════════════════════════════

Phase 1 (Scan):     ✓ Complete
  └─ 47 repos scanned (12 active)
Phase 2 (Analyze):  ✓ Complete
  └─ 47 shards generated
Phase 3 (Dashboard): ✓ Complete
  └─ 127.4 KB dashboard
Phase 4 (Metrics):  ✓ Complete
  └─ 87.3% precision

📁 File Locations:
  • Docs: /output/docs/
  • Shards: /output/docs/shards/
  • Dashboard: /output/docs/dashboard.html
  • Metrics: /output/docs/cognitive_metrics.json

🌐 View dashboard: file:///output/docs/dashboard.html
```

---

## 🛠️ Skills Reference

The system uses modular "skills" for different analysis tasks.

### Core Skills

#### 1. **repo-scanner**
Scans directories for Git repositories and extracts metadata.

**Capabilities**:
- Recursive directory traversal
- Git metadata extraction (commits, branches, authors)
- Activity classification (active/dormant)
- Changed file tracking

**Usage**:
```typescript
import { scanRepos, getChangedFiles } from './skills/repo-scanner';

const repos = await scanRepos('/path/to/projects', 3);
const files = await getChangedFiles('/path/to/repo', '2025-01-01');
```

---

#### 2. **semantic-analyzer**
Generates embeddings using OpenAI's API or keyword-based fallback.

**Capabilities**:
- OpenAI embedding generation (text-embedding-3-small)
- Semantic clustering into categories
- Keyword-based fallback
- Multi-dimensional vector analysis

**Clusters**:
- `frontend` - React, Vue, Angular, HTML/CSS
- `backend` - Node.js, Express, API development
- `fullstack` - MERN, MEAN, complete applications
- `infrastructure` - DevOps, CI/CD, Docker, Kubernetes
- `ai/ml` - Machine learning, AI models
- `data` - Databases, analytics, ETL
- `general` - Uncategorized projects

**Usage**:
```typescript
import { generateEmbedding } from './skills/semantic-analyzer';

const embedding = await generateEmbedding(
  ['commit message 1', 'commit message 2'],
  ['src/file1.ts', 'src/file2.ts']
);
// Returns: { vector: number[], cluster: string }
```

---

#### 3. **drift-detector**
Detects semantic drift between AI reasoning and implementation.

**Capabilities**:
- Cosine similarity calculation
- Drift scoring (0-1 scale)
- Threshold-based alerts
- Semantic alignment measurement

**Usage**:
```typescript
import { detectDrift } from './skills/drift-detector';

const drift = await detectDrift(
  'AI reasoning chain...',
  'Implementation code...'
);
// Returns: { score: number, alert: boolean }
```

---

#### 4. **shard-generator**
Creates project shards (structured JSON metadata).

**Capabilities**:
- Shard generation from repo metadata
- Batch processing
- Statistical calculation
- Cluster distribution analysis

**Shard Structure**:
```json
{
  "project": "project-name",
  "path": "/absolute/path",
  "status": "ACTIVE",
  "activity": {
    "commits7d": 5,
    "lastCommit": "2025-12-04T10:30:00Z"
  },
  "embedding": {
    "cluster": "backend",
    "vector": [0.1, 0.2, ...]
  },
  "cognitive": {
    "sessionId": "session-123",
    "drift": { "score": 0.85, "alert": false }
  }
}
```

**Usage**:
```typescript
import { generateShard, saveShards, calculateStats } from './skills/shard-generator';

const shard = generateShard(repo, embedding, cognitiveLink, drift);
saveShards([shard], './output/shards');
const stats = calculateStats([shard]);
```

---

#### 5. **dashboard-builder**
Generates interactive HTML dashboards.

**Capabilities**:
- Responsive HTML generation
- Project clustering visualization
- Activity heatmaps
- Drift alert panels
- Interactive filtering

**Features**:
- Real-time search/filter
- Cluster-based organization
- Status indicators
- Cognitive link displays
- Export functionality

**Usage**:
```typescript
import { createDashboardConfig, buildDashboardHTML, saveDashboard } from './skills/dashboard-builder';

const config = createDashboardConfig(shards);
const html = buildDashboardHTML(config);
saveDashboard(html, './dashboard.html');
```

---

#### 6. **cognitive-linker**
Links commits to AI agent sessions via AgentDB.

**Capabilities**:
- Session-commit matching
- Temporal correlation
- Reasoning chain extraction
- MCP memory integration
- GOAP world state tracking

**Usage**:
```typescript
import { linkToAgentDB } from './skills/cognitive-linker';

const link = await linkToAgentDB(
  new Date('2025-12-04'),
  'commit-hash-123',
  './data/agentdb.json'
);
// Returns: { sessionId, reasoningChain, confidence }
```

---

#### 7. **brief-generator**
Generates executive portfolio summaries.

**Capabilities**:
- Markdown report generation
- Statistical analysis
- Top project highlighting
- Cluster distribution
- Activity trends

**Output Format**:
```markdown
# Portfolio Brief

**Generated**: 2025-12-04

## Overview
- Total Projects: 47
- Active Projects: 12 (25.5%)
- Average Alignment: 87.3%

## Top Projects
1. **project-alpha** - Backend (5 commits/week)
2. **project-beta** - Frontend (3 commits/week)

## Cluster Distribution
- Backend: 15 projects
- Frontend: 12 projects
...
```

**Usage**:
```typescript
import { generateBrief } from './skills/brief-generator';

const result = generateBrief(
  './output/docs/shards',
  './output/docs/cognitive_metrics.json',
  './output/docs'
);
```

---

#### 8. **ledger-generator**
Creates detailed progress ledgers.

**Capabilities**:
- Git history analysis
- Activity timeline generation
- Commit log formatting
- Weekly/monthly aggregation
- Trend detection

**Usage**:
```typescript
import { generateLedger } from './skills/ledger-generator';

const result = await generateLedger({
  shardDir: './output/docs/shards',
  outputDir: './output/docs'
});
```

---

## 🗄️ AgentDB Integration

AgentDB provides a unified persistence layer for AI agent interactions.

### Architecture

```
AgentDB
├── Database Layer (database.ts)
│   ├── Session management
│   ├── Memory storage
│   └── GOAP state tracking
├── MCP Adapter (mcp-adapter.ts)
│   ├── Memory operations
│   └── State synchronization
├── Session Capture (session-capture.ts)
│   ├── Agent interaction logging
│   └── Reasoning chain recording
└── Storage (storage.ts)
    ├── File-based persistence
    └── JSON serialization
```

### Key Features

#### 1. **Session Management**
Track AI agent sessions with metadata:
```typescript
{
  sessionId: "session-123",
  timestamp: "2025-12-04T10:30:00Z",
  agent: "cognitive-analyzer",
  reasoning: ["step 1", "step 2"],
  outcome: "SUCCESS"
}
```

#### 2. **MCP Memory Integration**
Connect to Model Context Protocol:
```typescript
import { MCPAdapter } from './agentdb/mcp-adapter';

const adapter = new MCPAdapter('./data/agentdb.json');
await adapter.storeMemory('key', { data: 'value' });
const memory = await adapter.retrieveMemory('key');
```

#### 3. **GOAP World State**
Track goal-oriented planning:
```typescript
{
  worldState: {
    goals: ["goal1", "goal2"],
    actions: ["action1", "action2"],
    preconditions: {...},
    effects: {...}
  }
}
```

#### 4. **Session Capture**
Record agent interactions:
```typescript
import { captureSession } from './agentdb/session-capture';

await captureSession({
  agentId: 'analyzer-1',
  task: 'semantic-analysis',
  reasoning: ['step 1', 'step 2'],
  files: ['file1.ts', 'file2.ts']
});
```

### Configuration

AgentDB path is configured via environment variable:
```bash
AGENTDB_PATH=./data/agentdb.json
```

Or via CLI:
```bash
pcc analyze --agent-db ./custom/path/agentdb.json
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `OPENAI_API_KEY` | string | - | OpenAI API key for embeddings |
| `OPENAI_EMBEDDING_MODEL` | string | `text-embedding-3-small` | OpenAI model name |
| `EMBEDDING_DIMENSIONS` | number | `1536` | Embedding vector dimensions |
| `USE_OPENAI_API` | boolean | `true` | Enable OpenAI API |
| `SCAN_DIR` | string | `cwd()` | Directory to scan |
| `AGENTDB_PATH` | string | `./data/agentdb.json` | AgentDB file path |
| `OUTPUT_DIR` | string | `./output` | Output directory |
| `DRIFT_THRESHOLD` | number | `0.7` | Drift detection threshold (0-1) |
| `MIN_CLUSTER_SIZE` | number | `2` | Minimum projects per cluster |
| `MAX_CLUSTER_SIZE` | number | `10` | Maximum projects per cluster |
| `VERBOSE` | boolean | `false` | Enable verbose logging |
| `LOG_LEVEL` | string | `info` | Log level (error/warn/info/debug) |
| `FALLBACK_TO_KEYWORDS` | boolean | `true` | Use keyword fallback |

### Configuration Validation

The system automatically validates configuration on startup:

```typescript
import { validateConfig, printConfig } from './config';

const validation = validateConfig();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}

printConfig(); // Display current configuration
```

---

## 🧪 Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/portfolio-cognitive-command.git
cd portfolio-cognitive-command

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- repo-scanner.test.ts

# Watch mode
npm test -- --watch
```

### Test Coverage

Current coverage: **79%**
- Unit tests: 475 passing
- Integration tests: 3 passing
- Coverage report: `./coverage/lcov-report/index.html`

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### TypeScript Type Checking

```bash
# Check types
npm run typecheck

# Watch mode
tsc --watch
```

### Project Scripts

```bash
npm run build       # Compile TypeScript to JavaScript
npm run start       # Run compiled CLI
npm run dev         # Run TypeScript directly (ts-node)
npm test            # Run Jest tests
npm run test:coverage  # Generate coverage report
npm run lint        # Lint source files
npm run scan        # Quick scan shortcut
npm run analyze     # Quick analyze shortcut
npm run all         # Run complete pipeline
```

### Directory Structure

```
portfolio-cognitive-command/
├── src/                    # Source code
│   ├── skills/            # Modular skills
│   │   ├── repo-scanner.ts
│   │   ├── semantic-analyzer.ts
│   │   ├── drift-detector.ts
│   │   ├── shard-generator.ts
│   │   ├── dashboard-builder.ts
│   │   ├── cognitive-linker.ts
│   │   ├── brief-generator.ts
│   │   └── ledger-generator.ts
│   ├── agentdb/           # AgentDB module
│   │   ├── database.ts
│   │   ├── mcp-adapter.ts
│   │   ├── session-capture.ts
│   │   ├── storage.ts
│   │   ├── queries.ts
│   │   ├── sync.ts
│   │   └── types.ts
│   ├── config.ts          # Configuration
│   └── index.ts           # CLI entry point
├── tests/                 # Test files
│   ├── *.test.ts         # Unit tests
│   └── integration/       # Integration tests
├── output/                # Output directory
│   └── docs/             # Generated documentation
│       ├── shards/       # Project shards
│       ├── dashboard.html
│       ├── cognitive_metrics.json
│       ├── portfolio_brief.md
│       └── progress_ledger.md
├── data/                  # Data directory
│   └── agentdb.json      # AgentDB storage
├── docs/                  # Project documentation
├── coverage/             # Test coverage reports
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env                  # Environment variables
```

---

## 📖 Usage Examples

### Example 1: Analyze Personal Projects

```bash
# Scan personal projects directory
pcc scan --dir ~/projects --max-depth 4

# Analyze only active projects
pcc analyze --active-only

# Generate dashboard
pcc dashboard

# View results
open output/docs/dashboard.html
```

### Example 2: Enterprise Portfolio Analysis

```bash
# Set environment variables
export SCAN_DIR=/enterprise/repos
export DRIFT_THRESHOLD=0.8
export MIN_CLUSTER_SIZE=5

# Run complete pipeline
pcc all

# Export metrics for reporting
pcc metrics --output /reports/metrics.json
```

### Example 3: CI/CD Integration

```bash
#!/bin/bash
# ci-analyze.sh

# Run portfolio analysis in CI
pcc all --dir $WORKSPACE --active-only

# Check for drift alerts
DRIFT_ALERTS=$(jq '.driftAlerts' output/docs/cognitive_metrics.json)

if [ "$DRIFT_ALERTS" -gt 0 ]; then
  echo "Warning: $DRIFT_ALERTS drift alerts detected"
  exit 1
fi

echo "Portfolio analysis complete"
```

### Example 4: Programmatic API Usage

```typescript
import { scanRepos } from './skills/repo-scanner';
import { generateEmbedding } from './skills/semantic-analyzer';
import { generateShard } from './skills/shard-generator';

async function analyzePortfolio() {
  // Scan repositories
  const repos = await scanRepos('./projects', 3);

  // Process each repository
  for (const repo of repos) {
    // Generate embedding
    const embedding = await generateEmbedding(
      [repo.lastCommit.message],
      [repo.path]
    );

    // Create shard
    const shard = generateShard(repo, embedding);

    console.log(`${repo.name}: ${embedding.cluster}`);
  }
}

analyzePortfolio();
```

---

## 🔍 Output Files

### phase1_manifest.json
Repository scan results:
```json
{
  "scan_date": "2025-12-04",
  "total_repos": 47,
  "active_repos": ["repo1", "repo2"],
  "dormant_repos": ["repo3"],
  "manifest": [...]
}
```

### Project Shards (*.json)
Individual project metadata:
```json
{
  "project": "my-project",
  "status": "ACTIVE",
  "embedding": { "cluster": "backend" },
  "cognitive": { "sessionId": "abc123" }
}
```

### dashboard.html
Interactive HTML visualization with:
- Project cards grouped by cluster
- Activity indicators
- Drift alerts
- Search/filter capabilities

### cognitive_metrics.json
Aggregate portfolio metrics:
```json
{
  "totalProjects": 47,
  "activeProjects": 12,
  "averageAlignment": 0.873,
  "driftAlerts": 2,
  "clusterDistribution": {...}
}
```

### portfolio_brief.md
Executive summary in markdown format

### progress_ledger.md
Detailed activity log with commit history

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Maintain TypeScript type safety
- Follow existing code style
- Update documentation
- Add JSDoc comments
- Keep functions under 50 lines
- Use meaningful variable names

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** - For embedding models and API
- **Commander.js** - For CLI interface
- **TypeScript** - For type safety
- **Jest** - For testing framework
- **Claude-Flow** - For SPARC methodology integration

---

## 📞 Support

- **Documentation**: [./docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/portfolio-cognitive-command/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/portfolio-cognitive-command/discussions)

---

## 🗺️ Roadmap

### v1.1.0 (Planned)
- [ ] Multi-language support for embeddings
- [ ] Real-time dashboard updates
- [ ] GitHub API integration
- [ ] Docker containerization

### v1.2.0 (Future)
- [ ] GraphQL API
- [ ] Web-based UI
- [ ] Team collaboration features
- [ ] Advanced analytics

---

**Version**: 1.0.0
**Last Updated**: 2025-12-04
**Status**: Production Ready

---

*Built with ❤️ using SPARC methodology and Claude-Flow orchestration*
