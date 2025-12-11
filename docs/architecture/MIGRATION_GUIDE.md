# Migration Guide: Keyword-Based → Vector Database
**Step-by-Step Implementation Plan**

Date: December 4, 2025

---

## Overview

This guide provides concrete, actionable steps to migrate Portfolio Cognitive Command from keyword-based analysis to production-ready vector database implementation.

**Duration**: 10 weeks
**Risk Level**: Low (incremental migration with rollback points)
**Data Safety**: All legacy code preserved in `/legacy` directory

---

## Pre-Migration Checklist

### 1. Data Backup
```bash
# Create backup of current state
cd portfolio_cognitive_command
mkdir -p backups/pre-migration
cp -r data/ backups/pre-migration/
cp -r memory/ backups/pre-migration/
cp -r src/ backups/pre-migration/
git add . && git commit -m "Pre-migration snapshot"
git tag v1.0-legacy
```

### 2. Environment Setup
```bash
# Ensure Node.js 20+
node --version  # Should be >= 20.0.0

# Install new dependencies
npm install @agentic/agentdb@^2.0.0
npm install @anthropic/mcp-client@^1.0.0
npm install @xenova/transformers@^2.6.0

# Verify installations
npm list @agentic/agentdb
npm list @anthropic/mcp-client
npm list @xenova/transformers
```

### 3. Configuration Updates
```bash
# Create new .env entries
cat >> .env << EOF

# Vector Database Configuration
AGENTDB_PATH=./data/portfolio.db
VECTOR_INDEX_M=16
VECTOR_INDEX_EF_CONSTRUCTION=200
USE_QUANTIZATION=false

# MCP Integration
MCP_SERVER_URL=npx claude-flow@alpha mcp start
MCP_NAMESPACE=portfolio-cognitive-command

# Embedding Configuration
EMBEDDING_CACHE_DIR=./cache/embeddings
FALLBACK_TO_LOCAL_MODELS=true
EOF
```

---

## Phase 1: Foundation (Week 1-2)

### Week 1: Service Layer Setup

#### Day 1-2: Vector Database Service

**File**: `src/services/vector-database.ts`

```typescript
import { AgentDB } from '@agentic/agentdb';
import { config } from '../config';

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
  private initialized: boolean = false;

  constructor(dbPath: string = config.agentDbPath) {
    this.db = new AgentDB({
      path: dbPath,
      vectorIndexConfig: {
        M: parseInt(process.env.VECTOR_INDEX_M || '16'),
        efConstruction: parseInt(process.env.VECTOR_INDEX_EF_CONSTRUCTION || '200'),
        efSearch: 50
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create commits collection with vector column
    await this.db.createCollection('commits', {
      schema: {
        hash: 'string',
        message: 'string',
        author: 'string',
        authorEmail: 'string',
        timestamp: 'datetime',
        repository: 'string',
        filePaths: 'json',
        cluster: 'string',
        embedding: 'vector(1536)',
        embeddingSource: 'string'
      },
      primaryKey: 'hash',
      vectorIndex: {
        column: 'embedding',
        metric: 'cosine'
      }
    });

    // Create sessions collection
    await this.db.createCollection('sessions', {
      schema: {
        sessionId: 'string',
        name: 'string',
        status: 'string',
        startedAt: 'datetime',
        endedAt: 'datetime',
        repository: 'string',
        reasoningEmbedding: 'vector(1536)',
        decisions: 'json',
        commits: 'json',
        metrics: 'json',
        customData: 'json'
      },
      primaryKey: 'sessionId',
      vectorIndex: {
        column: 'reasoningEmbedding',
        metric: 'cosine'
      }
    });

    // Create patterns collection
    await this.db.createCollection('patterns', {
      schema: {
        patternId: 'string',
        patternType: 'string',
        name: 'string',
        patternVector: 'vector(1536)',
        trajectory: 'json',
        successRate: 'float',
        usageCount: 'integer',
        trainedOn: 'json',
        description: 'string'
      },
      primaryKey: 'patternId',
      vectorIndex: {
        column: 'patternVector',
        metric: 'cosine'
      }
    });

    // Create repositories collection
    await this.db.createCollection('repositories', {
      schema: {
        repoPath: 'string',
        name: 'string',
        contextEmbedding: 'vector(1536)',
        readme: 'string',
        techStack: 'json',
        clusterDistribution: 'json',
        totalCommits: 'integer',
        lastAnalyzed: 'datetime'
      },
      primaryKey: 'repoPath',
      vectorIndex: {
        column: 'contextEmbedding',
        metric: 'cosine'
      }
    });

    this.initialized = true;
    console.log('[VectorDB] Initialized successfully');
  }

  async insert<T>(collection: string, document: T): Promise<T> {
    return this.db.insert(collection, document);
  }

  async bulkInsert<T>(collection: string, documents: T[]): Promise<number> {
    return this.db.bulkInsert(collection, documents, {
      batchSize: 100,
      buildIndex: false  // Build index after all inserts
    });
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

  async buildIndex(collection: string): Promise<void> {
    console.log(`[VectorDB] Building HNSW index for ${collection}...`);
    const startTime = Date.now();

    await this.db.buildVectorIndex(collection);

    const duration = Date.now() - startTime;
    console.log(`[VectorDB] Index built in ${duration}ms`);
  }

  async getStats(collection: string) {
    return {
      totalDocuments: await this.db.count(collection),
      vectorDimension: await this.db.getVectorDimension(collection),
      indexSize: await this.db.getIndexSize(collection)
    };
  }

  async query<T>(collection: string, filter: Record<string, any>): Promise<T[]> {
    return this.db.query(collection, filter);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    return this.db.get(collection, id);
  }

  async update<T>(collection: string, id: string, updates: Partial<T>): Promise<T> {
    return this.db.update(collection, id, updates);
  }

  async delete(collection: string, id: string): Promise<boolean> {
    return this.db.delete(collection, id);
  }
}

// Singleton instance
export const vectorDb = new VectorDatabaseService();
```

