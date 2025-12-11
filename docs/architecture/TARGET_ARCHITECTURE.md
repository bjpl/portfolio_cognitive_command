# Target Architecture: Portfolio Cognitive Command
**Production-Ready Design with Real Vector Database & MCP Integration**

Date: December 4, 2025
Status: ARCHITECTURE DESIGN PHASE

---

## Executive Summary

This document outlines the target architecture for migrating Portfolio Cognitive Command from a keyword-based prototype to a production-ready system with:
- **Real vector database** (actual AgentDB npm package)
- **True semantic embeddings** (OpenAI/Transformers)
- **Live MCP integration** (claude-flow/ruv-swarm)
- **Neural pattern learning** (distillation, replay)
- **Distributed coordination** (multi-agent swarms)

**Current State**: Functional prototype with JSON file storage and keyword-based "embeddings"
**Target State**: Production vector database with true semantic search and neural learning

---

## 1. CRITICAL GAPS IN CURRENT IMPLEMENTATION

### 1.1 Semantic Analysis Issues
```
CURRENT (semantic-analyzer.ts):
├── Uses keyword frequency counting (not embeddings)
├── Hash-based "vector" generation (simpleHash function)
├── Cluster bias hardcoded in first 10 dimensions
├── No vector similarity search (only cosine similarity utility)
└── OpenAI API optional, defaults to fake vectors

PROBLEM:
→ Not real semantic embeddings
→ No learned representations
→ Cannot capture context or meaning
→ Keyword matching misses semantic similarity
```

### 1.2 AgentDB Naming Confusion
```
CURRENT (src/agentdb/):
├── database.ts - NOT a vector database
├── storage.ts - JSON file operations (fs.writeFile)
├── types.ts - Document schemas (no vector types)
└── queries.ts - Array.filter() queries (not vector search)

PROBLEM:
→ Misleading name suggests vector database
→ Actually just JSON file storage with manual filtering
→ No HNSW indexing, no ANN search
→ Linear scan over all documents (O(n))
```

### 1.3 MCP Sync Layer Disconnected
```
CURRENT (src/agentdb/sync.ts):
├── MCPMemoryTools interface defined
├── SyncManager implemented with push/pull/merge
├── Conflict resolution strategies coded
└── BUT: Never connects to real MCP servers

PROBLEM:
→ Interface exists but no implementation
→ No actual claude-flow MCP integration
→ No mcp__claude-flow__* tool calls
→ SyncManager never instantiated with real tools
```

### 1.4 Neural Patterns Referenced, Not Implemented
```
CURRENT:
├── types.ts defines NeuralPattern document
├── database.ts has saveNeuralPattern() method
├── No actual neural network code
└── No training, no inference, no pattern distillation

PROBLEM:
→ Skeleton only, no implementation
→ No pattern learning from sessions
→ No trajectory optimization
→ No ReasoningBank integration
```

---

## 2. TARGET ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PORTFOLIO COGNITIVE COMMAND                             │
│                         Production Architecture                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: CLI & USER INTERFACE                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Commander   │  │   Config     │  │  Dashboard   │  │   Metrics    │    │
│  │   (CLI)      │  │  Validator   │  │   Builder    │  │   Reporter   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │                 │            │
└─────────┼─────────────────┼──────────────────┼─────────────────┼────────────┘
          │                 │                  │                 │
          ▼                 ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: ORCHESTRATION & COORDINATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    MCP COORDINATION LAYER                            │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Claude Flow MCP Server                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ swarm_init   │  │ agent_spawn  │  │task_orchestr │               │   │
