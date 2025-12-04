/**
 * AgentDB Basic Usage Example
 * Demonstrates core CRUD operations and common patterns
 */

import { createAgentDB, AgentState, SessionState, WorldState } from '../src/agentdb';
import { createMockMCPAdapter } from '../src/agentdb/mcp-adapter';

async function basicUsageExample() {
  console.log('=== AgentDB Basic Usage Example ===\n');

  // 1. Create database instance with mock MCP adapter
  const { adapter } = createMockMCPAdapter();
  const db = createAgentDB('./memory', adapter, {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'latest',
    autoSync: false, // Manual sync for demo
  });

  console.log('✓ Database initialized\n');

  // 2. Create and save an agent
  console.log('--- Creating Agent ---');
  const agent: AgentState = {
    id: 'agent-001',
    collection: 'agents',
    agentId: 'scanner-001',
    role: 'scanner',
    name: 'Repository Scanner',
    status: 'idle',
    capabilities: [
      {
        name: 'repo-scan',
        version: '1.0.0',
        parameters: { depth: 3, includeHidden: false },
      },
    ],
    config: {
      scanDepth: 3,
      maxConcurrency: 5,
    },
    tasksCompleted: 0,
    tasksFailedCount: 0,
    averageExecutionTime: 0,
    sessionIds: [],
    skillIds: ['repo-scanner'],
    lastActivity: new Date(),
    tags: ['scanner', 'repository'],
    customData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.saveAgent(agent);
  console.log(`✓ Agent saved: ${agent.name} (${agent.agentId})\n`);

  // 3. Update agent status
  console.log('--- Updating Agent Status ---');
  await db.updateAgentStatus('agent-001', 'active', 'Scanning repositories');
  const updatedAgent = await db.getAgent('agent-001');
  console.log(`✓ Agent status: ${updatedAgent?.status}`);
  console.log(`✓ Current task: ${updatedAgent?.currentTask}\n`);

  // 4. Create a session
  console.log('--- Creating Session ---');
  const session: SessionState = {
    id: 'session-001',
    collection: 'sessions',
    sessionId: 'scan-2025-12-03',
    name: 'Portfolio Analysis Session',
    description: 'Comprehensive analysis of portfolio repositories',
    status: 'active',
    startedAt: new Date(),
    agentIds: ['agent-001'],
    decisions: [],
    conversationSummary: 'Initial session for portfolio analysis',
    metrics: {
      duration: 0,
      agentsUsed: 1,
      tasksCompleted: 0,
      filesModified: 0,
    },
    worldStateIds: [],
    analysisIds: [],
    artifactPaths: [],
    tags: ['analysis', 'portfolio'],
    customData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.createSession(session);
  console.log(`✓ Session created: ${session.name}\n`);

  // 5. Add a decision to the session
  console.log('--- Recording Decision ---');
  await db.addSessionDecision('session-001', {
    timestamp: new Date(),
    description: 'Use semantic clustering for repository analysis',
    rationale: 'Provides better accuracy than keyword-based matching',
    outcome: 'Selected semantic-analyzer skill',
  });
  const updatedSession = await db.getSession('session-001');
  console.log(`✓ Decision recorded: ${updatedSession?.decisions[0].description}\n`);

  // 6. Create world state
  console.log('--- Creating World State ---');
  const worldState: WorldState = {
    id: 'ws-001',
    collection: 'worldStates',
    worldStateId: 'initial-state',
    sessionId: 'session-001',
    snapshotName: 'Initial Scan State',
    facts: [
      {
        key: 'repositories_scanned',
        value: 0,
        confidence: 1.0,
        source: 'scanner-001',
        timestamp: new Date(),
      },
      {
        key: 'total_repositories',
        value: 10,
        confidence: 1.0,
        source: 'system',
        timestamp: new Date(),
      },
      {
        key: 'scan_in_progress',
        value: true,
        confidence: 1.0,
        source: 'scanner-001',
        timestamp: new Date(),
      },
    ],
    goals: [
      {
        description: 'Scan all repositories',
        priority: 10,
        satisfied: false,
        preconditions: { repositories_available: true },
        effects: { all_repositories_scanned: true },
      },
      {
        description: 'Detect drift in implementations',
        priority: 8,
        satisfied: false,
        preconditions: { repositories_scanned: true },
        effects: { drift_detected: true },
      },
    ],
    timestamp: new Date(),
    changedFacts: [],
    tags: ['initial', 'scan'],
    customData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.saveWorldState(worldState);
  console.log(`✓ World state created: ${worldState.snapshotName}`);
  console.log(`  - Facts: ${worldState.facts.length}`);
  console.log(`  - Goals: ${worldState.goals.length}\n`);

  // 7. Simulate task execution
  console.log('--- Simulating Task Execution ---');
  for (let i = 1; i <= 5; i++) {
    const success = Math.random() > 0.2; // 80% success rate
    const executionTime = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds

    await db.recordAgentTaskCompletion('agent-001', success, executionTime);

    // Update world state
    await db.updateWorldStateFacts('ws-001', [
      {
        key: 'repositories_scanned',
        value: i,
        confidence: 1.0,
        source: 'scanner-001',
        timestamp: new Date(),
      },
    ]);

    console.log(`  Task ${i}: ${success ? 'SUCCESS' : 'FAILED'} (${executionTime}ms)`);
  }

  const finalAgent = await db.getAgent('agent-001');
  console.log(`\n✓ Tasks completed: ${finalAgent?.tasksCompleted}`);
  console.log(`✓ Tasks failed: ${finalAgent?.tasksFailedCount}`);
  console.log(`✓ Average execution time: ${Math.round(finalAgent?.averageExecutionTime || 0)}ms\n`);

  // 8. Query operations
  console.log('--- Query Operations ---');

  // Get active agents
  const activeAgents = await db.queryBuilder.getActiveAgents();
  console.log(`✓ Active agents: ${activeAgents.documents.length}`);

  // Get latest world state
  const latestWS = await db.getLatestWorldState('session-001');
  console.log(`✓ Latest world state: ${latestWS?.snapshotName}`);
  console.log(`  - Repositories scanned: ${latestWS?.facts.find(f => f.key === 'repositories_scanned')?.value}\n`);

  // 9. Complete session
  console.log('--- Completing Session ---');
  await db.updateSessionStatus('session-001', 'completed');
  const completedSession = await db.getSession('session-001');
  console.log(`✓ Session status: ${completedSession?.status}`);
  console.log(`✓ Session ended at: ${completedSession?.endedAt}\n`);

  // 10. Get session context (all related data)
  console.log('--- Getting Session Context ---');
  const context = await db.getSessionContext('session-001');
  console.log(`✓ Session: ${context.session?.name}`);
  console.log(`✓ Agents: ${context.agents.length}`);
  console.log(`✓ World States: ${context.worldStates.length}`);
  console.log(`✓ Analyses: ${context.analyses.length}`);
  console.log(`✓ Drift Alerts: ${context.driftAlerts.length}`);
  console.log(`✓ Metrics: ${context.metrics.length}\n`);

  // 11. Sync with MCP memory
  console.log('--- Syncing with MCP Memory ---');
  const syncResult = await db.syncAll();
  if (syncResult) {
    console.log(`✓ Synced documents: ${syncResult.synced}`);
    console.log(`✓ Conflicts: ${syncResult.conflicts}`);
    console.log(`✓ Errors: ${syncResult.errors.length}\n`);
  }

  // 12. Cleanup
  db.destroy();
  console.log('✓ Database cleaned up\n');

  console.log('=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export { basicUsageExample };