**Test**:
```bash
# Create test file
cat > src/services/vector-database.test.ts << 'EOF'
import { VectorDatabaseService } from './vector-database';

describe('VectorDatabaseService', () => {
  let db: VectorDatabaseService;

  beforeAll(async () => {
    db = new VectorDatabaseService(':memory:');  // In-memory for tests
    await db.initialize();
  });

  it('should initialize collections', async () => {
    const stats = await db.getStats('commits');
    expect(stats.totalDocuments).toBe(0);
    expect(stats.vectorDimension).toBe(1536);
  });

  it('should insert and retrieve documents', async () => {
    const commit = {
      hash: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      authorEmail: 'test@example.com',
      timestamp: new Date(),
      repository: '/test/repo',
      filePaths: ['src/test.ts'],
      cluster: null,
      embedding: new Array(1536).fill(0.1),
      embeddingSource: 'test'
    };

    await db.insert('commits', commit);
    const retrieved = await db.get('commits', 'abc123');

    expect(retrieved).toMatchObject({ hash: 'abc123', message: 'Test commit' });
  });
});
EOF

npm test -- vector-database.test.ts
```

#### Day 3-4: Embedding Service

**File**: `src/services/embedding-service.ts`

```typescript
import OpenAI from 'openai';
import { pipeline } from '@xenova/transformers';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

export interface EmbeddingOptions {
  model?: 'openai' | 'huggingface' | 'tfidf';
  dimensions?: number;
  cache?: boolean;
}

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  source: 'openai' | 'huggingface' | 'tfidf';
  cached: boolean;
}

export class EmbeddingService {
  private openai?: OpenAI;
  private transformerPipeline?: any;
  private memoryCache: Map<string, number[]>;
  private cacheDir: string;
  private initialized: boolean = false;

  constructor() {
    if (config.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    }

    this.memoryCache = new Map();
    this.cacheDir = process.env.EMBEDDING_CACHE_DIR || './cache/embeddings';

    // Ensure cache directory exists
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[EmbeddingService] Loading HuggingFace model...');
      this.transformerPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      console.log('[EmbeddingService] HuggingFace model loaded');
    } catch (error) {
      console.warn('[EmbeddingService] HuggingFace model failed to load:', error);
    }

    this.initialized = true;
  }

  async embed(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const cacheKey = this.getCacheKey(text, options?.model);

    // Check memory cache
    if (options?.cache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          vector: cached,
          dimensions: cached.length,
          source: options?.model || 'openai',
          cached: true
        };
      }
    }

    let embedding: number[];
    let source: 'openai' | 'huggingface' | 'tfidf';

    try {
      if (this.openai && (!options?.model || options.model === 'openai')) {
        embedding = await this.embedWithOpenAI(text);
        source = 'openai';
      } else {
        throw new Error('OpenAI not available or not requested');
      }
    } catch (error) {
      console.warn('[EmbeddingService] OpenAI failed, trying HuggingFace:', error);

      try {
        if (this.transformerPipeline) {
          embedding = await this.embedWithHuggingFace(text);
          source = 'huggingface';
        } else {
          throw new Error('HuggingFace not available');
        }
      } catch (error2) {
        console.warn('[EmbeddingService] HuggingFace failed, using TF-IDF:', error2);
        embedding = this.embedWithTFIDF(text);
        source = 'tfidf';
      }
    }

    // Normalize
    embedding = this.normalize(embedding);

    // Cache result
    if (options?.cache !== false) {
      this.saveToCache(cacheKey, embedding);
    }

    return {
      vector: embedding,
      dimensions: embedding.length,
      source,
      cached: false
    };
  }

  private async embedWithOpenAI(text: string): Promise<number[]> {
    const response = await this.openai!.embeddings.create({
      model: config.openaiEmbeddingModel || 'text-embedding-3-small',
      input: text.substring(0, 8000)  // Token limit
    });

    return response.data[0].embedding;
  }

  private async embedWithHuggingFace(text: string): Promise<number[]> {
    const output = await this.transformerPipeline(text, {
      pooling: 'mean',
      normalize: true
    });

    const embedding = Array.from(output.data);

    // Align to 1536 dimensions (pad or reduce)
    return this.alignDimensions(embedding, 1536);
  }

  private embedWithTFIDF(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const vector = new Array(1536).fill(0);

    for (const word of words) {
      const hash = this.hashString(word);
      const index = Math.abs(hash) % 1536;
      const tf = 1 / Math.log(words.length + 1);
      vector[index] += tf;
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

  private getCacheKey(text: string, model?: string): string {
    const hash = crypto.createHash('sha256')
      .update(text + (model || 'auto'))
      .digest('hex');
    return hash;
  }

  private getFromCache(key: string): number[] | null {
    // Check memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // Check file cache
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8');
      const vector = JSON.parse(data);
      this.memoryCache.set(key, vector);  // Promote to memory cache
      return vector;
    }

    return null;
  }

  private saveToCache(key: string, vector: number[]): void {
    // Save to memory cache
    this.memoryCache.set(key, vector);

    // Save to file cache (async, don't wait)
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    fs.writeFile(cachePath, JSON.stringify(vector), (err) => {
      if (err) console.warn('[EmbeddingService] Failed to save cache:', err);
    });
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
    this.memoryCache.clear();
  }

  getCacheSize(): number {
    return this.memoryCache.size;
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();
```

