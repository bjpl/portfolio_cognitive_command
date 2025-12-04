/**
 * Unit Tests for AgentDB Query Builder Module
 * Tests QueryBuilder implementation with comprehensive coverage
 */

import { QueryBuilder } from '../../src/agentdb/queries';
import { StorageBackend } from '../../src/agentdb/storage';
import {
  AgentState,
  SessionState,
  AnalysisResult,
  DriftAlert,
  WorldState,
  SkillRegistration,
  MetricsDocument,
  QueryResult,
  AgentRole,
  AgentStatus,
  SessionStatus,
  DriftSeverity,
  AgentCapability,
  SkillType,
} from '../../src/agentdb/types';

// Helper to create test agent
function createTestAgent(overrides: Partial<AgentState> = {}): AgentState {
  return {
    id: `agent-${Date.now()}`,
    collection: 'agents',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    agentId: `agent-${Date.now()}`,
    role: 'scanner' as AgentRole,
    name: 'Test Agent',
    status: 'idle' as AgentStatus,
    lastActivity: new Date('2025-01-01T00:00:00Z'),
    capabilities: [],
    config: {},
    tasksCompleted: 10,
    tasksFailedCount: 2,
    averageExecutionTime: 500,
    sessionIds: [],
    skillIds: [],
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test session
function createTestSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: `session-${Date.now()}`,
    collection: 'sessions',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    sessionId: `session-${Date.now()}`,
    name: 'Test Session',
    description: 'Test description',
    status: 'active' as SessionStatus,
    startedAt: new Date('2025-01-01T00:00:00Z'),
    agentIds: [],
    decisions: [],
    conversationSummary: '',
    metrics: {
      duration: 0,
      agentsUsed: 0,
      tasksCompleted: 0,
      filesModified: 0,
    },
    worldStateIds: [],
    analysisIds: [],
    artifactPaths: [],
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test analysis
function createTestAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: `analysis-${Date.now()}`,
    collection: 'analyses',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    analysisId: `analysis-${Date.now()}`,
    sessionId: 'session-1',
    analysisType: 'semantic',
    repositories: ['test-repo'],
    totalRepositories: 1,
    totalCommits: 100,
    processingTime: 1000,
    status: 'completed',
    performedBy: 'agent-1',
    performedAt: new Date('2025-01-01T00:00:00Z'),
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test drift alert
function createTestDriftAlert(overrides: Partial<DriftAlert> = {}): DriftAlert {
  return {
    id: `alert-${Date.now()}`,
    collection: 'driftAlerts',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    alertId: `alert-${Date.now()}`,
    repository: 'test-repo',
    driftResult: {
      alignmentScore: 0.75,
      driftAlert: true,
      highPrecision: true,
      intentVector: [0.1, 0.2, 0.3],
      implementationVector: [0.4, 0.5, 0.6],
    },
    severity: 'medium' as DriftSeverity,
    intentSummary: 'Intended to do X',
    implementationSummary: 'Actually did Y',
    acknowledged: false,
    resolved: false,
    recommendations: ['Fix the drift'],
    actionsTaken: [],
    detectedBy: 'agent-1',
    detectedAt: new Date('2025-01-01T00:00:00Z'),
    sessionId: 'session-1',
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test world state
function createTestWorldState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    id: `worldstate-${Date.now()}`,
    collection: 'worldStates',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    worldStateId: `worldstate-${Date.now()}`,
    sessionId: 'session-1',
    snapshotName: 'Test Snapshot',
    facts: [],
    goals: [],
    timestamp: new Date('2025-01-01T00:00:00Z'),
    changedFacts: [],
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test skill
function createTestSkill(overrides: Partial<SkillRegistration> = {}): SkillRegistration {
  return {
    id: `skill-${Date.now()}`,
    collection: 'skills',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    skillId: `skill-${Date.now()}`,
    skillType: 'repo-scanner' as SkillType,
    name: 'Test Skill',
    skillVersion: '1.0.0',
    enabled: true,
    config: {},
    requiredSkills: [],
    requiredCapabilities: [],
    executionCount: 10,
    averageExecutionTime: 500,
    successRate: 0.9,
    errorCount: 1,
    description: 'Test skill',
    tags: [],
    customData: {},
    ...overrides,
  };
}

// Helper to create test metrics
function createTestMetrics(overrides: Partial<MetricsDocument> = {}): MetricsDocument {
  return {
    id: `metrics-${Date.now()}`,
    collection: 'metrics',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    metricsId: `metrics-${Date.now()}`,
    metricType: 'performance',
    name: 'Test Metric',
    snapshots: [],
    current: 100,
    average: 95,
    min: 80,
    max: 110,
    aggregationPeriod: 'hour',
    description: 'Test metric',
    tags: [],
    customData: {},
    ...overrides,
  };
}

describe('QueryBuilder', () => {
  let mockStorage: jest.Mocked<StorageBackend>;
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    mockStorage = {
      query: jest.fn(),
      list: jest.fn(),
      load: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      exists: jest.fn(),
      getCollectionPath: jest.fn(),
    } as unknown as jest.Mocked<StorageBackend>;
    queryBuilder = new QueryBuilder(mockStorage);
  });

  // ============================================================================
  // Agent Queries
  // ============================================================================

  describe('Agent Queries', () => {
    describe('getActiveAgents', () => {
      it('should return agents with active or busy status', async () => {
        const activeAgent = createTestAgent({ status: 'active' });
        const busyAgent = createTestAgent({ status: 'busy' });
        const mockResult: QueryResult<AgentState> = {
          documents: [activeAgent, busyAgent],
          total: 2,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getActiveAgents();

        expect(mockStorage.query).toHaveBeenCalledWith('agents', {
          status: { $in: ['active', 'busy'] },
        });
        expect(result.documents).toHaveLength(2);
        expect(result.total).toBe(2);
      });

      it('should return empty result when no active agents exist', async () => {
        const mockResult: QueryResult<AgentState> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getActiveAgents();

        expect(result.documents).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });

    describe('getAgentsByRole', () => {
      it('should return agents filtered by role', async () => {
        const scannerAgent = createTestAgent({ role: 'scanner' });
        const mockResult: QueryResult<AgentState> = {
          documents: [scannerAgent],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAgentsByRole('scanner');

        expect(mockStorage.query).toHaveBeenCalledWith('agents', { role: 'scanner' });
        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].role).toBe('scanner');
      });
    });

    describe('getAgentsByCapability', () => {
      it('should return agents with specific capability', async () => {
        const capability: AgentCapability = {
          name: 'semantic-analysis',
          version: '1.0.0',
          parameters: {},
        };
        const agent = createTestAgent({ capabilities: [capability] });
        const mockResult: QueryResult<AgentState> = {
          documents: [agent],
          total: 1,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAgentsByCapability('semantic-analysis');

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].capabilities[0].name).toBe('semantic-analysis');
      });

      it('should filter out agents without the capability', async () => {
        const agent1 = createTestAgent({
          capabilities: [{ name: 'other-capability', version: '1.0.0', parameters: {} }],
        });
        const agent2 = createTestAgent({
          capabilities: [{ name: 'semantic-analysis', version: '1.0.0', parameters: {} }],
        });
        const mockResult: QueryResult<AgentState> = {
          documents: [agent1, agent2],
          total: 2,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAgentsByCapability('semantic-analysis');

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].capabilities[0].name).toBe('semantic-analysis');
      });
    });

    describe('getTopPerformers', () => {
      it('should return top performing agents sorted by score', async () => {
        const highPerformer = createTestAgent({
          tasksCompleted: 100,
          tasksFailedCount: 5,
          averageExecutionTime: 200,
        });
        const lowPerformer = createTestAgent({
          tasksCompleted: 50,
          tasksFailedCount: 20,
          averageExecutionTime: 1000,
        });
        const mockResult: QueryResult<AgentState> = {
          documents: [lowPerformer, highPerformer],
          total: 2,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getTopPerformers(2);

        expect(result.documents).toHaveLength(2);
        // High performer should be first
        expect(result.documents[0].tasksCompleted).toBe(100);
      });

      it('should limit results to specified count', async () => {
        const agents = Array.from({ length: 20 }, (_, i) =>
          createTestAgent({ agentId: `agent-${i}` })
        );
        const mockResult: QueryResult<AgentState> = {
          documents: agents,
          total: 20,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getTopPerformers(5);

        expect(result.documents).toHaveLength(5);
      });

      it('should use default limit of 10 when not specified', async () => {
        const agents = Array.from({ length: 15 }, (_, i) =>
          createTestAgent({ agentId: `agent-${i}` })
        );
        const mockResult: QueryResult<AgentState> = {
          documents: agents,
          total: 15,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getTopPerformers();

        expect(result.documents).toHaveLength(10);
      });
    });
  });

  // ============================================================================
  // Session Queries
  // ============================================================================

  describe('Session Queries', () => {
    describe('getSessionsByDateRange', () => {
      it('should return sessions within date range', async () => {
        const start = new Date('2025-01-01T00:00:00Z');
        const end = new Date('2025-01-31T23:59:59Z');
        const session = createTestSession({ startedAt: new Date('2025-01-15T12:00:00Z') });
        const mockResult: QueryResult<SessionState> = {
          documents: [session],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getSessionsByDateRange(start, end);

        expect(mockStorage.query).toHaveBeenCalledWith('sessions', {
          startedAt: { $gte: start, $lte: end },
        });
        expect(result.documents).toHaveLength(1);
      });
    });

    describe('getActiveSessions', () => {
      it('should return active and paused sessions', async () => {
        const activeSession = createTestSession({ status: 'active' });
        const pausedSession = createTestSession({ status: 'paused' });
        const mockResult: QueryResult<SessionState> = {
          documents: [activeSession, pausedSession],
          total: 2,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getActiveSessions();

        expect(mockStorage.query).toHaveBeenCalledWith('sessions', {
          status: { $in: ['active', 'paused'] },
        });
        expect(result.documents).toHaveLength(2);
      });
    });

    describe('getSessionsByRepository', () => {
      it('should return sessions for specific repository', async () => {
        const session = createTestSession({ repository: 'my-repo' });
        const mockResult: QueryResult<SessionState> = {
          documents: [session],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getSessionsByRepository('my-repo');

        expect(mockStorage.query).toHaveBeenCalledWith('sessions', {
          repository: 'my-repo',
        });
        expect(result.documents[0].repository).toBe('my-repo');
      });
    });

    describe('getRecentSessions', () => {
      it('should return recent sessions sorted by start date', async () => {
        const mockResult: QueryResult<SessionState> = {
          documents: [createTestSession()],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getRecentSessions(10);

        expect(mockStorage.query).toHaveBeenCalledWith(
          'sessions',
          {},
          {
            sort: { field: 'startedAt', order: 'desc' },
            limit: 10,
          }
        );
      });

      it('should use default limit of 10', async () => {
        const mockResult: QueryResult<SessionState> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        await queryBuilder.getRecentSessions();

        expect(mockStorage.query).toHaveBeenCalledWith(
          'sessions',
          {},
          {
            sort: { field: 'startedAt', order: 'desc' },
            limit: 10,
          }
        );
      });
    });

    describe('getLongRunningSessions', () => {
      it('should return sessions running longer than threshold', async () => {
        const now = Date.now();
        const longSession = createTestSession({
          status: 'active',
          startedAt: new Date(now - 120 * 60 * 1000), // 120 minutes ago
        });
        const shortSession = createTestSession({
          status: 'active',
          startedAt: new Date(now - 30 * 60 * 1000), // 30 minutes ago
        });
        const mockResult: QueryResult<SessionState> = {
          documents: [longSession, shortSession],
          total: 2,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLongRunningSessions(60);

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0]).toBe(longSession);
      });

      it('should only include active sessions', async () => {
        const now = Date.now();
        const completedSession = createTestSession({
          status: 'completed',
          startedAt: new Date(now - 120 * 60 * 1000),
        });
        const mockResult: QueryResult<SessionState> = {
          documents: [completedSession],
          total: 1,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLongRunningSessions(60);

        expect(result.documents).toHaveLength(0);
      });

      it('should use default threshold of 60 minutes', async () => {
        const mockResult: QueryResult<SessionState> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLongRunningSessions();

        expect(mockStorage.list).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // Analysis Queries
  // ============================================================================

  describe('Analysis Queries', () => {
    describe('getLatestAnalysisForRepo', () => {
      it('should return most recent completed analysis for repository', async () => {
        const analysis = createTestAnalysis({ repositories: ['test-repo'], status: 'completed' });
        const mockResult: QueryResult<AnalysisResult> = {
          documents: [analysis],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLatestAnalysisForRepo('test-repo');

        expect(mockStorage.query).toHaveBeenCalledWith(
          'analyses',
          {
            repositories: 'test-repo',
            status: 'completed',
          },
          {
            sort: { field: 'performedAt', order: 'desc' },
            limit: 1,
          }
        );
        expect(result).toBe(analysis);
      });

      it('should return null when no analysis found', async () => {
        const mockResult: QueryResult<AnalysisResult> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLatestAnalysisForRepo('test-repo');

        expect(result).toBeNull();
      });
    });

    describe('getAnalysesByType', () => {
      it('should return completed analyses of specific type', async () => {
        const analysis = createTestAnalysis({ analysisType: 'semantic', status: 'completed' });
        const mockResult: QueryResult<AnalysisResult> = {
          documents: [analysis],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAnalysesByType('semantic');

        expect(mockStorage.query).toHaveBeenCalledWith('analyses', {
          analysisType: 'semantic',
          status: 'completed',
        });
        expect(result.documents[0].analysisType).toBe('semantic');
      });
    });

    describe('getFailedAnalyses', () => {
      it('should return analyses with failed status', async () => {
        const analysis = createTestAnalysis({ status: 'failed', error: 'Test error' });
        const mockResult: QueryResult<AnalysisResult> = {
          documents: [analysis],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getFailedAnalyses();

        expect(mockStorage.query).toHaveBeenCalledWith('analyses', {
          status: 'failed',
        });
        expect(result.documents[0].status).toBe('failed');
      });
    });

    describe('getAnalysisHistory', () => {
      it('should return analysis history for repository', async () => {
        const analyses = Array.from({ length: 3 }, (_, i) =>
          createTestAnalysis({ repositories: ['test-repo'], analysisId: `analysis-${i}` })
        );
        const mockResult: QueryResult<AnalysisResult> = {
          documents: analyses,
          total: 3,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAnalysisHistory('test-repo', 20);

        expect(mockStorage.query).toHaveBeenCalledWith(
          'analyses',
          {
            repositories: 'test-repo',
          },
          {
            sort: { field: 'performedAt', order: 'desc' },
            limit: 20,
          }
        );
        expect(result.documents).toHaveLength(3);
      });
    });
  });

  // ============================================================================
  // Drift Alert Queries
  // ============================================================================

  describe('Drift Alert Queries', () => {
    describe('getUnacknowledgedAlerts', () => {
      it('should return unacknowledged alerts', async () => {
        const alert = createTestDriftAlert({ acknowledged: false });
        const mockResult: QueryResult<DriftAlert> = {
          documents: [alert],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getUnacknowledgedAlerts();

        expect(mockStorage.query).toHaveBeenCalledWith('driftAlerts', {
          acknowledged: false,
        });
        expect(result.documents[0].acknowledged).toBe(false);
      });
    });

    describe('getAlertsBySeverity', () => {
      it('should return alerts filtered by severity', async () => {
        const alert = createTestDriftAlert({ severity: 'critical' });
        const mockResult: QueryResult<DriftAlert> = {
          documents: [alert],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getAlertsBySeverity('critical');

        expect(mockStorage.query).toHaveBeenCalledWith('driftAlerts', {
          severity: 'critical',
        });
        expect(result.documents[0].severity).toBe('critical');
      });
    });

    describe('getCriticalUnresolvedAlerts', () => {
      it('should return critical unresolved alerts', async () => {
        const alert = createTestDriftAlert({ severity: 'critical', resolved: false });
        const mockResult: QueryResult<DriftAlert> = {
          documents: [alert],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getCriticalUnresolvedAlerts();

        expect(mockStorage.query).toHaveBeenCalledWith('driftAlerts', {
          severity: 'critical',
          resolved: false,
        });
        expect(result.documents[0].severity).toBe('critical');
        expect(result.documents[0].resolved).toBe(false);
      });
    });

    describe('getDriftAlertsForRepo', () => {
      it('should return alerts for specific repository sorted by detection date', async () => {
        const alert = createTestDriftAlert({ repository: 'my-repo' });
        const mockResult: QueryResult<DriftAlert> = {
          documents: [alert],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getDriftAlertsForRepo('my-repo');

        expect(mockStorage.query).toHaveBeenCalledWith(
          'driftAlerts',
          {
            repository: 'my-repo',
          },
          {
            sort: { field: 'detectedAt', order: 'desc' },
          }
        );
        expect(result.documents[0].repository).toBe('my-repo');
      });
    });

    describe('getDriftAlertStats', () => {
      it('should return comprehensive statistics for all alerts', async () => {
        const alerts = [
          createTestDriftAlert({ severity: 'low', acknowledged: true, resolved: true }),
          createTestDriftAlert({ severity: 'medium', acknowledged: true, resolved: false }),
          createTestDriftAlert({ severity: 'high', acknowledged: false, resolved: false }),
          createTestDriftAlert({ severity: 'critical', acknowledged: false, resolved: false }),
          createTestDriftAlert({ severity: 'critical', acknowledged: true, resolved: false }),
        ];
        const mockResult: QueryResult<DriftAlert> = {
          documents: alerts,
          total: 5,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const stats = await queryBuilder.getDriftAlertStats();

        expect(stats.total).toBe(5);
        expect(stats.bySeverity.low).toBe(1);
        expect(stats.bySeverity.medium).toBe(1);
        expect(stats.bySeverity.high).toBe(1);
        expect(stats.bySeverity.critical).toBe(2);
        expect(stats.acknowledged).toBe(3);
        expect(stats.resolved).toBe(1);
        expect(stats.criticalUnresolved).toBe(2);
      });

      it('should filter by repository when provided', async () => {
        const mockResult: QueryResult<DriftAlert> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        await queryBuilder.getDriftAlertStats('my-repo');

        expect(mockStorage.query).toHaveBeenCalledWith('driftAlerts', {
          repository: 'my-repo',
        });
      });

      it('should return zero counts when no alerts exist', async () => {
        const mockResult: QueryResult<DriftAlert> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const stats = await queryBuilder.getDriftAlertStats();

        expect(stats.total).toBe(0);
        expect(stats.bySeverity.low).toBe(0);
        expect(stats.bySeverity.medium).toBe(0);
        expect(stats.bySeverity.high).toBe(0);
        expect(stats.bySeverity.critical).toBe(0);
        expect(stats.acknowledged).toBe(0);
        expect(stats.resolved).toBe(0);
        expect(stats.criticalUnresolved).toBe(0);
      });
    });
  });

  // ============================================================================
  // World State Queries
  // ============================================================================

  describe('World State Queries', () => {
    describe('getLatestWorldState', () => {
      it('should return most recent world state for session', async () => {
        const worldState = createTestWorldState({ sessionId: 'session-1' });
        const mockResult: QueryResult<WorldState> = {
          documents: [worldState],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLatestWorldState('session-1');

        expect(mockStorage.query).toHaveBeenCalledWith(
          'worldStates',
          {
            sessionId: 'session-1',
          },
          {
            sort: { field: 'timestamp', order: 'desc' },
            limit: 1,
          }
        );
        expect(result).toBe(worldState);
      });

      it('should return null when no world state found', async () => {
        const mockResult: QueryResult<WorldState> = {
          documents: [],
          total: 0,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getLatestWorldState('session-1');

        expect(result).toBeNull();
      });
    });

    describe('getWorldStateHistory', () => {
      it('should return world state history for session', async () => {
        const worldStates = Array.from({ length: 3 }, (_, i) =>
          createTestWorldState({ sessionId: 'session-1', worldStateId: `state-${i}` })
        );
        const mockResult: QueryResult<WorldState> = {
          documents: worldStates,
          total: 3,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getWorldStateHistory('session-1', 50);

        expect(mockStorage.query).toHaveBeenCalledWith(
          'worldStates',
          {
            sessionId: 'session-1',
          },
          {
            sort: { field: 'timestamp', order: 'desc' },
            limit: 50,
          }
        );
        expect(result.documents).toHaveLength(3);
      });
    });

    describe('getWorldStatesByRepo', () => {
      it('should return world states for specific repository', async () => {
        const worldState = createTestWorldState({ repository: 'my-repo' });
        const mockResult: QueryResult<WorldState> = {
          documents: [worldState],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getWorldStatesByRepo('my-repo');

        expect(mockStorage.query).toHaveBeenCalledWith('worldStates', {
          repository: 'my-repo',
        });
        expect(result.documents[0].repository).toBe('my-repo');
      });
    });
  });

  // ============================================================================
  // Skill Queries
  // ============================================================================

  describe('Skill Queries', () => {
    describe('getEnabledSkills', () => {
      it('should return enabled skills only', async () => {
        const skill = createTestSkill({ enabled: true });
        const mockResult: QueryResult<SkillRegistration> = {
          documents: [skill],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getEnabledSkills();

        expect(mockStorage.query).toHaveBeenCalledWith('skills', {
          enabled: true,
        });
        expect(result.documents[0].enabled).toBe(true);
      });
    });

    describe('getSkillsByType', () => {
      it('should return skills filtered by type', async () => {
        const skill = createTestSkill({ skillType: 'semantic-analyzer' });
        const mockResult: QueryResult<SkillRegistration> = {
          documents: [skill],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getSkillsByType('semantic-analyzer');

        expect(mockStorage.query).toHaveBeenCalledWith('skills', {
          skillType: 'semantic-analyzer',
        });
        expect(result.documents[0].skillType).toBe('semantic-analyzer');
      });
    });

    describe('getHighPerformingSkills', () => {
      it('should return skills above success rate threshold', async () => {
        const highSkill = createTestSkill({ successRate: 0.9 });
        const lowSkill = createTestSkill({ successRate: 0.5 });
        const mockResult: QueryResult<SkillRegistration> = {
          documents: [highSkill, lowSkill],
          total: 2,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getHighPerformingSkills(0.8);

        expect(result.documents).toHaveLength(1);
        expect(result.documents[0].successRate).toBeGreaterThanOrEqual(0.8);
      });

      it('should use default threshold of 0.8', async () => {
        const skill = createTestSkill({ successRate: 0.85 });
        const mockResult: QueryResult<SkillRegistration> = {
          documents: [skill],
          total: 1,
          hasMore: false,
        };

        mockStorage.list.mockResolvedValue(mockResult);

        const result = await queryBuilder.getHighPerformingSkills();

        expect(result.documents[0].successRate).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  // ============================================================================
  // Metrics Queries
  // ============================================================================

  describe('Metrics Queries', () => {
    describe('getMetricsForRepo', () => {
      it('should return metrics for specific repository', async () => {
        const metrics = createTestMetrics({ repository: 'my-repo' });
        const mockResult: QueryResult<MetricsDocument> = {
          documents: [metrics],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getMetricsForRepo('my-repo');

        expect(mockStorage.query).toHaveBeenCalledWith('metrics', {
          repository: 'my-repo',
        });
        expect(result.documents[0].repository).toBe('my-repo');
      });
    });

    describe('getMetricsForSession', () => {
      it('should return metrics for specific session', async () => {
        const metrics = createTestMetrics({ sessionId: 'session-1' });
        const mockResult: QueryResult<MetricsDocument> = {
          documents: [metrics],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getMetricsForSession('session-1');

        expect(mockStorage.query).toHaveBeenCalledWith('metrics', {
          sessionId: 'session-1',
        });
        expect(result.documents[0].sessionId).toBe('session-1');
      });
    });

    describe('getMetricsForAgent', () => {
      it('should return metrics for specific agent', async () => {
        const metrics = createTestMetrics({ agentId: 'agent-1' });
        const mockResult: QueryResult<MetricsDocument> = {
          documents: [metrics],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getMetricsForAgent('agent-1');

        expect(mockStorage.query).toHaveBeenCalledWith('metrics', {
          agentId: 'agent-1',
        });
        expect(result.documents[0].agentId).toBe('agent-1');
      });
    });

    describe('getMetricsByType', () => {
      it('should return metrics filtered by type', async () => {
        const metrics = createTestMetrics({ metricType: 'performance' });
        const mockResult: QueryResult<MetricsDocument> = {
          documents: [metrics],
          total: 1,
          hasMore: false,
        };

        mockStorage.query.mockResolvedValue(mockResult);

        const result = await queryBuilder.getMetricsByType('performance');

        expect(mockStorage.query).toHaveBeenCalledWith('metrics', {
          metricType: 'performance',
        });
        expect(result.documents[0].metricType).toBe('performance');
      });
    });
  });

  // ============================================================================
  // Cross-Collection Queries
  // ============================================================================

  describe('Cross-Collection Queries', () => {
    describe('getSessionContext', () => {
      it('should return complete context for a session', async () => {
        const session = createTestSession({ sessionId: 'session-1' });
        const agent = createTestAgent({ sessionIds: ['session-1'] });
        const worldState = createTestWorldState({ sessionId: 'session-1' });
        const analysis = createTestAnalysis({ sessionId: 'session-1' });
        const alert = createTestDriftAlert({ sessionId: 'session-1' });
        const metrics = createTestMetrics({ sessionId: 'session-1' });

        mockStorage.load.mockResolvedValue(session);
        mockStorage.query.mockImplementation((collection: string) => {
          const results: Record<string, QueryResult<any>> = {
            agents: { documents: [agent], total: 1, hasMore: false },
            worldStates: { documents: [worldState], total: 1, hasMore: false },
            analyses: { documents: [analysis], total: 1, hasMore: false },
            driftAlerts: { documents: [alert], total: 1, hasMore: false },
            metrics: { documents: [metrics], total: 1, hasMore: false },
          };
          return Promise.resolve(results[collection]);
        });

        const context = await queryBuilder.getSessionContext('session-1');

        expect(context.session).toBe(session);
        expect(context.agents).toHaveLength(1);
        expect(context.worldStates).toHaveLength(1);
        expect(context.analyses).toHaveLength(1);
        expect(context.driftAlerts).toHaveLength(1);
        expect(context.metrics).toHaveLength(1);
      });

      it('should handle session not found', async () => {
        mockStorage.load.mockResolvedValue(null);
        mockStorage.query.mockResolvedValue({ documents: [], total: 0, hasMore: false });

        const context = await queryBuilder.getSessionContext('nonexistent');

        expect(context.session).toBeNull();
        expect(context.agents).toHaveLength(0);
        expect(context.worldStates).toHaveLength(0);
      });
    });

    describe('getRepositoryDashboard', () => {
      it('should return complete dashboard data for repository', async () => {
        const analysis = createTestAnalysis({ repositories: ['test-repo'] });
        const alert = createTestDriftAlert({ repository: 'test-repo', severity: 'high' });
        const session = createTestSession({ repository: 'test-repo' });
        const worldState = createTestWorldState({ repository: 'test-repo' });
        const metrics = createTestMetrics({ repository: 'test-repo' });

        mockStorage.query.mockImplementation((collection: string) => {
          const results: Record<string, QueryResult<any>> = {
            analyses: { documents: [analysis], total: 1, hasMore: false },
            driftAlerts: { documents: [alert], total: 1, hasMore: false },
            sessions: { documents: [session], total: 1, hasMore: false },
            worldStates: { documents: [worldState], total: 1, hasMore: false },
            metrics: { documents: [metrics], total: 1, hasMore: false },
          };
          return Promise.resolve(results[collection]);
        });

        const dashboard = await queryBuilder.getRepositoryDashboard('test-repo');

        expect(dashboard.latestAnalysis).toBe(analysis);
        expect(dashboard.driftAlerts).toHaveLength(1);
        expect(dashboard.sessions).toHaveLength(1);
        expect(dashboard.worldStates).toHaveLength(1);
        expect(dashboard.metrics).toHaveLength(1);
        expect(dashboard.alertStats).toBeDefined();
        expect(dashboard.alertStats.total).toBe(1);
        expect(dashboard.alertStats.bySeverity.high).toBe(1);
      });
    });

    describe('globalSearch', () => {
      it('should search across all collections', async () => {
        const agent = createTestAgent({ name: 'Test Agent' });
        const session = createTestSession({ name: 'Test Session' });
        const analysis = createTestAnalysis({ repositories: ['test-repo'] });
        const alert = createTestDriftAlert({ intentSummary: 'Test intent' });

        mockStorage.query.mockImplementation((collection: string) => {
          const results: Record<string, QueryResult<any>> = {
            agents: { documents: [agent], total: 1, hasMore: false },
            sessions: { documents: [session], total: 1, hasMore: false },
            analyses: { documents: [analysis], total: 1, hasMore: false },
            driftAlerts: { documents: [alert], total: 1, hasMore: false },
          };
          return Promise.resolve(results[collection]);
        });

        const results = await queryBuilder.globalSearch('test', 50);

        expect(results.agents).toHaveLength(1);
        expect(results.sessions).toHaveLength(1);
        expect(results.analyses).toHaveLength(1);
        expect(results.driftAlerts).toHaveLength(1);
      });

      it('should apply limit to each collection', async () => {
        mockStorage.query.mockResolvedValue({ documents: [], total: 0, hasMore: false });

        await queryBuilder.globalSearch('test', 25);

        // Verify limit is passed to query
        const calls = mockStorage.query.mock.calls;
        calls.forEach((call) => {
          expect(call[2]?.limit).toBe(25);
        });
      });

      it('should use regex for case-insensitive search', async () => {
        mockStorage.query.mockResolvedValue({ documents: [], total: 0, hasMore: false });

        await queryBuilder.globalSearch('TEST', 50);

        // Verify regex filter is used
        expect(mockStorage.query).toHaveBeenCalled();
        const firstCall = mockStorage.query.mock.calls[0];
        expect(firstCall[1]).toHaveProperty('$or');
      });
    });
  });
});
