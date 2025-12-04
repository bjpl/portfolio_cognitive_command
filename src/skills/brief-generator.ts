/**
 * Brief Generator Skill
 * Generates executive Portfolio Brief markdown documents
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectShard } from './shard-generator';

export interface CognitiveMetrics {
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

export interface BriefGeneratorResult {
  filename: string;
  filepath: string;
  precisionScore: number;
  redListCount: number;
  topPerformersCount: number;
  clusterCount: number;
  generatedAt: string;
}

export interface PortfolioBriefData {
  metrics: CognitiveMetrics;
  shards: ProjectShard[];
  redList: ProjectShard[];
  topPerformers: ProjectShard[];
  clusterAnalysis: Array<{
    cluster: string;
    count: number;
    avgAlignment: number;
    projects: string[];
  }>;
}

/**
 * Loads all project shards from directory
 * @param shardDir - Directory containing shard JSON files
 * @returns Array of project shards
 */
export function loadShards(shardDir: string): ProjectShard[] {
  if (!fs.existsSync(shardDir)) {
    return [];
  }

  const files = fs.readdirSync(shardDir)
    .filter(f => f.endsWith('_shard.json'));

  return files.map(f => {
    const content = fs.readFileSync(path.join(shardDir, f), 'utf8');
    return JSON.parse(content) as ProjectShard;
  });
}

/**
 * Loads cognitive metrics from JSON file
 * @param metricsPath - Path to cognitive_metrics.json
 * @returns Cognitive metrics or default values
 */
export function loadMetrics(metricsPath: string): CognitiveMetrics {
  if (!fs.existsSync(metricsPath)) {
    return {
      timestamp: new Date().toISOString(),
      totalProjects: 0,
      activeProjects: 0,
      dormantProjects: 0,
      averageAlignment: 0,
      driftAlerts: 0,
      agentDrivenPercentage: 0,
      clusterDistribution: {},
      precisionScore: 0
    };
  }

  const content = fs.readFileSync(metricsPath, 'utf8');
  return JSON.parse(content) as CognitiveMetrics;
}

/**
 * Analyzes shards to build portfolio brief data
 * @param shards - Array of project shards
 * @param metrics - Cognitive metrics
 * @returns Portfolio brief data
 */
export function analyzePortfolio(
  shards: ProjectShard[],
  metrics: CognitiveMetrics
): PortfolioBriefData {
  // Identify red list (drift alerts + low alignment)
  const redList = shards.filter(s =>
    s.driftAlert || s.alignmentScore < 0.7
  ).sort((a, b) => a.alignmentScore - b.alignmentScore);

  // Identify top performers (high alignment, active)
  const topPerformers = shards
    .filter(s => s.metadata?.status === 'ACTIVE' && s.alignmentScore >= 0.85)
    .sort((a, b) => b.alignmentScore - a.alignmentScore)
    .slice(0, 5);

  // Cluster analysis
  const clusterMap: Record<string, ProjectShard[]> = {};
  for (const shard of shards) {
    if (!clusterMap[shard.cluster]) {
      clusterMap[shard.cluster] = [];
    }
    clusterMap[shard.cluster].push(shard);
  }

  const clusterAnalysis = Object.entries(clusterMap).map(([cluster, projects]) => {
    const avgAlignment = projects.reduce((sum, p) => sum + p.alignmentScore, 0) / projects.length;
    return {
      cluster,
      count: projects.length,
      avgAlignment,
      projects: projects.map(p => p.project)
    };
  }).sort((a, b) => b.count - a.count);

  return {
    metrics,
    shards,
    redList,
    topPerformers,
    clusterAnalysis
  };
}

/**
 * Generates markdown content for portfolio brief
 * @param data - Portfolio brief data
 * @returns Markdown string
 */
