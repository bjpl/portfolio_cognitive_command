/**
 * Tests for database.ts
 * Comprehensive unit tests for AgentDB database operations
 */

import { AgentDB, createAgentDB } from '../../src/agentdb/database';
import { StorageBackend } from '../../src/agentdb/storage';
import { SyncManager, MCPMemoryTools } from '../../src/agentdb/sync';
import { QueryBuilder } from '../../src/agentdb/queries';
import {
  AgentState,
  SessionState,
  WorldState,
  SkillRegistration,
  AnalysisResult,
  DriftAlert,
  NeuralPattern,
  MetricsDocument,
  CollectionName,
  SyncConfig,
  SyncResult,
  QueryResult,
} from '../../src/agentdb/types';

// ============================================================================
// Mocks
// ============================================================================

// Mock storage backend
const mockStorage: jest.Mocked<StorageBackend> = {
  save: jest.fn(),
  load: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  list: jest.fn(),
};

// Mock sync manager
const mockSyncManager: jest.Mocked<SyncManager> = {
  syncDocument: jest.fn(),
  syncCollection: jest.fn(),
  syncAll: jest.fn(),
  destroy: jest.fn(),
} as any;

// Mock MCP tools
const mockMCPTools: jest.Mocked<MCPMemoryTools> = {
  store: jest.fn(),
  retrieve: jest.fn(),
  search: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
};