│  │  │  (topology)  │  │  (parallel)  │  │  (pipeline)  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │memory_store  │  │ memory_retr  │  │ neural_train │               │   │
│  │  │  (persist)   │  │  (context)   │  │  (patterns)  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              SESSION CAPTURE & COORDINATION                          │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  SessionCapture                                                       │   │
│  │  ├─ Creates sessions with MCP persistence                            │   │
│  │  ├─ Links commits via cognitive-linker                               │   │
│  │  ├─ Captures reasoning chains (ReasoningBank)                        │   │
│  │  └─ Syncs to AgentDB vector store                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: SEMANTIC ANALYSIS & VECTOR OPERATIONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              EMBEDDING GENERATION PIPELINE                           │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  1. TEXT EXTRACTION                                                  │   │
│  │     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │     │   Git Log    │  │  File Paths  │  │    README    │            │   │
│  │     │  (commits)   │  │  (semantic)  │  │  (context)   │            │   │
│  │     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │   │
│  │            └──────────────────┴──────────────────┘                   │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │  2. EMBEDDING MODELS (Priority Order)                               │   │
│  │     ┌──────────────────────────────────────────────────────┐        │   │
│  │     │ STRATEGY PATTERN: Try in order until success         │        │   │
│  │     ├──────────────────────────────────────────────────────┤        │   │
│  │     │ 1st: OpenAI text-embedding-3-small (1536d)           │        │   │
│  │     │      └─ API call with retry + caching                │        │   │
│  │     │ 2nd: HuggingFace sentence-transformers               │        │   │
│  │     │      └─ Local model (all-MiniLM-L6-v2) 384d          │        │   │
│  │     │ 3rd: Keyword TF-IDF vectorizer (sparse → dense)      │        │   │
│  │     │      └─ Scikit-learn with LSA dimensionality reduce  │        │   │
│  │     └──────────────────────────────────────────────────────┘        │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │  3. VECTOR NORMALIZATION                                            │   │
│  │     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │     │  L2 Normalize│  │  Dimension   │  │   Metadata   │            │   │
│  │     │  (unit vec)  │  │  Alignment   │  │   Attach     │            │   │
│  │     └──────────────┘  └──────────────┘  └──────────────┘            │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              CLUSTER & DRIFT DETECTION                               │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   K-Means    │  │   HDBSCAN    │  │   Semantic   │               │   │
│  │  │  Clustering  │  │  (density)   │  │   Similarity │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │                                                                       │   │
│  │  Cluster Types: Experience, Core Systems, Infra (from embeddings)   │   │
│  │  Drift Detection: Compare reasoning vector to implementation vector │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: VECTOR DATABASE & PERSISTENCE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     AGENTDB NPM PACKAGE                              │   │
│  │                    (Real Vector Database)                            │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  Import: @agentic/agentdb                                            │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ VECTOR STORE                                                │    │   │
│  │  ├─────────────────────────────────────────────────────────────┤    │   │
│  │  │ • Collections with vector columns                           │    │   │
│  │  │ • HNSW indexing (M=16, efConstruction=200)                  │    │   │
│  │  │ • Distance metrics: cosine, euclidean, dot                  │    │   │
│  │  │ • Metadata filtering (hybrid search)                        │    │   │
│  │  │ • Quantization: 4bit, 8bit, 16bit options                   │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ COLLECTIONS                                                 │    │   │
│  │  ├─────────────────────────────────────────────────────────────┤    │   │
│  │  │ commits:                                                    │    │   │
│  │  │   ├─ hash (primary key)                                     │    │   │
│  │  │   ├─ embedding (vector 1536d)                               │    │   │
│  │  │   ├─ message, author, timestamp                             │    │   │
│  │  │   └─ cluster, repository (metadata)                         │    │   │
│  │  │                                                              │    │   │
│  │  │ sessions:                                                   │    │   │
│  │  │   ├─ sessionId (primary key)                                │    │   │
│  │  │   ├─ reasoningEmbedding (vector 1536d)                      │    │   │
│  │  │   ├─ decisions[], outcome                                   │    │   │
│  │  │   └─ commitHashes[], agentIds[]                             │    │   │
│  │  │                                                              │    │   │
│  │  │ patterns:                                                   │    │   │
│  │  │   ├─ patternId (primary key)                                │    │   │
│  │  │   ├─ patternVector (vector 1536d)                           │    │   │
│  │  │   ├─ trajectory (ReasoningBank format)                      │    │   │
│  │  │   └─ successRate, usageCount                                │    │   │
│  │  │                                                              │    │   │
│  │  │ repositories:                                               │    │   │
│  │  │   ├─ repoPath (primary key)                                 │    │   │
│  │  │   ├─ contextEmbedding (vector 1536d)                        │    │   │
│  │  │   ├─ README summary, tech stack                             │    │   │
│  │  │   └─ clusterDistribution, metrics                           │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ VECTOR OPERATIONS                                           │    │   │
│  │  ├─────────────────────────────────────────────────────────────┤    │   │
│  │  │ • vectorSearch(embedding, k=10, filter?)                    │    │   │
│  │  │ • hybridSearch(text, metadata, k=10)                        │    │   │
│  │  │ • insertVector(collection, doc)                             │    │   │
│  │  │ • updateVector(collection, id, newEmbedding)                │    │   │
│  │  │ • deleteVector(collection, id)                              │    │   │
│  │  │ • buildIndex(collection) // HNSW build                      │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              FILE STORAGE (Fallback & Exports)                       │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  memory/                                                              │   │
│  │  ├─ agentdb.db (SQLite/DuckDB with vector extension)                 │   │
│  │  ├─ exports/                                                          │   │
│  │  │  ├─ commits.jsonl (line-delimited JSON)                           │   │
│  │  │  ├─ sessions.jsonl                                                │   │
│  │  │  └─ patterns.jsonl                                                │   │
│  │  └─ cache/                                                            │   │
│  │     ├─ embeddings/ (OpenAI cache to avoid re-computing)              │   │
│  │     └─ models/ (Downloaded HuggingFace models)                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 5: SKILLS & AGENTS                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │  RepoScanner   │  │ SemanticAnalyz │  │ DriftDetector  │                │
│  │                │  │      (NEW)     │  │     (NEW)      │                │
│  │  • Git log     │  │  • Embedding   │  │  • Vector      │                │
│  │  • File paths  │  │    generation  │  │    comparison  │                │
│  │  • Branch info │  │  • Store in DB │  │  • Alert gen   │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ ShardGenerator │  │ DashboardBuild │  │CognitiveLinkr  │                │
│  │                │  │                │  │     (NEW)      │                │
│  │  • Vector      │  │  • Cluster viz │  │  • Session →   │                │
│  │    clusters    │  │  • Similarity  │  │    Commit link │                │
│  │  • Project     │  │    heatmaps    │  │  • AgentDB     │                │
│  │    breakdown   │  │  • Metrics     │  │    export      │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐                                     │
│  │BriefGenerator  │  │LedgerGenerator │                                     │
│  │                │  │                │                                     │
│  │  • Portfolio   │  │  • Progress    │                                     │
│  │    summary     │  │    tracking    │                                     │
│  │  • Cluster     │  │  • Timeline    │                                     │
│  │    breakdown   │  │  • Metrics     │                                     │
│  └────────────────┘  └────────────────┘                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 6: NEURAL LEARNING (NEW)                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │            REASONINGBANK INTEGRATION                                 │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  Pattern Learning Pipeline:                                          │   │
│  │                                                                       │   │
│  │  1. TRAJECTORY CAPTURE                                               │   │
│  │     Session → Decisions[] → Trajectory Vector                        │   │
│  │                                                                       │   │
│  │  2. VERDICT JUDGMENT                                                 │   │
│  │     Compare reasoning to outcome                                     │   │
│  │     ├─ Success: Store pattern for replay                             │   │
│  │     └─ Failure: Store anti-pattern to avoid                          │   │
│  │                                                                       │   │
│  │  3. MEMORY DISTILLATION                                              │   │
│  │     Extract high-value patterns from sessions                        │   │
│  │     ├─ Cluster similar trajectories                                  │   │
│  │     ├─ Identify recurring successful patterns                        │   │
│  │     └─ Store in AgentDB patterns collection                          │   │
│  │                                                                       │   │
│  │  4. EXPERIENCE REPLAY                                                │   │
│  │     Retrieve relevant patterns for new tasks                         │   │
│  │     ├─ Vector search: current task → similar patterns                │   │
│  │     ├─ Filter by success rate threshold                              │   │
│  │     └─ Suggest to agent for decision-making                          │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENT INTEGRATION MAP

### 3.1 Data Flow: Semantic Analysis Pipeline

