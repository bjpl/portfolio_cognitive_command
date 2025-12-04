/**
 * Unit Tests for Ledger Generator Skill
 * Tests ledger generation, commit correlation, and verification logging
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateLedger,
  loadLedger,
  listLedgers,
  getLedgerSummary,
  LedgerGeneratorResult,
  LedgerEntry,
  ClusterLedger,
  ProjectLedger
} from '../../src/skills/ledger-generator';
import { ProjectShard } from '../../src/skills/shard-generator';
import { AgentDatabase, AgentSession } from '../../src/skills/cognitive-linker';

describe('Ledger Generator Skill', () => {
  let tempDir: string;
  let shardDir: string;
  let outputDir: string;
  let agentDbPath: string;

  beforeEach(() => {
    // Create temporary directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-test-'));
    shardDir = path.join(tempDir, 'shards');
    outputDir = path.join(tempDir, 'output');
    agentDbPath = path.join(tempDir, 'agentdb.json');

    fs.mkdirSync(shardDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper: Create mock shard
  function createMockShard(
    project: string,
    cluster: string,
    commitHash: string,
    alignmentScore: number,
    status: 'ACTIVE' | 'DORMANT' = 'ACTIVE',
    driftAlert: boolean = false,
    source: 'agent_swarm' | 'manual_override' = 'agent_swarm'
  ): ProjectShard {
    return {
      project,
      cluster,
      alignmentScore,
      driftAlert,
      lastIntent: `Implement features for ${project}`,
      executionSummary: `Working on ${project}`,
      rawCommit: `${commitHash} Initial commit message`,
      source,
      metadata: {
        timestamp: new Date().toISOString(),
        commitHash,
        sessionId: source === 'agent_swarm' ? `session-${commitHash}` : undefined,
        commitCount7d: status === 'ACTIVE' ? 5 : 0,
        status
      }
    };
  }

  // Helper: Create mock agent session
  function createMockSession(
    sessionId: string,
    commits: string[],
    reasoning: string,
    outcome?: string
  ): AgentSession {
    return {
      sessionId,
      startTime: new Date().toISOString(),
      commits,
      reasoning,
      prompt: 'Test prompt',
      outcome
    };
  }

  // Helper: Create mock AgentDB
  function createMockAgentDB(sessions: AgentSession[]): AgentDatabase {
    return {
      sessions,
      lastUpdated: new Date().toISOString()
    };
  }

  describe('generateLedger', () => {
    it('should generate ledger with correct structure', async () => {
      // Create mock shards
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      const shard2 = createMockShard('project-b', 'Core Systems', 'def5678', 0.85);

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'project-b_shard.json'),
        JSON.stringify(shard2, null, 2)
      );

      // Create mock AgentDB
      const agentDb = createMockAgentDB([
        createMockSession('session-abc1234', ['abc1234'], 'Implemented feature X', 'Success'),
        createMockSession('session-def5678', ['def5678'], 'Refactored module Y', 'Success')
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      // Generate ledger
      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      // Verify result structure
      expect(result.ledgerPath).toBeDefined();
      expect(fs.existsSync(result.ledgerPath)).toBe(true);
      expect(result.totalProjects).toBe(2);
      expect(result.totalCommits).toBe(2);
      expect(result.verifiedCommits).toBe(2);
      expect(result.clusters).toHaveLength(2);
    });

    it('should create output directory if it does not exist', async () => {
      const newOutputDir = path.join(tempDir, 'new-output');
      expect(fs.existsSync(newOutputDir)).toBe(false);

      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      await generateLedger({
        shardDir,
        agentDbPath,
        outputDir: newOutputDir
      });

      expect(fs.existsSync(newOutputDir)).toBe(true);
    });

    it('should handle missing AgentDB file gracefully', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const nonExistentDbPath = path.join(tempDir, 'nonexistent.json');

      const result = await generateLedger({
        shardDir,
        agentDbPath: nonExistentDbPath,
        outputDir
      });

      expect(result.totalProjects).toBe(1);
      expect(result.totalCommits).toBe(1);
      expect(result.verifiedCommits).toBe(0); // No sessions to verify against
    });

    it('should use default paths when options not provided', async () => {
      // This test verifies the function works with default paths
      // We'll create files in the expected default locations relative to tempDir
      const defaultShardDir = path.join(tempDir, 'output', 'docs', 'shards');
      const defaultAgentDbPath = path.join(tempDir, 'data', 'agentdb.json');
      const defaultOutputDir = path.join(tempDir, 'output', 'docs');

      fs.mkdirSync(defaultShardDir, { recursive: true });
      fs.mkdirSync(path.dirname(defaultAgentDbPath), { recursive: true });

      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(defaultShardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(defaultAgentDbPath, JSON.stringify(agentDb, null, 2));

      // Temporarily change working directory
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await generateLedger();
        expect(result.totalProjects).toBe(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should correctly correlate commits to agent sessions', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      const shard2 = createMockShard('project-b', 'Core Systems', 'def5678', 0.85, 'ACTIVE', false, 'manual_override');

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'project-b_shard.json'),
        JSON.stringify(shard2, null, 2)
      );

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1234', ['abc1234'], 'Implemented feature X', 'Success')
        // No session for def5678 (manual override)
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      expect(result.totalCommits).toBe(2);
      expect(result.verifiedCommits).toBe(1); // Only abc1234 has session with outcome

      // Read ledger file to verify content
      const ledgerContent = fs.readFileSync(result.ledgerPath, 'utf8');
      expect(ledgerContent).toContain('abc1234');
      expect(ledgerContent).toContain('def5678');
      expect(ledgerContent).toContain('Implemented feature X');
      expect(ledgerContent).toContain('🤖 Agent Swarm');
      expect(ledgerContent).toContain('👤 Manual Override');
    });
  });

  describe('Ledger content and formatting', () => {
    it('should generate markdown with all required sections', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1234', ['abc1234'], 'Test reasoning', 'Success')
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const content = fs.readFileSync(result.ledgerPath, 'utf8');

      // Check main sections
      expect(content).toContain('# Portfolio Progress Ledger');
      expect(content).toContain('## Executive Summary');
      expect(content).toContain('## Cluster: Experience');
      expect(content).toContain('### Project: project-a');
      expect(content).toContain('#### Commit Verification Log');
      expect(content).toContain('## Audit Trail');
    });

    it('should include verification status for each commit', async () => {
      const shard1 = createMockShard('verified-project', 'Experience', 'abc1234', 0.9);
      const shard2 = createMockShard('unverified-project', 'Core Systems', 'def5678', 0.85);

      fs.writeFileSync(
        path.join(shardDir, 'verified-project_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'unverified-project_shard.json'),
        JSON.stringify(shard2, null, 2)
      );

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1234', ['abc1234'], 'Test reasoning', 'Success')
        // No session for def5678
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const content = fs.readFileSync(result.ledgerPath, 'utf8');

      expect(content).toContain('**Status:** VERIFIED');
      expect(content).toContain('**Status:** UNVERIFIED');
    });

    it('should group projects by cluster correctly', async () => {
      const shards = [
        createMockShard('exp-1', 'Experience', 'abc1', 0.9),
        createMockShard('exp-2', 'Experience', 'abc2', 0.85),
        createMockShard('core-1', 'Core Systems', 'def1', 0.88),
        createMockShard('infra-1', 'Infra', 'ghi1', 0.92)
      ];

      shards.forEach(shard => {
        fs.writeFileSync(
          path.join(shardDir, `${shard.project}_shard.json`),
          JSON.stringify(shard, null, 2)
        );
      });

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      expect(result.clusters).toHaveLength(3);

      const expCluster = result.clusters.find(c => c.cluster === 'Experience');
      expect(expCluster).toBeDefined();
      expect(expCluster!.projects).toHaveLength(2);
      expect(expCluster!.totalCommits).toBe(2);
    });

    it('should calculate alignment scores per cluster', async () => {
      const shards = [
        createMockShard('exp-1', 'Experience', 'abc1', 0.9),
        createMockShard('exp-2', 'Experience', 'abc2', 0.8)
      ];

      shards.forEach(shard => {
        fs.writeFileSync(
          path.join(shardDir, `${shard.project}_shard.json`),
          JSON.stringify(shard, null, 2)
        );
      });

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const expCluster = result.clusters.find(c => c.cluster === 'Experience');
      expect(expCluster!.alignmentScore).toBeCloseTo(0.85, 2); // (0.9 + 0.8) / 2
    });
  });

  describe('loadLedger', () => {
    it('should load existing ledger file', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const loadedContent = loadLedger(result.ledgerPath);

      expect(loadedContent).toContain('# Portfolio Progress Ledger');
      expect(loadedContent).toContain('project-a');
    });

    it('should throw error if ledger file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.md');

      expect(() => {
        loadLedger(nonExistentPath);
      }).toThrow('Ledger file not found');
    });
  });

  describe('listLedgers', () => {
    it('should list all ledger files in output directory', async () => {
      // Generate multiple ledgers
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      await generateLedger({ shardDir, agentDbPath, outputDir });
      await generateLedger({ shardDir, agentDbPath, outputDir });

      const ledgers = listLedgers(outputDir);

      expect(ledgers.length).toBeGreaterThanOrEqual(1);
      ledgers.forEach(ledgerPath => {
        expect(path.basename(ledgerPath)).toMatch(/^Portfolio_Progress_Ledger_\d{4}-\d{2}-\d{2}\.md$/);
      });
    });

    it('should return empty array if output directory does not exist', () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      const ledgers = listLedgers(nonExistentDir);

      expect(ledgers).toEqual([]);
    });

    it('should sort ledgers by date (most recent first)', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      // Generate ledgers
      await generateLedger({ shardDir, agentDbPath, outputDir });

      const ledgers = listLedgers(outputDir);
      expect(ledgers.length).toBeGreaterThan(0);

      // Most recent should be first
      if (ledgers.length > 1) {
        expect(ledgers[0] >= ledgers[1]).toBe(true);
      }
    });
  });

  describe('getLedgerSummary', () => {
    it('should extract summary statistics from ledger result', async () => {
      const shards = [
        createMockShard('project-a', 'Experience', 'abc1', 0.9),
        createMockShard('project-b', 'Core Systems', 'def2', 0.85)
      ];

      shards.forEach(shard => {
        fs.writeFileSync(
          path.join(shardDir, `${shard.project}_shard.json`),
          JSON.stringify(shard, null, 2)
        );
      });

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1', ['abc1'], 'Test', 'Success')
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const summary = getLedgerSummary(result);

      expect(summary.totalProjects).toBe(2);
      expect(summary.totalCommits).toBe(2);
      expect(summary.verifiedCommits).toBe(1);
      expect(summary.verificationRate).toBeCloseTo(50, 1);
      expect(summary.clusters).toHaveLength(2);
    });

    it('should handle zero commits gracefully', () => {
      const result: LedgerGeneratorResult = {
        ledgerPath: '/test/path',
        totalProjects: 0,
        totalCommits: 0,
        verifiedCommits: 0,
        clusters: [],
        generatedAt: new Date().toISOString()
      };

      const summary = getLedgerSummary(result);

      expect(summary.verificationRate).toBe(0);
    });

    it('should calculate verification rate correctly', async () => {
      const shards = [
        createMockShard('verified-1', 'Experience', 'abc1', 0.9),
        createMockShard('verified-2', 'Experience', 'abc2', 0.85),
        createMockShard('unverified', 'Core Systems', 'def1', 0.8)
      ];

      shards.forEach(shard => {
        fs.writeFileSync(
          path.join(shardDir, `${shard.project}_shard.json`),
          JSON.stringify(shard, null, 2)
        );
      });

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1', ['abc1'], 'Test', 'Success'),
        createMockSession('session-abc2', ['abc2'], 'Test', 'Success')
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const summary = getLedgerSummary(result);

      expect(summary.verificationRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle projects with no commits', async () => {
      // Create a shard but no AgentDB sessions
      const shard1 = createMockShard('project-a', 'Experience', 'unknown', 0.9);
      shard1.metadata!.commitHash = undefined as any;

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      expect(result.totalProjects).toBe(1);
    });

    it('should handle sessions with no outcome (PENDING status)', async () => {
      const shard1 = createMockShard('project-a', 'Experience', 'abc1234', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const agentDb = createMockAgentDB([
        createMockSession('session-abc1234', ['abc1234'], 'In progress') // No outcome
      ]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir,
        agentDbPath,
        outputDir
      });

      const content = fs.readFileSync(result.ledgerPath, 'utf8');
      expect(content).toContain('**Status:** PENDING');
      expect(result.verifiedCommits).toBe(0); // Not verified without outcome
    });

    it('should handle aggregated shards file format', async () => {
      // Create shards directory
      const testShardDir = path.join(tempDir, 'output', 'docs', 'shards');
      fs.mkdirSync(testShardDir, { recursive: true });

      // Create aggregated shards file (one level up from shards directory)
      const aggregatedData = {
        timestamp: new Date().toISOString(),
        shards: [
          {
            project: 'aggregated-project',
            cluster: 'Experience',
            alignment_score: 90,
            drift_alert: false,
            last_intent: 'Test intent',
            execution_summary: 'Test summary',
            raw_commit: 'xyz9999 Commit message',
            source: 'agent_swarm'
          }
        ]
      };

      const aggregatedPath = path.join(tempDir, 'output', 'docs', 'project_shards.json');
      fs.writeFileSync(aggregatedPath, JSON.stringify(aggregatedData, null, 2));

      const agentDb = createMockAgentDB([]);
      fs.writeFileSync(agentDbPath, JSON.stringify(agentDb, null, 2));

      const result = await generateLedger({
        shardDir: testShardDir,
        agentDbPath,
        outputDir
      });

      // Should load from aggregated file since shards dir is empty
      expect(result.totalProjects).toBeGreaterThanOrEqual(1);
      expect(result.clusters.length).toBeGreaterThan(0);
    });
  });
});
