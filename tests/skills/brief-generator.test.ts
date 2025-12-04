/**
 * Unit Tests for Brief Generator Skill
 * Tests all brief generation functions including portfolio analysis and markdown formatting
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadShards,
  loadMetrics,
  analyzePortfolio,
  generateBriefMarkdown,
  generateBrief,
  batchGenerateBriefs,
  CognitiveMetrics,
  PortfolioBriefData,
  BriefGeneratorResult
} from '../../src/skills/brief-generator';
import { ProjectShard } from '../../src/skills/shard-generator';

describe('Brief Generator Skill', () => {
  let tempDir: string;
  let shardDir: string;
  let outputDir: string;
  let metricsPath: string;

  beforeEach(() => {
    // Create temporary directories
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brief-test-'));
    shardDir = path.join(tempDir, 'shards');
    outputDir = path.join(tempDir, 'output');
    metricsPath = path.join(tempDir, 'cognitive_metrics.json');

    fs.mkdirSync(shardDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper function to create mock shard
  function createMockShard(
    project: string,
    cluster: string,
    alignmentScore: number,
    status: 'ACTIVE' | 'DORMANT' = 'ACTIVE',
    driftAlert: boolean = false
  ): ProjectShard {
    return {
      project,
      cluster,
      alignmentScore,
      driftAlert,
      lastIntent: `Implement features for ${project}`,
      executionSummary: `Working on ${project} implementation`,
      rawCommit: 'abc1234 Initial commit',
      source: alignmentScore > 0.8 ? 'agent_swarm' : 'manual_override',
      metadata: {
        timestamp: new Date().toISOString(),
        commitHash: 'abc1234',
        sessionId: driftAlert ? undefined : 'session-001',
        commitCount7d: status === 'ACTIVE' ? 5 : 0,
        status
      }
    };
  }

  // Helper function to create mock metrics
  function createMockMetrics(
    totalProjects: number = 5,
    activeProjects: number = 3,
    driftAlerts: number = 1
  ): CognitiveMetrics {
    return {
      timestamp: new Date().toISOString(),
      totalProjects,
      activeProjects,
      dormantProjects: totalProjects - activeProjects,
      averageAlignment: 0.82,
      driftAlerts,
      agentDrivenPercentage: 0.65,
      clusterDistribution: {
        'Experience': 2,
        'Core Systems': 2,
        'Infra': 1
      },
      precisionScore: 0.85
    };
  }

  describe('loadShards', () => {
    it('should load all shard files from directory', () => {
      // Create mock shard files
      const shard1 = createMockShard('project-a', 'Experience', 0.9);
      const shard2 = createMockShard('project-b', 'Core Systems', 0.75);

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'project-b_shard.json'),
        JSON.stringify(shard2, null, 2)
      );

      const shards = loadShards(shardDir);

      expect(shards).toHaveLength(2);
      expect(shards[0].project).toBe('project-a');
      expect(shards[1].project).toBe('project-b');
    });

    it('should return empty array if directory does not exist', () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');
      const shards = loadShards(nonExistentDir);

      expect(shards).toEqual([]);
    });

    it('should only load files ending with _shard.json', () => {
      const shard1 = createMockShard('project-a', 'Experience', 0.9);

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'other-file.json'),
        JSON.stringify({ test: 'data' })
      );
      fs.writeFileSync(
        path.join(shardDir, 'readme.txt'),
        'Some text'
      );

      const shards = loadShards(shardDir);

      expect(shards).toHaveLength(1);
      expect(shards[0].project).toBe('project-a');
    });
  });

  describe('loadMetrics', () => {
    it('should load metrics from JSON file', () => {
      const mockMetrics = createMockMetrics();
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      const metrics = loadMetrics(metricsPath);

      expect(metrics.totalProjects).toBe(5);
      expect(metrics.activeProjects).toBe(3);
      expect(metrics.driftAlerts).toBe(1);
      expect(metrics.precisionScore).toBe(0.85);
    });

    it('should return default metrics if file does not exist', () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');
      const metrics = loadMetrics(nonExistentPath);

      expect(metrics.totalProjects).toBe(0);
      expect(metrics.activeProjects).toBe(0);
      expect(metrics.dormantProjects).toBe(0);
      expect(metrics.averageAlignment).toBe(0);
      expect(metrics.precisionScore).toBe(0);
    });
  });

  describe('analyzePortfolio', () => {
    it('should identify red list projects (low alignment and drift)', () => {
      const shards: ProjectShard[] = [
        createMockShard('good-project', 'Experience', 0.92, 'ACTIVE', false),
        createMockShard('drift-project', 'Core Systems', 0.75, 'ACTIVE', true),
        createMockShard('low-alignment', 'Infra', 0.55, 'ACTIVE', false)
      ];

      const metrics = createMockMetrics(3, 3, 1);
      const data = analyzePortfolio(shards, metrics);

      expect(data.redList).toHaveLength(2);
      expect(data.redList.map(s => s.project)).toContain('drift-project');
      expect(data.redList.map(s => s.project)).toContain('low-alignment');
      // Red list should be sorted by alignment score (ascending)
      expect(data.redList[0].alignmentScore).toBeLessThanOrEqual(data.redList[1].alignmentScore);
    });

    it('should identify top performers (high alignment, active)', () => {
      const shards: ProjectShard[] = [
        createMockShard('top-1', 'Experience', 0.95, 'ACTIVE', false),
        createMockShard('top-2', 'Core Systems', 0.92, 'ACTIVE', false),
        createMockShard('top-3', 'Experience', 0.88, 'ACTIVE', false),
        createMockShard('dormant-high', 'Infra', 0.93, 'DORMANT', false),
        createMockShard('low-project', 'Infra', 0.65, 'ACTIVE', false)
      ];

      const metrics = createMockMetrics(5, 4, 0);
      const data = analyzePortfolio(shards, metrics);

      expect(data.topPerformers).toHaveLength(3);
      expect(data.topPerformers[0].project).toBe('top-1');
      expect(data.topPerformers[0].alignmentScore).toBe(0.95);
      // Top performers should be sorted by alignment score (descending)
      expect(data.topPerformers[0].alignmentScore).toBeGreaterThanOrEqual(
        data.topPerformers[1].alignmentScore
      );
    });

    it('should limit top performers to 5 projects', () => {
      const shards: ProjectShard[] = [];
      for (let i = 1; i <= 10; i++) {
        shards.push(createMockShard(`project-${i}`, 'Experience', 0.85 + (i * 0.01), 'ACTIVE'));
      }

      const metrics = createMockMetrics(10, 10, 0);
      const data = analyzePortfolio(shards, metrics);

      expect(data.topPerformers.length).toBeLessThanOrEqual(5);
    });

    it('should group projects by cluster with accurate statistics', () => {
      const shards: ProjectShard[] = [
        createMockShard('exp-1', 'Experience', 0.9),
        createMockShard('exp-2', 'Experience', 0.8),
        createMockShard('core-1', 'Core Systems', 0.85),
        createMockShard('infra-1', 'Infra', 0.75)
      ];

      const metrics = createMockMetrics(4, 4, 0);
      const data = analyzePortfolio(shards, metrics);

      expect(data.clusterAnalysis).toHaveLength(3);

      const expCluster = data.clusterAnalysis.find(c => c.cluster === 'Experience');
      expect(expCluster).toBeDefined();
      expect(expCluster!.count).toBe(2);
      expect(expCluster!.avgAlignment).toBeCloseTo(0.85, 10); // (0.9 + 0.8) / 2
      expect(expCluster!.projects).toEqual(['exp-1', 'exp-2']);
    });

    it('should sort clusters by project count descending', () => {
      const shards: ProjectShard[] = [
        createMockShard('exp-1', 'Experience', 0.9),
        createMockShard('exp-2', 'Experience', 0.8),
        createMockShard('exp-3', 'Experience', 0.85),
        createMockShard('core-1', 'Core Systems', 0.85),
        createMockShard('infra-1', 'Infra', 0.75)
      ];

      const metrics = createMockMetrics(5, 5, 0);
      const data = analyzePortfolio(shards, metrics);

      expect(data.clusterAnalysis[0].cluster).toBe('Experience');
      expect(data.clusterAnalysis[0].count).toBe(3);
    });
  });

  describe('generateBriefMarkdown', () => {
    it('should generate valid markdown with all sections', () => {
      const shards: ProjectShard[] = [
        createMockShard('project-a', 'Experience', 0.92, 'ACTIVE'),
        createMockShard('project-b', 'Core Systems', 0.65, 'ACTIVE', true)
      ];

      const metrics = createMockMetrics(2, 2, 1);
      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      // Check key sections
      expect(markdown).toContain('# Portfolio Brief');
      expect(markdown).toContain('## 🎯 Global Precision Score');
      expect(markdown).toContain('## 📊 Executive Summary');
      expect(markdown).toContain('## 🚨 Red List (Requires Attention)');
      expect(markdown).toContain('## 📦 Cluster Distribution');
      expect(markdown).toContain('## 🏆 Top Performers');
      expect(markdown).toContain('## 💡 Strategic Recommendations');
      expect(markdown).toContain('*Generated by Portfolio Cognitive Command*');
    });

    it('should display precision score as percentage', () => {
      const shards: ProjectShard[] = [createMockShard('project-a', 'Experience', 0.9)];
      const metrics = createMockMetrics(1, 1, 0);
      metrics.precisionScore = 0.877;

      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('**87.7%**');
    });

    it('should show "no projects require attention" when red list is empty', () => {
      const shards: ProjectShard[] = [
        createMockShard('project-a', 'Experience', 0.92, 'ACTIVE'),
        createMockShard('project-b', 'Core Systems', 0.88, 'ACTIVE')
      ];

      const metrics = createMockMetrics(2, 2, 0);
      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('✅ **No projects require immediate attention**');
      expect(markdown).toContain('All projects are aligned with strategic intent.');
    });

    it('should list red list projects with drift alerts', () => {
      const shards: ProjectShard[] = [
        createMockShard('drift-project', 'Experience', 0.65, 'ACTIVE', true),
        createMockShard('low-project', 'Core Systems', 0.55, 'ACTIVE', false)
      ];

      const metrics = createMockMetrics(2, 2, 1);
      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('drift-project ⚠️ DRIFT');
      expect(markdown).toContain('low-project');
      expect(markdown).toContain('**Recommendation:** Review implementation against stated intent');
    });

    it('should generate strategic recommendations for drift alerts', () => {
      const shards: ProjectShard[] = [
        createMockShard('project-a', 'Experience', 0.75, 'ACTIVE', true)
      ];

      const metrics = createMockMetrics(1, 1, 1);
      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('**Address Drift Alerts:**');
      expect(markdown).toContain('project(s) showing drift');
    });

    it('should generate recommendations for dormant projects', () => {
      const shards: ProjectShard[] = [
        createMockShard('active-project', 'Experience', 0.9, 'ACTIVE'),
        createMockShard('dormant-project', 'Core Systems', 0.8, 'DORMANT')
      ];

      const metrics = createMockMetrics(2, 1, 0);
      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('**Revive Dormant Projects:**');
      expect(markdown).toContain('are dormant');
    });

    it('should show excellent health message when all metrics are good', () => {
      const shards: ProjectShard[] = [
        createMockShard('project-a', 'Experience', 0.92, 'ACTIVE'),
        createMockShard('project-b', 'Core Systems', 0.88, 'ACTIVE')
      ];

      const metrics: CognitiveMetrics = {
        timestamp: new Date().toISOString(),
        totalProjects: 2,
        activeProjects: 2,
        dormantProjects: 0,
        averageAlignment: 0.9,
        driftAlerts: 0,
        agentDrivenPercentage: 0.85,
        clusterDistribution: { 'Experience': 1, 'Core Systems': 1 },
        precisionScore: 0.9
      };

      const data = analyzePortfolio(shards, metrics);
      const markdown = generateBriefMarkdown(data);

      expect(markdown).toContain('✅ **Portfolio Health Excellent:**');
    });
  });

  describe('generateBrief', () => {
    it('should generate brief and save to file', () => {
      // Create mock data
      const shard1 = createMockShard('project-a', 'Experience', 0.9);
      const shard2 = createMockShard('project-b', 'Core Systems', 0.75);

      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );
      fs.writeFileSync(
        path.join(shardDir, 'project-b_shard.json'),
        JSON.stringify(shard2, null, 2)
      );

      const mockMetrics = createMockMetrics(2, 2, 0);
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      // Generate brief
      const result: BriefGeneratorResult = generateBrief(shardDir, metricsPath, outputDir);

      // Verify result
      expect(result.filename).toMatch(/^Portfolio_Brief_\d{4}-\d{2}-\d{2}\.md$/);
      expect(fs.existsSync(result.filepath)).toBe(true);
      expect(result.precisionScore).toBe(0.85);

      // Verify file content
      const content = fs.readFileSync(result.filepath, 'utf8');
      expect(content).toContain('# Portfolio Brief');
      expect(content).toContain('project-a');
      expect(content).toContain('project-b');
    });

    it('should create output directory if it does not exist', () => {
      const newOutputDir = path.join(tempDir, 'new-output');
      expect(fs.existsSync(newOutputDir)).toBe(false);

      const shard1 = createMockShard('project-a', 'Experience', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const mockMetrics = createMockMetrics(1, 1, 0);
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      generateBrief(shardDir, metricsPath, newOutputDir);

      expect(fs.existsSync(newOutputDir)).toBe(true);
    });

    it('should return accurate statistics in result', () => {
      const shards: ProjectShard[] = [
        createMockShard('top-1', 'Experience', 0.95, 'ACTIVE'),
        createMockShard('top-2', 'Core Systems', 0.92, 'ACTIVE'),
        createMockShard('low-1', 'Infra', 0.65, 'ACTIVE', true)
      ];

      shards.forEach(shard => {
        fs.writeFileSync(
          path.join(shardDir, `${shard.project}_shard.json`),
          JSON.stringify(shard, null, 2)
        );
      });

      const mockMetrics = createMockMetrics(3, 3, 1);
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      const result = generateBrief(shardDir, metricsPath, outputDir);

      expect(result.redListCount).toBe(1);
      expect(result.topPerformersCount).toBe(2);
      expect(result.clusterCount).toBe(3);
    });
  });

  describe('batchGenerateBriefs', () => {
    it('should generate multiple briefs', () => {
      const shard1 = createMockShard('project-a', 'Experience', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const mockMetrics = createMockMetrics(1, 1, 0);
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      const results = batchGenerateBriefs(shardDir, metricsPath, outputDir, 3);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(fs.existsSync(result.filepath)).toBe(true);
        expect(result.precisionScore).toBe(0.85);
      });
    });

    it('should default to 1 day if days parameter not provided', () => {
      const shard1 = createMockShard('project-a', 'Experience', 0.9);
      fs.writeFileSync(
        path.join(shardDir, 'project-a_shard.json'),
        JSON.stringify(shard1, null, 2)
      );

      const mockMetrics = createMockMetrics(1, 1, 0);
      fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2));

      const results = batchGenerateBriefs(shardDir, metricsPath, outputDir);

      expect(results).toHaveLength(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty shards array gracefully', () => {
      const metrics = createMockMetrics(0, 0, 0);
      const data = analyzePortfolio([], metrics);

      expect(data.redList).toHaveLength(0);
      expect(data.topPerformers).toHaveLength(0);
      expect(data.clusterAnalysis).toHaveLength(0);
    });

    it('should handle shards with missing metadata', () => {
      const shards: ProjectShard[] = [
        {
          project: 'incomplete-project',
          cluster: 'Experience',
          alignmentScore: 0.8,
          driftAlert: false,
          lastIntent: 'Test intent',
          executionSummary: 'Test summary',
          rawCommit: 'abc123',
          source: 'manual_override',
          metadata: undefined as any
        }
      ];

      const metrics = createMockMetrics(1, 1, 0);
      const data = analyzePortfolio(shards, metrics);

      // Should not crash
      expect(data.shards).toHaveLength(1);
    });

    it('should truncate long intent text in markdown', () => {
      const longIntent = 'A'.repeat(200);
      const shard = createMockShard('project-a', 'Experience', 0.6);
      shard.lastIntent = longIntent;

      const metrics = createMockMetrics(1, 1, 0);
      const data = analyzePortfolio([shard], metrics);
      const markdown = generateBriefMarkdown(data);

      // Should be truncated to 100 chars + '...'
      expect(markdown).toContain('A'.repeat(97) + '...');
      expect(markdown).not.toContain(longIntent);
    });

    it('should handle projects with same alignment score', () => {
      const shards: ProjectShard[] = [
        createMockShard('project-a', 'Experience', 0.9, 'ACTIVE'),
        createMockShard('project-b', 'Core Systems', 0.9, 'ACTIVE'),
        createMockShard('project-c', 'Infra', 0.9, 'ACTIVE')
      ];

      const metrics = createMockMetrics(3, 3, 0);
      const data = analyzePortfolio(shards, metrics);

      // All should be in top performers (no crash)
      expect(data.topPerformers.length).toBeGreaterThan(0);
    });
  });
});
