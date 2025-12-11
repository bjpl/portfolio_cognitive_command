# Data Flow Diagrams: Portfolio Cognitive Command
**Detailed Pipeline and Integration Flows**

Date: December 4, 2025

---

## 1. SEMANTIC ANALYSIS PIPELINE

### 1.1 Complete Flow: Repository → Vector Database

```
┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: REPOSITORY SCANNING                                              │
└───────────────────────────────────────────────────────────────────────────┘

INPUT: Repository Path
  │
  ├─→ Git Repository (/.git directory)
  │   ├─ .git/logs (commit history)
  │   ├─ .git/refs (branches, tags)
  │   └─ Working directory (file structure)
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ RepoScanner.scan(repoPath)                                       │
│                                                                  │
│ 1. Validate repository:                                         │
│    ├─ Check .git exists                                         │
│    ├─ Verify git binary available                               │
│    └─ Ensure not bare repository                                │
│                                                                  │
│ 2. Extract git history:                                         │
│    ├─ git log --all --format=%H|%an|%ae|%at|%s                  │
│    ├─ git diff-tree --no-commit-id --name-only -r <hash>        │
│    └─ git branch -a                                             │
│                                                                  │
│ 3. Parse README (if exists):                                    │
│    ├─ Extract project description                               │
│    ├─ Identify tech stack                                       │
│    └─ Parse installation instructions                           │
│                                                                  │
│ 4. Analyze file structure:                                      │
│    ├─ Count files by extension                                  │
│    ├─ Calculate SLOC (source lines of code)                     │
│    └─ Identify framework indicators                             │
│                                                                  │
│ OUTPUT: RepositoryMetadata {                                    │
│   path: string,                                                  │
│   commits: Commit[],  // [{hash, message, author, timestamp...}]│
│   branches: string[],                                            │
│   readme: string,                                                │
│   techStack: string[],                                           │
│   fileStats: FileStats                                           │
│ }                                                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: EMBEDDING GENERATION                                             │
└───────────────────────────────────────────────────────────────────────────┘

INPUT: RepositoryMetadata
  │
  ├─→ commits[] (array of commit objects)
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ EmbeddingService.embedCommits(commits)                           │
│                                                                  │
│ FOR EACH commit in commits:                                     │
│   │                                                              │
│   1. Prepare text input:                                        │
│   │  combinedText = commit.message + " " +                      │
│   │                 commit.filePaths.join(" ")                  │
│   │                                                              │
│   2. Check cache:                                               │
│   │  cacheKey = sha256(combinedText)                            │
│   │  IF cache.has(cacheKey):                                    │
│   │    RETURN cache.get(cacheKey)                               │
│   │                                                              │
│   3. Generate embedding (strategy pattern):                     │
│   │  ┌───────────────────────────────────────────────────┐     │
│   │  │ STRATEGY 1: OpenAI API                           │     │
│   │  ├───────────────────────────────────────────────────┤     │
│   │  │ try:                                              │     │
│   │  │   response = await openai.embeddings.create({     │     │
│   │  │     model: "text-embedding-3-small",              │     │
│   │  │     input: combinedText                           │     │
│   │  │   })                                              │     │
│   │  │   embedding = response.data[0].embedding          │     │
│   │  │   dimensions = 1536                               │     │
│   │  │   source = "openai"                               │     │
│   │  │ catch (RateLimitError):                           │     │
│   │  │   wait(exponentialBackoff())                      │     │
│   │  │   retry()                                         │     │
│   │  │ catch (APIError):                                 │     │
│   │  │   fallback to Strategy 2                          │     │
│   │  └───────────────────────────────────────────────────┘     │
│   │                                                              │
│   │  ┌───────────────────────────────────────────────────┐     │
│   │  │ STRATEGY 2: HuggingFace Transformers            │     │
│   │  ├───────────────────────────────────────────────────┤     │
│   │  │ try:                                              │     │
│   │  │   embedding = await transformerPipeline(          │     │
│   │  │     combinedText,                                 │     │
│   │  │     { pooling: "mean", normalize: true }          │     │
│   │  │   )                                               │     │
│   │  │   // Model: all-MiniLM-L6-v2 outputs 384d         │     │
│   │  │   embedding = alignDimensions(embedding, 1536)    │     │
│   │  │   dimensions = 1536                               │     │
│   │  │   source = "huggingface"                          │     │
│   │  │ catch (ModelLoadError):                           │     │
│   │  │   fallback to Strategy 3                          │     │
│   │  └───────────────────────────────────────────────────┘     │
│   │                                                              │
│   │  ┌───────────────────────────────────────────────────┐     │
│   │  │ STRATEGY 3: TF-IDF Fallback                      │     │
│   │  ├───────────────────────────────────────────────────┤     │
│   │  │ // Last resort - deterministic, fast, offline     │     │
│   │  │ words = combinedText.split(/\s+/)                 │     │
│   │  │ vector = new Array(1536).fill(0)                  │     │
│   │  │                                                    │     │
│   │  │ FOR word in words:                                │     │
│   │  │   hash = hashFunction(word)                       │     │
│   │  │   index = abs(hash) % 1536                        │     │
│   │  │   tf = 1 / log(words.length + 1)                  │     │
│   │  │   vector[index] += tf                             │     │
│   │  │                                                    │     │
│   │  │ embedding = normalize(vector)                     │     │
│   │  │ dimensions = 1536                                 │     │
│   │  │ source = "tfidf"                                  │     │
│   │  └───────────────────────────────────────────────────┘     │
│   │                                                              │
│   4. Normalize to unit vector:                                 │
│   │  magnitude = sqrt(sum(v^2 for v in embedding))             │
│   │  embedding = [v / magnitude for v in embedding]            │
│   │                                                              │
│   5. Cache result:                                              │
│   │  cache.set(cacheKey, embedding)                             │
│   │                                                              │
│   OUTPUT: {                                                     │
│     vector: number[],      // 1536 dimensions                   │
│     dimensions: number,    // 1536                              │
│     source: string,        // "openai"|"huggingface"|"tfidf"    │
│     cached: boolean        // true if from cache                │
│   }                                                              │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ (All commits embedded)
             ▼

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: VECTOR DATABASE INSERTION                                        │
└───────────────────────────────────────────────────────────────────────────┘

INPUT: commits[] with embeddings
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ VectorDatabaseService.bulkInsert('commits', commits)             │
│                                                                  │
│ 1. Prepare batch insert:                                        │
│    documents = commits.map(c => ({                              │
│      hash: c.hash,                    // Primary key            │
│      message: c.message,              // Metadata               │
│      author: c.author,                // Metadata               │
│      authorEmail: c.authorEmail,      // Metadata               │
│      timestamp: c.timestamp,          // Metadata               │
│      repository: repoPath,            // Metadata               │
│      filePaths: c.filePaths,          // Metadata               │
│      cluster: null,                   // To be assigned          │
│      embedding: c.embedding.vector,   // Vector column (1536d)   │
│      embeddingSource: c.embedding.source                        │
│    }))                                                           │
│                                                                  │
│ 2. Execute batch insert:                                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ AgentDB.insert('commits', documents, {               │    │
│    │   batchSize: 100,         // Insert 100 at a time    │    │
│    │   buildIndex: false,      // Don't build until done  │    │
│    │   returnInserted: false   // Don't return all docs   │    │
│    │ })                                                    │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ 3. Build HNSW index (after all inserts):                        │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ AgentDB.buildVectorIndex('commits', {                │    │
│    │   column: 'embedding',                               │    │
│    │   metric: 'cosine',                                  │    │
│    │   M: 16,                 // HNSW connectivity        │    │
│    │   efConstruction: 200,   // Build accuracy           │    │
│    │   quantization: config.useQuantization ? '8bit' : 'none' │
│    │ })                                                    │    │
│    │                                                       │    │
│    │ Time: O(n log n) where n = number of vectors         │    │
│    │ Example: 10K commits ~5 seconds to index             │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ OUTPUT: {                                                       │
│   insertedCount: number,      // Total commits inserted         │
│   indexBuildTime: number,     // Milliseconds to build index    │
│   totalVectors: number,       // Total vectors in collection    │
│   indexSize: number           // Index size in bytes            │
│ }                                                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼

┌───────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: CLUSTERING                                                       │
└───────────────────────────────────────────────────────────────────────────┘

INPUT: Commits in vector database
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ ClusteringService.clusterRepository(repoPath)                    │
│                                                                  │
│ 1. Retrieve all embeddings:                                     │
│    commits = await vectorDb.query('commits', {                  │
│      filter: { repository: repoPath },                          │
│      projection: ['hash', 'embedding', 'message']               │
│    })                                                            │
│                                                                  │
│ 2. Extract vectors for clustering:                              │
│    vectors = commits.map(c => c.embedding)                      │
│    // Shape: [n_samples, n_features] = [commits.length, 1536]   │
│                                                                  │
│ 3. Apply HDBSCAN algorithm:                                     │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ HDBSCAN Clustering                                   │    │
│    ├──────────────────────────────────────────────────────┤    │
│    │ Parameters:                                          │    │
│    │   min_cluster_size = 3                               │    │
│    │   min_samples = 2                                    │    │
│    │   metric = 'cosine'                                  │    │
│    │   cluster_selection_method = 'eom'                   │    │
│    │                                                       │    │
│    │ Process:                                             │    │
│    │   1. Build mutual reachability graph                 │    │
│    │   2. Construct minimum spanning tree                 │    │
│    │   3. Extract cluster hierarchy                       │    │
│    │   4. Condense tree (merge small clusters)            │    │
│    │   5. Extract stable clusters                         │    │
│    │                                                       │    │
│    │ Output:                                              │    │
│    │   labels = [cluster_id for each commit]             │    │
│    │   // -1 = noise (no cluster)                         │    │
│    │   // 0, 1, 2, ... = cluster IDs                      │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ 4. Label clusters with semantic meaning:                        │
│    FOR EACH unique cluster_id in labels:                        │
│      IF cluster_id == -1: SKIP (noise)                          │
│                                                                  │
│      // Get all commits in this cluster                         │
│      clusterCommits = commits.filter((c, i) =>                  │
│        labels[i] == cluster_id                                  │
│      )                                                           │
│                                                                  │
│      // Calculate cluster centroid                              │
│      centroid = mean(clusterCommits.map(c => c.embedding))      │
│                                                                  │
│      // Classify centroid into predefined categories            │
│      clusterLabel = classifyCentroid(centroid)                  │
│                                                                  │
│      // Update all commits in cluster                           │
│      await vectorDb.bulkUpdate('commits', {                     │
│        filter: { hash: { $in: clusterCommits.map(c => c.hash) }},│
│        update: { cluster: clusterLabel }                        │
│      })                                                          │
│                                                                  │
│ 5. Store cluster statistics:                                    │
│    clusterStats = calculateClusterStats(commits, labels)        │
│    await vectorDb.insert('repositoryStats', {                   │
│      repository: repoPath,                                      │
│      totalCommits: commits.length,                              │
│      clusterDistribution: clusterStats,                         │
│      timestamp: new Date()                                      │
│    })                                                            │
│                                                                  │
│ OUTPUT: {                                                       │
│   clusterCount: number,       // Number of clusters found       │
│   noiseCount: number,         // Commits not in any cluster     │
│   clusterLabels: {            // Label distribution             │
│     'Experience': number,                                       │
│     'Core Systems': number,                                     │
│     'Infra': number                                             │
│   },                                                             │
│   largestCluster: number      // Size of largest cluster        │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ classifyCentroid(centroid: number[]): ClusterType                │
│                                                                  │
│ // Classify centroid by comparing to reference vectors          │
│                                                                  │
│ referenceVectors = {                                            │
│   'Experience': await embeddingService.embed(                   │
│     "frontend ui ux components user interface design react"     │
│   ),                                                             │
│   'Core Systems': await embeddingService.embed(                 │
│     "backend api database server business logic service"        │
│   ),                                                             │
│   'Infra': await embeddingService.embed(                        │
│     "docker kubernetes deployment ci cd infrastructure config"  │
│   )                                                              │
│ }                                                                │
│                                                                  │
│ // Calculate similarity to each reference                       │
│ similarities = {                                                 │
│   'Experience': cosineSimilarity(centroid, referenceVectors.Experience),│
│   'Core Systems': cosineSimilarity(centroid, referenceVectors['Core Systems']),│
│   'Infra': cosineSimilarity(centroid, referenceVectors.Infra)   │
│ }                                                                │
│                                                                  │
│ // Return label with highest similarity                         │
│ return maxKey(similarities)                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. MCP INTEGRATION FLOW

### 2.1 Session Lifecycle with MCP Sync

```
┌───────────────────────────────────────────────────────────────────────────┐
│ SESSION START FLOW                                                        │
└───────────────────────────────────────────────────────────────────────────┘