// Mock query builder
const mockQueryBuilder: jest.Mocked<QueryBuilder> = {
  getLatestWorldState: jest.fn(),
  getLatestAnalysisForRepo: jest.fn(),
  getUnacknowledgedAlerts: jest.fn(),
  getEnabledSkills: jest.fn(),
  getSessionContext: jest.fn(),
  getRepositoryDashboard: jest.fn(),
  globalSearch: jest.fn(),
} as any;

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockAgent(overrides?: Partial<AgentState>): AgentState {
  return {
    id: 'agent-123',
    collection: 'agents',
    agentId: 'agent-123',
    role: 'analyzer',
    name: 'Test Agent',
    status: 'idle',
    lastActivity: new Date('2025-01-01'),
    capabilities: [
      { name: 'analyze', version: '1.0.0', parameters: {} },
    ],
    config: {},
    tasksCompleted: 10,
    tasksFailedCount: 2,
    averageExecutionTime: 1500,
    sessionIds: [],
    skillIds: [],
    tags: ['test'],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockSession(overrides?: Partial<SessionState>): SessionState {
  return {
    id: 'session-123',
    collection: 'sessions',
    sessionId: 'session-123',
    name: 'Test Session',
    description: 'Testing session',
    status: 'active',
    startedAt: new Date('2025-01-01'),
    agentIds: ['agent-123'],
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
    tags: [],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockWorldState(overrides?: Partial<WorldState>): WorldState {
  return {
    id: 'world-123',
    collection: 'worldStates',
    worldStateId: 'world-123',
    sessionId: 'session-123',
    snapshotName: 'initial',
    facts: [],
    goals: [],
    timestamp: new Date('2025-01-01'),
    changedFacts: [],
    tags: [],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockSkill(overrides?: Partial<SkillRegistration>): SkillRegistration {
  return {
    id: 'skill-123',
    collection: 'skills',
    skillId: 'skill-123',
    skillType: 'semantic-analyzer',
    name: 'Test Skill',
    skillVersion: '1.0.0',
    enabled: true,
    config: {},
    requiredSkills: [],
    requiredCapabilities: [],
    executionCount: 5,
    averageExecutionTime: 1000,
    successRate: 0.9,
    errorCount: 1,
    description: 'Test skill',
    tags: [],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockNeuralPattern(overrides?: Partial<NeuralPattern>): NeuralPattern {
  return {
    id: 'pattern-123',
    collection: 'neuralPatterns',
    patternId: 'pattern-123',
    patternType: 'coordination',
    name: 'Test Pattern',
    inputShape: [10],
    outputShape: [5],
    weights: [[1, 2], [3, 4]],
    biases: [0.1, 0.2],
    trainedOn: ['session-123'],
    trainingEpochs: 100,
    accuracy: 0.95,
    loss: 0.05,
    usageCount: 10,
    successRate: 0.9,
    description: 'Test pattern',
    tags: [],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockMetrics(overrides?: Partial<MetricsDocument>): MetricsDocument {
  return {
    id: 'metrics-123',
    collection: 'metrics',
    metricsId: 'metrics-123',
    metricType: 'performance',
    name: 'Test Metric',
    snapshots: [],
    current: 100,
    average: 100,
    min: 50,
    max: 150,
    aggregationPeriod: 'hour',
    description: 'Test metrics',
    tags: [],
    customData: {},
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
    ...overrides,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentDB', () => {
  let db: AgentDB;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh database instance without sync
    db = new AgentDB(mockStorage);

    // Replace query builder with mock
    (db as any).queries = mockQueryBuilder;
  });

  afterEach(() => {
    db.destroy();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with storage backend only', () => {
      const database = new AgentDB(mockStorage);
      expect(database).toBeInstanceOf(AgentDB);
    });

    it('should create instance with sync manager when MCP tools provided', () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const database = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      expect(database).toBeInstanceOf(AgentDB);
    });

    it('should provide query builder access', () => {
      expect(db.queryBuilder).toBeDefined();
    });
  });

  // ==========================================================================
  // Core CRUD Operations
  // ==========================================================================

  describe('save', () => {
    it('should save document to storage', async () => {
      const agent = createMockAgent();
      mockStorage.save.mockResolvedValue(agent);

      const result = await db.save('agents', agent);

      expect(mockStorage.save).toHaveBeenCalledWith('agents', agent);
      expect(result).toEqual(agent);
    });

    it('should sync document when sync manager enabled', async () => {
      // Create DB with sync
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };
      const dbWithSync = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      (dbWithSync as any).sync = mockSyncManager;

      const agent = createMockAgent();
      mockStorage.save.mockResolvedValue(agent);

      await dbWithSync.save('agents', agent);

      expect(mockSyncManager.syncDocument).toHaveBeenCalledWith('agents', agent);
      dbWithSync.destroy();
    });

    it('should not sync when sync manager disabled', async () => {
      const agent = createMockAgent();
      mockStorage.save.mockResolvedValue(agent);

      await db.save('agents', agent);

      expect(mockSyncManager.syncDocument).not.toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load document by ID', async () => {
      const agent = createMockAgent();
      mockStorage.load.mockResolvedValue(agent);

      const result = await db.load<AgentState>('agents', 'agent-123');

      expect(mockStorage.load).toHaveBeenCalledWith('agents', 'agent-123');
      expect(result).toEqual(agent);
    });

    it('should return null when document not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      const result = await db.load('agents', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('query', () => {
    it('should query documents with filter', async () => {
      const mockResult: QueryResult<AgentState> = {
        documents: [createMockAgent()],
        total: 1,
        hasMore: false,
      };
      mockStorage.query.mockResolvedValue(mockResult);

      const filter = { status: 'active' };
      const result = await db.query<AgentState>('agents', filter);

      expect(mockStorage.query).toHaveBeenCalledWith('agents', filter, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should pass query options', async () => {
      const mockResult: QueryResult<AgentState> = {
        documents: [],
        total: 0,
        hasMore: false,
      };
      mockStorage.query.mockResolvedValue(mockResult);

      const filter = { status: 'active' };
      const options = { limit: 10, offset: 0 };

      await db.query('agents', filter, options);

      expect(mockStorage.query).toHaveBeenCalledWith('agents', filter, options);
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const agent = createMockAgent({ status: 'active' });
      mockStorage.update.mockResolvedValue(agent);

      const result = await db.update<AgentState>('agents', 'agent-123', {
        status: 'active',
      });

      expect(mockStorage.update).toHaveBeenCalledWith('agents', 'agent-123', {
        status: 'active',
      });
      expect(result).toEqual(agent);
    });

    it('should sync updated document when sync enabled', async () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };
      const dbWithSync = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      (dbWithSync as any).sync = mockSyncManager;

      const agent = createMockAgent();
      mockStorage.update.mockResolvedValue(agent);

      await dbWithSync.update<AgentState>('agents', 'agent-123', { status: 'active' });

      expect(mockSyncManager.syncDocument).toHaveBeenCalled();
      dbWithSync.destroy();
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      mockStorage.delete.mockResolvedValue(true);

      const result = await db.delete('agents', 'agent-123');

      expect(mockStorage.delete).toHaveBeenCalledWith('agents', 'agent-123');
      expect(result).toBe(true);
    });

    it('should return false when document not found', async () => {
      mockStorage.delete.mockResolvedValue(false);

      const result = await db.delete('agents', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all documents in collection', async () => {
      const mockResult: QueryResult<AgentState> = {
        documents: [createMockAgent(), createMockAgent({ id: 'agent-456' })],
        total: 2,
        hasMore: false,
      };
      mockStorage.list.mockResolvedValue(mockResult);

      const result = await db.list<AgentState>('agents');

      expect(mockStorage.list).toHaveBeenCalledWith('agents', undefined);
      expect(result.documents).toHaveLength(2);
    });

    it('should accept query options', async () => {
      const mockResult: QueryResult<AgentState> = {
        documents: [],
        total: 0,
        hasMore: false,
      };
      mockStorage.list.mockResolvedValue(mockResult);

      const options = { limit: 5 };
      await db.list('agents', options);

      expect(mockStorage.list).toHaveBeenCalledWith('agents', options);
    });
  });

  // ==========================================================================
  // Agent Operations
  // ==========================================================================

  describe('saveAgent', () => {
    it('should save agent document', async () => {
      const agent = createMockAgent();
      mockStorage.save.mockResolvedValue(agent);

      const result = await db.saveAgent(agent);

      expect(mockStorage.save).toHaveBeenCalledWith('agents', agent);
      expect(result).toEqual(agent);
    });
  });

  describe('getAgent', () => {
    it('should get agent by ID', async () => {
      const agent = createMockAgent();
      mockStorage.load.mockResolvedValue(agent);

      const result = await db.getAgent('agent-123');

      expect(mockStorage.load).toHaveBeenCalledWith('agents', 'agent-123');
      expect(result).toEqual(agent);
    });

    it('should return null for nonexistent agent', async () => {
      mockStorage.load.mockResolvedValue(null);

      const result = await db.getAgent('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateAgentStatus', () => {
    it('should update agent status and current task', async () => {
      const agent = createMockAgent({ status: 'busy', currentTask: 'analyzing' });
      mockStorage.update.mockResolvedValue(agent);

      const result = await db.updateAgentStatus('agent-123', 'busy', 'analyzing');

      expect(mockStorage.update).toHaveBeenCalledWith('agents', 'agent-123', {
        status: 'busy',
        currentTask: 'analyzing',
        lastActivity: expect.any(Date),
      });
      expect(result.status).toBe('busy');
    });

    it('should update last activity timestamp', async () => {
      const beforeUpdate = new Date();
      const agent = createMockAgent();
      mockStorage.update.mockResolvedValue(agent);

      await db.updateAgentStatus('agent-123', 'active');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.lastActivity).toBeInstanceOf(Date);
      expect(callArgs.lastActivity.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('recordAgentTaskCompletion', () => {
    it('should increment tasks completed on success', async () => {
      const agent = createMockAgent({
        tasksCompleted: 10,
        tasksFailedCount: 2,
        averageExecutionTime: 1000,
      });
      const updatedAgent: AgentState = {
        ...agent,
        tasksCompleted: 11,
      };
      mockStorage.load.mockResolvedValue(agent);
      mockStorage.update.mockResolvedValue(updatedAgent);

      const result = await db.recordAgentTaskCompletion('agent-123', true, 1200);

      expect(mockStorage.update).toHaveBeenCalledWith('agents', 'agent-123', {
        tasksCompleted: 11,
        tasksFailedCount: 2,
        averageExecutionTime: expect.any(Number),
        lastActivity: expect.any(Date),
      });
    });

    it('should increment failed count on failure', async () => {
      const agent = createMockAgent({
        tasksCompleted: 10,
        tasksFailedCount: 2,
      });
      const updatedAgent: AgentState = {
        ...agent,
        tasksFailedCount: 3,
      };
      mockStorage.load.mockResolvedValue(agent);
      mockStorage.update.mockResolvedValue(updatedAgent);

      await db.recordAgentTaskCompletion('agent-123', false, 1500);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.tasksCompleted).toBe(10);
      expect(callArgs.tasksFailedCount).toBe(3);
    });

    it('should calculate average execution time correctly', async () => {
      const agent = createMockAgent({
        tasksCompleted: 10,
        tasksFailedCount: 2,
        averageExecutionTime: 1000,
      });
      mockStorage.load.mockResolvedValue(agent);
      mockStorage.update.mockResolvedValue(agent);

      await db.recordAgentTaskCompletion('agent-123', true, 1300);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      // (1000 * 12 + 1300) / 13 ≈ 1023
      expect(callArgs.averageExecutionTime).toBeCloseTo(1023, 0);
    });

    it('should throw error when agent not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        db.recordAgentTaskCompletion('nonexistent', true, 1000)
      ).rejects.toThrow('Agent not found: nonexistent');
    });
  });

  // ==========================================================================
  // Session Operations
  // ==========================================================================

  describe('createSession', () => {
    it('should create session document', async () => {
      const session = createMockSession();
      mockStorage.save.mockResolvedValue(session);

      const result = await db.createSession(session);

      expect(mockStorage.save).toHaveBeenCalledWith('sessions', session);
      expect(result).toEqual(session);
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      const session = createMockSession();
      mockStorage.load.mockResolvedValue(session);

      const result = await db.getSession('session-123');

      expect(mockStorage.load).toHaveBeenCalledWith('sessions', 'session-123');
      expect(result).toEqual(session);
    });

    it('should return null for nonexistent session', async () => {
      mockStorage.load.mockResolvedValue(null);

      const result = await db.getSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', async () => {
      const session = createMockSession({ status: 'paused' });
      mockStorage.update.mockResolvedValue(session);

      const result = await db.updateSessionStatus('session-123', 'paused');

      expect(mockStorage.update).toHaveBeenCalledWith('sessions', 'session-123', {
        status: 'paused',
      });
      expect(result.status).toBe('paused');
    });

    it('should set endedAt when status is completed', async () => {
      const session = createMockSession({ status: 'completed', endedAt: new Date() });
      mockStorage.update.mockResolvedValue(session);

      await db.updateSessionStatus('session-123', 'completed');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.endedAt).toBeInstanceOf(Date);
    });

    it('should set endedAt when status is failed', async () => {
      const session = createMockSession({ status: 'failed', endedAt: new Date() });
      mockStorage.update.mockResolvedValue(session);

      await db.updateSessionStatus('session-123', 'failed');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.endedAt).toBeInstanceOf(Date);
    });

    it('should not set endedAt for active or paused status', async () => {
      const session = createMockSession({ status: 'active' });
      mockStorage.update.mockResolvedValue(session);

      await db.updateSessionStatus('session-123', 'active');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.endedAt).toBeUndefined();
    });
  });

  describe('addSessionDecision', () => {
    it('should add decision to session', async () => {
      const session = createMockSession({ decisions: [] });
      const updatedSession: SessionState = {
        ...session,
        decisions: [{
          timestamp: new Date(),
          description: 'Test decision',
          rationale: 'Testing',
        }],
      };
      mockStorage.load.mockResolvedValue(session);
      mockStorage.update.mockResolvedValue(updatedSession);

      const decision = {
        timestamp: new Date(),
        description: 'Test decision',
        rationale: 'Testing',
      };

      await db.addSessionDecision('session-123', decision);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.decisions).toHaveLength(1);
      expect(callArgs.decisions[0]).toEqual(decision);
    });

    it('should append to existing decisions', async () => {
      const existingDecision = {
        timestamp: new Date('2025-01-01'),
        description: 'Old decision',
        rationale: 'Old',
      };
      const session = createMockSession({ decisions: [existingDecision] });
      mockStorage.load.mockResolvedValue(session);
      mockStorage.update.mockResolvedValue(session);

      const newDecision = {
        timestamp: new Date('2025-01-02'),
        description: 'New decision',
        rationale: 'New',
      };

      await db.addSessionDecision('session-123', newDecision);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.decisions).toHaveLength(2);
    });

    it('should throw error when session not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      const decision = {
        timestamp: new Date(),
        description: 'Test',
        rationale: 'Test',
      };

      await expect(
        db.addSessionDecision('nonexistent', decision)
      ).rejects.toThrow('Session not found: nonexistent');
    });
  });

  // ==========================================================================
  // World State Operations
  // ==========================================================================

  describe('saveWorldState', () => {
    it('should save world state document', async () => {
      const worldState = createMockWorldState();
      mockStorage.save.mockResolvedValue(worldState);

      const result = await db.saveWorldState(worldState);

      expect(mockStorage.save).toHaveBeenCalledWith('worldStates', worldState);
      expect(result).toEqual(worldState);
    });
  });

  describe('getLatestWorldState', () => {
    it('should delegate to query builder', async () => {
      const worldState = createMockWorldState();
      mockQueryBuilder.getLatestWorldState.mockResolvedValue(worldState);

      const result = await db.getLatestWorldState('session-123');

      expect(mockQueryBuilder.getLatestWorldState).toHaveBeenCalledWith('session-123');
      expect(result).toEqual(worldState);
    });

    it('should return null when no world state found', async () => {
      mockQueryBuilder.getLatestWorldState.mockResolvedValue(null);

      const result = await db.getLatestWorldState('session-123');

      expect(result).toBeNull();
    });
  });

  describe('updateWorldStateFacts', () => {
    it('should merge and update facts', async () => {
      const existingFacts = [
        {
          key: 'fact1',
          value: 'old',
          confidence: 0.8,
          source: 'agent1',
          timestamp: new Date('2025-01-01'),
        },
      ];
      const worldState = createMockWorldState({ facts: existingFacts });
      mockStorage.load.mockResolvedValue(worldState);
      mockStorage.update.mockResolvedValue(worldState);

      const newFacts = [
        {
          key: 'fact1',
          value: 'new',
          confidence: 0.9,
          source: 'agent2',
          timestamp: new Date('2025-01-02'),
        },
        {
          key: 'fact2',
          value: 'value',
          confidence: 1.0,
          source: 'agent2',
          timestamp: new Date('2025-01-02'),
        },
      ];

      await db.updateWorldStateFacts('world-123', newFacts);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.facts).toHaveLength(2);
      expect(callArgs.changedFacts).toEqual(['fact1', 'fact2']);
    });

    it('should throw error when world state not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        db.updateWorldStateFacts('nonexistent', [])
      ).rejects.toThrow('World state not found: nonexistent');
    });
  });

  // ==========================================================================
  // Skill Operations
  // ==========================================================================

  describe('registerSkill', () => {
    it('should register skill document', async () => {
      const skill = createMockSkill();
      mockStorage.save.mockResolvedValue(skill);

      const result = await db.registerSkill(skill);

      expect(mockStorage.save).toHaveBeenCalledWith('skills', skill);
      expect(result).toEqual(skill);
    });
  });

  describe('getEnabledSkills', () => {
    it('should delegate to query builder', async () => {
      const mockResult: QueryResult<SkillRegistration> = {
        documents: [createMockSkill()],
        total: 1,
        hasMore: false,
      };
      mockQueryBuilder.getEnabledSkills.mockResolvedValue(mockResult);

      const result = await db.getEnabledSkills();

      expect(mockQueryBuilder.getEnabledSkills).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('recordSkillExecution', () => {
    it('should update execution count and calculate success rate', async () => {
      const skill = createMockSkill({
        executionCount: 10,
        errorCount: 1,
        averageExecutionTime: 1000,
      });
      mockStorage.load.mockResolvedValue(skill);
      mockStorage.update.mockResolvedValue(skill);

      await db.recordSkillExecution('skill-123', true, 1200);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.executionCount).toBe(11);
      expect(callArgs.errorCount).toBe(1);
      expect(callArgs.successRate).toBeCloseTo(10 / 11, 2);
    });

    it('should increment error count on failure', async () => {
      const skill = createMockSkill({
        executionCount: 10,
        errorCount: 1,
      });
      mockStorage.load.mockResolvedValue(skill);
      mockStorage.update.mockResolvedValue(skill);

      await db.recordSkillExecution('skill-123', false, 1500);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.errorCount).toBe(2);
      expect(callArgs.successRate).toBeCloseTo(9 / 11, 2);
    });

    it('should throw error when skill not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        db.recordSkillExecution('nonexistent', true, 1000)
      ).rejects.toThrow('Skill not found: nonexistent');
    });
  });

  // ==========================================================================
  // Neural Pattern Operations
  // ==========================================================================

  describe('saveNeuralPattern', () => {
    it('should save neural pattern document', async () => {
      const pattern = createMockNeuralPattern();
      mockStorage.save.mockResolvedValue(pattern);

      const result = await db.saveNeuralPattern(pattern);

      expect(mockStorage.save).toHaveBeenCalledWith('neuralPatterns', pattern);
      expect(result).toEqual(pattern);
    });
  });

  describe('recordPatternUsage', () => {
    it('should update usage count and success rate on success', async () => {
      const pattern = createMockNeuralPattern({
        usageCount: 10,
        successRate: 0.9,
      });
      mockStorage.load.mockResolvedValue(pattern);
      mockStorage.update.mockResolvedValue(pattern);

      await db.recordPatternUsage('pattern-123', true);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.usageCount).toBe(11);
      // (0.9 * 10 + 1) / 11 ≈ 0.909
      expect(callArgs.successRate).toBeCloseTo(0.909, 2);
    });

    it('should decrease success rate on failure', async () => {
      const pattern = createMockNeuralPattern({
        usageCount: 10,
        successRate: 0.9,
      });
      mockStorage.load.mockResolvedValue(pattern);
      mockStorage.update.mockResolvedValue(pattern);

      await db.recordPatternUsage('pattern-123', false);

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      // (0.9 * 10 + 0) / 11 ≈ 0.818
      expect(callArgs.successRate).toBeCloseTo(0.818, 2);
    });

    it('should throw error when pattern not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        db.recordPatternUsage('nonexistent', true)
      ).rejects.toThrow('Pattern not found: nonexistent');
    });
  });

  // ==========================================================================
  // Metrics Operations
  // ==========================================================================

  describe('saveMetrics', () => {
    it('should save metrics document', async () => {
      const metrics = createMockMetrics();
      mockStorage.save.mockResolvedValue(metrics);

      const result = await db.saveMetrics(metrics);

      expect(mockStorage.save).toHaveBeenCalledWith('metrics', metrics);
      expect(result).toEqual(metrics);
    });
  });

  describe('addMetricSnapshot', () => {
    it('should add snapshot and update aggregated values', async () => {
      const metrics = createMockMetrics({
        snapshots: [
          { timestamp: new Date('2025-01-01'), value: 100, unit: 'ms' },
        ],
        current: 100,
        average: 100,
        min: 100,
        max: 100,
      });
      mockStorage.load.mockResolvedValue(metrics);
      mockStorage.update.mockResolvedValue(metrics);

      await db.addMetricSnapshot('metrics-123', 150, 'ms');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.snapshots).toHaveLength(2);
      expect(callArgs.current).toBe(150);
      expect(callArgs.average).toBe(125);
      expect(callArgs.min).toBe(100);
      expect(callArgs.max).toBe(150);
    });

    it('should handle empty snapshots', async () => {
      const metrics = createMockMetrics({
        snapshots: [],
        current: 0,
        average: 0,
        min: 0,
        max: 0,
      });
      mockStorage.load.mockResolvedValue(metrics);
      mockStorage.update.mockResolvedValue(metrics);

      await db.addMetricSnapshot('metrics-123', 75, 'ms');

      const callArgs = mockStorage.update.mock.calls[0][2] as any;
      expect(callArgs.current).toBe(75);
      expect(callArgs.average).toBe(75);
      expect(callArgs.min).toBe(75);
      expect(callArgs.max).toBe(75);
    });

    it('should throw error when metrics not found', async () => {
      mockStorage.load.mockResolvedValue(null);

      await expect(
        db.addMetricSnapshot('nonexistent', 100, 'ms')
      ).rejects.toThrow('Metrics not found: nonexistent');
    });
  });

  // ==========================================================================
  // Sync Operations
  // ==========================================================================

  describe('syncAll', () => {
    it('should return null when sync manager not enabled', async () => {
      const result = await db.syncAll();

      expect(result).toBeNull();
    });

    it('should delegate to sync manager when enabled', async () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };
      const dbWithSync = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      (dbWithSync as any).sync = mockSyncManager;

      const syncResult: SyncResult = {
        success: true,
        synced: 10,
        conflicts: 0,
        errors: [],
        timestamp: new Date(),
      };
      mockSyncManager.syncAll.mockResolvedValue(syncResult);

      const result = await dbWithSync.syncAll();

      expect(mockSyncManager.syncAll).toHaveBeenCalled();
      expect(result).toEqual(syncResult);
      dbWithSync.destroy();
    });
  });

  describe('syncCollection', () => {
    it('should return null when sync manager not enabled', async () => {
      const result = await db.syncCollection('agents');

      expect(result).toBeNull();
    });

    it('should delegate to sync manager when enabled', async () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };
      const dbWithSync = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      (dbWithSync as any).sync = mockSyncManager;

      const syncResult: SyncResult = {
        success: true,
        synced: 5,
        conflicts: 0,
        errors: [],
        timestamp: new Date(),
      };
      mockSyncManager.syncCollection.mockResolvedValue(syncResult);

      const result = await dbWithSync.syncCollection('agents');

      expect(mockSyncManager.syncCollection).toHaveBeenCalledWith('agents');
      expect(result).toEqual(syncResult);
      dbWithSync.destroy();
    });
  });

  // ==========================================================================
  // Query Shortcuts
  // ==========================================================================

  describe('getSessionContext', () => {
    it('should delegate to query builder', async () => {
      const mockContext = {
        session: createMockSession(),
        agents: [createMockAgent()],
        worldStates: [createMockWorldState()],
        analyses: [],
        driftAlerts: [],
        metrics: [],
      };
      mockQueryBuilder.getSessionContext.mockResolvedValue(mockContext);

      const result = await db.getSessionContext('session-123');

      expect(mockQueryBuilder.getSessionContext).toHaveBeenCalledWith('session-123');
      expect(result).toEqual(mockContext);
    });
  });

  describe('getRepositoryDashboard', () => {
    it('should delegate to query builder', async () => {
      const mockDashboard = {
        latestAnalysis: null,
        driftAlerts: [],
        sessions: [],
        worldStates: [],
        metrics: [],
        alertStats: {
          total: 0,
          bySeverity: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
          },
          acknowledged: 0,
          resolved: 0,
          criticalUnresolved: 0,
        },
      };
      mockQueryBuilder.getRepositoryDashboard.mockResolvedValue(mockDashboard);

      const result = await db.getRepositoryDashboard('test/repo');

      expect(mockQueryBuilder.getRepositoryDashboard).toHaveBeenCalledWith('test/repo');
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('search', () => {
    it('should delegate to query builder', async () => {
      const mockResults = {
        agents: [],
        sessions: [],
        analyses: [],
        driftAlerts: [],
      };
      mockQueryBuilder.globalSearch.mockResolvedValue(mockResults);

      const result = await db.search('test query', 10);

      expect(mockQueryBuilder.globalSearch).toHaveBeenCalledWith('test query', 10);
      expect(result).toEqual(mockResults);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('destroy', () => {
    it('should call sync manager destroy when enabled', () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };
      const dbWithSync = new AgentDB(mockStorage, mockMCPTools, syncConfig);
      (dbWithSync as any).sync = mockSyncManager;

      dbWithSync.destroy();

      expect(mockSyncManager.destroy).toHaveBeenCalled();
    });

    it('should not throw when sync manager not enabled', () => {
      expect(() => db.destroy()).not.toThrow();
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================

  describe('createAgentDB', () => {
    it('should create database with default configuration', () => {
      const database = createAgentDB();

      expect(database).toBeInstanceOf(AgentDB);
    });

    it('should accept custom base path', () => {
      // Use temp directory to avoid permission issues
      const tempPath = require('os').tmpdir();
      const database = createAgentDB(tempPath);

      expect(database).toBeInstanceOf(AgentDB);
      database.destroy();
    });

    it('should accept MCP tools and sync config', () => {
      const syncConfig: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const database = createAgentDB(undefined, mockMCPTools, syncConfig);

      expect(database).toBeInstanceOf(AgentDB);
    });
  });
});