```
INPUT: Git Repository
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ RepoScanner (Skill)                                              │
│ ├─ Extract commits, file paths, branches                         │
│ ├─ Parse README for context                                      │
│ └─ OUTPUT: RepositoryMetadata                                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SemanticAnalyzer (Skill - REWRITTEN)                             │
│                                                                  │
│ FOR EACH commit:                                                 │
│   1. Combine commit message + file paths → text                  │
│   2. Generate embedding via EmbeddingService:                    │
│      ┌─────────────────────────────────────────────────────┐    │
│      │ EmbeddingService (NEW)                              │    │
│      ├─────────────────────────────────────────────────────┤    │
│      │ try:                                                 │    │
│      │   return openai.embeddings.create(text)              │    │
│      │ catch:                                               │    │
│      │   return sentenceTransformers.encode(text)           │    │
│      │ catch:                                               │    │
│      │   return tfidfVectorizer.transform(text)             │    │
│      └─────────────────────────────────────────────────────┘    │
│   3. Store in AgentDB:                                           │
│      agentdb.insert('commits', {                                 │
│        hash, message, author, timestamp,                         │
│        embedding: vector,                                        │
│        repository, cluster: null  // To be assigned              │
│      })                                                          │
│                                                                  │
│ OUTPUT: Commit embeddings stored in vector DB                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ ClusteringService (NEW)                                          │
│                                                                  │
│ 1. Retrieve all commit embeddings for repository:               │
│    vectors = agentdb.query('commits', { repository })            │
│                                                                  │
│ 2. Perform clustering:                                           │
│    ┌─────────────────────────────────────────────────────┐      │
│    │ HDBSCAN Algorithm                                   │      │
│    ├─────────────────────────────────────────────────────┤      │
│    │ • min_cluster_size = 3                              │      │
│    │ • min_samples = 2                                   │      │
│    │ • metric = 'cosine'                                 │      │
│    │ • cluster_selection_method = 'eom'                  │      │
│    └─────────────────────────────────────────────────────┘      │
│                                                                  │
│ 3. Label clusters with semantic meaning:                        │
│    FOR EACH cluster:                                             │
│      centroid = mean(cluster_vectors)                            │
│      label = classify(centroid) // "Experience", "Core", "Infra" │
│      UPDATE commits SET cluster = label WHERE id IN cluster      │
│                                                                  │
│ OUTPUT: Clustered commits with semantic labels                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ DriftDetector (Skill - REWRITTEN)                                │
│                                                                  │
│ INPUT: Session with reasoning + commits                          │
│                                                                  │
│ 1. Generate reasoning embedding:                                 │
│    reasoningText = session.decisions.map(d => d.rationale).join │
│    reasoningVector = embeddingService.embed(reasoningText)       │
│                                                                  │
│ 2. Generate implementation embedding:                            │
│    commitMessages = session.commits.map(c => c.message).join     │
│    implVector = embeddingService.embed(commitMessages)           │
│                                                                  │
│ 3. Calculate semantic drift:                                     │
│    similarity = cosineSimilarity(reasoningVector, implVector)    │
│    drift = 1.0 - similarity                                      │
│                                                                  │
│ 4. Create alert if drift > threshold:                            │
│    IF drift > config.driftThreshold:                             │
│      agentdb.insert('driftAlerts', {                             │
│        sessionId, drift, severity,                               │
│        reasoningSummary, implementationSummary                   │
│      })                                                          │
│                                                                  │
│ OUTPUT: Drift alerts stored in DB                               │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ DashboardBuilder (Skill - ENHANCED)                              │
│                                                                  │
│ 1. Query AgentDB for visualization data:                         │
│    ┌─ Cluster distribution                                       │
│    ├─ Commit timeline                                            │
│    ├─ Drift alerts                                               │
│    ├─ Pattern usage                                              │
│    └─ Similarity heatmap (vector search between repos)           │
│                                                                  │
│ 2. Generate interactive HTML:                                    │
│    ┌─ D3.js force-directed graph for clusters                    │
│    ├─ Plotly heatmaps for similarity                             │
│    ├─ Timeline with drift alerts                                 │
│    └─ Pattern recommendations                                    │
│                                                                  │
│ OUTPUT: output/dashboard.html                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow: MCP Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ SESSION LIFECYCLE WITH MCP                                       │
└─────────────────────────────────────────────────────────────────┘

1. SESSION START
   ├─ User runs: pcc analyze
   ├─ SessionCapture.createSession()
   │  ├─ Create SessionState document
   │  ├─ Save to AgentDB local
   │  └─ Sync to MCP memory:
   │     mcp__claude-flow__memory_store(
   │       key: "sessions/active_session",
   │       value: JSON.stringify(session),
   │       namespace: "portfolio-cognitive-command"
   │     )
   └─ Session ID returned to CLI

2. TASK EXECUTION (Analysis Running)
   ├─ Skills execute (RepoScanner, SemanticAnalyzer, etc.)
   ├─ Each skill records decisions:
   │  SessionCapture.addDecision({
   │    description: "Analyzing repository structure",
   │    rationale: "Need to understand project organization",
   │    outcome: "Found 45 commits across 3 clusters"
   │  })
   ├─ Decisions stored in AgentDB
   └─ Synced to MCP for cross-session access

3. COMMIT LINKING (Git Commit Made)
   ├─ Developer commits code changes
   ├─ Git post-commit hook calls:
   │  pcc link-commit <commit-hash>
   ├─ SessionCapture.linkCommit()
   │  ├─ Add commit hash to session.commits[]
   │  ├─ Save to AgentDB
   │  ├─ Sync to MCP memory
   │  └─ Update cognitive-linker agentdb.json
   └─ Commit now linked to session

4. SESSION END
   ├─ User runs: pcc session-end --outcome "Analysis complete"
   ├─ SessionCapture.endSession()
   │  ├─ Set status = 'completed'
   │  ├─ Calculate metrics (duration, files modified, etc.)
   │  ├─ Save final state to AgentDB
   │  ├─ Sync to MCP memory
   │  └─ Trigger pattern learning:
   │     PatternLearner.extractPatterns(session)
   └─ Session archived

5. PATTERN LEARNING (Async Background)
   ├─ ReasoningBankService.analyzeSession(session)
   │  ├─ Extract trajectory: decisions[] → vector
   │  ├─ Compare to outcome (success/failure)
   │  ├─ If successful pattern:
   │  │  ├─ Store in AgentDB 'patterns' collection
   │  │  └─ Make available for future retrieval
   │  └─ Sync pattern to MCP:
   │     mcp__claude-flow__neural_train({
   │       patternId, trajectory, successRate
   │     })
   └─ Pattern available for experience replay
```

### 3.3 Data Flow: Vector Search Operations