USER ACTION: pcc analyze /path/to/repo
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLI Handler (src/index.ts)                                       │
│                                                                  │
│ program                                                          │
│   .command('analyze')                                            │
│   .action(async (repoPath) => {                                 │
│     // Initialize MCP client                                    │
│     const mcpClient = new MCPClient('portfolio-cognitive');     │
│     await mcpClient.connect();                                  │
│                                                                  │
│     // Create session                                            │
│     const sessionCapture = new SessionCapture({                 │
│       agentDb: vectorDb,                                        │
│       mcpTools: mcpClient,                                      │
│       namespace: 'sessions'                                     │
│     });                                                          │
│                                                                  │
│     const session = await sessionCapture.createSession({        │
│       name: `Analyze ${path.basename(repoPath)}`,               │
│       description: 'Repository analysis session',               │
│       repository: repoPath                                      │
│     });                                                          │
│                                                                  │
│     console.log(`Session started: ${session.id}`);              │
│   })                                                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SessionCapture.createSession()                                   │
│                                                                  │
│ 1. Generate session ID:                                         │
│    sessionId = `session-${Date.now()}-${randomString()}`        │
│                                                                  │
│ 2. Create session state:                                        │
│    sessionState = {                                             │
│      id: sessionId,                                             │
│      collection: 'sessions',                                    │
│      sessionId,                                                 │
│      name: params.name,                                         │
│      description: params.description,                           │
│      status: 'active',                                          │
│      startedAt: new Date(),                                     │
│      repository: params.repository,                             │
│      agentIds: [],                                              │
│      decisions: [],                                             │
│      conversationSummary: '',                                   │
│      metrics: {                                                 │
│        duration: 0,                                             │
│        agentsUsed: 0,                                           │
│        tasksCompleted: 0,                                       │
│        filesModified: 0                                         │
│      },                                                          │
│      worldStateIds: [],                                         │
│      analysisIds: [],                                           │
│      artifactPaths: [],                                         │
│      tags: [],                                                  │
│      customData: { commits: [] }                                │
│    }                                                             │
│                                                                  │
│ 3. Save to local AgentDB:                                       │
│    await agentDb.insert('sessions', sessionState)               │
│                                                                  │
│ 4. Sync to MCP memory:                                          │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ MCP Memory Store Operation                           │    │
│    ├──────────────────────────────────────────────────────┤    │
│    │ await mcpClient.callTool(                            │    │
│    │   'mcp__claude-flow__memory_store',                  │    │
│    │   {                                                   │    │
│    │     key: `session/${sessionId}`,                     │    │
│    │     value: JSON.stringify(sessionState),             │    │
│    │     namespace: 'portfolio-cognitive/sessions',       │    │
│    │     ttl: 7 * 24 * 60 * 60  // 7 days                 │    │
│    │   }                                                   │    │
│    │ )                                                     │    │
│    │                                                       │    │
│    │ // Also mark as active session                       │    │
│    │ await mcpClient.callTool(                            │    │
│    │   'mcp__claude-flow__memory_store',                  │    │
│    │   {                                                   │    │
│    │     key: 'active_session',                           │    │
│    │     value: JSON.stringify(sessionState),             │    │
│    │     namespace: 'portfolio-cognitive/sessions',       │    │
│    │     ttl: 24 * 60 * 60  // 24 hours                   │    │
│    │   }                                                   │    │
│    │ )                                                     │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ 5. Add to cognitive-linker (agentdb.json):                      │
│    agentSession = {                                             │
│      sessionId,                                                 │
│      startTime: sessionState.startedAt.toISOString(),           │
│      commits: [],                                               │
│      reasoning: 'Session started',                              │
│      prompt: sessionState.description                           │
│    }                                                             │
│    addSessionToAgentDb(agentSession, config.agentDbPath)        │
│                                                                  │
│ OUTPUT: SessionState (saved to local + MCP)                     │
└──────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ DECISION CAPTURE FLOW                                                     │
└───────────────────────────────────────────────────────────────────────────┘