export function generateBriefMarkdown(data: PortfolioBriefData): string {
  const date = new Date().toISOString().split('T')[0];
  const precisionPercent = (data.metrics.precisionScore * 100).toFixed(1);

  let md = '';

  // Header with global precision score
  md += `# Portfolio Brief\n`;
  md += `**Date:** ${date}\n\n`;
  md += `## 🎯 Global Precision Score\n\n`;
  md += `**${precisionPercent}%**\n\n`;
  md += `*Portfolio alignment with strategic intent*\n\n`;
  md += `---\n\n`;

  // Executive Summary
  md += `## 📊 Executive Summary\n\n`;
  md += `- **Total Projects:** ${data.metrics.totalProjects}\n`;
  md += `- **Active:** ${data.metrics.activeProjects}\n`;
  md += `- **Dormant:** ${data.metrics.dormantProjects}\n`;
  md += `- **Drift Alerts:** ${data.metrics.driftAlerts}\n`;
  md += `- **Agent-Driven:** ${(data.metrics.agentDrivenPercentage * 100).toFixed(0)}%\n`;
  md += `- **Average Alignment:** ${(data.metrics.averageAlignment * 100).toFixed(1)}%\n\n`;
  md += `---\n\n`;

  // Red List Section
  md += `## 🚨 Red List (Requires Attention)\n\n`;
  if (data.redList.length === 0) {
    md += `✅ **No projects require immediate attention**\n\n`;
    md += `All projects are aligned with strategic intent.\n\n`;
  } else {
    md += `**${data.redList.length} project(s) need review:**\n\n`;
    for (const shard of data.redList) {
      const alignPercent = (shard.alignmentScore * 100).toFixed(1);
      const driftFlag = shard.driftAlert ? '⚠️ DRIFT' : '';
      md += `### ${shard.project} ${driftFlag}\n\n`;
      md += `- **Alignment Score:** ${alignPercent}%\n`;
      md += `- **Cluster:** ${shard.cluster}\n`;
      md += `- **Status:** ${shard.metadata?.status || 'UNKNOWN'}\n`;
      md += `- **Last Intent:** ${truncateText(shard.lastIntent, 100)}\n`;
      md += `- **Summary:** ${shard.executionSummary}\n\n`;
      md += `**Recommendation:** Review implementation against stated intent and realign if necessary.\n\n`;
    }
  }
  md += `---\n\n`;

  // Cluster Analysis
  md += `## 📦 Cluster Distribution\n\n`;
  md += `Portfolio organized across ${data.clusterAnalysis.length} strategic clusters:\n\n`;
  for (const cluster of data.clusterAnalysis) {
    const avgPercent = (cluster.avgAlignment * 100).toFixed(1);
    md += `### ${cluster.cluster}\n\n`;
    md += `- **Projects:** ${cluster.count}\n`;
    md += `- **Avg Alignment:** ${avgPercent}%\n`;
    md += `- **Projects:** ${cluster.projects.join(', ')}\n\n`;
  }
  md += `---\n\n`;

  // Top Performers
  md += `## 🏆 Top Performers\n\n`;
  if (data.topPerformers.length === 0) {
    md += `No active projects with high alignment scores yet.\n\n`;
  } else {
    md += `Projects excelling in alignment and execution:\n\n`;
    let rank = 1;
    for (const shard of data.topPerformers) {
      const alignPercent = (shard.alignmentScore * 100).toFixed(1);
      md += `### ${rank}. ${shard.project}\n\n`;
      md += `- **Alignment Score:** ${alignPercent}%\n`;
      md += `- **Cluster:** ${shard.cluster}\n`;
      md += `- **Source:** ${formatSource(shard.source)}\n`;
      md += `- **Last Intent:** ${truncateText(shard.lastIntent, 100)}\n`;
      md += `- **Activity:** ${shard.metadata?.commitCount7d || 0} commits (7d)\n\n`;
      rank++;
    }
  }
  md += `---\n\n`;

  // Strategic Recommendations
  md += `## 💡 Strategic Recommendations\n\n`;
  md += generateRecommendations(data);
  md += `\n---\n\n`;

  // Footer
  md += `*Generated by Portfolio Cognitive Command*\n`;
  md += `*Timestamp: ${data.metrics.timestamp}*\n`;

  return md;
}

/**
 * Generates strategic recommendations based on portfolio analysis
 * @param data - Portfolio brief data
 * @returns Markdown recommendations section
 */
