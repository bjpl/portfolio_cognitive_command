# Hive-Mind Coordination Protocol
## Portfolio Cognitive Command v8.0

**Version:** 1.0.0
**Date:** 2025-12-03
**Swarm ID:** swarm_1764817168552_tn3max0m8
**Topology:** Mesh (Peer-to-Peer)
**Max Agents:** 5

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Roles & Responsibilities](#agent-roles--responsibilities)
3. [Message Protocol](#message-protocol)
4. [State Machine](#state-machine)
5. [Memory Sharing & Synchronization](#memory-sharing--synchronization)
6. [Consensus Mechanisms](#consensus-mechanisms)
7. [GOAP Integration](#goap-integration)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Performance Metrics](#performance-metrics)

---

## Architecture Overview

### Topology: Mesh Network

```
     Queen (Coordinator)
       /  |  |  \
      /   |  |   \
   Scout  │  │  Dashboard
     \    │  │    /
      \   │  │   /
      Semantic  │
         \      │
          \     │
          Skill-Creator
```

**Key Characteristics:**
- **Decentralized Communication:** All agents can communicate directly
- **Queen Oversight:** Strategic coordination without blocking operations
- **Fault Tolerant:** Mesh allows rerouting if any agent fails
- **Scalable:** Can add/remove agents dynamically

### Agent Network

| Agent ID | Role | Priority | Capabilities |
|----------|------|----------|--------------|
| `queen-001` | HiveMind-Queen | CRITICAL | Strategy, GOAP, Coordination, Conflict Resolution |
| `scout-001` | Scout-Cartographer | HIGH | Repo Discovery, Git Analysis, Manifest Generation |
| `semantic-001` | Semantic-Processor | HIGH | Embeddings, Clustering, Drift Detection |
| `dashboard-001` | Dashboard-Builder | MEDIUM | Visualization, React Components, HTML Generation |
| `skill-001` | Skill-Creator | LOW | Dynamic Skill Generation, AgentDB Integration |

---

## Agent Roles & Responsibilities

### 1. HiveMind-Queen (Coordinator)

**Primary Responsibilities:**
- Strategic decision-making using GOAP planner
- Task allocation and priority management
- Conflict resolution between agents
- Resource management and load balancing
- Monitoring overall swarm health

**Decision Authority:**
- FINAL: Strategic priorities, conflict resolution, resource allocation
- ADVISORY: Technical implementation details (defers to specialists)
- VETO: Can override any decision that conflicts with strategic goals

**Communication Pattern:**
- Receives status updates from all agents (every 30 seconds)
- Broadcasts strategic directives (when priorities change)
- Direct messages for conflict resolution

**GOAP Goals:**
```typescript
interface QueenGoals {
  primary: {
    maximize_portfolio_coverage: number;    // 0-100%
    minimize_drift_alerts: number;          // count
    maintain_data_freshness: number;        // hours since last update
  };
  secondary: {
    optimize_agent_utilization: number;     // 0-100%
    reduce_processing_latency: number;      // milliseconds
  };
}
```

### 2. Scout-Cartographer

**Primary Responsibilities:**
- Recursive repository discovery (Phase 1)
- Git history analysis (pulse check)
- Manifest generation and maintenance
- Change detection and reporting

**Autonomy Level:** HIGH
- Can independently scan and categorize repositories
- Reports to Queen only for priority changes or anomalies

**Communication Pattern:**
- Broadcasts discovery events (new repo found)
- Sends status updates to Queen (scan progress)
- Direct messages to Semantic-Processor (handoff discovered repos)

**Performance Targets:**
- Scan depth: 3 levels maximum
- Processing rate: 5 repos/minute
- Latency tolerance: <2 seconds per repo

### 3. Semantic-Processor

**Primary Responsibilities:**
- Generate vector embeddings for commits
- Perform semantic clustering
- Drift detection and scoring
- AgentDB correlation

**Autonomy Level:** HIGH
- Can autonomously process embeddings
- Flags drift alerts for Queen review

**Communication Pattern:**
- Receives repo metadata from Scout
- Sends embeddings to Skill-Creator for shard generation
- Alerts Queen on drift_alert > threshold

**Processing Pipeline:**
```typescript
interface SemanticPipeline {
  input: {
    commits: GitCommit[];
    agentdb_sessions: Session[];
  };
  processing: {
    embedding_generation: (commit: GitCommit) => Vector;
    clustering: (vectors: Vector[]) => Cluster;
    drift_detection: (intent: Vector, implementation: Vector) => number;
  };
  output: {
    cluster: string;
    alignment_score: number;
    drift_alert: boolean;
  };
}
```

### 4. Dashboard-Builder

**Primary Responsibilities:**
- React component generation
- Heatmap visualization
- Portfolio brief generation
- Progress ledger generation

**Autonomy Level:** MEDIUM
- Can autonomously generate visualizations
- Requires Queen approval for layout changes

**Communication Pattern:**
- Receives aggregated shards from all agents
- Publishes dashboard artifacts to shared storage
- Notifies Queen on completion

### 5. Skill-Creator

**Primary Responsibilities:**
- Dynamic skill generation based on patterns
- Shard generation and aggregation
- AgentDB integration
- Template management

**Autonomy Level:** MEDIUM
- Can create shards autonomously
- Requires Queen approval for new skill templates

**Communication Pattern:**
- Receives embeddings from Semantic-Processor
- Stores shards in shared memory
- Notifies Queen of new skill patterns

---

## Message Protocol

### Message Structure

```typescript
interface HiveMindMessage {
  // Header (Required)
  header: {
    message_id: string;           // UUID v4
    timestamp: number;             // Unix epoch milliseconds
    sender_id: string;             // Agent ID
    recipient_id: string | 'ALL'; // Agent ID or broadcast
    message_type: MessageType;     // Enum
    priority: Priority;            // Enum
    sequence_number: number;       // Monotonic counter per agent
  };

  // Body (Type-specific)
  body: TaskMessage | StatusMessage | ResultMessage | AlertMessage;

  // Metadata (Optional)
  metadata?: {
    correlation_id?: string;      // Link related messages
    reply_to?: string;            // Message ID being replied to
    ttl?: number;                 // Time-to-live in seconds
    retry_count?: number;         // Number of retries
  };

  // Signature (Required for Queen messages)
  signature?: string;             // HMAC-SHA256 signature
}
```

### Message Types

```typescript
enum MessageType {
  // Command & Control
  TASK_ASSIGN = 'task.assign',
  TASK_ACCEPT = 'task.accept',
  TASK_REJECT = 'task.reject',
  TASK_COMPLETE = 'task.complete',

  // Status & Monitoring
  STATUS_UPDATE = 'status.update',
  HEALTH_CHECK = 'health.check',
  HEARTBEAT = 'heartbeat',

  // Data Exchange
  RESULT_PUBLISH = 'result.publish',
  DATA_REQUEST = 'data.request',
  DATA_RESPONSE = 'data.response',

  // Coordination
  ALERT_DRIFT = 'alert.drift',
  ALERT_ERROR = 'alert.error',
  CONFLICT_REPORT = 'conflict.report',
  CONSENSUS_REQUEST = 'consensus.request',
  CONSENSUS_VOTE = 'consensus.vote',

  // Resource Management
  RESOURCE_REQUEST = 'resource.request',
  RESOURCE_GRANT = 'resource.grant',
  RESOURCE_DENY = 'resource.deny',
}

enum Priority {
  CRITICAL = 5,  // Queen directives, errors
  HIGH = 4,      // Drift alerts, task assignments
  MEDIUM = 3,    // Normal operations
  LOW = 2,       // Status updates
  BACKGROUND = 1 // Heartbeats, metrics
}
```

### Message Examples

#### 1. Task Assignment (Queen → Scout)

```json
{
  "header": {
    "message_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": 1701648000000,
    "sender_id": "queen-001",
    "recipient_id": "scout-001",
    "message_type": "task.assign",
    "priority": 4,
    "sequence_number": 42
  },
  "body": {
    "task_id": "scan-task-001",
    "task_type": "repo.scan",
    "parameters": {
      "scan_dir": "/active-development",
      "max_depth": 3,
      "batch_size": 5
    },
    "deadline": 1701651600000,
    "dependencies": []
  },
  "metadata": {
    "correlation_id": "workflow-001",
    "ttl": 3600
  },
  "signature": "abc123..."
}
```

#### 2. Status Update (Scout → Queen)

```json
{
  "header": {
    "message_id": "b2c3d4e5-f6g7-8901-bcde-f12345678901",
    "timestamp": 1701648030000,
    "sender_id": "scout-001",
    "recipient_id": "queen-001",
    "message_type": "status.update",
    "priority": 2,
    "sequence_number": 15
  },
  "body": {
    "task_id": "scan-task-001",
    "status": "in_progress",
    "progress": 0.60,
    "metrics": {
      "repos_scanned": 9,
      "repos_total": 15,
      "active_repos": 7,
      "dormant_repos": 2
    },
    "estimated_completion": 1701648180000
  },
  "metadata": {
    "correlation_id": "workflow-001",
    "reply_to": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

#### 3. Drift Alert (Semantic → Queen)

```json
{
  "header": {
    "message_id": "c3d4e5f6-g7h8-9012-cdef-123456789012",
    "timestamp": 1701648090000,
    "sender_id": "semantic-001",
    "recipient_id": "queen-001",
    "message_type": "alert.drift",
    "priority": 4,
    "sequence_number": 23
  },
  "body": {
    "alert_type": "drift_detection",
    "severity": "high",
    "project": "auth-service",
    "alignment_score": 0.42,
    "threshold": 0.50,
    "details": {
      "intent": "Implement OAuth2 scopes",
      "implementation": "Updated package.json dependencies",
      "cosine_similarity": 0.42
    },
    "recommended_action": "manual_review"
  },
  "metadata": {
    "correlation_id": "analyze-task-005"
  }
}
```

#### 4. Consensus Request (Queen → ALL)

```json
{
  "header": {
    "message_id": "d4e5f6g7-h8i9-0123-defg-234567890123",
    "timestamp": 1701648120000,
    "sender_id": "queen-001",
    "recipient_id": "ALL",
    "message_type": "consensus.request",
    "priority": 4,
    "sequence_number": 43
  },
  "body": {
    "consensus_id": "priority-vote-001",
    "question": "Should we prioritize auth-service analysis over new repo scans?",
    "options": ["prioritize_auth", "continue_scans", "split_resources"],
    "voting_deadline": 1701648180000,
    "required_quorum": 0.60,
    "context": {
      "drift_alert_count": 3,
      "pending_scans": 6
    }
  },
  "metadata": {
    "ttl": 60
  },
  "signature": "def456..."
}
```

---

## State Machine

### Agent State Diagram

```
                    [INITIALIZING]
                          │
                          ▼
                      [IDLE]
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    [PROCESSING]    [WAITING_DATA]   [CONSENSUS]
         │                │                │
         │                ▼                │
         │          [PROCESSING]           │
         │                │                │
         └────────────────┴────────────────┘
                          │
                          ▼
                    [COMPLETING]
                          │
         ┌────────────────┼────────────────┐
         ▼                                 ▼
    [IDLE]                            [ERROR]
                                           │
                                           ▼
                                      [RECOVERING]
                                           │
                                           ▼
                                      [IDLE]
```

### State Transitions

```typescript
enum AgentState {
  INITIALIZING = 'initializing',     // Agent startup
  IDLE = 'idle',                     // Ready for tasks
  PROCESSING = 'processing',         // Executing assigned task
  WAITING_DATA = 'waiting_data',     // Blocked on dependency
  CONSENSUS = 'consensus',           // Participating in vote
  COMPLETING = 'completing',         // Finalizing task
  ERROR = 'error',                   // Recoverable error
  RECOVERING = 'recovering',         // Executing recovery
  SHUTDOWN = 'shutdown'              // Graceful termination
}

interface StateTransition {
  from: AgentState;
  to: AgentState;
  trigger: string;
  conditions: string[];
  actions: string[];
}

const transitions: StateTransition[] = [
  {
    from: AgentState.INITIALIZING,
    to: AgentState.IDLE,
    trigger: 'initialization_complete',
    conditions: ['config_loaded', 'connections_established'],
    actions: ['send_ready_message', 'start_heartbeat']
  },
  {
    from: AgentState.IDLE,
    to: AgentState.PROCESSING,
    trigger: 'task_assigned',
    conditions: ['resources_available', 'no_conflicts'],
    actions: ['accept_task', 'allocate_resources', 'start_processing']
  },
  {
    from: AgentState.PROCESSING,
    to: AgentState.WAITING_DATA,
    trigger: 'dependency_required',
    conditions: ['data_not_available'],
    actions: ['send_data_request', 'save_state', 'set_timeout']
  },
  {
    from: AgentState.WAITING_DATA,
    to: AgentState.PROCESSING,
    trigger: 'data_received',
    conditions: ['data_valid'],
    actions: ['restore_state', 'resume_processing']
  },
  {
    from: AgentState.PROCESSING,
    to: AgentState.COMPLETING,
    trigger: 'task_finished',
    conditions: ['output_valid'],
    actions: ['save_results', 'send_completion_message']
  },
  {
    from: AgentState.COMPLETING,
    to: AgentState.IDLE,
    trigger: 'completion_acknowledged',
    conditions: [],
    actions: ['release_resources', 'update_metrics']
  },
  {
    from: AgentState.PROCESSING,
    to: AgentState.ERROR,
    trigger: 'error_occurred',
    conditions: ['error_recoverable'],
    actions: ['log_error', 'send_alert', 'save_state']
  },
  {
    from: AgentState.ERROR,
    to: AgentState.RECOVERING,
    trigger: 'recovery_initiated',
    conditions: ['recovery_strategy_available'],
    actions: ['execute_recovery', 'restore_state']
  },
  {
    from: AgentState.RECOVERING,
    to: AgentState.IDLE,
    trigger: 'recovery_complete',
    conditions: ['health_check_passed'],
    actions: ['send_ready_message']
  }
];
```

### Queen State Machine (Extended)

```typescript
enum QueenState extends AgentState {
  PLANNING = 'planning',            // GOAP planning phase
  ALLOCATING = 'allocating',        // Task distribution
  MONITORING = 'monitoring',        // Swarm health monitoring
  RESOLVING_CONFLICT = 'resolving', // Active conflict resolution
}

interface QueenContext {
  active_tasks: Map<string, TaskStatus>;
  agent_health: Map<string, HealthMetrics>;
  pending_conflicts: ConflictReport[];
  resource_pool: ResourcePool;
  goap_state: GOAPState;
}
```

---

## Memory Sharing & Synchronization

### Shared Knowledge Base (AgentDB)

**Storage Architecture:**
```
/memory/
├── agents/
│   ├── queen-001/
│   │   ├── state.json
│   │   ├── goals.json
│   │   └── decisions.json
│   ├── scout-001/
│   │   ├── manifest.json
│   │   └── scan_history.json
│   ├── semantic-001/
│   │   ├── embeddings/
│   │   └── clusters.json
│   └── ...
├── shared/
│   ├── project_shards/
│   ├── consensus_votes/
│   └── global_metrics.json
└── sessions/
    └── swarm_1764817168552_tn3max0m8/
        ├── timeline.json
        └── artifacts/
```

### Memory Access Patterns

```typescript
interface MemoryAccess {
  // Private Agent State (Read/Write by owner only)
  private: {
    path: `/memory/agents/{agent_id}/*`;
    permissions: 'owner_rw';
    sync: 'none';
  };

  // Shared Project Data (Read by all, Write by specialists)
  shared_read: {
    path: `/memory/shared/project_shards/*`;
    permissions: 'all_read, specialist_write';
    sync: 'eventual_consistency';
  };

  // Global Metrics (Read by all, Write by Queen)
  global: {
    path: `/memory/shared/global_metrics.json`;
    permissions: 'all_read, queen_write';
    sync: 'strong_consistency';
  };

  // Session History (Append-only log)
  session: {
    path: `/memory/sessions/{swarm_id}/*`;
    permissions: 'all_append';
    sync: 'sequential_consistency';
  };
}
```

### Synchronization Protocol

**1. Eventual Consistency (Project Shards)**
- Agents write shards locally
- Background sync every 10 seconds
- Conflict resolution: Last-Write-Wins (LWW) with timestamp

**2. Strong Consistency (Global Metrics)**
- All writes go through Queen
- Atomic updates with version numbers
- Read-your-writes guarantee

**3. Sequential Consistency (Session Logs)**
- Append-only structure
- Monotonic sequence numbers
- No conflicts possible

### Cache Coherence

```typescript
interface CachePolicy {
  // Local Agent Cache
  local_cache: {
    ttl: 30,                    // seconds
    invalidation: 'on_write',   // Invalidate on local write
    refresh: 'background'       // Background refresh
  };

  // Shared Data Cache
  shared_cache: {
    ttl: 60,                    // seconds
    invalidation: 'on_message', // Invalidate on update message
    refresh: 'lazy'             // Lazy load on next access
  };

  // Global Metrics Cache
  global_cache: {
    ttl: 10,                    // seconds
    invalidation: 'immediate',  // Queen broadcasts invalidation
    refresh: 'eager'            // Fetch immediately
  };
}
```

---

## Consensus Mechanisms

### Voting Protocol

**Trigger Conditions:**
- Strategic priority conflicts
- Resource allocation disputes
- Ambiguous drift alerts (score near threshold)
- Cross-cluster dependencies

**Voting Process:**

```typescript
interface ConsensusVote {
  vote_id: string;
  question: string;
  options: string[];
  voters: string[];              // Agent IDs eligible to vote
  votes: Map<string, string>;    // agent_id -> option
  weights: Map<string, number>;  // agent_id -> vote_weight
  deadline: number;              // Unix timestamp
  quorum: number;                // 0.0 - 1.0
  status: 'pending' | 'passed' | 'failed' | 'timeout';
}

class ConsensusEngine {
  initiateVote(request: ConsensusRequest): ConsensusVote {
    const vote: ConsensusVote = {
      vote_id: generateUUID(),
      question: request.question,
      options: request.options,
      voters: this.getEligibleVoters(request.scope),
      votes: new Map(),
      weights: this.calculateWeights(request.scope),
      deadline: Date.now() + request.timeout,
      quorum: request.quorum || 0.60,
      status: 'pending'
    };

    this.broadcastVote(vote);
    return vote;
  }

  castVote(vote_id: string, agent_id: string, option: string): void {
    const vote = this.getVote(vote_id);
    if (!vote.voters.includes(agent_id)) {
      throw new Error('Agent not eligible to vote');
    }
    vote.votes.set(agent_id, option);
    this.checkVoteComplete(vote);
  }

  checkVoteComplete(vote: ConsensusVote): void {
    const totalWeight = Array.from(vote.weights.values())
      .reduce((sum, w) => sum + w, 0);
    const votedWeight = Array.from(vote.votes.keys())
      .map(id => vote.weights.get(id) || 0)
      .reduce((sum, w) => sum + w, 0);

    const participation = votedWeight / totalWeight;

    if (participation >= vote.quorum) {
      const results = this.tallyVotes(vote);
      vote.status = results.winner ? 'passed' : 'failed';
      this.notifyVoteComplete(vote, results);
    } else if (Date.now() > vote.deadline) {
      vote.status = 'timeout';
      this.notifyVoteTimeout(vote);
    }
  }

  tallyVotes(vote: ConsensusVote): VoteResults {
    const tally = new Map<string, number>();

    for (const [agent_id, option] of vote.votes) {
      const weight = vote.weights.get(agent_id) || 0;
      tally.set(option, (tally.get(option) || 0) + weight);
    }

    const sorted = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1]);

    return {
      winner: sorted[0][0],
      tally: Object.fromEntries(tally),
      margin: sorted.length > 1 ? sorted[0][1] - sorted[1][1] : sorted[0][1]
    };
  }
}
```

### Vote Weighting Strategy

```typescript
interface VoteWeights {
  queen: 2.0,           // Strategic authority
  specialists: 1.5,     // Domain expertise (Scout, Semantic for repo questions)
  builders: 1.0,        // Standard vote (Dashboard, Skill)
  observers: 0.5        // Advisory only (future agents)
}

function calculateVoteWeight(agent_id: string, question_scope: string): number {
  const base_weight = VOTE_WEIGHTS[getAgentRole(agent_id)];
  const expertise_bonus = hasExpertise(agent_id, question_scope) ? 0.5 : 0;
  return base_weight + expertise_bonus;
}
```

### Conflict Resolution (Without Voting)

**Fast-Path Resolution (No Vote Required):**

1. **Resource Conflicts:**
   - Queen has final authority
   - Uses GOAP planner to optimize allocation
   - Decision time: <1 second

2. **Priority Conflicts:**
   - Defer to strategic goals (from GOAP)
   - Higher-priority tasks win
   - Decision time: immediate

3. **Data Conflicts:**
   - Last-Write-Wins with timestamp
   - Version vectors for complex updates
   - Decision time: immediate

**Slow-Path Resolution (Vote Required):**

1. **Strategic Ambiguity:**
   - Multiple valid strategies
   - Example: "Prioritize depth vs breadth in scanning"
   - Timeout: 60 seconds

2. **Cross-Domain Decisions:**
   - Requires expertise from multiple agents
   - Example: "Should we re-cluster all projects?"
   - Timeout: 120 seconds

---

## GOAP Integration

### Queen's GOAP Planner

**Goals:**
```typescript
interface QueenGoals {
  portfolio_coverage: {
    target: 100,           // Percentage
    current: 80,
    priority: 10           // 1-10 scale
  };
  drift_alerts: {
    target: 0,             // Count
    current: 3,
    priority: 9
  };
  data_freshness: {
    target: 1,             // Hours since last update
    current: 4,
    priority: 7
  };
  agent_utilization: {
    target: 75,            // Percentage
    current: 60,
    priority: 5
  };
}
```

**Actions:**
```typescript
interface GOAPAction {
  name: string;
  preconditions: Condition[];
  effects: Effect[];
  cost: number;
  executor: string;        // Agent ID
}

const actions: GOAPAction[] = [
  {
    name: 'scan_repositories',
    preconditions: [
      { key: 'scout.state', value: 'idle' }
    ],
    effects: [
      { key: 'portfolio_coverage', delta: +10 },
      { key: 'data_freshness', set: 0 }
    ],
    cost: 5,
    executor: 'scout-001'
  },
  {
    name: 'analyze_drift',
    preconditions: [
      { key: 'semantic.state', value: 'idle' },
      { key: 'drift_alerts', operator: '>', value: 0 }
    ],
    effects: [
      { key: 'drift_alerts', delta: -1 }
    ],
    cost: 3,
    executor: 'semantic-001'
  },
  {
    name: 'generate_dashboard',
    preconditions: [
      { key: 'dashboard.state', value: 'idle' },
      { key: 'portfolio_coverage', operator: '>', value: 50 }
    ],
    effects: [
      { key: 'dashboard.freshness', set: 0 }
    ],
    cost: 2,
    executor: 'dashboard-001'
  }
];
```

**Planning Algorithm:**
```typescript
class GOAPPlanner {
  plan(goals: QueenGoals, worldState: WorldState): Action[] {
    // A* search through action space
    const openSet = new PriorityQueue<PlanNode>();
    const closedSet = new Set<string>();

    const startNode: PlanNode = {
      state: worldState,
      actions: [],
      cost: 0,
      heuristic: this.calculateHeuristic(worldState, goals)
    };

    openSet.push(startNode, startNode.cost + startNode.heuristic);

    while (!openSet.isEmpty()) {
      const current = openSet.pop();

      if (this.goalsAchieved(current.state, goals)) {
        return current.actions;
      }

      closedSet.add(this.hashState(current.state));

      for (const action of this.getApplicableActions(current.state)) {
        const newState = this.applyAction(current.state, action);
        const stateHash = this.hashState(newState);

        if (closedSet.has(stateHash)) continue;

        const newNode: PlanNode = {
          state: newState,
          actions: [...current.actions, action],
          cost: current.cost + action.cost,
          heuristic: this.calculateHeuristic(newState, goals)
        };

        openSet.push(newNode, newNode.cost + newNode.heuristic);
      }
    }

    return []; // No plan found
  }

  calculateHeuristic(state: WorldState, goals: QueenGoals): number {
    // Manhattan distance in goal space, weighted by priority
    let distance = 0;

    for (const [key, goal] of Object.entries(goals)) {
      const current = state[key] || 0;
      const delta = Math.abs(goal.target - current);
      distance += delta * goal.priority;
    }

    return distance;
  }
}
```

**Plan Execution:**
```typescript
class PlanExecutor {
  async executePlan(plan: Action[]): Promise<void> {
    for (const action of plan) {
      // Convert GOAP action to agent task
      const task: TaskMessage = {
        task_id: generateUUID(),
        task_type: action.name,
        parameters: action.parameters,
        deadline: Date.now() + action.timeout
      };

      // Assign to executor
      await this.assignTask(action.executor, task);

      // Wait for completion or timeout
      await this.waitForCompletion(task.task_id);

      // Update world state
      this.applyEffects(action.effects);
    }
  }
}
```

---

## Error Handling & Recovery

### Error Classification

```typescript
enum ErrorSeverity {
  CRITICAL = 'critical',    // Requires immediate Queen intervention
  HIGH = 'high',           // Agent cannot continue current task
  MEDIUM = 'medium',       // Degraded performance, can continue
  LOW = 'low'              // Informational, no action needed
}

enum ErrorType {
  NETWORK_TIMEOUT = 'network.timeout',
  DATA_CORRUPTION = 'data.corruption',
  RESOURCE_EXHAUSTED = 'resource.exhausted',
  INVALID_STATE = 'state.invalid',
  DEPENDENCY_FAILED = 'dependency.failed',
  ALGORITHM_FAILED = 'algorithm.failed'
}

interface ErrorReport {
  error_id: string;
  timestamp: number;
  agent_id: string;
  severity: ErrorSeverity;
  type: ErrorType;
  message: string;
  context: Record<string, any>;
  stack_trace?: string;
  recovery_attempted: boolean;
  recovery_successful: boolean;
}
```

### Recovery Strategies

```typescript
interface RecoveryStrategy {
  error_type: ErrorType;
  actions: RecoveryAction[];
  max_retries: number;
  backoff: 'linear' | 'exponential';
  fallback?: RecoveryAction;
}

const recoveryStrategies: RecoveryStrategy[] = [
  {
    error_type: ErrorType.NETWORK_TIMEOUT,
    actions: [
      { type: 'retry', delay: 1000 },
      { type: 'retry', delay: 2000 },
      { type: 'retry', delay: 4000 }
    ],
    max_retries: 3,
    backoff: 'exponential',
    fallback: { type: 'notify_queen', escalate: true }
  },
  {
    error_type: ErrorType.DATA_CORRUPTION,
    actions: [
      { type: 'restore_from_backup' },
      { type: 'recompute_from_source' }
    ],
    max_retries: 2,
    backoff: 'linear',
    fallback: { type: 'mark_as_invalid', notify: true }
  },
  {
    error_type: ErrorType.RESOURCE_EXHAUSTED,
    actions: [
      { type: 'release_resources' },
      { type: 'request_more_resources' },
      { type: 'reduce_scope' }
    ],
    max_retries: 1,
    backoff: 'linear',
    fallback: { type: 'pause_and_notify_queen' }
  }
];

class RecoveryEngine {
  async recover(error: ErrorReport): Promise<boolean> {
    const strategy = this.getStrategy(error.type);

    for (let i = 0; i < strategy.max_retries; i++) {
      const action = strategy.actions[i];
      const delay = this.calculateDelay(i, strategy.backoff, action.delay);

      await this.sleep(delay);

      try {
        await this.executeRecoveryAction(action, error.context);
        this.logRecoverySuccess(error, action);
        return true;
      } catch (recoveryError) {
        this.logRecoveryFailure(error, action, recoveryError);
      }
    }

    // All retries failed, execute fallback
    if (strategy.fallback) {
      await this.executeFallback(strategy.fallback, error);
    }

    return false;
  }
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private successThreshold: number = 2
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half_open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

---

## Performance Metrics

### Agent-Level Metrics

```typescript
interface AgentMetrics {
  agent_id: string;
  uptime: number;                    // milliseconds
  tasks_completed: number;
  tasks_failed: number;
  average_task_duration: number;     // milliseconds
  cpu_usage: number;                 // 0-100%
  memory_usage: number;              // bytes
  message_queue_depth: number;
  last_heartbeat: number;            // Unix timestamp
}
```

### Swarm-Level Metrics

```typescript
interface SwarmMetrics {
  swarm_id: string;
  total_agents: number;
  active_agents: number;
  idle_agents: number;
  error_agents: number;

  // Performance
  throughput: number;                // tasks/second
  latency_p50: number;               // milliseconds
  latency_p95: number;
  latency_p99: number;

  // Communication
  messages_sent: number;
  messages_received: number;
  message_loss_rate: number;         // 0-1

  // Coordination
  consensus_votes: number;
  consensus_success_rate: number;    // 0-1
  conflicts_resolved: number;

  // Business Metrics
  portfolio_coverage: number;        // 0-100%
  drift_alerts: number;
  data_freshness: number;            // hours
}
```

### Monitoring & Alerting

```typescript
interface AlertRule {
  metric: string;
  operator: '>' | '<' | '==' | '!=';
  threshold: number;
  duration: number;                  // milliseconds
  severity: ErrorSeverity;
  actions: string[];
}

const alertRules: AlertRule[] = [
  {
    metric: 'agent.error_rate',
    operator: '>',
    threshold: 0.10,
    duration: 60000,
    severity: ErrorSeverity.HIGH,
    actions: ['notify_queen', 'restart_agent']
  },
  {
    metric: 'swarm.message_loss_rate',
    operator: '>',
    threshold: 0.05,
    duration: 30000,
    severity: ErrorSeverity.CRITICAL,
    actions: ['notify_queen', 'investigate_network']
  },
  {
    metric: 'swarm.drift_alerts',
    operator: '>',
    threshold: 5,
    duration: 0,
    severity: ErrorSeverity.MEDIUM,
    actions: ['trigger_analysis', 'notify_dashboard']
  }
];
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Message bus implementation (in-memory or Redis)
- [ ] State machine for each agent type
- [ ] Memory abstraction layer
- [ ] Heartbeat monitoring

### Phase 2: Coordination
- [ ] Queen GOAP planner
- [ ] Task assignment system
- [ ] Consensus voting engine
- [ ] Conflict resolution

### Phase 3: Resilience
- [ ] Error recovery strategies
- [ ] Circuit breakers
- [ ] Backup and restore
- [ ] Health monitoring

### Phase 4: Optimization
- [ ] Message batching
- [ ] Cache coherence
- [ ] Load balancing
- [ ] Performance profiling

---

## Appendix A: Configuration

```typescript
// config/hive-mind.config.ts
export const HiveMindConfig = {
  swarm: {
    id: 'swarm_1764817168552_tn3max0m8',
    topology: 'mesh',
    max_agents: 5
  },

  messaging: {
    queue_size: 1000,
    message_ttl: 3600,
    retry_attempts: 3,
    retry_backoff: 'exponential'
  },

  consensus: {
    default_quorum: 0.60,
    default_timeout: 60000,
    vote_weights: {
      queen: 2.0,
      specialists: 1.5,
      builders: 1.0
    }
  },

  monitoring: {
    heartbeat_interval: 30000,
    metrics_interval: 10000,
    health_check_interval: 60000
  },

  memory: {
    sync_interval: 10000,
    cache_ttl: 30000,
    backup_interval: 300000
  }
};
```

---

## Appendix B: Message Flow Examples

### Scenario 1: Normal Task Execution

```
1. Queen plans next action (GOAP) -> "scan_repositories"
2. Queen → Scout: TASK_ASSIGN (scan /active-development)
3. Scout → Queen: TASK_ACCEPT
4. Scout → Queen: STATUS_UPDATE (progress: 0.20)
5. Scout → Queen: STATUS_UPDATE (progress: 0.60)
6. Scout discovers new repo
7. Scout → Semantic: DATA_REQUEST (metadata for new repo)
8. Semantic → Scout: DATA_RESPONSE (repo analysis)
9. Scout → Queen: STATUS_UPDATE (progress: 1.0)
10. Scout → Queen: TASK_COMPLETE (manifest attached)
11. Scout → Semantic: RESULT_PUBLISH (new repos found)
12. Semantic begins processing new repos autonomously
```

### Scenario 2: Drift Alert & Consensus

```
1. Semantic analyzing commit -> alignment_score = 0.42
2. Semantic → Queen: ALERT_DRIFT (auth-service, score=0.42)
3. Queen evaluates: 3 drift alerts in last hour
4. Queen initiates consensus: "Prioritize drift analysis?"
5. Queen → ALL: CONSENSUS_REQUEST
6. Scout → Queen: CONSENSUS_VOTE (option: "split_resources", weight: 1.5)
7. Semantic → Queen: CONSENSUS_VOTE (option: "prioritize_drift", weight: 1.5)
8. Dashboard → Queen: CONSENSUS_VOTE (option: "prioritize_drift", weight: 1.0)
9. Skill → Queen: CONSENSUS_VOTE (option: "split_resources", weight: 1.0)
10. Queen tallies: prioritize_drift=2.5, split_resources=2.5 (TIE)
11. Queen uses tiebreaker (strategic priority) -> prioritize_drift WINS
12. Queen → ALL: RESULT_PUBLISH (consensus result)
13. Queen → Semantic: TASK_ASSIGN (analyze all drift alerts)
14. Queen → Scout: RESOURCE_DENY (hold new scans)
```

### Scenario 3: Agent Failure & Recovery

```
1. Semantic processing embeddings
2. Semantic encounters error (OOM)
3. Semantic → ERROR state
4. Semantic attempts recovery: release_resources
5. Recovery fails (state corrupted)
6. Semantic → Queen: ALERT_ERROR (critical, cannot recover)
7. Queen detects: semantic-001 missed 2 heartbeats
8. Queen → Semantic: HEALTH_CHECK
9. No response (timeout)
10. Queen initiates recovery:
    - Marks Semantic as FAILED
    - Redistributes pending tasks to Skill-Creator (temporary)
    - Attempts to restart Semantic
11. Semantic restarts → INITIALIZING
12. Semantic restores state from backup
13. Semantic → Queen: HEARTBEAT (state: IDLE)
14. Queen → Semantic: TASK_ASSIGN (resume processing)
15. Semantic → PROCESSING
16. Queen → Skill-Creator: RESOURCE_GRANT (return to normal duties)
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-03 | HiveMind-Queen | Initial protocol specification |