DURING TASK EXECUTION: Skill makes decision
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ SessionCapture.addDecision(sessionId, decision)                  │
│                                                                  │
│ INPUT: {                                                        │
│   sessionId: string,                                            │
│   decision: {                                                   │
│     description: "Analyzing repository structure",              │
│     rationale: "Need to understand project organization",       │
│     outcome: "Found 45 commits across 3 clusters"               │
│   }                                                              │
│ }                                                                │
│                                                                  │
│ 1. Load current session:                                        │
│    session = await agentDb.get('sessions', sessionId)           │
│                                                                  │
│ 2. Add decision with timestamp:                                 │
│    decisions = [                                                │
│      ...session.decisions,                                      │
│      {                                                           │
│        timestamp: new Date(),                                   │
│        description: decision.description,                       │
│        rationale: decision.rationale,                           │
│        outcome: decision.outcome                                │
│      }                                                           │
│    ]                                                             │
│                                                                  │
│ 3. Update session in AgentDB:                                   │
│    await agentDb.update('sessions', sessionId, { decisions })   │
│                                                                  │
│ 4. Sync updated session to MCP:                                 │
│    await mcpClient.callTool(                                    │
│      'mcp__claude-flow__memory_store',                          │
│      {                                                           │
│        key: `session/${sessionId}`,                             │
│        value: JSON.stringify({ ...session, decisions }),        │
│        namespace: 'portfolio-cognitive/sessions'                │
│      }                                                           │
│    )                                                             │
│                                                                  │
│ 5. Log to console (verbose mode):                               │
│    console.log(`[Session ${sessionId}] Decision: ${description}`)│
└──────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ COMMIT LINKING FLOW                                                       │
└───────────────────────────────────────────────────────────────────────────┘