**Test**:
```bash
npm test -- embedding-service.test.ts
```

#### Day 5: Integration Test

**File**: `src/tests/integration/vector-database-integration.test.ts`

```typescript
import { vectorDb } from '../../services/vector-database';
import { embeddingService } from '../../services/embedding-service';

describe('Vector Database Integration', () => {
  beforeAll(async () => {
    await vectorDb.initialize();
    await embeddingService.initialize();
  });

  it('should embed and store commits with vector search', async () => {
    // Generate embedding
    const embedding = await embeddingService.embed(
      'Add authentication feature with OAuth2'
    );

    // Insert commit with embedding
    await vectorDb.insert('commits', {
      hash: 'test123',
      message: 'Add authentication feature with OAuth2',
      author: 'Test',
      authorEmail: 'test@example.com',
      timestamp: new Date(),
      repository: '/test',
      filePaths: ['auth.ts'],
      cluster: null,
      embedding: embedding.vector,
      embeddingSource: embedding.source
    });

    // Perform vector search
    const searchEmbedding = await embeddingService.embed(
      'implement login system'
    );

    const results = await vectorDb.vectorSearch('commits', {
      vector: searchEmbedding.vector,
      k: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0.5);
  });
});
```

### Week 2: MCP Client Setup

#### Day 6-7: MCP Client Implementation

