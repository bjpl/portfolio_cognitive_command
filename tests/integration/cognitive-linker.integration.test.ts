/**
 * Integration Test: Cognitive Linker - Commit to Session Correlation
 * Validates end-to-end linking of git commits to AgentDB sessions
 */

import * as path from 'path';
import {
  linkToAgentDB,
  batchLinkCommits,
  createCognitiveTrace,
  extractKeyReasoningSteps,
  linkCommitToSession,
  addSessionToAgentDb,
  CognitiveLink,
  AgentSession
} from '../../src/skills/cognitive-linker';

describe('Cognitive Linker Integration Tests', () => {
  const testDbPath = path.join(__dirname, '../../data/agentdb.json');

  describe('linkToAgentDB - Direct Hash Lookup', () => {
    it('should find session_2025-12-03_001 for commit 64dda93', async () => {
      const commitHash = '64dda93';
      const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');

      const result = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);

      // Verify core link properties
      expect(result.commitHash).toBe(commitHash);
      expect(result.sessionId).toBe('session_2025-12-03_001');
      expect(result.source).toBe('agent_swarm');

      // Verify reasoning chain exists
      expect(result.reasoningChain).toBeTruthy();
      expect(result.reasoningChain).toContain('GOAP-driven refactoring');
      expect(result.reasoningChain).toContain('DELETE_DEAD_CODE');

      // Verify user prompt
      expect(result.userPrompt).toBeTruthy();
      expect(result.userPrompt).toContain('Production-ready v1.0.0');
    });

    it('should return manual link for unknown commit hash', async () => {
      const commitHash = 'unknown123';
      // Use a timestamp far outside any session's 1-hour window
      const commitTimestamp = new Date('2025-01-01T00:00:00.000Z');

      const result = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);

      expect(result.commitHash).toBe(commitHash);
      expect(result.sessionId).toBeNull();
      expect(result.reasoningChain).toBeNull();
      expect(result.userPrompt).toBeNull();
      expect(result.source).toBe('manual_override');
    });
  });

  describe('linkToAgentDB - Timestamp Fallback', () => {
    it('should find session by timestamp when within 1 hour window', async () => {
      // Session starts at 08:00:00, commit at 08:30:00 (within window)
      const commitHash = 'abcdef1';
      const commitTimestamp = new Date('2025-12-03T08:30:00.000Z');

      const result = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);

      // Should find session_2025-12-03_001 by timestamp proximity
      expect(result.sessionId).toBe('session_2025-12-03_001');
      expect(result.source).toBe('agent_swarm');
    });

    it('should return manual link when timestamp is outside 1 hour window', async () => {
      // Session starts at 08:00:00, commit at 10:00:00 (outside window)
      const commitHash = 'xyz789';
      const commitTimestamp = new Date('2025-12-03T10:00:00.000Z');

      const result = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);

      expect(result.source).toBe('manual_override');
      expect(result.sessionId).toBeNull();
    });
  });

  describe('batchLinkCommits', () => {
    it('should link multiple commits in batch', async () => {
      const commits = [
        { hash: '64dda93', timestamp: new Date('2025-12-03T08:00:00.000Z') },
        { hash: 'unknown1', timestamp: new Date('2025-12-05T10:00:00.000Z') }
      ];

      const results = await batchLinkCommits(commits, testDbPath);

      expect(results).toHaveLength(2);

      // First commit should link to session
      expect(results[0].commitHash).toBe('64dda93');
      expect(results[0].sessionId).toBe('session_2025-12-03_001');
      expect(results[0].source).toBe('agent_swarm');

      // Second commit should be manual (no session found)
      expect(results[1].commitHash).toBe('unknown1');
      expect(results[1].source).toBe('manual_override');
    });
  });

  describe('createCognitiveTrace', () => {
    it('should generate formatted trace for agent_swarm link', async () => {
      const commitHash = '64dda93';
      const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');

      const link = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);
      const trace = createCognitiveTrace(link);

      // Verify trace structure
      expect(trace).toContain('=== COGNITIVE TRACE ===');
      expect(trace).toContain(`Commit: ${commitHash}`);
      expect(trace).toContain('Source: agent_swarm');
      expect(trace).toContain('Session ID: session_2025-12-03_001');
      expect(trace).toContain('--- Original Prompt ---');
      expect(trace).toContain('Production-ready v1.0.0');
      expect(trace).toContain('--- Reasoning Chain ---');
      expect(trace).toContain('=== END TRACE ===');
    });

    it('should generate trace for manual_override link', async () => {
      const link: CognitiveLink = {
        commitHash: 'manual123',
        sessionId: null,
        reasoningChain: null,
        userPrompt: null,
        source: 'manual_override'
      };

      const trace = createCognitiveTrace(link);

      expect(trace).toContain('=== COGNITIVE TRACE ===');
      expect(trace).toContain('Commit: manual123');
      expect(trace).toContain('Source: manual_override');
      expect(trace).toContain('Manual Override (no agent session found)');
      expect(trace).toContain('=== END TRACE ===');
    });
  });

  describe('extractKeyReasoningSteps', () => {
    it('should extract reasoning steps from chain', () => {
      const reasoningChain = 'GOAP-driven refactoring → DELETE_DEAD_CODE → ADD_CONFIG → FIX_CLI_HARDCODING';
      const steps = extractKeyReasoningSteps(reasoningChain);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(s => s.includes('GOAP-driven'))).toBe(true);
      expect(steps.some(s => s.includes('DELETE_DEAD_CODE'))).toBe(true);
    });

    it('should return empty array for null reasoning', () => {
      const steps = extractKeyReasoningSteps(null);
      expect(steps).toEqual([]);
    });

    it('should filter out short and redundant steps', () => {
      const reasoningChain = 'Long meaningful step → then short → Another meaningful reasoning step';
      const steps = extractKeyReasoningSteps(reasoningChain);

      // Should filter out "then short" (too short and starts with "then")
      expect(steps.every(s => s.length > 10)).toBe(true);
      expect(steps.every(s => !s.match(/^(then|next|and|also)/i))).toBe(true);
    });
  });

  describe('linkCommitToSession', () => {
    it('should add commit hash to existing session', () => {
      const sessionId = 'session_2025-12-04_dev';
      const commitHash = 'test123';

      const result = linkCommitToSession(sessionId, commitHash, testDbPath);

      expect(result).toBe(true);
    });

    it('should return false for non-existent session', () => {
      const sessionId = 'non_existent_session';
      const commitHash = 'test456';

      const result = linkCommitToSession(sessionId, commitHash, testDbPath);

      expect(result).toBe(false);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full correlation workflow', async () => {
      // Step 1: Link commit to session
      const commitHash = '64dda93';
      const commitTimestamp = new Date('2025-12-03T08:00:00.000Z');

      const link = await linkToAgentDB(commitTimestamp, commitHash, testDbPath);

      // Step 2: Verify correlation
      expect(link.commitHash).toBe(commitHash);
      expect(link.sessionId).toBe('session_2025-12-03_001');
      expect(link.source).toBe('agent_swarm');

      // Step 3: Generate cognitive trace
      const trace = createCognitiveTrace(link);
      expect(trace).toBeTruthy();
      expect(trace).toContain('GOAP-driven refactoring');

      // Step 4: Extract reasoning steps
      const steps = extractKeyReasoningSteps(link.reasoningChain);
      expect(steps.length).toBeGreaterThan(0);

      // Step 5: Verify all data is accessible
      expect(link.userPrompt).toBeTruthy();
      expect(link.reasoningChain).toBeTruthy();
    });
  });

  describe('AgentDB Session Management', () => {
    it('should add new session to database', () => {
      const newSession: AgentSession = {
        sessionId: 'test_session_temp',
        startTime: new Date().toISOString(),
        commits: [],
        reasoning: 'Test reasoning chain',
        prompt: 'Test prompt'
      };

      // This will add the session (idempotent)
      addSessionToAgentDb(newSession, testDbPath);

      // Verify we can link to it
      const result = linkCommitToSession('test_session_temp', 'test_commit', testDbPath);
      expect(result).toBe(true);
    });
  });
});