USER ACTION: git commit -m "message" (post-commit hook triggers)
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Git Hook: .git/hooks/post-commit                                 │
│                                                                  │
│ #!/bin/bash                                                      │
│ COMMIT_HASH=$(git rev-parse HEAD)                               │
│ pcc link-commit $COMMIT_HASH                                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLI Handler: link-commit command                                 │
│                                                                  │
│ program                                                          │
│   .command('link-commit')                                        │
│   .argument('<hash>', 'Commit hash to link')                    │
│   .action(async (commitHash) => {                               │
│     // Get active session from MCP                              │
│     const activeSession = await sessionCapture.getActiveSession();│
│                                                                  │
│     if (!activeSession) {                                       │
│       console.warn('No active session found');                  │
│       return;                                                    │
│     }                                                            │
│                                                                  │
│     await sessionCapture.linkCommit(                            │
│       activeSession.id,                                         │
│       commitHash                                                │
│     );                                                           │
│   })                                                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ SessionCapture.linkCommit(sessionId, commitHash)                 │
│                                                                  │
│ 1. Load session:                                                │
│    session = await agentDb.get('sessions', sessionId)           │
│                                                                  │
│ 2. Add commit to session:                                       │
│    commits = session.customData.commits || []                   │
│    if (!commits.includes(commitHash)) {                         │
│      commits.push(commitHash)                                   │
│    }                                                             │
│                                                                  │
│ 3. Update AgentDB:                                              │
│    await agentDb.update('sessions', sessionId, {                │
│      customData: { ...session.customData, commits }            │
│    })                                                            │
│                                                                  │
│ 4. Update cognitive-linker agentdb.json:                        │
│    linkCommitToSession(sessionId, commitHash, agentDbPath)      │
│                                                                  │
│ 5. Sync to MCP:                                                 │
│    await mcpClient.callTool(                                    │
│      'mcp__claude-flow__memory_store',                          │
│      {                                                           │
│        key: `session/${sessionId}`,                             │
│        value: JSON.stringify(session),                          │
│        namespace: 'portfolio-cognitive/sessions'                │
│      }                                                           │
│    )                                                             │
│                                                                  │
│ OUTPUT: true (commit linked successfully)                       │
└──────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ SESSION END FLOW                                                          │
└───────────────────────────────────────────────────────────────────────────┘