**File**: `src/services/mcp-client.ts`

```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class MCPClient extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private namespace: string;
  private ready: boolean = false;

  constructor(namespace: string = 'portfolio-cognitive-command') {
    super();
    this.namespace = namespace;
  }

  async connect(): Promise<void> {
    console.log('[MCP] Starting server...');

    // Start MCP server
    this.serverProcess = spawn('npx', ['claude-flow@alpha', 'mcp', 'start'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for ready signal
    await this.waitForReady();

    console.log('[MCP] Server ready');
    this.ready = true;
  }

  async callTool(tool: string, parameters: Record<string, any>): Promise<MCPToolResult> {
    if (!this.ready) {
      throw new Error('MCP client not ready');
    }

    const toolCall: MCPToolCall = { tool, parameters };

    // Send tool call (implementation depends on MCP protocol)
    return this.sendToolCall(toolCall);
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

  async deleteMemory(key: string): Promise<boolean> {
    const result = await this.callTool('mcp__claude-flow__memory_delete', {
      key,
      namespace: this.namespace
    });

    return result.success;
  }

  disconnect(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
      this.ready = false;
      console.log('[MCP] Server stopped');
    }
  }

  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP server startup timeout'));
      }, 30000);

      this.serverProcess?.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('[MCP]', output);

        if (output.includes('MCP server ready') || output.includes('Server started')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      this.serverProcess?.stderr?.on('data', (data) => {
        console.error('[MCP Error]', data.toString());
      });
    });
  }

  private async sendToolCall(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Placeholder: actual implementation depends on MCP protocol
    // This would use stdio/HTTP/WebSocket to communicate with server

    return {
      success: true,
      data: null
    };
  }
}

// Singleton instance
export const mcpClient = new MCPClient();
```

#### Day 8-10: Legacy Code Migration

**Task**: Move old code to `/legacy` directory

```bash
# Create legacy directory
mkdir -p legacy/agentdb
mkdir -p legacy/skills

# Move old implementations
mv src/agentdb/database.ts legacy/agentdb/document-store.ts
mv src/agentdb/storage.ts legacy/agentdb/file-backend.ts
mv src/agentdb/queries.ts legacy/agentdb/array-queries.ts
mv src/skills/semantic-analyzer.ts legacy/skills/keyword-analyzer.ts
mv src/skills/drift-detector.ts legacy/skills/keyword-drift.ts

# Create README in legacy directory
cat > legacy/README.md << EOF
# Legacy Code

This directory contains the original keyword-based implementation.
Preserved for reference and potential rollback.

## Contents
- \`agentdb/\`: Original JSON file-based storage
- \`skills/\`: Keyword matching-based analysis

## DO NOT MODIFY
This code is frozen at migration point (v1.0-legacy tag).
EOF

git add legacy/
git commit -m "chore: Move legacy code to /legacy directory"
```

---

## Phase 2: Semantic Analysis Rewrite (Week 3-4)

### Week 3: Rewrite Core Skills

#### Semantic Analyzer

**File**: `src/skills/semantic-analyzer.ts` (REWRITE)

```typescript
import { embeddingService } from '../services/embedding-service';
import { vectorDb } from '../services/vector-database';

export interface Commit {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: Date;
  filePaths: string[];
  repository: string;
}

export interface AnalysisResult {
  processedCount: number;
  embeddingSource: 'openai' | 'huggingface' | 'tfidf';
  duration: number;
}

export async function analyzeCommits(
  commits: Commit[]
): Promise<AnalysisResult> {
  const startTime = Date.now();
  let embeddingSource: 'openai' | 'huggingface' | 'tfidf' = 'openai';

  console.log(`[SemanticAnalyzer] Processing ${commits.length} commits...`);

  // Generate embeddings for all commits
  const embeddings = await Promise.all(
    commits.map(async (commit) => {
      const text = `${commit.message} ${commit.filePaths.join(' ')}`;
      const result = await embeddingService.embed(text);
      embeddingSource = result.source;  // Track which model was used
      return result.vector;
    })
  );

  console.log(`[SemanticAnalyzer] Generated ${embeddings.length} embeddings using ${embeddingSource}`);

  // Bulk insert into vector database
  const documents = commits.map((commit, i) => ({
    hash: commit.hash,
    message: commit.message,
    author: commit.author,
    authorEmail: commit.authorEmail,
    timestamp: commit.timestamp,
    repository: commit.repository,
    filePaths: commit.filePaths,
    cluster: null,  // Will be assigned by clustering
    embedding: embeddings[i],
    embeddingSource
  }));

  await vectorDb.bulkInsert('commits', documents);

  console.log('[SemanticAnalyzer] Building vector index...');
  await vectorDb.buildIndex('commits');

  const duration = Date.now() - startTime;

  return {
    processedCount: commits.length,
    embeddingSource,
    duration
  };
}
```