```
┌─────────────────────────────────────────────────────────────────┐
│ VECTOR SEARCH SCENARIOS                                          │
└─────────────────────────────────────────────────────────────────┘

SCENARIO 1: Find Similar Commits
───────────────────────────────────
INPUT: "Add authentication feature"

1. Generate query embedding:
   queryVector = embeddingService.embed("Add authentication feature")

2. Execute vector search:
   results = agentdb.vectorSearch('commits', {
     vector: queryVector,
     k: 10,
     metric: 'cosine',
     filter: { repository: '/path/to/repo' }
   })

3. Results:
   [
     { hash: "abc123", message: "Implement OAuth login", similarity: 0.89 },
     { hash: "def456", message: "Add JWT authentication", similarity: 0.85 },
     { hash: "ghi789", message: "Secure user endpoints", similarity: 0.78 },
     ...
   ]

OUTPUT: Ranked list of similar commits with similarity scores

SCENARIO 2: Find Relevant Patterns for Current Task
────────────────────────────────────────────────────
INPUT: Current session with task description

1. Generate task embedding:
   taskText = session.name + " " + session.description
   taskVector = embeddingService.embed(taskText)

2. Search patterns collection:
   patterns = agentdb.vectorSearch('patterns', {
     vector: taskVector,
     k: 5,
     filter: { successRate: { $gte: 0.8 } }  // Only successful patterns
   })

3. Retrieve pattern details:
   FOR EACH pattern:
     trajectory = pattern.trajectory  // Decision chain
     suggestions = pattern.recommendations

OUTPUT: Recommended decision paths based on past success

SCENARIO 3: Repository Similarity Analysis
───────────────────────────────────────────
INPUT: Multiple repository paths

1. Generate context embeddings:
   FOR EACH repository:
     contextText = README + primaryLanguage + techStack
     repoVector = embeddingService.embed(contextText)
     agentdb.insert('repositories', { path, contextEmbedding: repoVector })

2. Build similarity matrix:
   repos = agentdb.query('repositories')
   similarityMatrix = computePairwiseSimilarity(repos.map(r => r.contextEmbedding))

3. Cluster repositories:
   clusters = HDBSCAN(similarityMatrix)

OUTPUT: Repository clusters with similarity scores

SCENARIO 4: Drift Detection via Vector Comparison
──────────────────────────────────────────────────
INPUT: Session with reasoning and commits

1. Reasoning embedding:
   reasoning = session.decisions.map(d => d.rationale).join("\n")
   reasoningVec = embeddingService.embed(reasoning)

2. Implementation embedding:
   implementation = session.commits.map(c => c.message).join("\n")
   implVec = embeddingService.embed(implementation)

3. Calculate drift:
   similarity = cosineSimilarity(reasoningVec, implVec)
   drift = 1.0 - similarity

   IF drift > 0.3:  // 30% drift threshold
     CREATE drift alert

OUTPUT: Drift score with alert if threshold exceeded
```

---

## 4. MIGRATION PATH: Current → Target

### Phase 1: Foundation (Week 1-2)
```
TASKS:
1. Install AgentDB npm package
   npm install @agentic/agentdb

2. Create VectorDatabaseService wrapper:
   src/services/vector-database.ts
   ├─ Initialize AgentDB with SQLite backend
   ├─ Define collections (commits, sessions, patterns, repos)
   ├─ Configure HNSW indexing
   └─ Implement CRUD + vector search methods

3. Create EmbeddingService:
   src/services/embedding-service.ts
   ├─ OpenAI client (primary)
   ├─ HuggingFace transformers (fallback)
   ├─ TF-IDF vectorizer (last resort)
   └─ Caching layer for repeated texts

4. Update config.ts:
   ├─ Add AGENTDB_PATH (location of .db file)
   ├─ Add EMBEDDING_CACHE_DIR
   ├─ Add VECTOR_INDEX_CONFIG
   └─ Add MCP_SERVER_URL

STATUS:
├─ Existing semantic-analyzer.ts DEPRECATED (kept for reference)
├─ Existing agentdb/ directory RENAMED to legacy-storage/
└─ New services/ directory created

FILES CREATED:
├─ src/services/vector-database.ts (NEW)
├─ src/services/embedding-service.ts (NEW)
├─ src/services/clustering-service.ts (NEW)
└─ src/services/mcp-client.ts (NEW)
```

### Phase 2: Semantic Analysis Rewrite (Week 3-4)
```
TASKS:
1. Rewrite semantic-analyzer.ts:
   src/skills/semantic-analyzer.ts (REPLACE)
   ├─ Remove keyword matching logic
   ├─ Remove simpleHash() function
   ├─ Remove hardcoded cluster biases
   └─ Implement real embedding generation:

   export async function analyzeCommits(commits: Commit[]) {
     const embeddings = await Promise.all(
       commits.map(c => embeddingService.embed(c.message + " " + c.files.join(" ")))
     );

     for (let i = 0; i < commits.length; i++) {
       await vectorDb.insert('commits', {
         hash: commits[i].hash,
         message: commits[i].message,
         embedding: embeddings[i],
         repository: commits[i].repository,
         timestamp: commits[i].timestamp
       });
     }

     return { processedCount: commits.length };
   }

2. Rewrite drift-detector.ts:
   src/skills/drift-detector.ts (REPLACE)
   ├─ Remove keyword comparison
   └─ Implement vector-based drift:

   export async function detectDrift(sessionId: string) {
     const session = await vectorDb.get('sessions', sessionId);

     const reasoningVec = await embeddingService.embed(
       session.decisions.map(d => d.rationale).join("\n")
     );

     const implVec = await embeddingService.embed(
       session.commits.map(c => c.message).join("\n")
     );

     const similarity = cosineSimilarity(reasoningVec, implVec);
     const drift = 1.0 - similarity;

     if (drift > config.driftThreshold) {
       await vectorDb.insert('driftAlerts', {
         sessionId, drift, severity: calculateSeverity(drift),
         reasoningSummary: summarize(session.decisions),
         implementationSummary: summarize(session.commits)
       });
     }

     return { drift, similarity };
   }

3. Update clustering logic:
   src/services/clustering-service.ts (NEW)
   ├─ Implement HDBSCAN clustering
   ├─ Automatic cluster labeling via centroid classification
   └─ Integration with vector database

STATUS:
├─ semantic-analyzer.ts now uses real embeddings
├─ drift-detector.ts uses vector similarity
└─ Clustering is density-based, not keyword-based

FILES MODIFIED:
├─ src/skills/semantic-analyzer.ts (REWRITTEN)
├─ src/skills/drift-detector.ts (REWRITTEN)
└─ src/skills/shard-generator.ts (UPDATED to use clusters from DB)
```

### Phase 3: MCP Integration (Week 5-6)
```
TASKS:
1. Create MCP client:
   src/services/mcp-client.ts (NEW)

   import { MCPClient } from '@anthropic/mcp-client';

   export class PortfolioCognitiveMCPClient {
     private client: MCPClient;

     async connect() {
       this.client = await MCPClient.connect({
         serverUrl: config.mcpServerUrl || 'npx claude-flow@alpha mcp start',
         namespace: 'portfolio-cognitive-command'
       });
     }

     async storeMemory(key: string, value: any, ttl?: number) {
       return this.client.callTool('memory_store', {
         key,
         value: JSON.stringify(value),
         namespace: this.namespace,
         ttl
       });
     }

     async retrieveMemory(key: string) {
       const result = await this.client.callTool('memory_retrieve', {
         key,
         namespace: this.namespace
       });
       return result ? JSON.parse(result) : null;
     }

     async trainNeuralPattern(pattern: NeuralPattern) {
       return this.client.callTool('neural_train', {
         patternId: pattern.id,
         trajectory: pattern.trajectory,
         successRate: pattern.successRate
       });
     }
   }

2. Update SessionCapture to use MCP:
   src/agentdb/session-capture.ts (MODIFY)
   ├─ Replace MCPMemoryTools interface with actual MCP client
   ├─ Connect to claude-flow MCP server
   └─ Sync all operations to MCP memory

3. Create sync service:
   src/services/sync-service.ts (NEW)
   ├─ Periodic sync: AgentDB ↔ MCP memory
   ├─ Conflict resolution (prefer local, but log conflicts)
   └─ Background sync worker

STATUS:
├─ MCP client connected to real claude-flow server
├─ SessionCapture uses live MCP tools
└─ Cross-session memory persistence working

FILES CREATED:
├─ src/services/mcp-client.ts (NEW)
├─ src/services/sync-service.ts (NEW)
└─ src/hooks/mcp-hooks.ts (NEW - Git post-commit hooks)
```

