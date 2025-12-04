# Hive-Mind Protocol Implementation Guide
## Portfolio Cognitive Command v8.0

**Companion to:** HIVE_MIND_PROTOCOL.md
**Version:** 1.0.0
**Date:** 2025-12-03

---

## Quick Start

### 1. Initialize Swarm with Claude-Flow

```bash
# Initialize mesh topology (already done)
npx claude-flow@alpha swarm init \
  --topology mesh \
  --max-agents 5 \
  --strategy distributed

# Verify swarm status
npx claude-flow@alpha swarm status
```

### 2. Agent Bootstrap Sequence

Each agent must execute this sequence on startup:

```typescript
// Example: Scout-Cartographer bootstrap
import { HiveMindAgent } from './lib/hive-mind-agent';

async function bootstrapScout() {
  const agent = new HiveMindAgent({
    agent_id: 'scout-001',
    role: 'Scout-Cartographer',
    capabilities: ['repo.scan', 'git.analyze', 'manifest.generate'],
    swarm_id: 'swarm_1764817168552_tn3max0m8'
  });

  // 1. Connect to message bus
  await agent.connect();

  // 2. Restore session state (if resuming)
  await agent.restoreSession();

  // 3. Register with Queen
  await agent.sendMessage({
    header: {
      message_type: 'heartbeat',
      recipient_id: 'queen-001',
      priority: Priority.LOW
    },
    body: {
      status: 'idle',
      capabilities: agent.capabilities
    }
  });

  // 4. Start listening for tasks
  agent.startListening();

  console.log('✅ Scout-001 initialized and ready');
}

bootstrapScout().catch(console.error);
```

---

## Core Components

### 1. Message Bus Adapter

```typescript
// lib/message-bus.ts
import { EventEmitter } from 'events';

export interface MessageBus {
  send(message: HiveMindMessage): Promise<void>;
  broadcast(message: HiveMindMessage): Promise<void>;
  subscribe(agent_id: string, handler: MessageHandler): void;
  unsubscribe(agent_id: string): void;
}

export class InMemoryMessageBus implements MessageBus {
  private emitter = new EventEmitter();
  private messageLog: HiveMindMessage[] = [];

  async send(message: HiveMindMessage): Promise<void> {
    this.messageLog.push(message);

    if (message.header.recipient_id === 'ALL') {
      this.emitter.emit('broadcast', message);
    } else {
      this.emitter.emit(message.header.recipient_id, message);
    }
  }

  async broadcast(message: HiveMindMessage): Promise<void> {
    message.header.recipient_id = 'ALL';
    await this.send(message);
  }

  subscribe(agent_id: string, handler: MessageHandler): void {
    this.emitter.on(agent_id, handler);
    this.emitter.on('broadcast', (msg) => {
      if (msg.header.sender_id !== agent_id) {
        handler(msg);
      }
    });
  }

  unsubscribe(agent_id: string): void {
    this.emitter.removeAllListeners(agent_id);
  }

  getMessageHistory(since?: number): HiveMindMessage[] {
    if (since) {
      return this.messageLog.filter(m => m.header.timestamp >= since);
    }
    return [...this.messageLog];
  }
}

// For production: Redis-based message bus
export class RedisMessageBus implements MessageBus {
  private redis: Redis;
  private pubsub: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.pubsub = new Redis(redisUrl);
  }

  async send(message: HiveMindMessage): Promise<void> {
    const channel = message.header.recipient_id === 'ALL'
      ? 'broadcast'
      : `agent:${message.header.recipient_id}`;

    await this.redis.publish(channel, JSON.stringify(message));

    // Store in message log with TTL
    const ttl = message.metadata?.ttl || 3600;
    await this.redis.setex(
      `message:${message.header.message_id}`,
      ttl,
      JSON.stringify(message)
    );
  }

  subscribe(agent_id: string, handler: MessageHandler): void {
    this.pubsub.subscribe(`agent:${agent_id}`, 'broadcast');
    this.pubsub.on('message', (channel, messageStr) => {
      const message = JSON.parse(messageStr);
      if (channel === 'broadcast' && message.header.sender_id === agent_id) {
        return; // Don't process own broadcasts
      }
      handler(message);
    });
  }

  // ... other methods
}
```

### 2. Agent Base Class