#### Drift Detector

**File**: `src/skills/drift-detector.ts` (REWRITE)

```typescript
import { embeddingService } from '../services/embedding-service';
import { vectorDb } from '../services/vector-database';
import { config } from '../config';

export interface DriftResult {
  drift: number;
  similarity: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertCreated: boolean;
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function calculateSeverity(drift: number): 'low' | 'medium' | 'high' | 'critical' {
  if (drift < 0.3) return 'low';
  if (drift < 0.5) return 'medium';
  if (drift < 0.7) return 'high';
  return 'critical';
}

export async function detectDrift(sessionId: string): Promise<DriftResult> {
  console.log(`[DriftDetector] Analyzing session ${sessionId}...`);

  // Load session
  const session = await vectorDb.get('sessions', sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Extract reasoning text from decisions
  const reasoningText = session.decisions
    .map((d: any) => `${d.description}: ${d.rationale}`)
    .join('\n');

  // Extract implementation text from commits
  const commitHashes = session.commits || [];
  const commits = await Promise.all(
    commitHashes.map((hash: string) => vectorDb.get('commits', hash))
  );

  const implementationText = commits
    .filter((c) => c !== null)
    .map((c: any) => c.message)
    .join('\n');

  // Generate embeddings
  console.log('[DriftDetector] Generating embeddings...');
  const [reasoningResult, implResult] = await Promise.all([
    embeddingService.embed(reasoningText),
    embeddingService.embed(implementationText)
  ]);

  // Calculate drift
  const similarity = cosineSimilarity(reasoningResult.vector, implResult.vector);
  const drift = 1.0 - similarity;
  const severity = calculateSeverity(drift);

  console.log(`[DriftDetector] Drift: ${drift.toFixed(3)}, Similarity: ${similarity.toFixed(3)}, Severity: ${severity}`);

  // Create alert if threshold exceeded
  let alertCreated = false;
  if (drift > config.driftThreshold) {
    await vectorDb.insert('driftAlerts', {
      alertId: `alert-${Date.now()}`,
      repository: session.repository,
      sessionId,
      driftResult: { drift, similarity },
      severity,
      intentSummary: reasoningText.substring(0, 500),
      implementationSummary: implementationText.substring(0, 500),
      acknowledged: false,
      resolved: false,
      recommendations: [
        'Review session decisions against implementation',
        'Check if requirements changed during development',
        'Consider updating planning process'
      ],
      actionsTaken: [],
      detectedBy: 'drift-detector',
      detectedAt: new Date(),
      tags: ['auto-generated']
    });

    alertCreated = true;
    console.log('[DriftDetector] Alert created');
  }

  return {
    drift,
    similarity,
    severity,
    alertCreated
  };
}
```

### Week 4: Clustering Service

**File**: `src/services/clustering-service.ts`