USER ACTION: pcc session-end --outcome "Analysis complete"
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ SessionCapture.endSession(sessionId, outcome)                    │
│                                                                  │
│ 1. Load session:                                                │
│    session = await agentDb.get('sessions', sessionId)           │
│                                                                  │
│ 2. Calculate final metrics:                                     │
│    endedAt = new Date()                                         │
│    duration = endedAt - session.startedAt                       │
│    metrics = {                                                  │
│      ...session.metrics,                                        │
│      duration,                                                  │
│      agentsUsed: session.agentIds.length,                       │
│      filesModified: await countModifiedFiles(session.commits)   │
│    }                                                             │
│                                                                  │
│ 3. Update session status:                                       │
│    await agentDb.update('sessions', sessionId, {                │
│      status: 'completed',                                       │
│      endedAt,                                                   │
│      metrics,                                                   │
│      customData: { ...session.customData, outcome }            │
│    })                                                            │
│                                                                  │
│ 4. Sync final state to MCP:                                     │
│    await mcpClient.callTool(                                    │
│      'mcp__claude-flow__memory_store',                          │
│      {                                                           │
│        key: `session/${sessionId}`,                             │
│        value: JSON.stringify(session),                          │
│        namespace: 'portfolio-cognitive/sessions',               │
│        ttl: 30 * 24 * 60 * 60  // 30 days (archive)             │
│      }                                                           │
│    )                                                             │
│                                                                  │
│ 5. Clear active session:                                        │
│    await mcpClient.callTool(                                    │
│      'mcp__claude-flow__memory_delete',                         │
│      {                                                           │
│        key: 'active_session',                                   │
│        namespace: 'portfolio-cognitive/sessions'                │
│      }                                                           │
│    )                                                             │
│                                                                  │
│ 6. Trigger pattern learning (async):                            │
│    PatternLearner.learnFromSession(session)                     │
│    // This runs in background, doesn't block                    │
│                                                                  │
│ OUTPUT: SessionState (final completed state)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. VECTOR SEARCH OPERATIONS