```typescript
// lib/hive-mind-agent.ts
import { MessageBus } from './message-bus';
import { StateMachine } from './state-machine';
import { MemoryAdapter } from './memory-adapter';

export interface AgentConfig {
  agent_id: string;
  role: string;
  capabilities: string[];
  swarm_id: string;
}

export abstract class HiveMindAgent {
  protected state: StateMachine;
  protected memory: MemoryAdapter;
  protected messageBus: MessageBus;
  protected sequenceNumber = 0;
  protected heartbeatInterval?: NodeJS.Timeout;

  constructor(protected config: AgentConfig) {
    this.state = new StateMachine(AgentState.INITIALIZING);
    this.memory = new MemoryAdapter(config.agent_id);
    this.messageBus = getMessageBus(); // Singleton
  }

  async connect(): Promise<void> {
    await this.memory.connect();
    this.messageBus.subscribe(this.config.agent_id, this.handleMessage.bind(this));
    this.startHeartbeat();
    this.state.transition(AgentState.IDLE);
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.messageBus.unsubscribe(this.config.agent_id);
    await this.memory.disconnect();
    this.state.transition(AgentState.SHUTDOWN);
  }

  protected async sendMessage(partial: Partial<HiveMindMessage>): Promise<void> {
    const message: HiveMindMessage = {
      header: {
        message_id: this.generateMessageId(),
        timestamp: Date.now(),
        sender_id: this.config.agent_id,
        sequence_number: this.sequenceNumber++,
        ...partial.header
      },
      body: partial.body!,
      metadata: partial.metadata
    };

    await this.messageBus.send(message);
    await this.memory.logMessage('sent', message);
  }

  protected async handleMessage(message: HiveMindMessage): Promise<void> {
    await this.memory.logMessage('received', message);

    switch (message.header.message_type) {
      case MessageType.TASK_ASSIGN:
        await this.handleTaskAssign(message);
        break;
      case MessageType.HEALTH_CHECK:
        await this.handleHealthCheck(message);
        break;
      case MessageType.CONSENSUS_REQUEST:
        await this.handleConsensusRequest(message);
        break;
      // ... other message types
      default:
        console.warn(`Unknown message type: ${message.header.message_type}`);
    }
  }

  protected async handleTaskAssign(message: HiveMindMessage): Promise<void> {
    if (this.state.current !== AgentState.IDLE) {
      await this.sendMessage({
        header: {
          recipient_id: message.header.sender_id,
          message_type: MessageType.TASK_REJECT,
          priority: Priority.HIGH
        },
        body: {
          task_id: message.body.task_id,
          reason: `Agent in ${this.state.current} state`
        },
        metadata: {
          reply_to: message.header.message_id
        }
      });
      return;
    }

    // Accept task
    this.state.transition(AgentState.PROCESSING);
    await this.sendMessage({
      header: {
        recipient_id: message.header.sender_id,
        message_type: MessageType.TASK_ACCEPT,
        priority: Priority.HIGH
      },
      body: {
        task_id: message.body.task_id
      },
      metadata: {
        reply_to: message.header.message_id
      }
    });

    // Execute task (implemented by subclass)
    try {
      const result = await this.executeTask(message.body);

      await this.sendMessage({
        header: {
          recipient_id: message.header.sender_id,
          message_type: MessageType.TASK_COMPLETE,
          priority: Priority.HIGH
        },
        body: {
          task_id: message.body.task_id,
          result
        }
      });
    } catch (error) {
      await this.handleError(error, message.body.task_id);
    } finally {
      this.state.transition(AgentState.IDLE);
    }
  }

  protected abstract executeTask(task: any): Promise<any>;

  protected async handleHealthCheck(message: HiveMindMessage): Promise<void> {
    const health = {
      agent_id: this.config.agent_id,
      state: this.state.current,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      message_queue_depth: this.messageBus.getQueueDepth?.(this.config.agent_id) || 0
    };

    await this.sendMessage({
      header: {
        recipient_id: message.header.sender_id,
        message_type: MessageType.STATUS_UPDATE,
        priority: Priority.LOW
      },
      body: health,
      metadata: {
        reply_to: message.header.message_id
      }
    });
  }

  protected startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.sendMessage({
        header: {
          recipient_id: 'queen-001',
          message_type: MessageType.HEARTBEAT,
          priority: Priority.BACKGROUND
        },
        body: {
          state: this.state.current,
          timestamp: Date.now()
        }
      });
    }, 30000); // 30 seconds
  }

  protected stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  protected generateMessageId(): string {
    return `${this.config.agent_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3. Queen Implementation

```typescript
// agents/queen.ts
import { HiveMindAgent } from '../lib/hive-mind-agent';
import { GOAPPlanner } from '../lib/goap-planner';

export class QueenAgent extends HiveMindAgent {
  private planner: GOAPPlanner;
  private agentHealth = new Map<string, AgentHealthMetrics>();
  private activeTasks = new Map<string, TaskStatus>();
  private consensusVotes = new Map<string, ConsensusVote>();

  constructor() {
    super({
      agent_id: 'queen-001',
      role: 'HiveMind-Queen',
      capabilities: ['coordinate', 'plan', 'resolve', 'allocate'],
      swarm_id: 'swarm_1764817168552_tn3max0m8'
    });

    this.planner = new GOAPPlanner({
      actions: this.getAvailableActions(),
      goals: this.getStrategicGoals()
    });
  }

  async start(): Promise<void> {
    await this.connect();
    this.startPlanningLoop();
    this.startHealthMonitoring();
    console.log('👑 Queen agent started');
  }

  protected async executeTask(task: any): Promise<any> {
    // Queen doesn't execute tasks, only coordinates
    throw new Error('Queen does not execute tasks');
  }

  private startPlanningLoop(): void {
    setInterval(async () => {
      const worldState = await this.getWorldState();
      const goals = this.getStrategicGoals();
      const plan = this.planner.plan(goals, worldState);

      if (plan.length > 0) {
        console.log(`📋 New plan generated: ${plan.length} actions`);
        await this.executePlan(plan);
      }
    }, 10000); // Replan every 10 seconds
  }

  private async executePlan(plan: GOAPAction[]): Promise<void> {
    for (const action of plan) {
      const task: TaskMessage = {
        task_id: this.generateTaskId(),
        task_type: action.name,
        parameters: action.parameters,
        deadline: Date.now() + (action.timeout || 300000)
      };

      await this.assignTask(action.executor, task);
      this.activeTasks.set(task.task_id, {
        task_id: task.task_id,
        status: 'assigned',
        executor: action.executor,
        started_at: Date.now()
      });
    }
  }

  private async assignTask(agent_id: string, task: TaskMessage): Promise<void> {
    await this.sendMessage({
      header: {
        recipient_id: agent_id,
        message_type: MessageType.TASK_ASSIGN,
        priority: Priority.HIGH
      },
      body: task,
      metadata: {
        correlation_id: `workflow-${Date.now()}`
      }
    });
  }

  protected async handleMessage(message: HiveMindMessage): Promise<void> {
    await super.handleMessage(message);

    // Queen-specific message handling
    switch (message.header.message_type) {
      case MessageType.HEARTBEAT:
        this.updateAgentHealth(message.header.sender_id, message.body);
        break;
      case MessageType.ALERT_DRIFT:
        await this.handleDriftAlert(message);
        break;
      case MessageType.CONSENSUS_VOTE:
        await this.handleConsensusVote(message);
        break;
      case MessageType.TASK_COMPLETE:
        this.updateTaskStatus(message.body.task_id, 'completed');
        break;
    }
  }

  private updateAgentHealth(agent_id: string, health: any): void {
    this.agentHealth.set(agent_id, {
      agent_id,
      last_heartbeat: Date.now(),
      state: health.state,
      ...health
    });
  }

  private async handleDriftAlert(message: HiveMindMessage): Promise<void> {
    const alert = message.body;
    console.log(`🚨 Drift alert: ${alert.project} (score: ${alert.alignment_score})`);

    // Check if we need consensus
    const recentAlerts = this.countRecentDriftAlerts();
    if (recentAlerts >= 3) {
      await this.initiateConsensus({
        question: 'Should we prioritize drift analysis over new scans?',
        options: ['prioritize_drift', 'continue_scans', 'split_resources'],
        timeout: 60000
      });
    }
  }

  private async initiateConsensus(request: ConsensusRequest): Promise<void> {
    const vote: ConsensusVote = {
      vote_id: this.generateVoteId(),
      question: request.question,
      options: request.options,
      voters: Array.from(this.agentHealth.keys()),
      votes: new Map(),
      weights: this.calculateVoteWeights(),
      deadline: Date.now() + request.timeout,
      quorum: 0.60,
      status: 'pending'
    };

    this.consensusVotes.set(vote.vote_id, vote);

    await this.sendMessage({
      header: {
        recipient_id: 'ALL',
        message_type: MessageType.CONSENSUS_REQUEST,
        priority: Priority.HIGH
      },
      body: vote
    });

    // Set timeout to tally votes
    setTimeout(() => this.tallyVotes(vote.vote_id), request.timeout);
  }

  private async handleConsensusVote(message: HiveMindMessage): Promise<void> {
    const { vote_id, option } = message.body;
    const vote = this.consensusVotes.get(vote_id);

    if (!vote || vote.status !== 'pending') {
      return;
    }

    vote.votes.set(message.header.sender_id, option);

    // Check if we have quorum
    const totalWeight = Array.from(vote.weights.values()).reduce((a, b) => a + b, 0);
    const votedWeight = Array.from(vote.votes.keys())
      .map(id => vote.weights.get(id) || 0)
      .reduce((a, b) => a + b, 0);

    if (votedWeight / totalWeight >= vote.quorum) {
      await this.tallyVotes(vote_id);
    }
  }

  private async tallyVotes(vote_id: string): Promise<void> {
    const vote = this.consensusVotes.get(vote_id);
    if (!vote || vote.status !== 'pending') return;

    const tally = new Map<string, number>();
    for (const [agent_id, option] of vote.votes) {
      const weight = vote.weights.get(agent_id) || 0;
      tally.set(option, (tally.get(option) || 0) + weight);
    }

    const sorted = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0][0];

    vote.status = 'passed';

    await this.sendMessage({
      header: {
        recipient_id: 'ALL',
        message_type: MessageType.RESULT_PUBLISH,
        priority: Priority.HIGH
      },
      body: {
        vote_id,
        result: winner,
        tally: Object.fromEntries(tally)
      }
    });

    console.log(`📊 Consensus reached: ${winner}`);
    await this.executeConsensusDecision(winner, vote);
  }

  private calculateVoteWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    weights.set('queen-001', 2.0);
    weights.set('scout-001', 1.5);
    weights.set('semantic-001', 1.5);
    weights.set('dashboard-001', 1.0);
    weights.set('skill-001', 1.0);
    return weights;
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [agent_id, health] of this.agentHealth) {
        if (now - health.last_heartbeat > timeout) {
          console.warn(`⚠️  Agent ${agent_id} missed heartbeat`);
          this.handleAgentFailure(agent_id);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async handleAgentFailure(agent_id: string): Promise<void> {
    console.error(`❌ Agent ${agent_id} failed`);

    // Reassign active tasks
    for (const [task_id, status] of this.activeTasks) {
      if (status.executor === agent_id && status.status !== 'completed') {
        console.log(`🔄 Reassigning task ${task_id}`);
        // Find alternative agent (implementation depends on task type)
        // For now, just mark as failed
        this.activeTasks.set(task_id, {
          ...status,
          status: 'failed',
          error: 'Agent failure'
        });
      }
    }
  }

  private getAvailableActions(): GOAPAction[] {
    return [
      {
        name: 'scan_repositories',
        preconditions: [{ key: 'scout.state', value: 'idle' }],
        effects: [
          { key: 'portfolio_coverage', delta: 10 },
          { key: 'data_freshness', set: 0 }
        ],
        cost: 5,
        executor: 'scout-001'
      },
      {
        name: 'analyze_semantics',
        preconditions: [
          { key: 'semantic.state', value: 'idle' },
          { key: 'new_commits', operator: '>', value: 0 }
        ],
        effects: [{ key: 'analyzed_commits', delta: 5 }],
        cost: 3,
        executor: 'semantic-001'
      },
      {
        name: 'generate_dashboard',
        preconditions: [
          { key: 'dashboard.state', value: 'idle' },
          { key: 'portfolio_coverage', operator: '>', value: 50 }
        ],
        effects: [{ key: 'dashboard_freshness', set: 0 }],
        cost: 2,
        executor: 'dashboard-001'
      }
    ];
  }

  private getStrategicGoals(): QueenGoals {
    return {
      portfolio_coverage: { target: 100, current: 80, priority: 10 },
      drift_alerts: { target: 0, current: 3, priority: 9 },
      data_freshness: { target: 1, current: 4, priority: 7 },
      agent_utilization: { target: 75, current: 60, priority: 5 }
    };
  }

  private async getWorldState(): Promise<WorldState> {
    // Gather current state from all agents
    const state: WorldState = {
      'scout.state': this.agentHealth.get('scout-001')?.state || 'unknown',
      'semantic.state': this.agentHealth.get('semantic-001')?.state || 'unknown',
      'dashboard.state': this.agentHealth.get('dashboard-001')?.state || 'unknown',
      'portfolio_coverage': await this.memory.get('metrics.coverage') || 0,
      'drift_alerts': await this.memory.get('metrics.drift_alerts') || 0,
      'data_freshness': await this.memory.get('metrics.data_freshness') || 0
    };

    return state;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVoteId(): string {
    return `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. Scout Implementation

```typescript
// agents/scout.ts
import { HiveMindAgent } from '../lib/hive-mind-agent';
import { scanRepos } from '../skills/repo-scanner';

export class ScoutAgent extends HiveMindAgent {
  constructor() {
    super({
      agent_id: 'scout-001',
      role: 'Scout-Cartographer',
      capabilities: ['repo.scan', 'git.analyze', 'manifest.generate'],
      swarm_id: 'swarm_1764817168552_tn3max0m8'
    });
  }

  async start(): Promise<void> {
    await this.connect();
    console.log('🔍 Scout agent started');
  }

  protected async executeTask(task: any): Promise<any> {
    switch (task.task_type) {
      case 'repo.scan':
        return await this.scanRepositories(task.parameters);
      case 'git.analyze':
        return await this.analyzeGitHistory(task.parameters);
      case 'manifest.generate':
        return await this.generateManifest(task.parameters);
      default:
        throw new Error(`Unknown task type: ${task.task_type}`);
    }
  }

  private async scanRepositories(params: any): Promise<any> {
    const { scan_dir, max_depth, batch_size } = params;

    // Hook into existing repo-scanner skill
    const repos = await scanRepos(scan_dir, max_depth);

    // Send progress updates
    let processed = 0;
    for (const repo of repos) {
      processed++;

      if (processed % 5 === 0) {
        await this.sendProgressUpdate(processed / repos.length);
      }

      // Notify semantic processor of new repo
      if (repo.status === 'ACTIVE') {
        await this.sendMessage({
          header: {
            recipient_id: 'semantic-001',
            message_type: MessageType.DATA_REQUEST,
            priority: Priority.MEDIUM
          },
          body: {
            repo_name: repo.name,
            repo_path: repo.path,
            recent_commits: repo.last_commits
          }
        });
      }
    }

    // Save manifest to memory
    await this.memory.set('latest_manifest', repos);

    return {
      repos_scanned: repos.length,
      active: repos.filter(r => r.status === 'ACTIVE').length,
      dormant: repos.filter(r => r.status === 'DORMANT').length
    };
  }

  private async sendProgressUpdate(progress: number): Promise<void> {
    await this.sendMessage({
      header: {
        recipient_id: 'queen-001',
        message_type: MessageType.STATUS_UPDATE,
        priority: Priority.LOW
      },
      body: {
        progress,
        state: this.state.current
      }
    });
  }

  // ... other methods
}
```

---

## Claude-Flow Integration

### Hooks Setup

```bash
# Enable pre-task hooks (auto-assign, validate, prepare)
npx claude-flow@alpha hooks enable pre-task

# Enable post-task hooks (format, train, update memory)
npx claude-flow@alpha hooks enable post-task

# Enable session hooks (summaries, restore, metrics)
npx claude-flow@alpha hooks enable session
```

### Memory Operations via Hooks

```typescript
// Every agent MUST use hooks for coordination

// BEFORE starting work
async function beforeTask(description: string) {
  await exec('npx claude-flow@alpha hooks pre-task --description "${description}"');
  await exec('npx claude-flow@alpha hooks session-restore --session-id "swarm-${swarmId}"');
}

// DURING work (after each significant edit)
async function afterEdit(file: string, step: string) {
  await exec(`npx claude-flow@alpha hooks post-edit --file "${file}" --memory-key "swarm/${agentId}/${step}"`);
  await exec(`npx claude-flow@alpha hooks notify --message "${step} completed"`);
}

// AFTER completing work
async function afterTask(taskId: string) {
  await exec(`npx claude-flow@alpha hooks post-task --task-id "${taskId}"`);
  await exec('npx claude-flow@alpha hooks session-end --export-metrics true');
}
```

### Example: Scout with Hooks

```typescript
// agents/scout-with-hooks.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ScoutAgentWithHooks extends ScoutAgent {
  protected async executeTask(task: any): Promise<any> {
    // PRE-TASK HOOKS
    await execAsync(`npx claude-flow@alpha hooks pre-task --description "${task.task_type}"`);
    await execAsync('npx claude-flow@alpha hooks session-restore --session-id "swarm_1764817168552_tn3max0m8"');

    try {
      const result = await super.executeTask(task);

      // POST-TASK HOOKS
      await execAsync(`npx claude-flow@alpha hooks post-task --task-id "${task.task_id}"`);
      await execAsync('npx claude-flow@alpha hooks notify --message "Scan complete"');

      return result;
    } catch (error) {
      await execAsync(`npx claude-flow@alpha hooks notify --message "Scan failed: ${error.message}"`);
      throw error;
    }
  }

  private async scanRepositories(params: any): Promise<any> {
    const repos = await scanRepos(params.scan_dir, params.max_depth);

    // DURING HOOKS (after each batch)
    for (let i = 0; i < repos.length; i += 5) {
      const batch = repos.slice(i, i + 5);

      // Process batch...

      // Save to memory via hook
      await execAsync(
        `npx claude-flow@alpha hooks post-edit ` +
        `--file "manifest.json" ` +
        `--memory-key "swarm/scout-001/batch-${i/5}"`
      );
    }

    return { repos_scanned: repos.length };
  }
}
```

---

## Testing & Validation

### Unit Tests

```typescript
// tests/hive-mind.test.ts
import { QueenAgent } from '../agents/queen';
import { ScoutAgent } from '../agents/scout';
import { InMemoryMessageBus } from '../lib/message-bus';

describe('Hive-Mind Protocol', () => {
  let queen: QueenAgent;
  let scout: ScoutAgent;
  let messageBus: InMemoryMessageBus;

  beforeEach(async () => {
    messageBus = new InMemoryMessageBus();
    queen = new QueenAgent();
    scout = new ScoutAgent();

    await queen.connect();
    await scout.connect();
  });

  afterEach(async () => {
    await queen.disconnect();
    await scout.disconnect();
  });

  test('Queen assigns task to Scout', async () => {
    const task = {
      task_id: 'test-001',
      task_type: 'repo.scan',
      parameters: { scan_dir: '/test', max_depth: 2 }
    };

    await queen.assignTask('scout-001', task);

    // Wait for Scout to process
    await new Promise(resolve => setTimeout(resolve, 100));

    const messages = messageBus.getMessageHistory();
    const acceptMsg = messages.find(m => m.header.message_type === 'task.accept');

    expect(acceptMsg).toBeDefined();
    expect(acceptMsg?.header.sender_id).toBe('scout-001');
  });

  test('Consensus voting works correctly', async () => {
    await queen.initiateConsensus({
      question: 'Test vote?',
      options: ['yes', 'no'],
      timeout: 5000
    });

    // Simulate votes
    await scout.sendMessage({
      header: {
        recipient_id: 'queen-001',
        message_type: 'consensus.vote'
      },
      body: { vote_id: 'vote-001', option: 'yes' }
    });

    // ... verify tally
  });
});
```

### Integration Tests

```bash
# Start all agents
npm run start:swarm

# Run integration tests
npm run test:integration

# Expected output:
# ✅ Queen initialized
# ✅ Scout initialized
# ✅ Semantic initialized
# ✅ Dashboard initialized
# ✅ Skill initialized
# ✅ All agents connected to message bus
# ✅ Task assignment: Scout scanning repos
# ✅ Drift alert: Semantic detected low alignment
# ✅ Consensus vote: Prioritize drift analysis
# ✅ Dashboard generated successfully
```

---

## Performance Optimization

### Message Batching

```typescript
class BatchingMessageBus implements MessageBus {
  private batchQueue: HiveMindMessage[] = [];
  private flushInterval = 100; // milliseconds

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  async send(message: HiveMindMessage): Promise<void> {
    if (message.header.priority >= Priority.HIGH) {
      // Send immediately
      await this.sendImmediately(message);
    } else {
      // Batch low-priority messages
      this.batchQueue.push(message);

      if (this.batchQueue.length >= 10) {
        await this.flush();
      }
    }
  }

  private async flush(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    await this.sendBatch(batch);
  }
}
```

### Caching Strategy

```typescript
class CachedMemoryAdapter extends MemoryAdapter {
  private cache = new Map<string, CacheEntry>();
  private ttl = 30000; // 30 seconds

  async get(key: string): Promise<any> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }

    const value = await super.get(key);
    this.cache.set(key, { value, timestamp: Date.now() });

    return value;
  }

  async set(key: string, value: any): Promise<void> {
    await super.set(key, value);
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}
```

---

## Deployment

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  queen:
    build: .
    command: npm run start:queen
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_ID=queen-001
    depends_on:
      - redis

  scout:
    build: .
    command: npm run start:scout
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_ID=scout-001
    depends_on:
      - redis

  semantic:
    build: .
    command: npm run start:semantic
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_ID=semantic-001
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis

  dashboard:
    build: .
    command: npm run start:dashboard
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_ID=dashboard-001
    depends_on:
      - redis

  skill:
    build: .
    command: npm run start:skill
    environment:
      - REDIS_URL=redis://redis:6379
      - AGENT_ID=skill-001
    depends_on:
      - redis
```

### Kubernetes (Production)

```yaml
# k8s/swarm-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pcc-swarm
spec:
  replicas: 5
  selector:
    matchLabels:
      app: pcc-swarm
  template:
    metadata:
      labels:
        app: pcc-swarm
    spec:
      containers:
      - name: queen
        image: pcc:latest
        command: ["npm", "run", "start:queen"]
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: AGENT_ID
          value: "queen-001"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      # ... other agents
```

---

## Monitoring Dashboard

```typescript
// monitoring/dashboard.ts
import express from 'express';

const app = express();

app.get('/metrics', async (req, res) => {
  const metrics = {
    swarm: {
      id: 'swarm_1764817168552_tn3max0m8',
      agents: await getAgentMetrics(),
      messages: await getMessageMetrics(),
      tasks: await getTaskMetrics()
    }
  };

  res.json(metrics);
});

app.get('/health', async (req, res) => {
  const health = {
    queen: await checkAgentHealth('queen-001'),
    scout: await checkAgentHealth('scout-001'),
    semantic: await checkAgentHealth('semantic-001'),
    dashboard: await checkAgentHealth('dashboard-001'),
    skill: await checkAgentHealth('skill-001')
  };

  const allHealthy = Object.values(health).every(h => h.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json(health);
});

app.listen(3000, () => {
  console.log('📊 Monitoring dashboard: http://localhost:3000');
});
```

---

## Troubleshooting

### Common Issues

**1. Agent not receiving messages**
```bash
# Check message bus connection
npx claude-flow@alpha swarm status

# Verify agent is subscribed
redis-cli PUBSUB CHANNELS

# Expected: agent:scout-001, agent:queen-001, etc.
```

**2. Consensus timeout**
```bash
# Check vote participation
redis-cli GET vote:vote-001

# Verify agent weights
redis-cli HGETALL vote:weights
```

**3. Memory sync issues**
```bash
# Force memory sync
npx claude-flow@alpha hooks session-restore --force

# Clear stale cache
redis-cli FLUSHDB
```

---

## Next Steps

1. **Implement remaining agents** (Semantic, Dashboard, Skill)
2. **Add GOAP planner** to Queen
3. **Set up Redis** for production message bus
4. **Deploy to Docker** for local testing
5. **Add monitoring** and alerting
6. **Performance testing** with realistic workloads

---

## Resources

- [HIVE_MIND_PROTOCOL.md](./HIVE_MIND_PROTOCOL.md) - Complete protocol specification
- [Claude-Flow Docs](https://github.com/ruvnet/claude-flow)
- [GOAP Tutorial](https://gamedevelopment.tutsplus.com/goal-oriented-action-planning-for-a-smarter-ai--cms-20793t)

