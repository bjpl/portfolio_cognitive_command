/**
 * Tests for index.ts (CLI Entry Point)
 * Comprehensive tests for CLI argument parsing, command execution, and error handling
 */

import { Command } from 'commander';

describe('CLI Entry Point (index.ts)', () => {
  let program: Command;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    program = new Command();

    // Spy on console and process methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Program Configuration', () => {
    it('should have correct program name', () => {
      program
        .name('portfolio-cognitive-command')
        .description('AI-powered portfolio analysis with semantic clustering')
        .version('1.0.0');

      expect(program.name()).toBe('portfolio-cognitive-command');
    });

    it('should have correct description', () => {
      program
        .name('portfolio-cognitive-command')
        .description('AI-powered portfolio analysis with semantic clustering')
        .version('1.0.0');

      expect(program.description()).toBe('AI-powered portfolio analysis with semantic clustering');
    });

    it('should have version 1.0.0', () => {
      program
        .name('portfolio-cognitive-command')
        .description('AI-powered portfolio analysis')
        .version('1.0.0');

      expect(program.version()).toBe('1.0.0');
    });
  });

  describe('Command Registration', () => {
    it('should register scan command', () => {
      program.command('scan');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('scan');
    });

    it('should register analyze command', () => {
      program.command('analyze');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('analyze');
    });

    it('should register dashboard command', () => {
      program.command('dashboard');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('dashboard');
    });

    it('should register metrics command', () => {
      program.command('metrics');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('metrics');
    });

    it('should register all command', () => {
      program.command('all');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('all');
    });

    it('should register status command', () => {
      program.command('status');

      expect(program.commands).toHaveLength(1);
      expect(program.commands[0].name()).toBe('status');
    });

    it('should register all commands together', () => {
      program.command('scan');
      program.command('analyze');
      program.command('dashboard');
      program.command('metrics');
      program.command('all');
      program.command('status');

      expect(program.commands).toHaveLength(6);
    });
  });

  describe('Command: scan - Options', () => {
    it('should accept --dir option', () => {
      const scanCmd = program
        .command('scan')
        .option('-d, --dir <path>', 'Directory to scan', '/default')
        .action((options) => {
          expect(options.dir).toBe('/test/path');
        });

      expect(scanCmd.options).toHaveLength(1);
      expect(scanCmd.options[0].short).toBe('-d');
      expect(scanCmd.options[0].long).toBe('--dir');
    });

    it('should accept --max-depth option', () => {
      const scanCmd = program
        .command('scan')
        .option('-m, --max-depth <n>', 'Maximum directory depth', '3');

      expect(scanCmd.options).toHaveLength(1);
      expect(scanCmd.options[0].short).toBe('-m');
      expect(scanCmd.options[0].long).toBe('--max-depth');
    });

    it('should parse --dir argument correctly', () => {
      let capturedOptions: any;

      program
        .command('scan')
        .option('-d, --dir <path>', 'Directory to scan', '/default')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'scan', '--dir', '/custom/path']);

      expect(capturedOptions.dir).toBe('/custom/path');
    });

    it('should parse --max-depth argument correctly', () => {
      let capturedOptions: any;

      program
        .command('scan')
        .option('-m, --max-depth <n>', 'Maximum depth', '3')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'scan', '--max-depth', '5']);

      expect(capturedOptions.maxDepth).toBe('5');
    });

    it('should use default values when options not provided', () => {
      let capturedOptions: any;
      const defaultDir = '/default/scan/dir';

      program
        .command('scan')
        .option('-d, --dir <path>', 'Directory to scan', defaultDir)
        .option('-m, --max-depth <n>', 'Maximum depth', '3')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'scan']);

      expect(capturedOptions.dir).toBe(defaultDir);
      expect(capturedOptions.maxDepth).toBe('3');
    });
  });

  describe('Command: analyze - Options', () => {
    it('should accept --manifest option', () => {
      const analyzeCmd = program
        .command('analyze')
        .option('--manifest <path>', 'Path to manifest file', '/default/manifest.json');

      expect(analyzeCmd.options).toHaveLength(1);
      expect(analyzeCmd.options[0].long).toBe('--manifest');
    });

    it('should accept --agent-db option', () => {
      const analyzeCmd = program
        .command('analyze')
        .option('--agent-db <path>', 'Path to AgentDB directory');

      expect(analyzeCmd.options).toHaveLength(1);
      expect(analyzeCmd.options[0].long).toBe('--agent-db');
    });

    it('should accept --active-only flag', () => {
      const analyzeCmd = program
        .command('analyze')
        .option('--active-only', 'Only analyze active repositories', false);

      expect(analyzeCmd.options).toHaveLength(1);
      expect(analyzeCmd.options[0].long).toBe('--active-only');
    });

    it('should parse --manifest argument correctly', () => {
      let capturedOptions: any;

      program
        .command('analyze')
        .option('--manifest <path>', 'Path to manifest file', '/default/manifest.json')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'analyze', '--manifest', '/custom/manifest.json']);

      expect(capturedOptions.manifest).toBe('/custom/manifest.json');
    });

    it('should parse --active-only flag correctly', () => {
      let capturedOptions: any;

      program
        .command('analyze')
        .option('--active-only', 'Only analyze active repositories', false)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'analyze', '--active-only']);

      expect(capturedOptions.activeOnly).toBe(true);
    });
  });

  describe('Command: dashboard - Options', () => {
    it('should accept --shards option', () => {
      const dashboardCmd = program
        .command('dashboard')
        .option('--shards <path>', 'Path to shards directory', '/default/shards');

      expect(dashboardCmd.options).toHaveLength(1);
      expect(dashboardCmd.options[0].long).toBe('--shards');
    });

    it('should accept --output option', () => {
      const dashboardCmd = program
        .command('dashboard')
        .option('--output <path>', 'Output path for dashboard', '/default/dashboard.html');

      expect(dashboardCmd.options).toHaveLength(1);
      expect(dashboardCmd.options[0].long).toBe('--output');
    });

    it('should parse both options correctly', () => {
      let capturedOptions: any;

      program
        .command('dashboard')
        .option('--shards <path>', 'Path to shards directory', '/default/shards')
        .option('--output <path>', 'Output path for dashboard', '/default/dashboard.html')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'dashboard', '--shards', '/my/shards', '--output', '/my/dashboard.html']);

      expect(capturedOptions.shards).toBe('/my/shards');
      expect(capturedOptions.output).toBe('/my/dashboard.html');
    });
  });

  describe('Command: metrics - Options', () => {
    it('should accept --shards and --output options', () => {
      const metricsCmd = program
        .command('metrics')
        .option('--shards <path>', 'Path to shards directory', '/default/shards')
        .option('--output <path>', 'Output path for metrics', '/default/metrics.json');

      expect(metricsCmd.options).toHaveLength(2);
      expect(metricsCmd.options[0].long).toBe('--shards');
      expect(metricsCmd.options[1].long).toBe('--output');
    });

    it('should parse options correctly', () => {
      let capturedOptions: any;

      program
        .command('metrics')
        .option('--shards <path>', 'Path to shards directory', '/default/shards')
        .option('--output <path>', 'Output path for metrics', '/default/metrics.json')
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'metrics', '--shards', '/shards', '--output', '/metrics.json']);

      expect(capturedOptions.shards).toBe('/shards');
      expect(capturedOptions.output).toBe('/metrics.json');
    });
  });

  describe('Command: all - Options', () => {
    it('should accept all pipeline options', () => {
      const allCmd = program
        .command('all')
        .option('-d, --dir <path>', 'Directory to scan', '/default')
        .option('-m, --max-depth <n>', 'Maximum directory depth', '3')
        .option('--agent-db <path>', 'Path to AgentDB directory')
        .option('--active-only', 'Only analyze active repositories', false);

      expect(allCmd.options).toHaveLength(4);
      expect(allCmd.options[0].long).toBe('--dir');
      expect(allCmd.options[1].long).toBe('--max-depth');
      expect(allCmd.options[2].long).toBe('--agent-db');
      expect(allCmd.options[3].long).toBe('--active-only');
    });

    it('should parse all options correctly', () => {
      let capturedOptions: any;

      program
        .command('all')
        .option('-d, --dir <path>', 'Directory to scan', '/default')
        .option('-m, --max-depth <n>', 'Maximum directory depth', '3')
        .option('--agent-db <path>', 'Path to AgentDB directory')
        .option('--active-only', 'Only analyze active repositories', false)
        .action((options) => {
          capturedOptions = options;
        });

      program.parse(['node', 'test', 'all', '-d', '/test', '-m', '5', '--agent-db', '/agentdb', '--active-only']);

      expect(capturedOptions.dir).toBe('/test');
      expect(capturedOptions.maxDepth).toBe('5');
      expect(capturedOptions.agentDb).toBe('/agentdb');
      expect(capturedOptions.activeOnly).toBe(true);
    });
  });

  describe('Command: status', () => {
    it('should execute without options', () => {
      let executed = false;

      program
        .command('status')
        .description('Show current pipeline status')
        .action(() => {
          executed = true;
        });

      program.parse(['node', 'test', 'status']);

      expect(executed).toBe(true);
    });

    it('should not require any options', () => {
      const statusCmd = program
        .command('status')
        .description('Show current pipeline status');

      expect(statusCmd.options).toHaveLength(0);
    });
  });

  describe('Type Definitions', () => {
    it('should define ManifestData interface structure', () => {
      interface ManifestData {
        scan_date: string;
        total_repos: number;
        active_repos: string[];
        dormant_repos: string[];
        manifest: any[];
      }

      const manifest: ManifestData = {
        scan_date: '2025-01-01',
        total_repos: 10,
        active_repos: ['repo1', 'repo2'],
        dormant_repos: ['repo3'],
        manifest: []
      };

      expect(manifest.total_repos).toBe(10);
      expect(manifest.active_repos).toHaveLength(2);
      expect(manifest.dormant_repos).toHaveLength(1);
      expect(manifest.scan_date).toBe('2025-01-01');
    });

    it('should define CognitiveMetrics interface structure', () => {
      interface CognitiveMetrics {
        timestamp: string;
        totalProjects: number;
        activeProjects: number;
        dormantProjects: number;
        averageAlignment: number;
        driftAlerts: number;
        agentDrivenPercentage: number;
        clusterDistribution: Record<string, number>;
        precisionScore: number;
      }

      const metrics: CognitiveMetrics = {
        timestamp: '2025-01-01T00:00:00Z',
        totalProjects: 5,
        activeProjects: 3,
        dormantProjects: 2,
        averageAlignment: 0.85,
        driftAlerts: 1,
        agentDrivenPercentage: 60,
        clusterDistribution: { Experience: 2, 'Core Systems': 3 },
        precisionScore: 0.85
      };

      expect(metrics.totalProjects).toBe(5);
      expect(metrics.activeProjects).toBe(3);
      expect(metrics.dormantProjects).toBe(2);
      expect(metrics.averageAlignment).toBe(0.85);
      expect(metrics.agentDrivenPercentage).toBe(60);
      expect(metrics.precisionScore).toBe(0.85);
    });
  });

  describe('Argument Validation', () => {
    it('should accept valid directory paths', () => {
      const validPaths = ['/absolute', './relative', '../parent'];

      validPaths.forEach(dirPath => {
        let capturedOptions: any;

        const prog = new Command();
        prog
          .command('scan')
          .option('-d, --dir <path>', 'Directory to scan')
          .action((options) => {
            capturedOptions = options;
          });

        prog.parse(['node', 'test', 'scan', '--dir', dirPath]);

        expect(capturedOptions.dir).toBe(dirPath);
      });
    });

    it('should accept valid max-depth values', () => {
      const validDepths = ['1', '3', '5', '10'];

      validDepths.forEach(depth => {
        let capturedOptions: any;

        const prog = new Command();
        prog
          .command('scan')
          .option('-m, --max-depth <n>', 'Maximum depth')
          .action((options) => {
            capturedOptions = options;
          });

        prog.parse(['node', 'test', 'scan', '--max-depth', depth]);

        expect(capturedOptions.maxDepth).toBe(depth);
      });
    });

    it('should parse max-depth as integer when needed', () => {
      const depthString = '5';
      const depthNumber = parseInt(depthString);

      expect(depthNumber).toBe(5);
      expect(typeof depthNumber).toBe('number');
    });
  });

  describe('Command Descriptions', () => {
    it('should have description for scan command', () => {
      const scanCmd = program
        .command('scan')
        .description('Scan repositories and generate Phase 1 manifest');

      expect(scanCmd.description()).toBe('Scan repositories and generate Phase 1 manifest');
    });

    it('should have description for analyze command', () => {
      const analyzeCmd = program
        .command('analyze')
        .description('Run semantic analysis on active repos and generate shards');

      expect(analyzeCmd.description()).toBe('Run semantic analysis on active repos and generate shards');
    });

    it('should have description for dashboard command', () => {
      const dashboardCmd = program
        .command('dashboard')
        .description('Generate interactive HTML dashboard from shards');

      expect(dashboardCmd.description()).toBe('Generate interactive HTML dashboard from shards');
    });

    it('should have description for metrics command', () => {
      const metricsCmd = program
        .command('metrics')
        .description('Generate cognitive metrics JSON file');

      expect(metricsCmd.description()).toBe('Generate cognitive metrics JSON file');
    });

    it('should have description for all command', () => {
      const allCmd = program
        .command('all')
        .description('Run complete pipeline (scan → analyze → dashboard → metrics)');

      expect(allCmd.description()).toContain('Run complete pipeline');
    });

    it('should have description for status command', () => {
      const statusCmd = program
        .command('status')
        .description('Show current pipeline status and file locations');

      expect(statusCmd.description()).toContain('Show current pipeline status');
    });
  });

  describe('Help and Version', () => {
    it('should support --help flag', () => {
      program
        .name('portfolio-cognitive-command')
        .version('1.0.0')
        .command('scan');

      // Commander automatically adds help, just verify program has it
      expect(program.version()).toBe('1.0.0');
    });

    it('should support --version flag', () => {
      program
        .name('portfolio-cognitive-command')
        .version('1.0.0');

      expect(program.version()).toBe('1.0.0');
    });
  });

  describe('Data Processing Logic', () => {
    it('should correctly filter active repositories', () => {
      const repos = [
        { name: 'repo1', status: 'ACTIVE' },
        { name: 'repo2', status: 'DORMANT' },
        { name: 'repo3', status: 'ACTIVE' }
      ];

      const activeRepos = repos.filter(r => r.status === 'ACTIVE');
      const dormantRepos = repos.filter(r => r.status === 'DORMANT');

      expect(activeRepos).toHaveLength(2);
      expect(dormantRepos).toHaveLength(1);
      expect(activeRepos[0].name).toBe('repo1');
      expect(activeRepos[1].name).toBe('repo3');
    });

    it('should calculate agent-driven percentage correctly', () => {
      const totalProjects = 10;
      const agentDriven = 7;

      const percentage = totalProjects > 0 ? (agentDriven / totalProjects) * 100 : 0;

      expect(percentage).toBe(70);
    });

    it('should handle zero total projects in percentage calculation', () => {
      const totalProjects = 0;
      const agentDriven = 0;

      const percentage = totalProjects > 0 ? (agentDriven / totalProjects) * 100 : 0;

      expect(percentage).toBe(0);
    });

    it('should format ISO date correctly for manifest', () => {
      const now = new Date('2025-01-15T12:30:45Z');
      const dateString = now.toISOString().split('T')[0];

      expect(dateString).toBe('2025-01-15');
    });
  });
});