### Phase 4: Neural Pattern Learning (Week 7-8)
```
TASKS:
1. Create ReasoningBank service:
   src/services/reasoningbank-service.ts (NEW)

   export class ReasoningBankService {
     async captureTrajectory(session: SessionState): Promise<Trajectory> {
       const decisions = session.decisions.map(d => ({
         state: d.description,
         action: d.rationale,
         reward: d.outcome ? calculateReward(d.outcome) : 0
       }));

       const trajectoryVector = await embeddingService.embed(
         decisions.map(d => `${d.state} → ${d.action}`).join(" | ")
       );

       return { sessionId: session.id, decisions, vector: trajectoryVector };
     }

     async judgeVerdict(trajectory: Trajectory, outcome: string): Promise<number> {
       // Positive outcomes: "success", "completed", "working"
       // Negative outcomes: "failed", "error", "blocked"
       const sentiment = analyzeSentiment(outcome);
       return sentiment.score; // -1 to +1
     }

     async distillPattern(trajectories: Trajectory[]): Promise<NeuralPattern> {
       // Cluster similar trajectories
       const vectors = trajectories.map(t => t.vector);
       const centroid = mean(vectors);

       // Extract common decision chain
       const commonDecisions = extractCommonPath(trajectories.map(t => t.decisions));

       return {
         id: generateId(),
         patternType: 'optimization',
         trajectory: commonDecisions,
         patternVector: centroid,
         successRate: calculateSuccessRate(trajectories),
         usageCount: 0
       };
     }

     async retrieveRelevantPatterns(taskDescription: string, k = 5) {
       const taskVector = await embeddingService.embed(taskDescription);

       return vectorDb.vectorSearch('patterns', {
         vector: taskVector,
         k,
         filter: { successRate: { $gte: 0.7 } }
       });
     }
   }

2. Integrate with SessionCapture:
   src/agentdb/session-capture.ts (MODIFY)

   async endSession(sessionId: string, outcome: string) {
     // ... existing code ...

     // Trigger pattern learning
     const trajectory = await reasoningBank.captureTrajectory(session);
     const verdict = await reasoningBank.judgeVerdict(trajectory, outcome);

     if (verdict > 0.5) {  // Successful session
       const pattern = await reasoningBank.distillPattern([trajectory]);
       await vectorDb.insert('patterns', pattern);
       await mcpClient.trainNeuralPattern(pattern);
     }
   }

3. Pattern retrieval in CLI:
   src/index.ts (MODIFY)

   program
     .command('suggest')
     .description('Get pattern-based suggestions for a task')
     .argument('<task>', 'Task description')
     .action(async (task) => {
       const patterns = await reasoningBank.retrieveRelevantPatterns(task);

       console.log(`\n📚 Found ${patterns.length} relevant patterns:\n`);
       patterns.forEach((p, i) => {
         console.log(`${i + 1}. ${p.name} (success rate: ${p.successRate})`);
         console.log(`   Recommended approach:`);
         p.trajectory.forEach(step => {
           console.log(`   - ${step.action}`);
         });
       });
     });

STATUS:
├─ ReasoningBank service captures session trajectories
├─ Pattern learning triggers on session end
├─ Experience replay available via CLI
└─ Neural patterns stored in vector database

FILES CREATED:
├─ src/services/reasoningbank-service.ts (NEW)
└─ src/types/reasoningbank.ts (NEW - Trajectory, Pattern types)
```

### Phase 5: Dashboard & Visualization (Week 9)
```
TASKS:
1. Update dashboard-builder.ts:
   src/skills/dashboard-builder.ts (MODIFY)
   ├─ Add cluster visualization (force-directed graph)
   ├─ Add similarity heatmap (repository × repository)
   ├─ Add drift timeline
   ├─ Add pattern recommendations section
   └─ Add vector search query interface

2. Create interactive components:
   output/dashboard.html (ENHANCED)
   ├─ D3.js cluster graph (zoomable, filterable)
   ├─ Plotly heatmaps (hover for details)
   ├─ Timeline with drill-down to commits
   └─ Pattern search box (live vector search)

3. Add export functionality:
   src/skills/export-service.ts (NEW)
   ├─ Export embeddings as JSONL
   ├─ Export for external analysis (Python, R)
   └─ Export patterns for sharing

STATUS:
├─ Dashboard uses real vector data
├─ Interactive visualizations functional
└─ Export pipelines ready

FILES MODIFIED:
├─ src/skills/dashboard-builder.ts (ENHANCED)
└─ src/skills/brief-generator.ts (UPDATED with pattern insights)
```

### Phase 6: Testing & Documentation (Week 10)
```
TASKS:
1. Comprehensive tests:
   tests/
   ├─ embedding-service.test.ts
   ├─ vector-database.test.ts
   ├─ semantic-analyzer.test.ts
   ├─ drift-detector.test.ts
   ├─ reasoningbank-service.test.ts
   ├─ mcp-client.test.ts
   └─ integration/
      ├─ end-to-end-analysis.test.ts
      └─ session-capture.test.ts

2. Documentation:
   docs/
   ├─ ARCHITECTURE.md (this document)
   ├─ MIGRATION_GUIDE.md (step-by-step)
   ├─ API_REFERENCE.md (all services)
   ├─ MCP_INTEGRATION.md (MCP setup)
   └─ VECTOR_SEARCH_GUIDE.md (usage examples)

3. Performance benchmarks:
   benchmarks/
   ├─ embedding-generation.bench.ts
   ├─ vector-search.bench.ts
   └─ clustering-performance.bench.ts

STATUS:
├─ Test coverage > 90%
├─ Documentation complete
└─ Benchmarks establish baselines
```

---

## 5. INTERFACE CONTRACTS

### 5.1 VectorDatabaseService Interface

