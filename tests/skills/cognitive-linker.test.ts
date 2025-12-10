/**
 * Unit Tests: Cognitive Linker - Edge Cases and Error Handling
 * Focuses on uncovered code paths for maximum test coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  linkToAgentDB,
  addSessionToAgentDb,
  linkCommitToSession,
  extractKeyReasoningSteps,
  createCognitiveTrace,
  saveCognitiveLink,
  loadCognitiveLinks,
  AgentSession,
  CognitiveLink
} from '../../src/skills/cognitive-linker';

describe('Cognitive Linker - Unit Tests for Edge Cases', () => {
  let tempDir: string;
  let tempDbPath: string;
  let tempLinkDir: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cognitive-linker-test-'));
    tempDbPath = path.join(tempDir, 'test-agentdb.json');
    tempLinkDir = path.join(tempDir, 'links');
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadAgentDb - Error Handling', () => {
    it('should create empty database when file does not exist (line 38)', async () => {
      // Use non-existent path
      const nonExistentPath = path.join(tempDir, 'non-existent', 'agentdb.json');

      const result = await linkToAgentDB(
        new Date(),
        'test-hash',
        nonExistentPath
      );

      // Should return manual link when DB doesn't exist
      expect(result.source).toBe('manual_override');
      expect(result.sessionId).toBeNull();
    });

    it('should handle JSON parse errors gracefully (lines 48-49)', async () => {
      // Write invalid JSON to file
      const invalidJsonPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidJsonPath, '{ invalid json content }', 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await linkToAgentDB(
        new Date(),
        'test-hash',
        invalidJsonPath
      );

      // Should return manual link when JSON parsing fails
      expect(result.source).toBe('manual_override');
      expect(result.sessionId).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading AgentDB'));

      consoleSpy.mockRestore();
    });
  });

  describe('saveAgentDb - Error Handling', () => {
    it('should create directory if it does not exist (line 65)', () => {
      const nestedPath = path.join(tempDir, 'deeply', 'nested', 'path', 'agentdb.json');

      const session: AgentSession = {
        sessionId: 'test-session',
        startTime: new Date().toISOString(),
        commits: ['abc123'],
        reasoning: 'Test reasoning',
        prompt: 'Test prompt'
      };

      // Should create nested directories
      addSessionToAgentDb(session, nestedPath);

      // Verify file was created
      expect(fs.existsSync(nestedPath)).toBe(true);

      // Verify content is correct
      const content = JSON.parse(fs.readFileSync(nestedPath, 'utf8'));
      expect(content.sessions).toHaveLength(1);
      expect(content.sessions[0].sessionId).toBe('test-session');
    });

    it('should handle write errors gracefully (line 71)', () => {
      // Use an invalid path that will cause writeFileSync to fail
      const invalidPath = '/invalid/path/that/cannot/be/created/agentdb.json';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const session: AgentSession = {
        sessionId: 'test-session-2',
        startTime: new Date().toISOString(),
        commits: [],
        reasoning: 'Test',
        prompt: 'Test'
      };

      // Should not throw, but log error
      expect(() => {
        addSessionToAgentDb(session, invalidPath);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving AgentDB'));

      consoleSpy.mockRestore();
    });
  });

  describe('addSessionToAgentDb - New Session Addition', () => {
    it('should add new session when it does not exist (line 142)', () => {
      const session1: AgentSession = {
        sessionId: 'session-1',
        startTime: new Date().toISOString(),
        commits: ['commit1'],
        reasoning: 'Reasoning 1',
        prompt: 'Prompt 1'
      };

      const session2: AgentSession = {
        sessionId: 'session-2',
        startTime: new Date().toISOString(),
        commits: ['commit2'],
        reasoning: 'Reasoning 2',
        prompt: 'Prompt 2'
      };

      // Add first session
      addSessionToAgentDb(session1, tempDbPath);

      // Add second session (new, not update)
      addSessionToAgentDb(session2, tempDbPath);

      // Verify both sessions exist
      const content = JSON.parse(fs.readFileSync(tempDbPath, 'utf8'));
      expect(content.sessions).toHaveLength(2);
      expect(content.sessions[0].sessionId).toBe('session-1');
      expect(content.sessions[1].sessionId).toBe('session-2');
    });

    it('should update existing session when it already exists', () => {
      const session: AgentSession = {
        sessionId: 'update-test',
        startTime: new Date().toISOString(),
        commits: ['commit1'],
        reasoning: 'Original reasoning',
        prompt: 'Original prompt'
      };

      // Add session
      addSessionToAgentDb(session, tempDbPath);

      // Update same session
      const updatedSession: AgentSession = {
        ...session,
        reasoning: 'Updated reasoning',
        commits: ['commit1', 'commit2']
      };

      addSessionToAgentDb(updatedSession, tempDbPath);

      // Verify only one session exists with updated data
      const content = JSON.parse(fs.readFileSync(tempDbPath, 'utf8'));
      expect(content.sessions).toHaveLength(1);
      expect(content.sessions[0].reasoning).toBe('Updated reasoning');
      expect(content.sessions[0].commits).toEqual(['commit1', 'commit2']);
    });
  });

  describe('getDefaultAgentDbPath - Default Path Usage', () => {
    it('should use default path when no path provided (line 193)', async () => {
      // Create a session in the default location
      const defaultPath = path.join(process.cwd(), 'data', 'agentdb.json');

      // Ensure data directory exists
      const dataDir = path.dirname(defaultPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const session: AgentSession = {
        sessionId: 'default-path-test',
        startTime: new Date().toISOString(),
        commits: ['test123'],
        reasoning: 'Test',
        prompt: 'Test'
      };

      // Add session without specifying path (uses default)
      addSessionToAgentDb(session);

      // Verify using default path
      const result = linkCommitToSession('default-path-test', 'test456');
      expect(result).toBe(true);

      // Clean up
      if (fs.existsSync(defaultPath)) {
        const db = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        db.sessions = db.sessions.filter((s: AgentSession) => s.sessionId !== 'default-path-test');
        fs.writeFileSync(defaultPath, JSON.stringify(db, null, 2), 'utf8');
      }
    });
  });

  describe('findNearestSession - Error Handling', () => {
    it('should handle errors when loading database (lines 225-226)', async () => {
      // Create invalid database file
      const invalidDbPath = path.join(tempDir, 'invalid-db.json');
      fs.writeFileSync(invalidDbPath, '{ broken json }', 'utf8');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should handle error gracefully
      const result = await linkToAgentDB(
        new Date(),
        'test-hash',
        invalidDbPath
      );

      expect(result.source).toBe('manual_override');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return null for sessions outside time window', async () => {
      // Create session with specific timestamp
      const session: AgentSession = {
        sessionId: 'time-test',
        startTime: '2025-01-01T12:00:00.000Z',
        commits: [],
        reasoning: 'Test',
        prompt: 'Test'
      };

      addSessionToAgentDb(session, tempDbPath);

      // Try to link commit 2 hours later (outside 1-hour window)
      const commitTime = new Date('2025-01-01T14:01:00.000Z');
      const result = await linkToAgentDB(commitTime, 'outside-window', tempDbPath);

      expect(result.source).toBe('manual_override');
      expect(result.sessionId).toBeNull();
    });
  });

  describe('saveCognitiveLink - File Operations', () => {
    it('should create output directory if it does not exist (lines 324-326)', async () => {
      const link: CognitiveLink = {
        commitHash: 'abc123def456',
        sessionId: 'test-session',
        reasoningChain: 'Test reasoning',
        userPrompt: 'Test prompt',
        source: 'agent_swarm'
      };

      // Save to non-existent directory
      await saveCognitiveLink(link, tempLinkDir);

      // Verify directory was created
      expect(fs.existsSync(tempLinkDir)).toBe(true);

      // Verify file was saved
      const filename = `cognitive_link_${link.commitHash.substring(0, 7)}.json`;
      const filepath = path.join(tempLinkDir, filename);
      expect(fs.existsSync(filepath)).toBe(true);

      // Verify content
      const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      expect(content.commitHash).toBe(link.commitHash);
      expect(content.sessionId).toBe(link.sessionId);
    });

    it('should save link with correct filename format (lines 328-331)', async () => {
      const link: CognitiveLink = {
        commitHash: '1234567890abcdef',
        sessionId: null,
        reasoningChain: null,
        userPrompt: null,
        source: 'manual_override'
      };

      await saveCognitiveLink(link, tempLinkDir);

      // Check filename uses first 7 characters
      const expectedFilename = 'cognitive_link_1234567.json';
      const filepath = path.join(tempLinkDir, expectedFilename);

      expect(fs.existsSync(filepath)).toBe(true);
    });
  });

  describe('loadCognitiveLinks - Directory Operations', () => {
    it('should return empty array when directory does not exist (lines 340-341)', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent-links');

      const links = loadCognitiveLinks(nonExistentDir);

      expect(links).toEqual([]);
    });

    it('should load all cognitive link files from directory (lines 344-349)', async () => {
      // Create directory
      fs.mkdirSync(tempLinkDir, { recursive: true });

      // Save multiple links
      const link1: CognitiveLink = {
        commitHash: 'aaa1111',
        sessionId: 'session-1',
        reasoningChain: 'Reasoning 1',
        userPrompt: 'Prompt 1',
        source: 'agent_swarm'
      };

      const link2: CognitiveLink = {
        commitHash: 'bbb2222',
        sessionId: 'session-2',
        reasoningChain: 'Reasoning 2',
        userPrompt: 'Prompt 2',
        source: 'agent_swarm'
      };

      const link3: CognitiveLink = {
        commitHash: 'ccc3333',
        sessionId: null,
        reasoningChain: null,
        userPrompt: null,
        source: 'manual_override'
      };

      await saveCognitiveLink(link1, tempLinkDir);
      await saveCognitiveLink(link2, tempLinkDir);
      await saveCognitiveLink(link3, tempLinkDir);

      // Also create a non-cognitive-link file to test filtering
      fs.writeFileSync(
        path.join(tempLinkDir, 'other_file.json'),
        JSON.stringify({ test: 'data' }),
        'utf8'
      );

      // Load all links
      const loadedLinks = loadCognitiveLinks(tempLinkDir);

      // Should load only cognitive link files
      expect(loadedLinks).toHaveLength(3);

      const commitHashes = loadedLinks.map(l => l.commitHash);
      expect(commitHashes).toContain('aaa1111');
      expect(commitHashes).toContain('bbb2222');
      expect(commitHashes).toContain('ccc3333');
    });

    it('should filter files correctly by prefix and extension', async () => {
      fs.mkdirSync(tempLinkDir, { recursive: true });

      // Create files with different patterns
      const validLink: CognitiveLink = {
        commitHash: 'valid123',
        sessionId: 'test',
        reasoningChain: 'test',
        userPrompt: 'test',
        source: 'agent_swarm'
      };

      await saveCognitiveLink(validLink, tempLinkDir);

      // Create files that should be filtered out
      fs.writeFileSync(path.join(tempLinkDir, 'cognitive_link_invalid.txt'), 'not json', 'utf8');
      fs.writeFileSync(path.join(tempLinkDir, 'wrong_prefix_abc1234.json'), '{}', 'utf8');
      fs.writeFileSync(path.join(tempLinkDir, 'README.md'), '# Test', 'utf8');

      const loadedLinks = loadCognitiveLinks(tempLinkDir);

      // Should only load the valid cognitive link file
      expect(loadedLinks).toHaveLength(1);
      expect(loadedLinks[0].commitHash).toBe('valid123');
    });
  });

  describe('extractKeyReasoningSteps - Edge Cases', () => {
    it('should handle empty string reasoning chain', () => {
      const steps = extractKeyReasoningSteps('');
      expect(steps).toEqual([]);
    });

    it('should handle reasoning with only short steps', () => {
      const reasoningChain = 'a → b → c → d';
      const steps = extractKeyReasoningSteps(reasoningChain);

      // All steps are too short (< 10 chars)
      expect(steps).toEqual([]);
    });

    it('should handle reasoning with redundant prefixes', () => {
      const reasoningChain = 'Initial analysis complete → then continue processing → next validate results → and finalize';
      const steps = extractKeyReasoningSteps(reasoningChain);

      // Should filter out steps starting with 'then', 'next', 'and'
      expect(steps).toHaveLength(1);
      expect(steps[0]).toBe('Initial analysis complete');
    });

    it('should handle newline-separated reasoning', () => {
      const reasoningChain = `First reasoning step here
Second important step
Third critical decision
also this should be filtered`;

      const steps = extractKeyReasoningSteps(reasoningChain);

      expect(steps.length).toBe(3);
      expect(steps).toContain('First reasoning step here');
      expect(steps).toContain('Second important step');
      expect(steps).toContain('Third critical decision');
      expect(steps).not.toContain('also this should be filtered');
    });

    it('should handle mixed arrow and newline separators', () => {
      const reasoningChain = `Step one analysis
Step two → Step three evaluation
Step four conclusion`;

      const steps = extractKeyReasoningSteps(reasoningChain);

      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some(s => s.includes('Step one'))).toBe(true);
      expect(steps.some(s => s.includes('Step four'))).toBe(true);
    });
  });

  describe('createCognitiveTrace - Format Validation', () => {
    it('should create trace with all sections for agent_swarm source', () => {
      const link: CognitiveLink = {
        commitHash: 'full123',
        sessionId: 'session-full',
        reasoningChain: 'Long reasoning step one → Another important reasoning decision',
        userPrompt: 'Create a comprehensive test suite',
        source: 'agent_swarm'
      };

      const trace = createCognitiveTrace(link);

      // Verify all expected sections
      expect(trace).toContain('=== COGNITIVE TRACE ===');
      expect(trace).toContain('Commit: full123');
      expect(trace).toContain('Source: agent_swarm');
      expect(trace).toContain('Session ID: session-full');
      expect(trace).toContain('--- Original Prompt ---');
      expect(trace).toContain('Create a comprehensive test suite');
      expect(trace).toContain('--- Reasoning Chain ---');
      expect(trace).toContain('=== END TRACE ===');
    });

    it('should handle agent_swarm link with no prompt', () => {
      const link: CognitiveLink = {
        commitHash: 'noprompt',
        sessionId: 'session-noprompt',
        reasoningChain: 'Some reasoning here',
        userPrompt: null,
        source: 'agent_swarm'
      };

      const trace = createCognitiveTrace(link);

      expect(trace).toContain('Session ID: session-noprompt');
      expect(trace).not.toContain('--- Original Prompt ---');
      expect(trace).toContain('--- Reasoning Chain ---');
    });

    it('should handle agent_swarm link with no reasoning', () => {
      const link: CognitiveLink = {
        commitHash: 'noreasoning',
        sessionId: 'session-noreasoning',
        reasoningChain: null,
        userPrompt: 'Test prompt',
        source: 'agent_swarm'
      };

      const trace = createCognitiveTrace(link);

      expect(trace).toContain('Session ID: session-noreasoning');
      expect(trace).toContain('--- Original Prompt ---');
      expect(trace).not.toContain('--- Reasoning Chain ---');
    });

    it('should format reasoning steps with numbering', () => {
      const link: CognitiveLink = {
        commitHash: 'numbered',
        sessionId: 'session-numbered',
        reasoningChain: 'First step with details → Second step with more info → Third step concluding',
        userPrompt: 'Test',
        source: 'agent_swarm'
      };

      const trace = createCognitiveTrace(link);

      // Should have numbered steps
      expect(trace).toMatch(/1\.\s+/);
      expect(trace).toMatch(/2\.\s+/);
      expect(trace).toMatch(/3\.\s+/);
    });
  });

  describe('Integration - Commit Linking Workflow', () => {
    it('should handle complete workflow with multiple commits and sessions', async () => {
      // Setup: Create multiple sessions
      const session1: AgentSession = {
        sessionId: 'workflow-session-1',
        startTime: '2025-12-09T10:00:00.000Z',
        commits: ['abc1234567890'],
        reasoning: 'Implement feature X → Test feature X → Deploy feature X',
        prompt: 'Add feature X to the system'
      };

      const session2: AgentSession = {
        sessionId: 'workflow-session-2',
        startTime: '2025-12-09T12:00:00.000Z',
        commits: ['def9876543210'],
        reasoning: 'Fix bug Y → Verify fix → Update tests',
        prompt: 'Fix critical bug Y'
      };

      addSessionToAgentDb(session1, tempDbPath);
      addSessionToAgentDb(session2, tempDbPath);

      // Test: Link commits and save (use distinct commit hashes)
      const link1 = await linkToAgentDB(
        new Date('2025-12-09T10:15:00.000Z'),
        'abc1234567890',
        tempDbPath
      );

      const link2 = await linkToAgentDB(
        new Date('2025-12-09T12:30:00.000Z'),
        'def9876543210',
        tempDbPath
      );

      // Verify links
      expect(link1.sessionId).toBe('workflow-session-1');
      expect(link2.sessionId).toBe('workflow-session-2');

      // Save links (these will have distinct filenames)
      await saveCognitiveLink(link1, tempLinkDir);
      await saveCognitiveLink(link2, tempLinkDir);

      // Load and verify
      const loadedLinks = loadCognitiveLinks(tempLinkDir);
      expect(loadedLinks).toHaveLength(2);

      // Verify both commits are present
      const commitHashes = loadedLinks.map(l => l.commitHash);
      expect(commitHashes).toContain('abc1234567890');
      expect(commitHashes).toContain('def9876543210');

      // Generate traces
      const trace1 = createCognitiveTrace(link1);
      const trace2 = createCognitiveTrace(link2);

      expect(trace1).toContain('feature X');
      expect(trace2).toContain('bug Y');
    });
  });
});