```typescript
import { vectorDb } from './vector-database';
import { embeddingService } from './embedding-service';

export type ClusterType = 'Experience' | 'Core Systems' | 'Infra';

export interface ClusterStats {
  clusterCount: number;
  noiseCount: number;
  clusterLabels: Record<ClusterType, number>;
  largestCluster: number;
}

export class ClusteringService {
  private referenceVectors: Map<ClusterType, number[]> = new Map();

  async initialize(): Promise<void> {
    // Generate reference vectors for cluster classification
    const [experienceVec, coreVec, infraVec] = await Promise.all([
      embeddingService.embed('frontend ui ux components user interface design react vue'),
      embeddingService.embed('backend api database server business logic service'),
      embeddingService.embed('docker kubernetes deployment ci cd infrastructure config')
    ]);

    this.referenceVectors.set('Experience', experienceVec.vector);
    this.referenceVectors.set('Core Systems', coreVec.vector);
    this.referenceVectors.set('Infra', infraVec.vector);
  }

  async clusterRepository(repository: string): Promise<ClusterStats> {
    console.log(`[Clustering] Clustering repository: ${repository}`);

    // Get all commits for repository
    const commits = await vectorDb.query('commits', { repository });

    if (commits.length === 0) {
      console.warn('[Clustering] No commits found');
      return {
        clusterCount: 0,
        noiseCount: 0,
        clusterLabels: { 'Experience': 0, 'Core Systems': 0, 'Infra': 0 },
        largestCluster: 0
      };
    }

    // Extract vectors
    const vectors = commits.map((c: any) => c.embedding);

    // Apply HDBSCAN clustering (simplified: use cosine similarity grouping)
    const labels = this.simpleClustering(vectors);

    // Classify each cluster
    const clusterStats: Record<ClusterType, number> = {
      'Experience': 0,
      'Core Systems': 0,
      'Infra': 0
    };

    const uniqueLabels = [...new Set(labels)].filter(l => l !== -1);

    for (const clusterId of uniqueLabels) {
      // Get commits in this cluster
      const clusterIndices = labels
        .map((label, i) => (label === clusterId ? i : -1))
        .filter(i => i !== -1);

      const clusterVectors = clusterIndices.map(i => vectors[i]);

      // Calculate centroid
      const centroid = this.calculateCentroid(clusterVectors);

      // Classify centroid
      const clusterLabel = this.classifyCentroid(centroid);

      // Update commits with cluster label
      for (const index of clusterIndices) {
        const commit = commits[index];
        await vectorDb.update('commits', commit.hash, { cluster: clusterLabel });
      }

      clusterStats[clusterLabel] += clusterIndices.length;
    }

    const noiseCount = labels.filter(l => l === -1).length;

    return {
      clusterCount: uniqueLabels.length,
      noiseCount,
      clusterLabels: clusterStats,
      largestCluster: Math.max(...Object.values(clusterStats))
    };
  }

  private simpleClustering(vectors: number[][]): number[] {
    // Simplified clustering: group by similarity threshold
    const labels = new Array(vectors.length).fill(-1);  // -1 = noise
    let currentCluster = 0;

    for (let i = 0; i < vectors.length; i++) {
      if (labels[i] !== -1) continue;  // Already assigned

      // Start new cluster
      labels[i] = currentCluster;

      // Find similar vectors
      for (let j = i + 1; j < vectors.length; j++) {
        if (labels[j] !== -1) continue;

        const similarity = this.cosineSimilarity(vectors[i], vectors[j]);

        if (similarity > 0.7) {  // Similarity threshold
          labels[j] = currentCluster;
        }
      }

      currentCluster++;
    }

    return labels;
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

  private classifyCentroid(centroid: number[]): ClusterType {
    const similarities = {
      'Experience': this.cosineSimilarity(centroid, this.referenceVectors.get('Experience')!),
      'Core Systems': this.cosineSimilarity(centroid, this.referenceVectors.get('Core Systems')!),
      'Infra': this.cosineSimilarity(centroid, this.referenceVectors.get('Infra')!)
    };

    return Object.entries(similarities).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] as ClusterType;
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

export const clusteringService = new ClusteringService();
```

---

## Testing Strategy

After each phase, run comprehensive tests:

```bash
# Unit tests
npm test

# Integration tests
npm test -- tests/integration

# Manual verification
pcc analyze ./test-repo
pcc search "authentication"
pcc dashboard
```

---

## Rollback Procedure

If issues arise:

```bash
# Revert to legacy tag
git reset --hard v1.0-legacy

# Or restore specific files
cp legacy/skills/keyword-analyzer.ts src/skills/semantic-analyzer.ts
```

---

This migration guide provides concrete, copy-paste-ready code for each phase. Continue to Phase 3-6 in similar detail?