```typescript
// src/services/vector-database.ts

import { AgentDB } from '@agentic/agentdb';

export interface VectorSearchOptions {
  vector: number[];
  k: number;
  metric?: 'cosine' | 'euclidean' | 'dot';
  filter?: Record<string, any>;
}

export interface VectorSearchResult<T> {
  document: T;
  similarity: number;
  distance: number;
}

export class VectorDatabaseService {
  private db: AgentDB;

  constructor(dbPath: string) {
    this.db = new AgentDB({
      path: dbPath,
      vectorIndexConfig: {
        M: 16,               // HNSW parameter
        efConstruction: 200, // Build-time accuracy
        efSearch: 50         // Query-time accuracy
      }
    });
  }

  async initialize(): Promise<void> {
    // Create collections with vector columns
    await this.db.createCollection('commits', {
      schema: {
        hash: 'string',
        message: 'string',
        author: 'string',
        timestamp: 'datetime',
        repository: 'string',
        cluster: 'string',
        embedding: 'vector(1536)'  // Vector column
      },
      primaryKey: 'hash',
      vectorIndex: {
        column: 'embedding',
        metric: 'cosine'
      }
    });

    await this.db.createCollection('sessions', {
      schema: {
        sessionId: 'string',
        name: 'string',
        status: 'string',
        reasoningEmbedding: 'vector(1536)',
        decisions: 'json',
        commits: 'json',
        // ... other fields
      },
      primaryKey: 'sessionId',
      vectorIndex: {
        column: 'reasoningEmbedding',
        metric: 'cosine'
      }
    });

    // ... more collections (patterns, repositories)
  }

  async insert<T>(collection: string, document: T): Promise<T> {
    return this.db.insert(collection, document);
  }

  async vectorSearch<T>(
    collection: string,
    options: VectorSearchOptions
  ): Promise<VectorSearchResult<T>[]> {
    return this.db.vectorSearch(collection, {
      vector: options.vector,
      k: options.k,
      metric: options.metric || 'cosine',
      filter: options.filter
    });
  }

  async hybridSearch<T>(
    collection: string,
    text: string,
    metadata: Record<string, any>,
    k: number = 10
  ): Promise<VectorSearchResult<T>[]> {
    // Combine vector search + metadata filtering
    const embedding = await embeddingService.embed(text);
    return this.vectorSearch(collection, {
      vector: embedding,
      k,
      filter: metadata
    });
  }

  async buildIndex(collection: string): Promise<void> {
    // Build HNSW index for faster search
    await this.db.buildVectorIndex(collection);
  }

  async getStats(collection: string) {
    return {
      totalDocuments: await this.db.count(collection),
      vectorDimension: await this.db.getVectorDimension(collection),
      indexSize: await this.db.getIndexSize(collection),
      averageQueryTime: await this.db.getAverageQueryTime(collection)
    };
  }
}
```

### 5.2 EmbeddingService Interface

```typescript
// src/services/embedding-service.ts

import OpenAI from 'openai';
import { pipeline } from '@xenova/transformers';

export interface EmbeddingOptions {
  model?: 'openai' | 'huggingface' | 'tfidf';
  dimensions?: number;
  cache?: boolean;
}

export class EmbeddingService {
  private openai?: OpenAI;
  private transformerPipeline?: any;
  private cache: Map<string, number[]>;

  constructor() {
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }
    this.cache = new Map();
  }

  async initialize(): Promise<void> {
    // Load HuggingFace model for fallback
    this.transformerPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const cacheKey = `${text}_${options?.model || 'auto'}`;

    if (options?.cache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let embedding: number[];

    try {
      // Try OpenAI first
      if (this.openai && (!options?.model || options.model === 'openai')) {
        embedding = await this.embedWithOpenAI(text);
      } else {
        throw new Error('OpenAI not available');
      }
    } catch (error) {
      console.warn('[EmbeddingService] OpenAI failed, using HuggingFace:', error);

      try {
        // Fallback to HuggingFace
        embedding = await this.embedWithHuggingFace(text);
      } catch (error2) {
        console.warn('[EmbeddingService] HuggingFace failed, using TF-IDF:', error2);

        // Last resort: TF-IDF
        embedding = await this.embedWithTFIDF(text);
      }
    }

    // Normalize to unit vector
    embedding = this.normalize(embedding);

    if (options?.cache !== false) {
      this.cache.set(cacheKey, embedding);
    }

    return embedding;
  }

  private async embedWithOpenAI(text: string): Promise<number[]> {
    const response = await this.openai!.embeddings.create({
      model: config.openaiEmbeddingModel,
      input: text.substring(0, 8000)  // Token limit
    });
    return response.data[0].embedding;
  }

  private async embedWithHuggingFace(text: string): Promise<number[]> {
    const output = await this.transformerPipeline(text, {
      pooling: 'mean',
      normalize: true
    });

    // Convert to 1536 dimensions (pad or reduce)
    return this.alignDimensions(Array.from(output.data), 1536);
  }

  private async embedWithTFIDF(text: string): Promise<number[]> {
    // Simple TF-IDF implementation
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(1536).fill(0);

    for (const word of words) {
      const hash = this.hashString(word);
      const index = Math.abs(hash) % 1536;
      vector[index] += 1 / Math.log(words.length + 1);  // TF-IDF approximation
    }

    return vector;
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }

  private alignDimensions(vector: number[], targetDim: number): number[] {
    if (vector.length === targetDim) return vector;
    if (vector.length < targetDim) {
      // Pad with zeros
      return [...vector, ...new Array(targetDim - vector.length).fill(0)];
    } else {
      // Reduce via averaging chunks
      const chunkSize = Math.ceil(vector.length / targetDim);
      const reduced = [];
      for (let i = 0; i < targetDim; i++) {
        const chunk = vector.slice(i * chunkSize, (i + 1) * chunkSize);
        reduced.push(chunk.reduce((a, b) => a + b, 0) / chunk.length);
      }
      return reduced;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const embeddingService = new EmbeddingService();
```

### 5.3 MCPClient Interface

```typescript
// src/services/mcp-client.ts

export interface MCPToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class MCPClient {
  private serverProcess: ChildProcess | null = null;
  private namespace: string;

  constructor(namespace: string = 'portfolio-cognitive-command') {
    this.namespace = namespace;
  }

  async connect(): Promise<void> {
    // Start MCP server process
    this.serverProcess = spawn('npx', ['claude-flow@alpha', 'mcp', 'start'], {
      stdio: 'pipe'
    });

    // Wait for server to be ready
    await this.waitForReady();
  }

  async callTool(tool: string, parameters: Record<string, any>): Promise<MCPToolResult> {
    const toolCall: MCPToolCall = { tool, parameters };

    // Send tool call via IPC
    const result = await this.sendToolCall(toolCall);
    return result;
  }

  async storeMemory(key: string, value: any, ttl?: number): Promise<boolean> {
    const result = await this.callTool('mcp__claude-flow__memory_store', {
      key,
      value: JSON.stringify(value),
      namespace: this.namespace,
      ttl
    });
    return result.success;
  }

  async retrieveMemory(key: string): Promise<any | null> {
    const result = await this.callTool('mcp__claude-flow__memory_retrieve', {
      key,
      namespace: this.namespace
    });
    return result.success ? JSON.parse(result.data) : null;
  }

  async trainNeuralPattern(pattern: NeuralPattern): Promise<boolean> {
    const result = await this.callTool('mcp__claude-flow__neural_train', {
      patternId: pattern.id,
      patternType: pattern.patternType,
      trajectory: pattern.trajectory,
      successRate: pattern.successRate
    });
    return result.success;
  }

  async swarmInit(topology: string, maxAgents: number): Promise<string> {
    const result = await this.callTool('mcp__claude-flow__swarm_init', {
      topology,
      maxAgents,
      namespace: this.namespace
    });
    return result.data.swarmId;
  }

  disconnect(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('MCP server timeout')), 30000);

      this.serverProcess?.stdout?.on('data', (data) => {
        if (data.toString().includes('MCP server ready')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
  }

  private async sendToolCall(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Implementation depends on MCP protocol (HTTP, stdio, etc.)
    // This is a placeholder - actual implementation will use MCP SDK
    return { success: true, data: null };
  }
}
```

