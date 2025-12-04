# AgentDB Integration Guide

Complete guide for using AgentDB persistence layer in Portfolio Cognitive Command.

## Overview

AgentDB provides a unified persistence layer that:
- Stores agent states, sessions, GOAP world states, and analysis results
- Syncs with claude-flow MCP memory tools
- Supports complex queries and cross-collection operations
- Maintains version history and conflict resolution

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AgentDB API                          │
├─────────────────────────────────────────────────────────┤
│  save() │ load() │ query() │ update() │ delete()        │
├─────────────────┬───────────────────────────────────────┤
│                 │                                       │
│  Storage Layer  │         Sync Manager                  │
│  (Local Files)  │       (MCP Memory)                    │
│                 │                                       │
│  /memory/       │   mcp__claude-flow__memory_usage      │
│  ├─agents/      │   mcp__claude-flow__memory_search     │
│  └─sessions/    │                                       │
└─────────────────┴───────────────────────────────────────┘
```

## Installation

```typescript
import { createAgentDB, MCPMemoryTools } from './agentdb';

// Create MCP tools adapter (if using claude-flow)
const mcpTools: MCPMemoryTools = {
  async store(key, value, namespace, ttl) {
    // Call mcp__claude-flow__memory_usage with action: 'store'
    return true;
  },
  async retrieve(key, namespace) {
    // Call mcp__claude-flow__memory_usage with action: 'retrieve'
    return null;
  },
  async search(pattern, namespace, limit) {
    // Call mcp__claude-flow__memory_search
    return [];
  },
  async delete(key, namespace) {
    // Call mcp__claude-flow__memory_usage with action: 'delete'
    return true;
  },
  async list(namespace) {
    // Call mcp__claude-flow__memory_usage with action: 'list'
    return [];
  }
};