### 3.1 Similarity Search Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│ FIND SIMILAR COMMITS FLOW                                                 │
└───────────────────────────────────────────────────────────────────────────┘

USER ACTION: pcc search "Add authentication feature"
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLI Handler: search command                                      │
│                                                                  │
│ program                                                          │
│   .command('search')                                             │
│   .argument('<query>', 'Search query')                          │
│   .option('-k <number>', 'Number of results', '10')             │
│   .option('-r <repo>', 'Filter by repository')                  │
│   .action(async (query, options) => {                           │
│     const results = await VectorSearchService.searchCommits({   │
│       query,                                                     │
│       k: parseInt(options.k),                                   │
│       repository: options.r                                     │
│     });                                                          │
│                                                                  │
│     displaySearchResults(results);                              │
│   })                                                             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│ VectorSearchService.searchCommits()                              │
│                                                                  │
│ INPUT: {                                                        │
│   query: "Add authentication feature",                          │
│   k: 10,                                                        │
│   repository: "/path/to/repo"                                   │
│ }                                                                │
│                                                                  │
│ STEP 1: Generate query embedding                                │
│ ─────────────────────────────────────────────────────────       │
│ queryVector = await embeddingService.embed(                     │
│   "Add authentication feature"                                  │
│ )                                                                │
│ // queryVector = [0.123, -0.456, 0.789, ..., 0.234] (1536d)     │
│                                                                  │
│ STEP 2: Execute HNSW vector search                              │
│ ─────────────────────────────────────────────────────────       │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ AgentDB HNSW Search Algorithm                            │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ 1. Start at entry point (top layer of HNSW graph)       │   │
│ │                                                           │   │
│ │ 2. Greedy search to find nearest neighbors:             │   │
│ │    FOR layer in HNSW_graph (top to bottom):             │   │
│ │      candidates = []                                     │   │
│ │      visited = set()                                     │   │
│ │                                                           │   │
│ │      WHILE candidates not exhausted:                     │   │
│ │        current = pop closest candidate                   │   │
│ │        FOR neighbor in current.neighbors:                │   │
│ │          IF neighbor not in visited:                     │   │
│ │            distance = cosineDist(queryVector, neighbor.vec)│ │
│ │            IF distance < threshold:                      │   │
│ │              add to candidates                           │   │
│ │            visited.add(neighbor)                         │   │
│ │                                                           │   │
│ │ 3. Return top-k closest vectors from bottom layer       │   │
│ │                                                           │   │
│ │ Complexity: O(log n) average case                        │   │
│ │ Example: Search 100K vectors in ~50ms                    │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ rawResults = await vectorDb.vectorSearch('commits', {           │
│   vector: queryVector,                                          │
│   k: 10,                                                        │
│   metric: 'cosine',                                             │
│   filter: { repository: "/path/to/repo" }                      │
│ })                                                               │
│                                                                  │
│ STEP 3: Format and rank results                                │
│ ─────────────────────────────────────────────────────────       │
│ results = rawResults.map(r => ({                                │
│   commit: {                                                     │
│     hash: r.document.hash,                                      │
│     message: r.document.message,                                │
│     author: r.document.author,                                  │
│     timestamp: r.document.timestamp                             │
│   },                                                             │
│   similarity: r.similarity,    // 0.0 to 1.0                    │
│   distance: r.distance,        // cosine distance               │
│   cluster: r.document.cluster                                   │
│ }))                                                              │
│                                                                  │
│ // Sort by similarity (descending)                              │
│ results.sort((a, b) => b.similarity - a.similarity)             │
│                                                                  │
│ OUTPUT: [                                                       │
│   {                                                              │
│     commit: {                                                   │
│       hash: "abc123",                                           │
│       message: "Implement OAuth login",                         │
│       author: "developer",                                      │
│       timestamp: "2024-03-15"                                   │
│     },                                                           │
│     similarity: 0.89,                                           │
│     distance: 0.11,                                             │
│     cluster: "Core Systems"                                     │
│   },                                                             │
│   {                                                              │
│     commit: {                                                   │
│       hash: "def456",                                           │
│       message: "Add JWT authentication middleware",             │
│       author: "developer",                                      │
│       timestamp: "2024-03-20"                                   │
│     },                                                           │
│     similarity: 0.85,                                           │
│     distance: 0.15,                                             │
│     cluster: "Core Systems"                                     │
│   },                                                             │
│   // ... 8 more results                                         │
│ ]                                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Drift Detection Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│ DRIFT DETECTION FLOW                                                      │
└───────────────────────────────────────────────────────────────────────────┘