### 5.4 ReasoningBankService Interface

```typescript
// src/services/reasoningbank-service.ts

export interface Trajectory {
  sessionId: string;
  decisions: DecisionStep[];
  vector: number[];
  outcome?: string;
  reward?: number;
}

export interface DecisionStep {
  state: string;
  action: string;
  rationale: string;
  reward: number;
}

export class ReasoningBankService {
  constructor(
    private vectorDb: VectorDatabaseService,
    private embeddingService: EmbeddingService
  ) {}

  async captureTrajectory(session: SessionState): Promise<Trajectory> {
    const decisions: DecisionStep[] = session.decisions.map(d => ({
      state: d.description,
      action: d.rationale,
      rationale: d.rationale,
      reward: this.calculateReward(d.outcome || '')
    }));

    // Generate trajectory embedding
    const trajectoryText = decisions
      .map(d => `${d.state} → ${d.action}`)
      .join(' | ');

    const vector = await this.embeddingService.embed(trajectoryText);

    return {
      sessionId: session.id,
      decisions,
      vector,
      outcome: session.customData.outcome as string,
      reward: this.calculateTotalReward(decisions)
    };
  }

  async judgeVerdict(trajectory: Trajectory, outcome: string): Promise<number> {
    // Sentiment analysis on outcome
    const positiveWords = ['success', 'complete', 'working', 'fixed', 'resolved'];
    const negativeWords = ['fail', 'error', 'broken', 'blocked', 'issue'];

    const lowerOutcome = outcome.toLowerCase();
    let score = 0;

    for (const word of positiveWords) {
      if (lowerOutcome.includes(word)) score += 0.2;
    }
    for (const word of negativeWords) {
      if (lowerOutcome.includes(word)) score -= 0.2;
    }

    return Math.max(-1, Math.min(1, score));
  }

  async distillPattern(trajectories: Trajectory[]): Promise<NeuralPattern> {
    // Find common decision patterns
    const vectors = trajectories.map(t => t.vector);
    const centroid = this.calculateCentroid(vectors);

    // Extract most frequent decision chains
    const commonPath = this.extractCommonPath(
      trajectories.map(t => t.decisions)
    );

    const successRate = trajectories.filter(t => (t.reward || 0) > 0).length / trajectories.length;

    const pattern: NeuralPattern = {
      id: this.generatePatternId(),
      collection: 'neuralPatterns',
      patternId: this.generatePatternId(),
      patternType: 'optimization',
      name: `Pattern from ${trajectories.length} sessions`,
      patternVector: centroid,
      trajectory: commonPath.map(step => step.action),
      trainedOn: trajectories.map(t => t.sessionId),
      trainingEpochs: 1,
      accuracy: successRate,
      loss: 1 - successRate,
      usageCount: 0,
      successRate,
      description: `Learned pattern with ${successRate * 100}% success rate`,
      tags: ['auto-learned', 'distilled'],
      customData: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      // Pattern-specific fields
      inputShape: [vectors[0].length],
      outputShape: [1],
      weights: [[]], // Simplified - real implementation would have trained weights
      biases: []
    };

    return pattern;
  }

  async retrieveRelevantPatterns(
    taskDescription: string,
    k: number = 5
  ): Promise<VectorSearchResult<NeuralPattern>[]> {
    const taskVector = await this.embeddingService.embed(taskDescription);

    return this.vectorDb.vectorSearch<NeuralPattern>('patterns', {
      vector: taskVector,
      k,
      filter: { successRate: { $gte: 0.7 } }
    });
  }

  private calculateReward(outcome: string): number {
    return this.judgeVerdict({ decisions: [], vector: [], sessionId: '' } as Trajectory, outcome);
  }

  private calculateTotalReward(decisions: DecisionStep[]): number {
    return decisions.reduce((sum, d) => sum + d.reward, 0) / decisions.length;
  }

  private calculateCentroid(vectors: number[][]): number[] {
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vec[i];
      }
    }

    return centroid.map(v => v / vectors.length);
  }

  private extractCommonPath(trajectories: DecisionStep[][]): DecisionStep[] {
    // Find longest common subsequence of decisions
    if (trajectories.length === 0) return [];

    // Simplified: return first trajectory as template
    // Real implementation would use LCS algorithm
    return trajectories[0];
  }

  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
```

---

## 6. REFACTORING STRATEGY

### What to Keep (Unchanged)
```
✅ src/config.ts - Good environment configuration
✅ src/index.ts - CLI structure is solid
✅ src/skills/repo-scanner.ts - Works well, no vector operations
✅ src/skills/dashboard-builder.ts - UI generation logic OK (add vector viz)
✅ src/skills/brief-generator.ts - Markdown generation OK (enhance with patterns)
✅ src/skills/ledger-generator.ts - Timeline generation OK
✅ tests/ structure - Keep test organization
```

### What to Deprecate (Move to /legacy)
```
❌ src/agentdb/database.ts → legacy-storage/document-store.ts
❌ src/agentdb/storage.ts → legacy-storage/file-backend.ts
❌ src/agentdb/queries.ts → legacy-storage/array-queries.ts
❌ src/skills/semantic-analyzer.ts → legacy/keyword-analyzer.ts
❌ src/skills/drift-detector.ts → legacy/keyword-drift.ts

Reason: These are JSON file operations, not vector database operations
```

### What to Rewrite (New Implementation)
```
🔄 src/services/vector-database.ts (NEW) - Real AgentDB integration
🔄 src/services/embedding-service.ts (NEW) - True embeddings
🔄 src/services/mcp-client.ts (NEW) - Live MCP connection
🔄 src/services/reasoningbank-service.ts (NEW) - Pattern learning
🔄 src/skills/semantic-analyzer.ts (REWRITE) - Vector-based analysis
🔄 src/skills/drift-detector.ts (REWRITE) - Vector similarity drift
🔄 src/agentdb/sync.ts (MODIFY) - Use real MCP client
🔄 src/agentdb/session-capture.ts (MODIFY) - Integrate vector DB
```