function generateRecommendations(data: PortfolioBriefData): string {
  const recommendations: string[] = [];

  // Check drift alerts
  if (data.metrics.driftAlerts > 0) {
    recommendations.push(
      `1. **Address Drift Alerts:** ${data.metrics.driftAlerts} project(s) showing drift. Review and realign with strategic intent.`
    );
  }

  // Check dormant projects
  if (data.metrics.dormantProjects > 0) {
    const dormantPercent = (data.metrics.dormantProjects / data.metrics.totalProjects * 100).toFixed(0);
    recommendations.push(
      `2. **Revive Dormant Projects:** ${data.metrics.dormantProjects} projects (${dormantPercent}%) are dormant. Consider archiving or reactivating.`
    );
  }

  // Check cluster balance
  const clusterCounts = data.clusterAnalysis.map(c => c.count);
  const maxCluster = Math.max(...clusterCounts);
  const minCluster = Math.min(...clusterCounts);
  const imbalance = maxCluster / (minCluster || 1);

  if (imbalance > 3 && data.clusterAnalysis.length > 1) {
    const dominant = data.clusterAnalysis[0];
    recommendations.push(
      `3. **Balance Portfolio:** Cluster "${dominant.cluster}" dominates with ${dominant.count} projects. Consider diversifying focus.`
    );
  }

  // Check agent-driven percentage
  if (data.metrics.agentDrivenPercentage < 0.5) {
    const agentPercent = (data.metrics.agentDrivenPercentage * 100).toFixed(0);
    recommendations.push(
      `4. **Increase Automation:** Only ${agentPercent}% of projects are agent-driven. Leverage AgentDB for more automated execution.`
    );
  }

  // Check overall alignment
  if (data.metrics.averageAlignment < 0.8) {
    recommendations.push(
      `5. **Improve Alignment:** Average alignment is ${(data.metrics.averageAlignment * 100).toFixed(0)}%. Focus on clarifying and documenting intent.`
    );
  }

  // If everything is good
  if (recommendations.length === 0) {
    recommendations.push(
      `✅ **Portfolio Health Excellent:** Continue current trajectory. All metrics within optimal ranges.`
    );
  }

  return recommendations.join('\n\n');
}

/**
 * Formats source type for display
 */
function formatSource(source: string): string {
  return source === 'agent_swarm' ? 'Agent-Driven' : 'Manual Implementation';
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generates and saves portfolio brief to file
 * @param shardDir - Directory containing shard files
 * @param metricsPath - Path to cognitive_metrics.json
 * @param outputDir - Directory to save brief
 * @returns Brief generation result
 */
export function generateBrief(
  shardDir: string,
  metricsPath: string,
  outputDir: string
): BriefGeneratorResult {
  // Load data
  const shards = loadShards(shardDir);
  const metrics = loadMetrics(metricsPath);

  // Analyze portfolio
  const data = analyzePortfolio(shards, metrics);

  // Generate markdown
  const markdown = generateBriefMarkdown(data);

  // Create filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `Portfolio_Brief_${date}.md`;
  const filepath = path.join(outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to file
  fs.writeFileSync(filepath, markdown, 'utf8');

  return {
    filename,
    filepath,
    precisionScore: metrics.precisionScore,
    redListCount: data.redList.length,
    topPerformersCount: data.topPerformers.length,
    clusterCount: data.clusterAnalysis.length,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Batch generates briefs for historical tracking
 * @param shardDir - Directory containing shard files
 * @param metricsPath - Path to cognitive_metrics.json
 * @param outputDir - Directory to save briefs
 * @param days - Number of days to generate (simulated for historical data)
 * @returns Array of brief generation results
 */
export function batchGenerateBriefs(
  shardDir: string,
  metricsPath: string,
  outputDir: string,
  days: number = 1
): BriefGeneratorResult[] {
  const results: BriefGeneratorResult[] = [];

  for (let i = 0; i < days; i++) {
    const result = generateBrief(shardDir, metricsPath, outputDir);
    results.push(result);
  }

  return results;
}
