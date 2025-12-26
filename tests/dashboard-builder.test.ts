/**
 * Tests for dashboard-builder.ts
 * Tests dashboard HTML generation and configuration building
 */

import {
  buildDashboardHTML,
  createDashboardConfig,
  saveDashboard,
  DashboardConfig
} from '../src/skills/dashboard-builder';
import { ProjectShard } from '../src/skills/shard-generator';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs for saveDashboard tests
jest.mock('fs');

describe('DashboardBuilder', () => {
  // Mock project shards for testing
  const mockShards: ProjectShard[] = [
    {
      project: 'test-project-1',
      cluster: 'Experience',
      alignmentScore: 0.85,
      driftAlert: false,
      lastIntent: 'Add feature',
      executionSummary: 'Implemented successfully',
      rawCommit: 'feat: add feature',
      source: 'agent_swarm',
      metadata: {
        timestamp: '2025-12-03T00:00:00Z',
        commitHash: 'abc123',
        commitCount7d: 5,
        status: 'ACTIVE'
      }
    },
    {
      project: 'test-project-2',
      cluster: 'Core Systems',
      alignmentScore: 0.65,
      driftAlert: true,
      lastIntent: 'Fix API endpoint',
      executionSummary: 'Partially completed',
      rawCommit: 'fix: update endpoint',
      source: 'manual_override',
      metadata: {
        timestamp: '2025-12-02T00:00:00Z',
        commitHash: 'def456',
        commitCount7d: 1,
        status: 'DORMANT'
      }
    },
    {
      project: 'test-project-3',
      cluster: 'Infra',
      alignmentScore: 0.92,
      driftAlert: false,
      lastIntent: 'Update CI/CD pipeline',
      executionSummary: 'Pipeline optimized',
      rawCommit: 'chore: update CI',
      source: 'agent_swarm',
      metadata: {
        timestamp: '2025-12-03T12:00:00Z',
        commitHash: 'ghi789',
        commitCount7d: 8,
        status: 'ACTIVE'
      }
    }
  ];

  describe('createDashboardConfig', () => {
    it('should create valid dashboard config from shards', () => {
      const config = createDashboardConfig(mockShards);

      expect(config).toHaveProperty('meta');
      expect(config).toHaveProperty('projects');
      expect(config).toHaveProperty('clusters');
    });

    it('should calculate correct metrics', () => {
      const config = createDashboardConfig(mockShards);

      expect(config.meta.totalProjects).toBe(3);
      expect(config.meta.active).toBe(2);
      expect(config.meta.dormant).toBe(1);
      expect(config.meta.driftAlerts).toBe(1);
    });

    it('should calculate precision score correctly', () => {
      const config = createDashboardConfig(mockShards);

      // (0.85 + 0.65 + 0.92) / 3 = 0.8066...
      expect(config.meta.precision).toBeCloseTo(0.8067, 3);
    });

    it('should include lastUpdated timestamp', () => {
      const config = createDashboardConfig(mockShards);

      expect(config.meta.lastUpdated).toBeDefined();
      expect(new Date(config.meta.lastUpdated).getTime()).toBeGreaterThan(0);
    });

    it('should group projects by cluster', () => {
      const config = createDashboardConfig(mockShards);

      expect(config.clusters.length).toBe(3);

      const experienceCluster = config.clusters.find(c => c.name === 'Experience');
      expect(experienceCluster).toBeDefined();
      expect(experienceCluster?.projects.length).toBe(1);
    });

    it('should calculate average alignment per cluster', () => {
      const config = createDashboardConfig(mockShards);

      const experienceCluster = config.clusters.find(c => c.name === 'Experience');
      expect(experienceCluster?.avgAlignment).toBeCloseTo(0.85, 2);

      const coreCluster = config.clusters.find(c => c.name === 'Core Systems');
      expect(coreCluster?.avgAlignment).toBeCloseTo(0.65, 2);
    });

    it('should handle empty shards array', () => {
      const config = createDashboardConfig([]);

      expect(config.meta.totalProjects).toBe(0);
      expect(config.meta.active).toBe(0);
      expect(config.meta.dormant).toBe(0);
      expect(config.meta.driftAlerts).toBe(0);
      expect(config.meta.precision).toBe(0);
      expect(config.clusters.length).toBe(0);
    });

    it('should handle shards without metadata', () => {
      const shardsNoMeta: ProjectShard[] = [
        {
          project: 'minimal-project',
          cluster: 'Experience',
          alignmentScore: 0.75,
          driftAlert: false,
          lastIntent: 'Test intent',
          executionSummary: 'Test summary',
          rawCommit: 'test: commit',
          source: 'agent_swarm'
        }
      ];

      const config = createDashboardConfig(shardsNoMeta);

      expect(config.meta.active).toBe(0);
      expect(config.meta.dormant).toBe(0);
      expect(config.meta.totalProjects).toBe(1);
    });
  });

  describe('buildDashboardHTML', () => {
    let testConfig: DashboardConfig;

    beforeEach(() => {
      testConfig = createDashboardConfig(mockShards);
    });

    it('should return valid HTML string', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include project count in HTML', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('3'); // Total projects
    });

    it('should include all cluster names', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('Experience');
      expect(html).toContain('Core Systems');
      expect(html).toContain('Infra');
    });

    it('should include drift alerts section', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('Drift Alerts');
    });

    it('should show drift alert count', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toMatch(/Drift Alerts.*\(1\)/s);
    });

    it('should display project names', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('test-project-1');
      expect(html).toContain('test-project-2');
      expect(html).toContain('test-project-3');
    });

    it('should include styles in output', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('<style>');
      expect(html).toContain('dashboard');
      expect(html).toContain('metric-card');
      expect(html).toContain('cluster-card');
    });

    it('should include scripts in output', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('<script>');
      expect(html).toContain('console.log');
    });

    it('should handle empty projects array', () => {
      const emptyConfig = createDashboardConfig([]);
      const html = buildDashboardHTML(emptyConfig);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('0'); // Zero projects
    });

    it('should escape special characters in intent and summary fields', () => {
      const specialShards: ProjectShard[] = [
        {
          project: 'test-project',
          cluster: 'Experience',
          alignmentScore: 0.8,
          driftAlert: false,
          lastIntent: 'Test & validate <html>',
          executionSummary: 'Done "successfully"',
          rawCommit: 'test: escape',
          source: 'agent_swarm'
        }
      ];

      const config = createDashboardConfig(specialShards);
      const html = buildDashboardHTML(config);

      // escapeHtml is only applied to lastIntent and executionSummary fields
      expect(html).toContain('&lt;');
      expect(html).toContain('&gt;');
      expect(html).toContain('&amp;');
    });

    it('should display metrics in dashboard', () => {
      const html = buildDashboardHTML(testConfig);

      // Dashboard shows health score
      expect(html).toContain('Portfolio Health');
    });

    it('should show active and dormant project counts', () => {
      const html = buildDashboardHTML(testConfig);

      // Dashboard shows active count in metrics panel
      expect(html).toContain('Active');
      expect(html).toContain('2');
    });

    it('should display projects correctly', () => {
      const html = buildDashboardHTML(testConfig);

      // Dashboard shows project names
      expect(html).toContain('test-project-1');
      expect(html).toContain('test-project-2');
      expect(html).toContain('test-project-3');
    });

    it('should mark drift projects with visual indicator', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toMatch(/drift-alert|DRIFT/i);
    });

    it('should show "no alerts" message when no drift detected', () => {
      const noDriftShards = mockShards.map(s => ({ ...s, driftAlert: false }));
      const config = createDashboardConfig(noDriftShards);
      const html = buildDashboardHTML(config);

      expect(html).toMatch(/No drift alerts|All projects aligned/i);
    });

    it('should include formatted timestamps', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('Last updated:');
    });

    it('should display source badges', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toMatch(/agent_swarm|Agent/i);
      expect(html).toMatch(/manual_override|Manual/i);
    });

    it('should render health or alignment bars', () => {
      const html = buildDashboardHTML(testConfig);

      // Dashboard renders progress bars with percentage widths
      expect(html).toMatch(/width:/);
    });

    it('should include dashboard title', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('Portfolio Cognitive Command');
    });

    it('should display status badges', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toMatch(/ACTIVE/);
      expect(html).toMatch(/DORMANT/);
    });

    it('should show cluster project counts', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toMatch(/Experience.*1\s+project/s);
      expect(html).toMatch(/Core Systems.*1\s+project/s);
      expect(html).toMatch(/Infra.*1\s+project/s);
    });

    it('should include meta viewport for responsive design', () => {
      const html = buildDashboardHTML(testConfig);

      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });
  });

  describe('saveDashboard', () => {
    const mockHtml = '<html><body>Test Dashboard</body></html>';
    const mockOutputPath = '/test/output/dashboard.html';

    beforeEach(() => {
      jest.clearAllMocks();
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation();
      (fs.writeFileSync as jest.Mock).mockImplementation();
    });

    it('should write HTML to file', () => {
      saveDashboard(mockHtml, mockOutputPath);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockOutputPath,
        mockHtml,
        'utf8'
      );
    });

    it('should create directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      saveDashboard(mockHtml, mockOutputPath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(mockOutputPath),
        { recursive: true }
      );
    });

    it('should not create directory if it exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      saveDashboard(mockHtml, mockOutputPath);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle nested directory paths', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const nestedPath = '/deep/nested/path/to/dashboard.html';

      saveDashboard(mockHtml, nestedPath);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(nestedPath),
        { recursive: true }
      );
    });
  });

  describe('HTML Structure Validation', () => {
    let html: string;

    beforeEach(() => {
      const config = createDashboardConfig(mockShards);
      html = buildDashboardHTML(config);
    });

    it('should have proper HTML structure', () => {
      expect(html).toMatch(/<html[^>]*>.*<\/html>/s);
      expect(html).toMatch(/<head>.*<\/head>/s);
      expect(html).toMatch(/<body>.*<\/body>/s);
    });

    it('should include charset declaration', () => {
      expect(html).toContain('charset="UTF-8"');
    });

    it('should have page title', () => {
      expect(html).toMatch(/<title>.*Portfolio Cognitive Command.*<\/title>/);
    });

    it('should have header section', () => {
      expect(html).toMatch(/<header[^>]*>.*<\/header>/s);
    });

    it('should have metrics panel section', () => {
      expect(html).toMatch(/metrics-panel/);
    });

    it('should have clusters section', () => {
      expect(html).toMatch(/clusters-section/);
    });

    it('should have projects table', () => {
      expect(html).toMatch(/<table[^>]*>.*<\/table>/s);
      expect(html).toMatch(/<thead>.*<\/thead>/s);
      // tbody exists with id attribute for JavaScript population
      expect(html).toContain('<tbody id="projectsTableBody">');
      expect(html).toContain('</tbody>');
    });

    it('should have drift alerts section', () => {
      expect(html).toMatch(/drift-alerts-section/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle projects with very long names', () => {
      const longNameShards: ProjectShard[] = [
        {
          project: 'a'.repeat(500),
          cluster: 'Experience',
          alignmentScore: 0.8,
          driftAlert: false,
          lastIntent: 'Test',
          executionSummary: 'Done',
          rawCommit: 'test',
          source: 'agent_swarm'
        }
      ];

      const config = createDashboardConfig(longNameShards);
      const html = buildDashboardHTML(config);

      expect(html).toContain('a'.repeat(500));
    });

    it('should handle very high alignment scores', () => {
      const perfectShards: ProjectShard[] = [
        {
          project: 'perfect-project',
          cluster: 'Experience',
          alignmentScore: 1.0,
          driftAlert: false,
          lastIntent: 'Perfect execution',
          executionSummary: 'Flawless',
          rawCommit: 'feat: perfect',
          source: 'agent_swarm',
          health: { score: 100, grade: 'A', factors: { activity: 100, deployment: 100, codeQuality: 100, documentation: 100, integrations: 100 }, recommendations: [] }
        }
      ];

      const config = createDashboardConfig(perfectShards);
      const html = buildDashboardHTML(config);

      // Health score displayed in dashboard (100/100 or grade A)
      expect(html).toContain('perfect-project');
    });

    it('should handle very low alignment scores', () => {
      const lowScoreShards: ProjectShard[] = [
        {
          project: 'struggling-project',
          cluster: 'Experience',
          alignmentScore: 0.1,
          driftAlert: true,
          lastIntent: 'Fix critical bug',
          executionSummary: 'Issues remain',
          rawCommit: 'fix: attempt',
          source: 'manual_override',
          health: { score: 10, grade: 'F', factors: { activity: 10, deployment: 0, codeQuality: 20, documentation: 0, integrations: 0 }, recommendations: ['Add tests', 'Add CI'] }
        }
      ];

      const config = createDashboardConfig(lowScoreShards);
      const html = buildDashboardHTML(config);

      expect(html).toContain('struggling-project');
    });

    it('should handle unicode characters in project data', () => {
      const unicodeShards: ProjectShard[] = [
        {
          project: '项目-🚀',
          cluster: 'Experience',
          alignmentScore: 0.8,
          driftAlert: false,
          lastIntent: 'Add 新功能',
          executionSummary: 'Completed ✓',
          rawCommit: 'feat: 添加功能',
          source: 'agent_swarm'
        }
      ];

      const config = createDashboardConfig(unicodeShards);
      const html = buildDashboardHTML(config);

      expect(html).toContain('项目-🚀');
      expect(html).toContain('新功能');
    });

    it('should handle multiple projects in same cluster', () => {
      const manyProjectsShards: ProjectShard[] = Array(10).fill(0).map((_, i) => ({
        project: `project-${i}`,
        cluster: 'Experience',
        alignmentScore: 0.7 + (i * 0.02),
        driftAlert: i % 3 === 0,
        lastIntent: `Intent ${i}`,
        executionSummary: `Summary ${i}`,
        rawCommit: `commit-${i}`,
        source: i % 2 === 0 ? 'agent_swarm' as const : 'manual_override' as const,
        metadata: {
          timestamp: new Date().toISOString(),
          commitHash: `hash-${i}`,
          commitCount7d: i,
          status: i % 2 === 0 ? 'ACTIVE' as const : 'DORMANT' as const
        }
      }));

      const config = createDashboardConfig(manyProjectsShards);
      const html = buildDashboardHTML(config);

      expect(html).toContain('10'); // Should show 10 projects
    });

    it('should handle all projects with drift alerts', () => {
      const allDriftShards = mockShards.map(s => ({ ...s, driftAlert: true }));
      const config = createDashboardConfig(allDriftShards);
      const html = buildDashboardHTML(config);

      expect(config.meta.driftAlerts).toBe(3);
      expect(html).toMatch(/Drift Alerts.*\(3\)/s);
    });

    it('should handle missing optional metadata fields', () => {
      const minimalShards: ProjectShard[] = [
        {
          project: 'minimal',
          cluster: 'Experience',
          alignmentScore: 0.8,
          driftAlert: false,
          lastIntent: 'Test',
          executionSummary: 'Done',
          rawCommit: 'test',
          source: 'agent_swarm',
          metadata: {
            timestamp: '2025-12-03T00:00:00Z',
            commitHash: 'abc',
            commitCount7d: 1,
            status: 'ACTIVE'
          }
        }
      ];

      const config = createDashboardConfig(minimalShards);
      const html = buildDashboardHTML(config);

      expect(html).toContain('minimal');
    });
  });

  describe('Data Visualization', () => {
    it('should render alignment bars for all projects', () => {
      const config = createDashboardConfig(mockShards);
      const html = buildDashboardHTML(config);

      // Check for alignment-bar-container (visualization element)
      expect(html).toMatch(/alignment-bar-container/);
      expect(html).toMatch(/alignment-bar/);
    });

    it('should include cluster statistics', () => {
      const config = createDashboardConfig(mockShards);
      const html = buildDashboardHTML(config);

      // Check for cluster stats display
      expect(html).toMatch(/cluster-stats/);
      expect(html).toMatch(/aligned/i);
    });

    it('should display metric cards with values', () => {
      const config = createDashboardConfig(mockShards);
      const html = buildDashboardHTML(config);

      expect(html).toMatch(/metric-card/);
      expect(html).toMatch(/metric-value/);
      expect(html).toMatch(/metric-label/);
    });
  });
});