### New Files to Create
```
➕ src/services/clustering-service.ts
➕ src/services/sync-service.ts
➕ src/types/vector-types.ts
➕ src/types/reasoningbank.ts
➕ src/hooks/git-hooks.ts (post-commit automation)
➕ docs/MIGRATION_GUIDE.md
➕ docs/VECTOR_SEARCH_GUIDE.md
➕ docs/MCP_INTEGRATION.md
➕ benchmarks/embedding-generation.bench.ts
➕ benchmarks/vector-search.bench.ts
```

---

## 7. PERFORMANCE TARGETS

### Embedding Generation
```
Target: 100 commits processed in < 30 seconds

Breakdown:
- OpenAI API: ~200ms per request (with batching: 50 commits in 2 seconds)
- HuggingFace local: ~100ms per commit (parallelized: 10 commits/sec)
- TF-IDF fallback: ~10ms per commit (CPU-bound, instant)

Optimization:
✓ Batch OpenAI requests (max 100 inputs/request)
✓ Cache embeddings for repeated texts
✓ Parallel processing with worker threads
```

### Vector Search
```
Target: Search 100,000 commits in < 100ms

HNSW Index Parameters:
- M = 16 (graph connectivity)
- efConstruction = 200 (build accuracy)
- efSearch = 50 (query accuracy)

Expected Performance:
- 100K vectors: ~50ms per search
- 1M vectors: ~150ms per search
- 10M vectors: ~500ms per search (with quantization)

Optimization:
✓ Build HNSW index after bulk insert
✓ Use 8-bit quantization for >1M vectors
✓ Metadata pre-filtering before vector search
```

### Clustering
```
Target: Cluster 10,000 commits in < 5 seconds

HDBSCAN Parameters:
- min_cluster_size = 3
- min_samples = 2
- metric = 'cosine'

Expected Performance:
- 1K vectors: ~500ms
- 10K vectors: ~5s
- 100K vectors: ~60s (use sampling for large datasets)

Optimization:
✓ Sample large datasets (max 10K for clustering)
✓ Cache cluster assignments
✓ Incremental clustering for new commits
```

### MCP Sync
```
Target: Sync 1000 documents in < 2 seconds

Breakdown:
- Serialize documents: ~10ms
- Network roundtrip: ~50ms per batch
- Store in MCP memory: ~100ms per batch

Optimization:
✓ Batch sync operations (100 docs/batch)
✓ Async background sync
✓ Diff-based sync (only changed docs)
```

---

## 8. DEPLOYMENT CONSIDERATIONS

### Dependencies
```json
{
  "dependencies": {
    "@agentic/agentdb": "^2.0.0",  // REQUIRED: Real vector database
    "@anthropic/mcp-client": "^1.0.0",  // REQUIRED: MCP connection
    "@xenova/transformers": "^2.6.0",  // Optional: Local embeddings
    "openai": "^4.20.0",  // Optional: OpenAI embeddings
    "commander": "^11.0.0",
    "dotenv": "^17.2.3",
    "glob": "^10.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0"
  }
}
```

### Environment Variables
```bash
# Required
AGENTDB_PATH=./data/portfolio.db
MCP_SERVER_URL=npx claude-flow@alpha mcp start

# Optional (embeddings)
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional (performance)
EMBEDDING_CACHE_DIR=./cache/embeddings
USE_QUANTIZATION=true
VECTOR_INDEX_M=16
VECTOR_INDEX_EF_CONSTRUCTION=200
```

### System Requirements
```
Minimum:
- Node.js >= 18.0.0
- 4GB RAM
- 2GB disk space (for models + cache)

Recommended:
- Node.js >= 20.0.0
- 8GB RAM
- 10GB disk space
- SSD for database
```

---

## 9. RISKS & MITIGATION

### Risk 1: OpenAI API Costs
**Impact**: High embedding volume = high costs
**Mitigation**:
- Aggressive caching (persist embeddings)
- Batch requests (100 inputs/request)
- Fallback to free HuggingFace models
- Rate limiting

### Risk 2: Vector Database Performance
**Impact**: Slow searches on large datasets
**Mitigation**:
- HNSW indexing (150x faster than brute-force)
- Quantization for >1M vectors
- Metadata pre-filtering
- Periodic index rebuilds

### Risk 3: MCP Server Reliability
**Impact**: Sync failures, data loss
**Mitigation**:
- Local-first architecture (AgentDB primary)
- MCP as secondary cache layer
- Retry logic with exponential backoff
- Offline mode support

### Risk 4: Migration Complexity
**Impact**: Breaking changes, data loss
**Mitigation**:
- Keep legacy code in /legacy directory
- Gradual migration (phase by phase)
- Data export scripts before migration
- Rollback plan for each phase

---

## 10. SUCCESS CRITERIA

### Functional Requirements
```
✅ Generate real embeddings (OpenAI or HuggingFace)
✅ Store vectors in AgentDB with HNSW indexing
✅ Vector search returns semantically similar commits
✅ Clustering uses vector similarity, not keywords
✅ Drift detection compares reasoning vs. implementation vectors
✅ MCP client connects to claude-flow server
✅ Session data syncs to MCP memory
✅ Neural patterns learned from successful sessions
✅ Pattern retrieval via vector search
✅ Dashboard visualizes vector clusters
```

### Performance Requirements
```
✅ 100 commits embedded in < 30s (with caching)
✅ Vector search 100K commits in < 100ms
✅ Clustering 10K commits in < 5s
✅ MCP sync 1000 docs in < 2s
✅ Dashboard loads in < 3s
```

### Quality Requirements
```
✅ Test coverage > 90%
✅ No data loss during migration
✅ Backward compatibility (can read legacy data)
✅ Documentation complete (API, guides, examples)
✅ Error handling for all external dependencies
```

---

## CONCLUSION

This architecture transforms Portfolio Cognitive Command from a prototype into a production-ready system with:

1. **Real Vector Database**: AgentDB npm package with HNSW indexing
2. **True Semantic Analysis**: OpenAI/HuggingFace embeddings, not keywords
3. **Live MCP Integration**: Connection to claude-flow for coordination
4. **Neural Learning**: ReasoningBank pattern distillation and replay
5. **Scalable Performance**: Sub-second vector search on 100K+ commits

The migration path is incremental (10 weeks, 6 phases) with minimal risk and clear rollback points. All legacy code is preserved for reference and backward compatibility.

Next steps: Begin Phase 1 (Foundation) by installing AgentDB and creating VectorDatabaseService wrapper.
