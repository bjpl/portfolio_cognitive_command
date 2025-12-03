/**
 * Tests for shard-generator.ts
 * Tests project shard generation and aggregation
 */

import {
  generateShard,
  batchGenerateShards,
  aggregateByCluster,
  filterByStatus,
  sortByAlignment,
  getDriftAlerts,
  calculateStats,
  ProjectShard
} from '../src/skills/shard-generator';
import { RepoScanResult } from '../src/skills/repo-scanner';
import { SemanticEmbedding } from '../src/skills/semantic-analyzer';
import { CognitiveLink } from '../src/skills/cognitive-linker';
import { DriftResult } from '../src/skills/drift-detector';

describe('ShardGenerator', () => {
  // Mock data matching actual interfaces
  const mockRepo: RepoScanResult = {
    name: 'test-project',
    path: '/test/path',
    status: 'ACTIVE',
    commits7d: 10,
    lastCommit: {
      hash: 'abc1234',
      message: 'feat: add new feature',
      date: '2025-01-01T12:00:00Z'
    }
  };

  const mockEmbedding: SemanticEmbedding = {
    vector: new Array(1536).fill(0.5),
    cluster: 'Core Systems',
    confidence: 0.85
  };

  const mockLink: CognitiveLink = {
    commitHash: 'abc1234',
    sessionId: 'session-12345678',
    reasoningChain: 'Analyzed requirements → Designed solution → Implemented feature',
    userPrompt: 'Add new feature',
    source: 'agent_swarm'
  };

  const mockDrift: DriftResult = {
    alignmentScore: 0.88,
    driftAlert: false,
    highPrecision: true,
    intentVector: new Array(1536).fill(0.5),
    implementationVector: new Array(1536).fill(0.6)
  };

  describe('generateShard', () => {
    it('should generate shard with required properties', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard).toHaveProperty('project');
      expect(shard).toHaveProperty('cluster');
      expect(shard).toHaveProperty('alignmentScore');
      expect(shard).toHaveProperty('driftAlert');
      expect(shard).toHaveProperty('lastIntent');
      expect(shard).toHaveProperty('executionSummary');
      expect(shard).toHaveProperty('rawCommit');
      expect(shard).toHaveProperty('source');
    });

    it('should use repo name as project name', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.project).toBe('test-project');
    });

    it('should use embedding cluster', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.cluster).toBe('Core Systems');
    });

    it('should use drift alignment score when provided', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink, mockDrift);

      expect(shard.alignmentScore).toBe(0.88);
      expect(shard.driftAlert).toBe(false);
    });

    it('should default to high alignment when no drift provided', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.alignmentScore).toBe(0.95);
      expect(shard.driftAlert).toBe(false);
    });

    it('should include raw commit message', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.rawCommit).toBe('feat: add new feature');
    });

    it('should set source from cognitive link', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.source).toBe('agent_swarm');
    });

    it('should include metadata', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.metadata).toBeDefined();
      expect(shard.metadata?.timestamp).toBe('2025-01-01T12:00:00Z');
      expect(shard.metadata?.commitHash).toBe('abc1234');
      expect(shard.metadata?.commitCount7d).toBe(10);
      expect(shard.metadata?.status).toBe('ACTIVE');
    });

    it('should include session ID in metadata when available', () => {
      const shard = generateShard(mockRepo, mockEmbedding, mockLink);

      expect(shard.metadata?.sessionId).toBe('session-12345678');
    });
  });

  describe('batchGenerateShards', () => {
    it('should generate shards for multiple repos', () => {
      const repoData = [
        { repo: mockRepo, embedding: mockEmbedding, link: mockLink },
        { repo: { ...mockRepo, name: 'project-2' }, embedding: mockEmbedding, link: mockLink }
      ];

      const shards = batchGenerateShards(repoData);

      expect(shards.length).toBe(2);
    });

    it('should handle empty array', () => {
      const shards = batchGenerateShards([]);

      expect(shards).toEqual([]);
    });

    it('should include drift when provided', () => {
      const repoData = [
        { repo: mockRepo, embedding: mockEmbedding, link: mockLink, drift: mockDrift }
      ];

      const shards = batchGenerateShards(repoData);

      expect(shards[0].alignmentScore).toBe(0.88);
    });
  });

  describe('aggregateByCluster', () => {
    const shards: ProjectShard[] = [
      { ...generateShard(mockRepo, mockEmbedding, mockLink), cluster: 'Experience' },
      { ...generateShard(mockRepo, mockEmbedding, mockLink), cluster: 'Core Systems' },
      { ...generateShard(mockRepo, mockEmbedding, mockLink), cluster: 'Experience' },
      { ...generateShard(mockRepo, mockEmbedding, mockLink), cluster: 'Infra' }
    ];

    it('should group shards by cluster', () => {
      const grouped = aggregateByCluster(shards);

      expect(Object.keys(grouped)).toContain('Experience');
      expect(Object.keys(grouped)).toContain('Core Systems');
      expect(Object.keys(grouped)).toContain('Infra');
    });

    it('should count shards correctly per cluster', () => {
      const grouped = aggregateByCluster(shards);

      expect(grouped['Experience'].length).toBe(2);
      expect(grouped['Core Systems'].length).toBe(1);
      expect(grouped['Infra'].length).toBe(1);
    });

    it('should handle empty array', () => {
      const grouped = aggregateByCluster([]);

      expect(Object.keys(grouped).length).toBe(0);
    });
  });

  describe('filterByStatus', () => {
    const activeRepo = { ...mockRepo, status: 'ACTIVE' as const };
    const dormantRepo = { ...mockRepo, status: 'DORMANT' as const, commits7d: 0 };

    const shards: ProjectShard[] = [
      generateShard(activeRepo, mockEmbedding, mockLink),
      generateShard(dormantRepo, mockEmbedding, mockLink),
      generateShard(activeRepo, mockEmbedding, mockLink)
    ];

    it('should filter active shards', () => {
      const active = filterByStatus(shards, 'ACTIVE');

      expect(active.length).toBe(2);
      active.forEach(s => expect(s.metadata?.status).toBe('ACTIVE'));
    });

    it('should filter dormant shards', () => {
      const dormant = filterByStatus(shards, 'DORMANT');

      expect(dormant.length).toBe(1);
      dormant.forEach(s => expect(s.metadata?.status).toBe('DORMANT'));
    });

    it('should return empty for no matches', () => {
      const onlyActive = [generateShard(activeRepo, mockEmbedding, mockLink)];
      const dormant = filterByStatus(onlyActive, 'DORMANT');

      expect(dormant.length).toBe(0);
    });
  });

  describe('sortByAlignment', () => {
    it('should sort shards by alignment score descending', () => {
      const shards: ProjectShard[] = [
        { ...generateShard(mockRepo, mockEmbedding, mockLink), alignmentScore: 0.5 },
        { ...generateShard(mockRepo, mockEmbedding, mockLink), alignmentScore: 0.9 },
        { ...generateShard(mockRepo, mockEmbedding, mockLink), alignmentScore: 0.7 }
      ];

      const sorted = sortByAlignment(shards);

      expect(sorted[0].alignmentScore).toBe(0.9);
      expect(sorted[1].alignmentScore).toBe(0.7);
      expect(sorted[2].alignmentScore).toBe(0.5);
    });

    it('should not modify original array', () => {
      const shards: ProjectShard[] = [
        { ...generateShard(mockRepo, mockEmbedding, mockLink), alignmentScore: 0.5 },
        { ...generateShard(mockRepo, mockEmbedding, mockLink), alignmentScore: 0.9 }
      ];

      const sorted = sortByAlignment(shards);

      expect(shards[0].alignmentScore).toBe(0.5);
      expect(sorted[0].alignmentScore).toBe(0.9);
    });

    it('should handle empty array', () => {
      const sorted = sortByAlignment([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('getDriftAlerts', () => {
    it('should filter shards with drift alerts', () => {
      const shards: ProjectShard[] = [
        { ...generateShard(mockRepo, mockEmbedding, mockLink), driftAlert: true },
        { ...generateShard(mockRepo, mockEmbedding, mockLink), driftAlert: false },
        { ...generateShard(mockRepo, mockEmbedding, mockLink), driftAlert: true }
      ];

      const alerts = getDriftAlerts(shards);

      expect(alerts.length).toBe(2);
      alerts.forEach(s => expect(s.driftAlert).toBe(true));
    });

    it('should return empty for no drift alerts', () => {
      const shards: ProjectShard[] = [
        { ...generateShard(mockRepo, mockEmbedding, mockLink), driftAlert: false }
      ];

      const alerts = getDriftAlerts(shards);

      expect(alerts.length).toBe(0);
    });
  });

  describe('calculateStats', () => {
    const activeRepo = { ...mockRepo, status: 'ACTIVE' as const };
    const dormantRepo = { ...mockRepo, status: 'DORMANT' as const, commits7d: 0 };

    const shards: ProjectShard[] = [
      { ...generateShard(activeRepo, mockEmbedding, { ...mockLink, source: 'agent_swarm' }), alignmentScore: 0.8, driftAlert: false, cluster: 'Experience' },
      { ...generateShard(dormantRepo, mockEmbedding, { ...mockLink, source: 'manual_override' }), alignmentScore: 0.6, driftAlert: true, cluster: 'Core Systems' },
      { ...generateShard(activeRepo, mockEmbedding, { ...mockLink, source: 'agent_swarm' }), alignmentScore: 0.9, driftAlert: false, cluster: 'Experience' }
    ];

    it('should calculate total count', () => {
      const stats = calculateStats(shards);
      expect(stats.total).toBe(3);
    });

    it('should count active and dormant', () => {
      const stats = calculateStats(shards);
      expect(stats.active).toBe(2);
      expect(stats.dormant).toBe(1);
    });

    it('should count drift alerts', () => {
      const stats = calculateStats(shards);
      expect(stats.driftAlerts).toBe(1);
    });

    it('should calculate average alignment', () => {
      const stats = calculateStats(shards);
      expect(stats.averageAlignment).toBeCloseTo((0.8 + 0.6 + 0.9) / 3, 5);
    });

    it('should count agent driven vs manual', () => {
      const stats = calculateStats(shards);
      expect(stats.agentDriven).toBe(2);
      expect(stats.manualOverride).toBe(1);
    });

    it('should group by clusters', () => {
      const stats = calculateStats(shards);
      expect(stats.byClusters['Experience']).toBe(2);
      expect(stats.byClusters['Core Systems']).toBe(1);
    });

    it('should handle empty array', () => {
      const stats = calculateStats([]);
      expect(stats.total).toBe(0);
      expect(stats.averageAlignment).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing reasoning chain', () => {
      const linkNoReasoning: CognitiveLink = {
        commitHash: 'abc',
        sessionId: null,
        reasoningChain: null,
        userPrompt: null,
        source: 'manual_override'
      };

      const shard = generateShard(mockRepo, mockEmbedding, linkNoReasoning);

      expect(shard.lastIntent).toBe('feat: add new feature'); // Falls back to commit message
    });

    it('should handle long reasoning chains', () => {
      const longReasoning: CognitiveLink = {
        commitHash: 'abc',
        sessionId: 'test',
        reasoningChain: 'Step 1: ' + 'a'.repeat(200) + ' → Step 2: complete',
        userPrompt: 'test',
        source: 'agent_swarm'
      };

      const shard = generateShard(mockRepo, mockEmbedding, longReasoning);

      expect(shard.lastIntent.length).toBeLessThanOrEqual(150);
    });
  });
});