// Create database instance
const db = createAgentDB('./memory', mcpTools, {
  enabled: true,
  strategy: 'merge',
  conflictResolution: 'latest',
  autoSync: true,
  syncInterval: 60000, // 1 minute
});
```

## Data Schemas

### 1. Agent State

```typescript
interface AgentState {
  id: string;
  collection: 'agents';
  agentId: string;
  role: 'scanner' | 'analyzer' | 'detector' | 'generator' | 'builder' | 'linker' | 'coordinator';
  name: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'terminated';
  currentTask?: string;
  capabilities: Array<{
    name: string;
    version: string;
    parameters: Record<string, unknown>;
  }>;
  config: Record<string, unknown>;
  tasksCompleted: number;
  tasksFailedCount: number;
  averageExecutionTime: number;
  sessionIds: string[];
  skillIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Session State

```typescript
interface SessionState {
  id: string;
  collection: 'sessions';
  sessionId: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  agentIds: string[];
  coordinatorId?: string;
  repository?: string;
  branch?: string;
  commitHash?: string;
  decisions: Array<{
    timestamp: Date;
    description: string;
    rationale: string;
    outcome?: string;
  }>;
  conversationSummary: string;
  metrics: {
    duration: number;
    agentsUsed: number;
    tasksCompleted: number;
    filesModified: number;
    tokensUsed?: number;
  };
  worldStateIds: string[];
  analysisIds: string[];
  artifactPaths: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. World State (GOAP)

```typescript
interface WorldState {
  id: string;
  collection: 'worldStates';
  worldStateId: string;
  sessionId: string;
  snapshotName: string;
  facts: Array<{
    key: string;
    value: unknown;
    confidence: number;
    source: string;
    timestamp: Date;
  }>;
  goals: Array<{
    description: string;
    priority: number;
    satisfied: boolean;
    preconditions: Record<string, unknown>;
    effects: Record<string, unknown>;
  }>;
  repository?: string;
  timestamp: Date;
  previousStateId?: string;
  changedFacts: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Analysis Result

```typescript
interface AnalysisResult {
  id: string;
  collection: 'analyses';
  analysisId: string;
  sessionId: string;
  analysisType: 'semantic' | 'drift' | 'cluster' | 'comprehensive';
  repositories: string[];
  timeRange?: { start: Date; end: Date };
  clusterAnalysis?: Array<{
    cluster: 'Experience' | 'Core Systems' | 'Infra';
    repositories: string[];
    commitCount: number;
    totalChanges: number;
    keyPaths: string[];
  }>;
  repositoryInsights?: Array<{
    repository: string;
    primaryCluster: ClusterType;
    clusterDistribution: Record<ClusterType, number>;
    totalCommits: number;
    analyzedCommits: number;
    lastAnalyzed: Date;
  }>;
  embeddings?: SemanticEmbedding[];
  totalRepositories: number;
  totalCommits: number;
  processingTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  performedBy: string;
  performedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5. Drift Alert

```typescript
interface DriftAlert {
  id: string;
  collection: 'driftAlerts';
  alertId: string;
  repository: string;
  driftResult: DriftResult;
  severity: 'low' | 'medium' | 'high' | 'critical';
  intentSummary: string;
  implementationSummary: string;
  commitRange?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  recommendations: string[];
  actionsTaken: string[];
  detectedBy: string;
  detectedAt: Date;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### 1. Basic CRUD Operations

```typescript
// Save an agent
const agent: AgentState = {
  id: 'agent-001',
  collection: 'agents',
  agentId: 'scanner-001',
  role: 'scanner',
  name: 'Repository Scanner',
  status: 'active',
  capabilities: [
    { name: 'repo-scan', version: '1.0.0', parameters: {} }
  ],
  config: { scanDepth: 3 },
  tasksCompleted: 0,
  tasksFailedCount: 0,
  averageExecutionTime: 0,
  sessionIds: [],
  skillIds: ['repo-scanner'],
  tags: ['scanner', 'repository'],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.saveAgent(agent);

// Load an agent
const loadedAgent = await db.getAgent('agent-001');

// Update agent status
await db.updateAgentStatus('agent-001', 'busy', 'Scanning repository');

// Record task completion
await db.recordAgentTaskCompletion('agent-001', true, 5000);
```

### 2. Session Management

```typescript
// Create a new session
const session: SessionState = {
  id: 'session-001',
  collection: 'sessions',
  sessionId: 'scan-session-2025-12-03',
  name: 'Portfolio Analysis',
  description: 'Analyzing portfolio repositories for drift',
  status: 'active',
  startedAt: new Date(),
  agentIds: ['agent-001'],
  decisions: [],
  conversationSummary: '',
  metrics: {
    duration: 0,
    agentsUsed: 1,
    tasksCompleted: 0,
    filesModified: 0,
  },
  worldStateIds: [],
  analysisIds: [],
  artifactPaths: [],
  tags: ['analysis', 'drift-detection'],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.createSession(session);

// Add a decision
await db.addSessionDecision('session-001', {
  timestamp: new Date(),
  description: 'Use semantic clustering for analysis',
  rationale: 'Better accuracy than keyword matching',
  outcome: 'Implemented successfully',
});

// Update session status
await db.updateSessionStatus('session-001', 'completed');
```

### 3. GOAP World State

```typescript
// Create initial world state
const worldState: WorldState = {
  id: 'ws-001',
  collection: 'worldStates',
  worldStateId: 'initial-state',
  sessionId: 'session-001',
  snapshotName: 'Initial Scan',
  facts: [
    {
      key: 'repositories_scanned',
      value: 0,
      confidence: 1.0,
      source: 'scanner-001',
      timestamp: new Date(),
    },
    {
      key: 'drift_detected',
      value: false,
      confidence: 1.0,
      source: 'system',
      timestamp: new Date(),
    },
  ],
  goals: [
    {
      description: 'Scan all repositories',
      priority: 10,
      satisfied: false,
      preconditions: { repositories_available: true },
      effects: { repositories_scanned: 'all' },
    },
  ],
  timestamp: new Date(),
  changedFacts: [],
  tags: [],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.saveWorldState(worldState);

// Update facts
await db.updateWorldStateFacts('ws-001', [
  {
    key: 'repositories_scanned',
    value: 5,
    confidence: 1.0,
    source: 'scanner-001',
    timestamp: new Date(),
  },
]);

// Get latest world state
const latest = await db.getLatestWorldState('session-001');
```

### 4. Analysis and Drift Detection

```typescript
// Save analysis results
const analysis: AnalysisResult = {
  id: 'analysis-001',
  collection: 'analyses',
  analysisId: 'semantic-001',
  sessionId: 'session-001',
  analysisType: 'semantic',
  repositories: ['repo-a', 'repo-b'],
  clusterAnalysis: [
    {
      cluster: 'Experience',
      repositories: ['repo-a'],
      commitCount: 45,
      totalChanges: 150,
      keyPaths: ['src/components', 'public'],
    },
  ],
  totalRepositories: 2,
  totalCommits: 75,
  processingTime: 3500,
  status: 'completed',
  performedBy: 'analyzer-001',
  performedAt: new Date(),
  tags: ['semantic', 'clustering'],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.saveAnalysis(analysis);

// Create drift alert
const alert: DriftAlert = {
  id: 'alert-001',
  collection: 'driftAlerts',
  alertId: 'drift-001',
  repository: 'repo-a',
  driftResult: {
    alignmentScore: 0.65,
    driftAlert: true,
    highPrecision: true,
    intentVector: [],
    implementationVector: [],
  },
  severity: 'medium',
  intentSummary: 'Add user authentication',
  implementationSummary: 'Modified database schema',
  acknowledged: false,
  resolved: false,
  recommendations: ['Review implementation against intent'],
  actionsTaken: [],
  detectedBy: 'detector-001',
  detectedAt: new Date(),
  sessionId: 'session-001',
  tags: ['drift', 'authentication'],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.createDriftAlert(alert);

// Acknowledge alert
await db.acknowledgeDriftAlert('alert-001', 'user-123');

// Resolve alert
await db.resolveDriftAlert('alert-001');
```

### 5. Advanced Queries

```typescript
// Get active agents
const activeAgents = await db.queryBuilder.getActiveAgents();

// Get sessions by date range
const recentSessions = await db.queryBuilder.getSessionsByDateRange(
  new Date('2025-12-01'),
  new Date('2025-12-03')
);

// Get latest analysis for repository
const latestAnalysis = await db.getLatestAnalysis('repo-a');

// Get unacknowledged alerts
const alerts = await db.getUnacknowledgedAlerts();

// Get critical unresolved alerts
const criticalAlerts = await db.queryBuilder.getCriticalUnresolvedAlerts();

// Get complete session context
const context = await db.getSessionContext('session-001');
// Returns: { session, agents, worldStates, analyses, driftAlerts, metrics }

// Get repository dashboard
const dashboard = await db.getRepositoryDashboard('repo-a');
// Returns: { latestAnalysis, driftAlerts, sessions, worldStates, metrics, alertStats }

// Global search
const results = await db.search('authentication');
// Returns: { agents, sessions, analyses, driftAlerts }
```

### 6. Skill Registration and Tracking

```typescript
// Register a skill
const skill: SkillRegistration = {
  id: 'skill-001',
  collection: 'skills',
  skillId: 'drift-detector',
  skillType: 'drift-detector',
  name: 'Drift Detector',
  version: '1.0.0',
  enabled: true,
  config: { threshold: 0.7 },
  requiredSkills: ['semantic-analyzer'],
  requiredCapabilities: ['embedding-generation'],
  executionCount: 0,
  errorCount: 0,
  averageExecutionTime: 0,
  successRate: 1.0,
  description: 'Detects alignment drift between intent and implementation',
  tags: ['drift', 'analysis'],
  customData: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
};

await db.registerSkill(skill);

// Record skill execution
await db.recordSkillExecution('skill-001', true, 2500);

// Get enabled skills
const enabledSkills = await db.getEnabledSkills();
```

### 7. Synchronization with MCP Memory

```typescript
// Manual sync of all collections
const syncResult = await db.syncAll();
console.log(`Synced ${syncResult.synced} documents with ${syncResult.conflicts} conflicts`);

// Sync specific collection
const agentSyncResult = await db.syncCollection('agents');

// Auto-sync is configured during database creation
const db = createAgentDB('./memory', mcpTools, {
  enabled: true,
  strategy: 'merge',
  conflictResolution: 'latest',
  autoSync: true,
  syncInterval: 60000, // Sync every minute
});
```

### 8. Complex Filtering

```typescript
// Query with operators
const busyAgents = await db.query<AgentState>('agents', {
  status: { $in: ['active', 'busy'] },
  tasksCompleted: { $gte: 10 },
});

// Query with sorting and pagination
const topAgents = await db.query<AgentState>(
  'agents',
  { status: 'active' },
  {
    sort: { field: 'tasksCompleted', order: 'desc' },
    limit: 10,
    offset: 0,
  }
);

// Query with regex
const searchResults = await db.query<SessionState>('sessions', {
  name: { $regex: 'Portfolio.*Analysis' },
});
```

## Integration with GOAP Planner

```typescript
import { createAgentDB } from './agentdb';
import { GOAPPlanner } from './goap-planner'; // Your GOAP implementation

// Initialize database
const db = createAgentDB('./memory');

// Load or create world state
let worldState = await db.getLatestWorldState(sessionId);
if (!worldState) {
  worldState = createInitialWorldState(sessionId);
  await db.saveWorldState(worldState);
}

// Convert to GOAP format
const goapState = {
  facts: Object.fromEntries(
    worldState.facts.map(f => [f.key, f.value])
  ),
  goals: worldState.goals,
};

// Plan actions
const planner = new GOAPPlanner();
const plan = planner.plan(goapState);

// Execute plan and update world state
for (const action of plan) {
  // Execute action...

  // Update world state
  await db.updateWorldStateFacts(worldState.id, [
    {
      key: 'action_executed',
      value: action.name,
      confidence: 1.0,
      source: 'planner',
      timestamp: new Date(),
    },
  ]);
}
```

## MCP Memory Integration

The sync layer automatically handles synchronization with claude-flow MCP memory:

```typescript
// Memory namespaces used:
// - agentdb/agents
// - agentdb/sessions
// - agentdb/worldStates
// - agentdb/skills
// - agentdb/analyses
// - agentdb/driftAlerts
// - agentdb/neuralPatterns
// - agentdb/metrics

// Access via MCP tools:
// mcp__claude-flow__memory_usage({
//   action: 'store',
//   key: 'agents/agent-001',
//   value: JSON.stringify(agent),
//   namespace: 'agentdb/agents'
// })

// Search across memory:
// mcp__claude-flow__memory_search({
//   pattern: 'drift.*',
//   namespace: 'agentdb/driftAlerts'
// })
```

## Best Practices

1. **Use consistent IDs**: Format IDs consistently (e.g., `agent-001`, `session-2025-12-03`)
2. **Tag everything**: Use tags for easy filtering and search
3. **Track metrics**: Record execution times and success rates
4. **Update world states**: Keep GOAP facts current with actual system state
5. **Acknowledge alerts**: Mark drift alerts as acknowledged to track resolution
6. **Batch queries**: Use `getSessionContext()` and `getRepositoryDashboard()` for related data
7. **Enable auto-sync**: Configure auto-sync for seamless MCP integration
8. **Handle conflicts**: Choose appropriate conflict resolution strategy
9. **Clean up**: Call `db.destroy()` when done to stop auto-sync

## Performance Considerations

- File-based storage is suitable for moderate data volumes (< 10,000 documents)
- Index-based queries are O(n) - consider caching for frequently accessed data
- Auto-sync has minimal overhead (~100ms per sync cycle)
- Large world state histories should be pruned periodically
- Use projections to reduce data transfer for large documents

## Future Enhancements

- [ ] Add indexing for faster queries
- [ ] Implement database compaction
- [ ] Support for binary data (embeddings)
- [ ] Real-time change notifications
- [ ] Backup and restore functionality
- [ ] Migration tools for schema changes
- [ ] GraphQL API layer
- [ ] Time-series optimization for metrics
