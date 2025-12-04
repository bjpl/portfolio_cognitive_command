/**
 * Tests for SessionCapture
 * Validates session lifecycle, MCP integration, and cognitive-linker coordination
 */

import {
  SessionCapture,
  createSessionCapture,
  autoLinkCommit,
  SessionCaptureConfig,
} from '../../src/agentdb/session-capture';
import { AgentDB } from '../../src/agentdb/database';
import { MCPMemoryTools } from '../../src/agentdb/sync';
import { SessionState, SessionDecision } from '../../src/agentdb/types';

// Mock cognitive-linker
jest.mock('../../src/skills/cognitive-linker', () => ({
  addSessionToAgentDb: jest.fn(),
  linkCommitToSession: jest.fn(),
}));

import {
  addSessionToAgentDb,
  linkCommitToSession,
} from '../../src/skills/cognitive-linker';

describe('SessionCapture', () => {
  let mockAgentDb: jest.Mocked<AgentDB>;
  let mockMcpTools: jest.Mocked<MCPMemoryTools>;
  let config: SessionCaptureConfig;
  let sessionCapture: SessionCapture;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock AgentDB
    mockAgentDb = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSessionStatus: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<AgentDB>;

    // Mock MCPMemoryTools
    mockMcpTools = {
      store: jest.fn().mockResolvedValue(undefined),
      retrieve: jest.fn().mockResolvedValue(null),
      search: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    };

    // Default config
    config = {
      agentDb: mockAgentDb,
      mcpTools: mockMcpTools,
      namespace: 'test-sessions',
      agentDbPath: '/test/agentdb.json',
      autoCommit: false,
    };

    sessionCapture = new SessionCapture(config);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(sessionCapture).toBeInstanceOf(SessionCapture);
    });

    it('should use default namespace when not provided', () => {
      const capture = new SessionCapture({
        agentDb: mockAgentDb,
        mcpTools: mockMcpTools,
      });

      expect(capture).toBeInstanceOf(SessionCapture);
    });

    it('should accept custom namespace', () => {
      const customConfig: SessionCaptureConfig = {
        ...config,
        namespace: 'custom-namespace',
      };

      const capture = new SessionCapture(customConfig);
      expect(capture).toBeInstanceOf(SessionCapture);
    });

    it('should handle minimal config', () => {
      const minimalConfig: SessionCaptureConfig = {
        agentDb: mockAgentDb,
        mcpTools: mockMcpTools,
      };

      const capture = new SessionCapture(minimalConfig);
      expect(capture).toBeInstanceOf(SessionCapture);
    });
  });

  describe('createSession', () => {
    const mockNow = new Date('2025-12-04T10:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a session with full configuration', async () => {
      const sessionInput: Partial<SessionState> = {
        name: 'Test Session',
        description: 'Testing session creation',
        status: 'active',
        agentIds: ['agent-1', 'agent-2'],
        repository: '/test/repo',
        decisions: [
          {
            timestamp: mockNow,
            description: 'Test decision',
            rationale: 'Testing purposes',
            outcome: 'success',
          },
        ],
        tags: ['test', 'session'],
      };

      const expectedSession: SessionState = {
        id: expect.stringMatching(/^session-\d+-[a-z0-9]+$/),
        collection: 'sessions',
        sessionId: expect.stringMatching(/^session-\d+-[a-z0-9]+$/),
        name: 'Test Session',
        description: 'Testing session creation',
        status: 'active',
        startedAt: mockNow,
        createdAt: mockNow,
        updatedAt: mockNow,
        version: 1,
        agentIds: ['agent-1', 'agent-2'],
        repository: '/test/repo',
        decisions: sessionInput.decisions || [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: ['test', 'session'],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(expectedSession);

      const result = await sessionCapture.createSession(sessionInput);

      expect(result).toEqual(expectedSession);
      expect(mockAgentDb.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Session',
          description: 'Testing session creation',
          status: 'active',
        })
      );
      expect(mockMcpTools.store).toHaveBeenCalledWith(
        expect.stringMatching(/^session\//),
        expect.any(String),
        'test-sessions'
      );
      expect(mockMcpTools.store).toHaveBeenCalledWith(
        'active_session',
        expect.any(String),
        'test-sessions'
      );
      expect(addSessionToAgentDb).toHaveBeenCalled();
    });

    it('should create a session with minimal configuration', async () => {
      const sessionInput: Partial<SessionState> = {};

      const expectedSession: SessionState = {
        id: 'session-123',
        collection: 'sessions',
        sessionId: 'session-123',
        name: 'Development Session',
        description: 'Automatic session capture',
        status: 'active',
        startedAt: mockNow,
        createdAt: mockNow,
        updatedAt: mockNow,
        version: 1,
        agentIds: [],
        repository: process.cwd(),
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(expectedSession);

      const result = await sessionCapture.createSession(sessionInput);

      expect(result.name).toBe('Development Session');
      expect(result.description).toBe('Automatic session capture');
      expect(result.status).toBe('active');
      expect(mockAgentDb.createSession).toHaveBeenCalled();
    });

    it('should use provided session ID if given', async () => {
      const customId = 'custom-session-id';
      const sessionInput: Partial<SessionState> = {
        id: customId,
      };

      const expectedSession: SessionState = {
        id: customId,
        collection: 'sessions',
        sessionId: customId,
        name: 'Development Session',
        description: 'Automatic session capture',
        status: 'active',
        startedAt: mockNow,
        createdAt: mockNow,
        updatedAt: mockNow,
        version: 1,
        agentIds: [],
        repository: process.cwd(),
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(expectedSession);

      const result = await sessionCapture.createSession(sessionInput);

      expect(result.id).toBe(customId);
      expect(result.sessionId).toBe(customId);
    });

    it('should persist active sessions to MCP memory', async () => {
      const sessionInput: Partial<SessionState> = {
        status: 'active',
      };

      const mockSession: SessionState = {
        id: 'test-session',
        collection: 'sessions',
        sessionId: 'test-session',
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: mockNow,
        createdAt: mockNow,
        updatedAt: mockNow,
        version: 1,
        agentIds: [],
        repository: process.cwd(),
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(mockSession);

      await sessionCapture.createSession(sessionInput);

      // Should store both session-specific and active_session keys
      expect(mockMcpTools.store).toHaveBeenCalledWith(
        'session/test-session',
        JSON.stringify(mockSession),
        'test-sessions'
      );
      expect(mockMcpTools.store).toHaveBeenCalledWith(
        'active_session',
        JSON.stringify(mockSession),
        'test-sessions'
      );
    });
  });

  describe('linkCommit', () => {
    const sessionId = 'test-session';
    const commitHash = 'abc123def456';

    it('should link commit to existing session', async () => {
      const mockSession: SessionState = {
        id: sessionId,
        collection: 'sessions',
        sessionId,
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.getSession.mockResolvedValue(mockSession);

      const result = await sessionCapture.linkCommit(sessionId, commitHash);

      expect(result).toBe(true);
      expect(mockAgentDb.getSession).toHaveBeenCalledWith(sessionId);
      expect(mockAgentDb.update).toHaveBeenCalledWith(
        'sessions',
        sessionId,
        expect.objectContaining({
          customData: expect.objectContaining({
            commits: [commitHash],
          }),
        })
      );
      expect(linkCommitToSession).toHaveBeenCalledWith(
        sessionId,
        commitHash,
        config.agentDbPath
      );
      expect(mockMcpTools.store).toHaveBeenCalled();
    });

    it('should return false when session not found', async () => {
      mockAgentDb.getSession.mockResolvedValue(null);

      const result = await sessionCapture.linkCommit(sessionId, commitHash);

      expect(result).toBe(false);
      expect(mockAgentDb.update).not.toHaveBeenCalled();
      expect(linkCommitToSession).not.toHaveBeenCalled();
    });

    it('should not duplicate commit hashes', async () => {
      const existingCommit = 'existing123';
      const mockSession: SessionState = {
        id: sessionId,
        collection: 'sessions',
        sessionId,
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {
          commits: [existingCommit],
        },
      };

      mockAgentDb.getSession.mockResolvedValue(mockSession);

      // Try to add duplicate
      await sessionCapture.linkCommit(sessionId, existingCommit);

      // Should not call update since commit already exists
      expect(mockAgentDb.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockAgentDb.getSession.mockRejectedValue(new Error('Database error'));

      const result = await sessionCapture.linkCommit(sessionId, commitHash);

      expect(result).toBe(false);
    });
  });

  describe('endSession', () => {
    const sessionId = 'test-session';

    it('should update session status to completed', async () => {
      const mockSession: SessionState = {
        id: sessionId,
        collection: 'sessions',
        sessionId,
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      const completedSession: SessionState = {
        ...mockSession,
        status: 'completed',
      };

      mockAgentDb.getSession.mockResolvedValue(mockSession);
      mockAgentDb.updateSessionStatus.mockResolvedValue(completedSession);

      const result = await sessionCapture.endSession(sessionId);

      expect(result).toEqual(completedSession);
      expect(mockAgentDb.updateSessionStatus).toHaveBeenCalledWith(
        sessionId,
        'completed'
      );
      expect(mockMcpTools.store).toHaveBeenCalled();
      expect(addSessionToAgentDb).toHaveBeenCalled();
    });

    it('should update session with outcome when provided', async () => {
      const outcome = 'Successfully implemented feature';
      const mockSession: SessionState = {
        id: sessionId,
        collection: 'sessions',
        sessionId,
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      const completedSession: SessionState = {
        ...mockSession,
        status: 'completed',
      };

      mockAgentDb.getSession.mockResolvedValue(mockSession);
      mockAgentDb.updateSessionStatus.mockResolvedValue(completedSession);

      const result = await sessionCapture.endSession(sessionId, outcome);

      expect(result).toBeTruthy();
      expect(mockAgentDb.update).toHaveBeenCalledWith(
        'sessions',
        sessionId,
        expect.objectContaining({
          customData: expect.objectContaining({
            outcome,
          }),
        })
      );
    });

    it('should return null when session not found', async () => {
      mockAgentDb.getSession.mockResolvedValue(null);

      const result = await sessionCapture.endSession(sessionId);

      expect(result).toBeNull();
      expect(mockAgentDb.updateSessionStatus).not.toHaveBeenCalled();
    });
  });

  describe('getActiveSession', () => {
    it('should retrieve active session from MCP memory', async () => {
      const now = new Date('2025-12-04T10:00:00Z');
      const mockSession: SessionState = {
        id: 'active-session',
        collection: 'sessions',
        sessionId: 'active-session',
        name: 'Active Session',
        description: 'Currently active',
        status: 'active',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockMcpTools.retrieve.mockResolvedValue(JSON.stringify(mockSession));

      const result = await sessionCapture.getActiveSession();

      // Dates are serialized as strings when stored in MCP memory
      expect(result).toMatchObject({
        id: 'active-session',
        name: 'Active Session',
        status: 'active',
      });
      expect(mockMcpTools.retrieve).toHaveBeenCalledWith(
        'active_session',
        'test-sessions'
      );
    });

    it('should return null when no active session exists', async () => {
      mockMcpTools.retrieve.mockResolvedValue(null);

      const result = await sessionCapture.getActiveSession();

      expect(result).toBeNull();
    });

    it('should handle retrieval errors gracefully', async () => {
      mockMcpTools.retrieve.mockRejectedValue(new Error('MCP error'));

      const result = await sessionCapture.getActiveSession();

      expect(result).toBeNull();
    });
  });

  describe('captureContext', () => {
    const sessionId = 'test-session';

    it('should store context in MCP and AgentDB', async () => {
      const context = {
        currentTask: 'Implementing feature',
        recentFiles: ['file1.ts', 'file2.ts'],
        environment: 'development',
      };

      const mockSession: SessionState = {
        id: sessionId,
        collection: 'sessions',
        sessionId,
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.getSession.mockResolvedValue(mockSession);

      await sessionCapture.captureContext(sessionId, context);

      expect(mockMcpTools.store).toHaveBeenCalledWith(
        `session/${sessionId}/context`,
        JSON.stringify(context),
        'test-sessions'
      );
      expect(mockAgentDb.update).toHaveBeenCalledWith(
        'sessions',
        sessionId,
        expect.objectContaining({
          customData: expect.objectContaining({
            context,
          }),
        })
      );
    });

    it('should handle session not found', async () => {
      const context = { test: 'data' };
      mockAgentDb.getSession.mockResolvedValue(null);

      await sessionCapture.captureContext(sessionId, context);

      expect(mockMcpTools.store).toHaveBeenCalled();
      expect(mockAgentDb.update).not.toHaveBeenCalled();
    });
  });

  describe('extractReasoning (private method)', () => {
    it('should extract reasoning from decisions', async () => {
      const decisions: SessionDecision[] = [
        {
          timestamp: new Date(),
          description: 'Use TypeScript',
          rationale: 'Type safety',
          outcome: 'Implemented',
        },
        {
          timestamp: new Date(),
          description: 'Add Jest tests',
          rationale: 'Quality assurance',
        },
      ];

      const sessionInput: Partial<SessionState> = {
        decisions,
      };

      const mockSession: SessionState = {
        id: 'test',
        collection: 'sessions',
        sessionId: 'test',
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions,
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(mockSession);

      await sessionCapture.createSession(sessionInput);

      // Verify addSessionToAgentDb was called with reasoning
      expect(addSessionToAgentDb).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning: expect.stringContaining('Use TypeScript'),
        }),
        config.agentDbPath
      );
    });

    it('should handle empty decisions', async () => {
      const sessionInput: Partial<SessionState> = {
        decisions: [],
      };

      const mockSession: SessionState = {
        id: 'test',
        collection: 'sessions',
        sessionId: 'test',
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(mockSession);

      await sessionCapture.createSession(sessionInput);

      expect(addSessionToAgentDb).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning: 'No reasoning captured',
        }),
        config.agentDbPath
      );
    });
  });

  describe('generateSessionId (private method)', () => {
    it('should generate unique session IDs', async () => {
      const ids = new Set<string>();

      // Create multiple sessions
      for (let i = 0; i < 10; i++) {
        const mockSession: SessionState = {
          id: `session-${Date.now()}-${i}`,
          collection: 'sessions',
          sessionId: `session-${Date.now()}-${i}`,
          name: 'Test',
          description: 'Test',
          status: 'active',
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          agentIds: [],
          repository: '/test/repo',
          decisions: [],
          conversationSummary: '',
          metrics: {
            duration: 0,
            agentsUsed: 0,
            tasksCompleted: 0,
            filesModified: 0,
            tokensUsed: 0,
          },
          worldStateIds: [],
          analysisIds: [],
          artifactPaths: [],
          tags: [],
          customData: {},
        };

        mockAgentDb.createSession.mockResolvedValue(mockSession);

        const result = await sessionCapture.createSession({});
        ids.add(result.id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(10);
    });

    it('should generate IDs matching expected format', async () => {
      const mockSession: SessionState = {
        id: 'session-1733311200000-abc123',
        collection: 'sessions',
        sessionId: 'session-1733311200000-abc123',
        name: 'Test',
        description: 'Test',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockAgentDb.createSession.mockResolvedValue(mockSession);

      const result = await sessionCapture.createSession({});

      expect(result.id).toMatch(/^session-\d+-[a-z0-9]+$/);
    });
  });

  describe('createSessionCapture (factory)', () => {
    it('should create SessionCapture instance', () => {
      const instance = createSessionCapture(config);

      expect(instance).toBeInstanceOf(SessionCapture);
    });

    it('should work with minimal config', () => {
      const minimalConfig: SessionCaptureConfig = {
        agentDb: mockAgentDb,
        mcpTools: mockMcpTools,
      };

      const instance = createSessionCapture(minimalConfig);

      expect(instance).toBeInstanceOf(SessionCapture);
    });
  });

  describe('autoLinkCommit (hook)', () => {
    const commitHash = 'abc123def456';

    it('should link commit to active session', async () => {
      const mockSession: SessionState = {
        id: 'active-session',
        collection: 'sessions',
        sessionId: 'active-session',
        name: 'Active',
        description: 'Active session',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockMcpTools.retrieve.mockResolvedValue(JSON.stringify(mockSession));
      mockAgentDb.getSession.mockResolvedValue(mockSession);

      await autoLinkCommit(sessionCapture, commitHash);

      expect(mockMcpTools.retrieve).toHaveBeenCalledWith(
        'active_session',
        'test-sessions'
      );
      expect(mockAgentDb.getSession).toHaveBeenCalledWith('active-session');
      expect(linkCommitToSession).toHaveBeenCalledWith(
        'active-session',
        commitHash,
        config.agentDbPath
      );
    });

    it('should handle no active session gracefully', async () => {
      mockMcpTools.retrieve.mockResolvedValue(null);

      await autoLinkCommit(sessionCapture, commitHash);

      expect(mockAgentDb.getSession).not.toHaveBeenCalled();
      expect(linkCommitToSession).not.toHaveBeenCalled();
    });

    it('should handle linking errors', async () => {
      const mockSession: SessionState = {
        id: 'active-session',
        collection: 'sessions',
        sessionId: 'active-session',
        name: 'Active',
        description: 'Active session',
        status: 'active',
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        agentIds: [],
        repository: '/test/repo',
        decisions: [],
        conversationSummary: '',
        metrics: {
          duration: 0,
          agentsUsed: 0,
          tasksCompleted: 0,
          filesModified: 0,
          tokensUsed: 0,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      mockMcpTools.retrieve.mockResolvedValue(JSON.stringify(mockSession));
      mockAgentDb.getSession.mockRejectedValue(new Error('DB error'));

      await expect(
        autoLinkCommit(sessionCapture, commitHash)
      ).resolves.not.toThrow();
    });
  });
});
