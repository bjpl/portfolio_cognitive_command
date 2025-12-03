#!/usr/bin/env node
/**
 * Portfolio Cognitive Command v8.0
 * CLI Entry Point
 *
 * Orchestrates the complete pipeline:
 * Phase 1: Discovery (scan repos)
 * Phase 2: Semantic Analysis (generate embeddings & shards)
 * Phase 3: Dashboard Generation
 * Phase 4: Metrics Export
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { scanRepos, getChangedFiles, RepoScanResult } from './skills/repo-scanner';
import { generateEmbedding } from './skills/semantic-analyzer';
import { detectDrift } from './skills/drift-detector';
import { generateShard, batchGenerateShards, saveShards, loadShards, calculateStats } from './skills/shard-generator';
import { linkToAgentDB } from './skills/cognitive-linker';
import { createDashboardConfig, buildDashboardHTML, saveDashboard } from './skills/dashboard-builder';

// ============================================================================
// TYPES
// ============================================================================

interface ManifestData {
  scan_date: string;
  total_repos: number;
  active_repos: string[];
  dormant_repos: string[];
  manifest: RepoScanResult[];
}

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

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SCAN_DIR = '/mnt/c/Users/brand/Development/Project_Workspace/active-development';
const DEFAULT_MAX_DEPTH = 3;
const DOCS_DIR = path.join(process.cwd(), 'docs');
const SHARDS_DIR = path.join(DOCS_DIR, 'shards');

// ============================================================================
// CLI SETUP
// ============================================================================

const program = new Command();

program
  .name('portfolio-cognitive-command')
  .description('AI-powered portfolio analysis with semantic clustering')
  .version('8.0.0');

// ============================================================================
// COMMAND: scan
// Phase 1 - Repository Discovery
// ============================================================================

program
  .command('scan')
  .description('Scan repositories and generate Phase 1 manifest')
  .option('-d, --dir <path>', 'Directory to scan', DEFAULT_SCAN_DIR)
  .option('-m, --max-depth <n>', 'Maximum directory depth', String(DEFAULT_MAX_DEPTH))
  .action(async (options) => {
    console.log('🔍 Phase 1: Discovery - Scanning repositories...');
    console.log(`  Directory: ${options.dir}`);
    console.log(`  Max depth: ${options.maxDepth}`);
    console.log('');

    try {
      // Scan repositories
      const repos = await scanRepos(options.dir, parseInt(options.maxDepth));

      // Build manifest
      const activeRepos = repos.filter(r => r.status === 'ACTIVE');
      const dormantRepos = repos.filter(r => r.status === 'DORMANT');

      const manifest: ManifestData = {
        scan_date: new Date().toISOString().split('T')[0],
        total_repos: repos.length,
        active_repos: activeRepos.map(r => r.name),
        dormant_repos: dormantRepos.map(r => r.name),
        manifest: repos
      };

      // Ensure docs directory exists
      if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
      }

      // Save manifest
      const manifestPath = path.join(DOCS_DIR, 'phase1_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Print summary
      console.log('✅ Scan complete!');
      console.log('');
      console.log(`  Total repositories: ${repos.length}`);
      console.log(`  Active (commits in last 7d): ${activeRepos.length}`);
      console.log(`  Dormant: ${dormantRepos.length}`);
      console.log('');
      console.log(`  Manifest saved: ${manifestPath}`);

      if (activeRepos.length > 0) {
        console.log('');
        console.log('  Active repositories:');
        activeRepos.slice(0, 10).forEach(repo => {
          console.log(`    • ${repo.name} (${repo.commits7d} commits)`);
        });
        if (activeRepos.length > 10) {
          console.log(`    ... and ${activeRepos.length - 10} more`);
        }
      }
    } catch (error) {
      console.error('❌ Error during scan:', error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: analyze
// Phase 2 - Semantic Analysis & Shard Generation
// ============================================================================

program
  .command('analyze')
  .description('Run semantic analysis on active repos and generate shards')
  .option('--manifest <path>', 'Path to manifest file', path.join(DOCS_DIR, 'phase1_manifest.json'))
  .option('--agent-db <path>', 'Path to AgentDB directory (optional)')
  .option('--active-only', 'Only analyze active repositories', false)
  .action(async (options) => {
    console.log('🧠 Phase 2: Semantic Analysis - Generating shards...');
    console.log('');

    try {
      // Load manifest
      if (!fs.existsSync(options.manifest)) {
        console.error(`❌ Manifest not found: ${options.manifest}`);
        console.log('   Run "scan" command first to generate manifest.');
        process.exit(1);
      }

      const manifestContent = fs.readFileSync(options.manifest, 'utf8');
      const manifest: ManifestData = JSON.parse(manifestContent);

      // Filter repos
      let reposToAnalyze = manifest.manifest;
      if (options.activeOnly) {
        reposToAnalyze = reposToAnalyze.filter(r => r.status === 'ACTIVE');
        console.log(`  Analyzing ${reposToAnalyze.length} active repositories only`);
      } else {
        console.log(`  Analyzing all ${reposToAnalyze.length} repositories`);
      }
      console.log('');

      // Process each repository
      const shardData = [];
      for (let i = 0; i < reposToAnalyze.length; i++) {
        const repo = reposToAnalyze[i];
        const progress = `[${i + 1}/${reposToAnalyze.length}]`;

        process.stdout.write(`  ${progress} ${repo.name}... `);

        try {
          // Get changed files for semantic analysis
          const changedFiles = await getChangedFiles(repo.path,
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          );

          // Generate embedding from commit messages and file paths
          const commitMessages = [repo.lastCommit.message];
          const embedding = await generateEmbedding(commitMessages, changedFiles);

          // Link to AgentDB (if available)
          const commitDate = new Date(repo.lastCommit.date);
          const cognitiveLink = await linkToAgentDB(commitDate, repo.lastCommit.hash, options.agentDb);

          // Detect drift (if we have reasoning chain)
          let drift;
          if (cognitiveLink.reasoningChain) {
            const implementationText = `${repo.lastCommit.message}\n${changedFiles.join('\n')}`;
            drift = await detectDrift(cognitiveLink.reasoningChain, implementationText);
          }

          // Generate shard
          const shard = generateShard(repo, embedding, cognitiveLink, drift);
          shardData.push(shard);

          console.log(`✓ [${embedding.cluster}]`);
        } catch (error) {
          console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Save shards
      if (!fs.existsSync(SHARDS_DIR)) {
        fs.mkdirSync(SHARDS_DIR, { recursive: true });
      }
      saveShards(shardData, SHARDS_DIR);

      // Calculate and display stats
      const stats = calculateStats(shardData);

      console.log('');
      console.log('✅ Analysis complete!');
      console.log('');
      console.log('  Shard Statistics:');
      console.log(`    Total shards: ${stats.total}`);
      console.log(`    Active: ${stats.active} | Dormant: ${stats.dormant}`);
      console.log(`    Drift alerts: ${stats.driftAlerts}`);
      console.log(`    Average alignment: ${(stats.averageAlignment * 100).toFixed(1)}%`);
      console.log(`    Agent-driven: ${stats.agentDriven} | Manual: ${stats.manualOverride}`);
      console.log('');
      console.log('  Cluster Distribution:');
      Object.entries(stats.byClusters).forEach(([cluster, count]) => {
        console.log(`    • ${cluster}: ${count} projects`);
      });
      console.log('');
      console.log(`  Shards saved to: ${SHARDS_DIR}`);
    } catch (error) {
      console.error('❌ Error during analysis:', error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: dashboard
// Phase 3 - Dashboard Generation
// ============================================================================

program
  .command('dashboard')
  .description('Generate interactive HTML dashboard from shards')
  .option('--shards <path>', 'Path to shards directory', SHARDS_DIR)
  .option('--output <path>', 'Output path for dashboard', path.join(DOCS_DIR, 'dashboard.html'))
  .action(async (options) => {
    console.log('📊 Phase 3: Dashboard Generation...');
    console.log('');

    try {
      // Load shards
      if (!fs.existsSync(options.shards)) {
        console.error(`❌ Shards directory not found: ${options.shards}`);
        console.log('   Run "analyze" command first to generate shards.');
        process.exit(1);
      }

      const shards = loadShards(options.shards);

      if (shards.length === 0) {
        console.error('❌ No shards found in directory.');
        console.log('   Run "analyze" command first to generate shards.');
        process.exit(1);
      }

      console.log(`  Loaded ${shards.length} project shards`);

      // Create dashboard config
      const dashboardConfig = createDashboardConfig(shards);

      // Build HTML
      console.log('  Building HTML dashboard...');
      const html = buildDashboardHTML(dashboardConfig);

      // Save dashboard
      saveDashboard(html, options.output);

      console.log('');
      console.log('✅ Dashboard generated!');
      console.log('');
      console.log('  Dashboard Metrics:');
      console.log(`    Precision Score: ${(dashboardConfig.meta.precision * 100).toFixed(1)}%`);
      console.log(`    Active Projects: ${dashboardConfig.meta.active}`);
      console.log(`    Dormant Projects: ${dashboardConfig.meta.dormant}`);
      console.log(`    Drift Alerts: ${dashboardConfig.meta.driftAlerts}`);
      console.log('');
      console.log(`  Dashboard saved: ${options.output}`);
      console.log(`  Open in browser: file://${path.resolve(options.output)}`);
    } catch (error) {
      console.error('❌ Error generating dashboard:', error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: metrics
// Phase 4 - Cognitive Metrics Export
// ============================================================================

program
  .command('metrics')
  .description('Generate cognitive metrics JSON file')
  .option('--shards <path>', 'Path to shards directory', SHARDS_DIR)
  .option('--output <path>', 'Output path for metrics', path.join(DOCS_DIR, 'cognitive_metrics.json'))
  .action(async (options) => {
    console.log('📈 Phase 4: Generating Cognitive Metrics...');
    console.log('');

    try {
      // Load shards
      if (!fs.existsSync(options.shards)) {
        console.error(`❌ Shards directory not found: ${options.shards}`);
        console.log('   Run "analyze" command first to generate shards.');
        process.exit(1);
      }

      const shards = loadShards(options.shards);

      if (shards.length === 0) {
        console.error('❌ No shards found in directory.');
        process.exit(1);
      }

      // Calculate comprehensive stats
      const stats = calculateStats(shards);

      // Build metrics object
      const metrics: CognitiveMetrics = {
        timestamp: new Date().toISOString(),
        totalProjects: stats.total,
        activeProjects: stats.active,
        dormantProjects: stats.dormant,
        averageAlignment: stats.averageAlignment,
        driftAlerts: stats.driftAlerts,
        agentDrivenPercentage: stats.total > 0
          ? (stats.agentDriven / stats.total) * 100
          : 0,
        clusterDistribution: stats.byClusters,
        precisionScore: stats.averageAlignment
      };

      // Save metrics
      fs.writeFileSync(options.output, JSON.stringify(metrics, null, 2));

      console.log('  Metrics Summary:');
      console.log(`    Total Projects: ${metrics.totalProjects}`);
      console.log(`    Active: ${metrics.activeProjects} | Dormant: ${metrics.dormantProjects}`);
      console.log(`    Average Alignment: ${(metrics.averageAlignment * 100).toFixed(1)}%`);
      console.log(`    Drift Alerts: ${metrics.driftAlerts}`);
      console.log(`    Agent-Driven: ${metrics.agentDrivenPercentage.toFixed(1)}%`);
      console.log('');
      console.log('  Cluster Distribution:');
      Object.entries(metrics.clusterDistribution).forEach(([cluster, count]) => {
        const percentage = (count / metrics.totalProjects * 100).toFixed(1);
        console.log(`    • ${cluster}: ${count} (${percentage}%)`);
      });
      console.log('');
      console.log('✅ Metrics saved!');
      console.log(`  Location: ${options.output}`);
    } catch (error) {
      console.error('❌ Error generating metrics:', error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: all
// Complete Pipeline (All Phases)
// ============================================================================

program
  .command('all')
  .description('Run complete pipeline (scan → analyze → dashboard → metrics)')
  .option('-d, --dir <path>', 'Directory to scan', DEFAULT_SCAN_DIR)
  .option('-m, --max-depth <n>', 'Maximum directory depth', String(DEFAULT_MAX_DEPTH))
  .option('--agent-db <path>', 'Path to AgentDB directory (optional)')
  .option('--active-only', 'Only analyze active repositories', false)
  .action(async (options) => {
    console.log('🚀 Portfolio Cognitive Command - Full Pipeline');
    console.log('═'.repeat(60));
    console.log('');

    const startTime = Date.now();

    try {
      // Phase 1: Scan
      console.log('Phase 1/4: Repository Discovery');
      console.log('─'.repeat(60));
      const repos = await scanRepos(options.dir, parseInt(options.maxDepth));
      const activeRepos = repos.filter(r => r.status === 'ACTIVE');
      const dormantRepos = repos.filter(r => r.status === 'DORMANT');

      const manifest: ManifestData = {
        scan_date: new Date().toISOString().split('T')[0],
        total_repos: repos.length,
        active_repos: activeRepos.map(r => r.name),
        dormant_repos: dormantRepos.map(r => r.name),
        manifest: repos
      };

      if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
      }

      const manifestPath = path.join(DOCS_DIR, 'phase1_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`✓ Found ${repos.length} repositories (${activeRepos.length} active, ${dormantRepos.length} dormant)`);
      console.log('');

      // Phase 2: Analyze
      console.log('Phase 2/4: Semantic Analysis');
      console.log('─'.repeat(60));

      let reposToAnalyze = options.activeOnly ? activeRepos : repos;
      console.log(`Processing ${reposToAnalyze.length} repositories...`);

      const shardData = [];
      for (let i = 0; i < reposToAnalyze.length; i++) {
        const repo = reposToAnalyze[i];
        const progress = `[${i + 1}/${reposToAnalyze.length}]`;

        process.stdout.write(`  ${progress} ${repo.name}... `);

        try {
          const changedFiles = await getChangedFiles(repo.path,
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          );

          const embedding = await generateEmbedding([repo.lastCommit.message], changedFiles);
          const cognitiveLink = await linkToAgentDB(
            new Date(repo.lastCommit.date),
            repo.lastCommit.hash,
            options.agentDb
          );

          let drift;
          if (cognitiveLink.reasoningChain) {
            const implText = `${repo.lastCommit.message}\n${changedFiles.join('\n')}`;
            drift = await detectDrift(cognitiveLink.reasoningChain, implText);
          }

          const shard = generateShard(repo, embedding, cognitiveLink, drift);
          shardData.push(shard);

          console.log(`✓`);
        } catch (error) {
          console.log(`✗`);
        }
      }

      if (!fs.existsSync(SHARDS_DIR)) {
        fs.mkdirSync(SHARDS_DIR, { recursive: true });
      }
      saveShards(shardData, SHARDS_DIR);

      const stats = calculateStats(shardData);
      console.log(`✓ Generated ${shardData.length} shards (${(stats.averageAlignment * 100).toFixed(1)}% avg alignment)`);
      console.log('');

      // Phase 3: Dashboard
      console.log('Phase 3/4: Dashboard Generation');
      console.log('─'.repeat(60));

      const dashboardConfig = createDashboardConfig(shardData);
      const html = buildDashboardHTML(dashboardConfig);
      const dashboardPath = path.join(DOCS_DIR, 'dashboard.html');
      saveDashboard(html, dashboardPath);

      console.log(`✓ Dashboard generated with ${dashboardConfig.meta.totalProjects} projects`);
      console.log('');

      // Phase 4: Metrics
      console.log('Phase 4/4: Metrics Export');
      console.log('─'.repeat(60));

      const metrics: CognitiveMetrics = {
        timestamp: new Date().toISOString(),
        totalProjects: stats.total,
        activeProjects: stats.active,
        dormantProjects: stats.dormant,
        averageAlignment: stats.averageAlignment,
        driftAlerts: stats.driftAlerts,
        agentDrivenPercentage: stats.total > 0 ? (stats.agentDriven / stats.total) * 100 : 0,
        clusterDistribution: stats.byClusters,
        precisionScore: stats.averageAlignment
      };

      const metricsPath = path.join(DOCS_DIR, 'cognitive_metrics.json');
      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

      console.log(`✓ Metrics exported`);
      console.log('');

      // Summary
      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('═'.repeat(60));
      console.log('✅ Pipeline Complete!');
      console.log('═'.repeat(60));
      console.log('');
      console.log('📊 Results Summary:');
      console.log(`  • Total Projects: ${metrics.totalProjects}`);
      console.log(`  • Active: ${metrics.activeProjects} | Dormant: ${metrics.dormantProjects}`);
      console.log(`  • Average Alignment: ${(metrics.averageAlignment * 100).toFixed(1)}%`);
      console.log(`  • Drift Alerts: ${metrics.driftAlerts}`);
      console.log(`  • Agent-Driven: ${metrics.agentDrivenPercentage.toFixed(1)}%`);
      console.log('');
      console.log('📁 Output Files:');
      console.log(`  • Manifest: ${manifestPath}`);
      console.log(`  • Shards: ${SHARDS_DIR}/ (${shardData.length} files)`);
      console.log(`  • Dashboard: ${dashboardPath}`);
      console.log(`  • Metrics: ${metricsPath}`);
      console.log('');
      console.log(`⏱️  Completed in ${elapsedTime}s`);
      console.log('');
      console.log(`🌐 View dashboard: file://${path.resolve(dashboardPath)}`);

    } catch (error) {
      console.error('');
      console.error('❌ Pipeline failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: status
// Show current pipeline status
// ============================================================================

program
  .command('status')
  .description('Show current pipeline status and file locations')
  .action(() => {
    console.log('📋 Portfolio Cognitive Command - Status');
    console.log('═'.repeat(60));
    console.log('');

    // Check for manifest
    const manifestPath = path.join(DOCS_DIR, 'phase1_manifest.json');
    const manifestExists = fs.existsSync(manifestPath);
    console.log(`Phase 1 (Scan):     ${manifestExists ? '✓ Complete' : '✗ Not run'}`);
    if (manifestExists) {
      const manifest: ManifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      console.log(`  └─ ${manifest.total_repos} repos scanned (${manifest.active_repos.length} active)`);
    }

    // Check for shards
    const shardsExist = fs.existsSync(SHARDS_DIR);
    const shardCount = shardsExist ? fs.readdirSync(SHARDS_DIR).filter(f => f.endsWith('_shard.json')).length : 0;
    console.log(`Phase 2 (Analyze):  ${shardCount > 0 ? '✓ Complete' : '✗ Not run'}`);
    if (shardCount > 0) {
      console.log(`  └─ ${shardCount} shards generated`);
    }

    // Check for dashboard
    const dashboardPath = path.join(DOCS_DIR, 'dashboard.html');
    const dashboardExists = fs.existsSync(dashboardPath);
    console.log(`Phase 3 (Dashboard): ${dashboardExists ? '✓ Complete' : '✗ Not run'}`);
    if (dashboardExists) {
      const stats = fs.statSync(dashboardPath);
      console.log(`  └─ ${(stats.size / 1024).toFixed(1)} KB dashboard`);
    }

    // Check for metrics
    const metricsPath = path.join(DOCS_DIR, 'cognitive_metrics.json');
    const metricsExist = fs.existsSync(metricsPath);
    console.log(`Phase 4 (Metrics):  ${metricsExist ? '✓ Complete' : '✗ Not run'}`);
    if (metricsExist) {
      const metrics: CognitiveMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      console.log(`  └─ ${(metrics.averageAlignment * 100).toFixed(1)}% precision`);
    }

    console.log('');
    console.log('📁 File Locations:');
    console.log(`  • Docs: ${DOCS_DIR}/`);
    console.log(`  • Shards: ${SHARDS_DIR}/`);
    console.log(`  • Dashboard: ${dashboardPath}`);
    console.log(`  • Metrics: ${metricsPath}`);
    console.log('');

    if (dashboardExists) {
      console.log(`🌐 View dashboard: file://${path.resolve(dashboardPath)}`);
    } else {
      console.log('💡 Tip: Run "all" command to execute the complete pipeline');
    }
  });

// ============================================================================
// PARSE ARGUMENTS
// ============================================================================

program.parse();
