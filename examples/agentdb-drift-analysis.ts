/**
 * AgentDB Drift Analysis Example
 * Demonstrates drift detection and alert management
 */

import {
  createAgentDB,
  AgentState,
  SessionState,
  AnalysisResult,
  DriftAlert,
  DriftSeverity,
} from '../src/agentdb';
import { createMockMCPAdapter } from '../src/agentdb/mcp-adapter';
import { detectDrift, DriftResult } from '../src/skills/drift-detector';

async function driftAnalysisExample() {
  console.log('=== AgentDB Drift Analysis Example ===\n');

  // Initialize database
  const { adapter } = createMockMCPAdapter();
  const db = createAgentDB('./memory', adapter, {
    enabled: true,
    strategy: 'merge',
    conflictResolution: 'latest',
    autoSync: false,
  });

  // 1. Create drift detector agent
  console.log('--- Creating Drift Detector Agent ---');
  const detector: AgentState = {
    id: 'agent-002',
    collection: 'agents',
    agentId: 'detector-001',
    role: 'detector',
    name: 'Drift Detector',
    status: 'active',
    capabilities: [
      {
        name: 'drift-detection',
        version: '1.0.0',
        parameters: { threshold: 0.7 },
      },
    ],
    config: { alertOnMedium: true },
    tasksCompleted: 0,
    tasksFailedCount: 0,
    averageExecutionTime: 0,
    sessionIds: [],
    skillIds: ['drift-detector'],
    lastActivity: new Date(),
    tags: ['detector', 'drift'],
    customData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.saveAgent(detector);
  console.log(`✓ Agent created: ${detector.name}\n`);

  // 2. Create analysis session
  console.log('--- Creating Analysis Session ---');
  const session: SessionState = {
    id: 'session-002',
    collection: 'sessions',
    sessionId: 'drift-analysis-2025-12-03',
    name: 'Drift Analysis Session',
    description: 'Analyzing repository for intent-implementation drift',
    status: 'active',
    startedAt: new Date(),
    agentIds: ['agent-002'],
    repository: 'portfolio-repo-a',
    branch: 'main',
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
    tags: ['drift', 'analysis'],
    customData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.createSession(session);
  console.log(`✓ Session created: ${session.name}\n`);

  // 3. Simulate drift detection on multiple commits
  console.log('--- Detecting Drift ---');
  const testCases = [
    {
      intent: 'Add user authentication with JWT tokens',
      implementation: 'src/auth/jwt.ts\nsrc/middleware/auth.ts\nImplemented JWT authentication',
      expectedSeverity: 'low' as DriftSeverity,
    },
    {
      intent: 'Implement shopping cart functionality',
      implementation: 'src/database/schema.sql\nAltered user table structure',
      expectedSeverity: 'high' as DriftSeverity,
    },
    {
      intent: 'Add API rate limiting',
      implementation: 'src/api/ratelimit.ts\nImplemented rate limiter middleware',
      expectedSeverity: 'low' as DriftSeverity,
    },
    {
      intent: 'Create user profile page',
      implementation: 'src/api/endpoints.ts\nModified database queries',
      expectedSeverity: 'critical' as DriftSeverity,
    },
  ];

  const alerts: DriftAlert[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const startTime = Date.now();

    // Perform drift detection
    const driftResult: DriftResult = await detectDrift(
      testCase.intent,
      testCase.implementation
    );

    const executionTime = Date.now() - startTime;

    // Determine severity
    let severity: DriftSeverity;
    if (driftResult.alignmentScore >= 0.8) {
      severity = 'low';
    } else if (driftResult.alignmentScore >= 0.7) {
      severity = 'medium';
    } else if (driftResult.alignmentScore >= 0.5) {
      severity = 'high';
    } else {
      severity = 'critical';
    }

    console.log(`  Drift Check ${i + 1}:`);
    console.log(`    Intent: ${testCase.intent}`);
    console.log(`    Alignment: ${(driftResult.alignmentScore * 100).toFixed(1)}%`);
    console.log(`    Severity: ${severity.toUpperCase()}`);
    console.log(`    Alert: ${driftResult.driftAlert ? 'YES' : 'NO'}`);

    // Create drift alert if necessary
    if (driftResult.driftAlert) {
      const alert: DriftAlert = {
        id: `alert-${String(i + 1).padStart(3, '0')}`,
        collection: 'driftAlerts',
        alertId: `drift-alert-${Date.now()}-${i}`,
        repository: session.repository!,
        driftResult,
        severity,
        intentSummary: testCase.intent,
        implementationSummary: testCase.implementation,
        commitRange: `commit-${i + 1}`,
        acknowledged: false,
        resolved: false,
        recommendations: [
          severity === 'critical'
            ? 'CRITICAL: Major drift detected. Immediate review required.'
            : severity === 'high'
            ? 'WARNING: Significant drift. Review implementation against intent.'
            : 'NOTICE: Minor drift detected. Consider alignment check.',
        ],
        actionsTaken: [],
        detectedBy: detector.agentId,
        detectedAt: new Date(),
        sessionId: session.sessionId,
        tags: ['drift', severity],
        customData: { testCaseIndex: i },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      await db.createDriftAlert(alert);
      alerts.push(alert);
      console.log(`    ✓ Alert created: ${alert.alertId}`);
    }

    // Record task execution
    await db.recordAgentTaskCompletion('agent-002', true, executionTime);

    console.log();
  }

  // 4. Get drift alert statistics
  console.log('--- Drift Alert Statistics ---');
  const stats = await db.queryBuilder.getDriftAlertStats(session.repository);
  console.log(`✓ Total alerts: ${stats.total}`);
  console.log(`✓ By severity:`);
  console.log(`  - Low: ${stats.bySeverity.low}`);
  console.log(`  - Medium: ${stats.bySeverity.medium}`);
  console.log(`  - High: ${stats.bySeverity.high}`);
  console.log(`  - Critical: ${stats.bySeverity.critical}`);
  console.log(`✓ Acknowledged: ${stats.acknowledged}`);
  console.log(`✓ Resolved: ${stats.resolved}`);
  console.log(`✓ Critical unresolved: ${stats.criticalUnresolved}\n`);

  // 5. Get unacknowledged alerts
  console.log('--- Unacknowledged Alerts ---');
  const unacknowledged = await db.getUnacknowledgedAlerts();
  console.log(`✓ Found ${unacknowledged.documents.length} unacknowledged alerts\n`);

  // 6. Get critical alerts
  console.log('--- Critical Alerts ---');
  const critical = await db.queryBuilder.getCriticalUnresolvedAlerts();
  console.log(`✓ Found ${critical.documents.length} critical unresolved alerts`);
  for (const alert of critical.documents) {
    console.log(`  - ${alert.alertId}: ${alert.intentSummary}`);
    console.log(`    Alignment: ${(alert.driftResult.alignmentScore * 100).toFixed(1)}%`);
  }
  console.log();

  // 7. Acknowledge and resolve alerts
  console.log('--- Managing Alerts ---');
  for (const alert of alerts) {
    // Acknowledge alert
    await db.acknowledgeDriftAlert(alert.id, 'admin-user');
    console.log(`✓ Acknowledged: ${alert.alertId}`);

    // Resolve non-critical alerts
    if (alert.severity !== 'critical') {
      await db.resolveDriftAlert(alert.id);
      console.log(`  ✓ Resolved: ${alert.alertId}`);
    }
  }
  console.log();

  // 8. Create analysis result
  console.log('--- Creating Analysis Result ---');
  const analysis: AnalysisResult = {
    id: 'analysis-001',
    collection: 'analyses',
    analysisId: 'drift-analysis-001',
    sessionId: session.sessionId,
    analysisType: 'drift',
    repositories: [session.repository!],
    totalRepositories: 1,
    totalCommits: testCases.length,
    processingTime: testCases.length * 2500, // Estimated
    status: 'completed',
    performedBy: detector.agentId,
    performedAt: new Date(),
    tags: ['drift', 'alignment'],
    customData: {
      alertsGenerated: alerts.length,
      averageAlignment:
        alerts.reduce((sum, a) => sum + a.driftResult.alignmentScore, 0) /
        alerts.length,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  await db.saveAnalysis(analysis);
  console.log(`✓ Analysis saved: ${analysis.analysisId}`);
  console.log(`  - Commits analyzed: ${analysis.totalCommits}`);
  console.log(`  - Alerts generated: ${alerts.length}`);
  console.log(`  - Processing time: ${analysis.processingTime}ms\n`);

  // 9. Get repository dashboard
  console.log('--- Repository Dashboard ---');
  const dashboard = await db.getRepositoryDashboard(session.repository!);
  console.log(`✓ Repository: ${session.repository}`);
  console.log(`✓ Latest analysis: ${dashboard.latestAnalysis?.analysisType || 'none'}`);
  console.log(`✓ Drift alerts: ${dashboard.driftAlerts.length}`);
  console.log(`✓ Sessions: ${dashboard.sessions.length}`);
  console.log(`✓ Alert statistics:`);
  console.log(`  - Total: ${dashboard.alertStats.total}`);
  console.log(`  - Critical unresolved: ${dashboard.alertStats.criticalUnresolved}\n`);

  // 10. Complete session
  console.log('--- Completing Session ---');
  await db.updateSessionStatus('session-002', 'completed');
  console.log(`✓ Session completed\n`);

  // 11. Cleanup
  db.destroy();
  console.log('✓ Database cleaned up\n');

  console.log('=== Example Complete ===');
}

// Run the example
if (require.main === module) {
  driftAnalysisExample().catch((error) => {
    console.error('Example failed:', error);
    process.exit(1);
  });
}

export { driftAnalysisExample };