INPUT: SessionState (after session completion)
  │
  ▼
┌─────────────────────────────────────────────────────────────────┐
│ DriftDetector.detectDrift(sessionId)                             │
│                                                                  │
│ 1. Load session:                                                │
│    session = await vectorDb.get('sessions', sessionId)          │
│                                                                  │
│ 2. Extract reasoning text:                                      │
│    reasoningText = session.decisions                            │
│      .map(d => `${d.description}: ${d.rationale}`)              │
│      .join("\n")                                                │
│    // Example:                                                  │
│    // "Analyzing repository: Need to understand structure\n     │
│    //  Generating embeddings: Semantic analysis required\n      │
│    //  Clustering commits: Group by similarity"                 │
│                                                                  │
│ 3. Extract implementation text:                                 │
│    commitHashes = session.customData.commits                    │
│    commits = await vectorDb.query('commits', {                  │
│      filter: { hash: { $in: commitHashes } }                   │
│    })                                                            │
│    implementationText = commits                                 │
│      .map(c => c.message)                                       │
│      .join("\n")                                                │
│    // Example:                                                  │
│    // "Add AgentDB integration\n                                │
│    //  Implement vector search\n                                │
│    //  Create clustering service"                               │
│                                                                  │
│ 4. Generate embeddings:                                         │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ PARALLEL EMBEDDING GENERATION                        │    │
│    ├──────────────────────────────────────────────────────┤    │
│    │ Promise.all([                                        │    │
│    │   embeddingService.embed(reasoningText),             │    │
│    │   embeddingService.embed(implementationText)         │    │
│    │ ])                                                    │    │
│    │                                                       │    │
│    │ Result:                                              │    │
│    │   reasoningVector = [0.123, ..., 0.456] (1536d)      │    │
│    │   implVector = [0.789, ..., 0.234] (1536d)           │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ 5. Calculate semantic drift:                                    │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ COSINE SIMILARITY                                    │    │
│    ├──────────────────────────────────────────────────────┤    │
│    │ dotProduct = sum(                                    │    │
│    │   reasoningVector[i] * implVector[i]                 │    │
│    │   for i in 0..1535                                   │    │
│    │ )                                                     │    │
│    │                                                       │    │
│    │ magReasoning = sqrt(sum(v^2 for v in reasoningVector))│   │
│    │ magImpl = sqrt(sum(v^2 for v in implVector))         │    │
│    │                                                       │    │
│    │ similarity = dotProduct / (magReasoning * magImpl)   │    │
│    │ // Range: -1.0 to 1.0                                │    │
│    │ // 1.0 = identical direction (no drift)              │    │
│    │ // 0.0 = perpendicular (significant drift)           │    │
│    │ // -1.0 = opposite direction (complete misalignment) │    │
│    │                                                       │    │
│    │ drift = 1.0 - similarity                             │    │
│    │ // Range: 0.0 to 2.0                                 │    │
│    │ // 0.0 = no drift                                    │    │
│    │ // 1.0 = perpendicular                               │    │
│    │ // 2.0 = opposite                                    │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                  │
│ 6. Determine severity:                                          │
│    severity = calculateSeverity(drift)                          │
│    // drift < 0.3  → 'low'                                      │
│    // drift < 0.5  → 'medium'                                   │
│    // drift < 0.7  → 'high'                                     │
│    // drift >= 0.7 → 'critical'                                 │
│                                                                  │
│ 7. Create alert if threshold exceeded:                          │
│    IF drift > config.driftThreshold (default 0.7):              │
│      alert = {                                                  │
│        id: generateId(),                                        │
│        collection: 'driftAlerts',                               │
│        alertId: generateId(),                                   │
│        repository: session.repository,                          │
│        sessionId: session.id,                                   │
│        driftResult: { drift, similarity },                      │
│        severity,                                                │
│        intentSummary: summarize(reasoningText),                 │
│        implementationSummary: summarize(implementationText),    │
│        acknowledged: false,                                     │
│        resolved: false,                                         │
│        recommendations: generateRecommendations(drift),         │
│        detectedBy: 'drift-detector',                            │
│        detectedAt: new Date()                                   │
│      }                                                           │
│                                                                  │
│      await vectorDb.insert('driftAlerts', alert)                │
│                                                                  │
│ OUTPUT: {                                                       │
│   drift: 0.42,         // Numeric drift score                   │
│   similarity: 0.58,    // Semantic similarity                   │
│   severity: 'medium',  // Alert severity                        │
│   alertCreated: true   // Alert generated                       │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

This comprehensive data flow documentation shows exactly how data moves through the system at each phase, with all implementation details included.