/**
 * Brief Generator Skill
 * Generates executive Portfolio Brief markdown documents with enhanced metrics
 * and AI-powered strategic insights
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { ProjectShard, ProjectHealth, ActivityMetrics, TechStackInfo, IntegrationInfo } from './shard-generator';

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
  // Enhanced metrics
  averageHealthScore?: number;
  healthGradeDistribution?: Record<string, number>;
  projectsWithCI?: number;
  projectsWithTests?: number;
  projectsWithDocker?: number;
  projectsDeployed?: number;
  totalCommits7d?: number;
  totalCommits30d?: number;
  techStackSummary?: {
    languages: Record<string, number>;
    frameworks: Record<string, number>;
  };
}

export interface BriefGeneratorResult {
  filename: string;
  filepath: string;
  precisionScore: number;
  healthScore: number;
  healthGrade: string;
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
  needsAttention: ProjectShard[];
  clusterAnalysis: Array<{
    cluster: string;
    count: number;
    avgAlignment: number;
    avgHealthScore: number;
    avgHealthGrade: string;
    projects: string[];
  }>;
  healthSummary: {
    avgScore: number;
    avgGrade: string;
    distribution: Record<string, number>;
  };
  activitySummary: {
    totalCommits7d: number;
    totalCommits30d: number;
    highVelocity: number;
    mediumVelocity: number;
    lowVelocity: number;
    stale: number;
  };
  techSummary: {
    languages: Array<{ name: string; count: number }>;
    frameworks: Array<{ name: string; count: number }>;
  };
  integrationSummary: {
    withCI: number;
    withTests: number;
    withDocker: number;
    withTypeScript: number;
    withSupabase: number;
    deployed: number;
  };
  aiStrategy?: PortfolioStrategy | null;
}

/**
 * Strategic insight categories
 */
export type StrategyInsightType =
  | 'consolidation'   // Merge similar projects
  | 'investment'      // Prioritize for growth
  | 'maintenance'     // Keep stable, minimal effort
  | 'retirement'      // Archive or deprecate
  | 'acceleration';   // Fast-track development

/**
 * AI-powered portfolio strategy insights
 */
export interface PortfolioStrategy {
  executiveSummary: string;
  insights: Array<{
    project: string;
    type: StrategyInsightType;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
  techDebtAssessment: {
    overallLevel: 'critical' | 'high' | 'moderate' | 'low';
    hotspots: string[];
    quickWins: string[];
  };
  riskWarnings: Array<{
    type: 'abandonment' | 'complexity' | 'dependency' | 'security' | 'performance';
    description: string;
    affectedProjects: string[];
  }>;
  focusAreas: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  portfolioTrend: 'growing' | 'stable' | 'declining' | 'transitioning';
  analysisTimestamp: string;
}

/**
 * Cache for portfolio strategy to avoid repeated API calls
 */
const strategyCache = new Map<string, { strategy: PortfolioStrategy; expiry: number }>();
const STRATEGY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
 * Analyzes shards to build portfolio brief data with enhanced metrics
 * @param shards - Array of project shards
 * @param metrics - Cognitive metrics
 * @returns Portfolio brief data
 */
export function analyzePortfolio(
  shards: ProjectShard[],
  metrics: CognitiveMetrics
): PortfolioBriefData {
  // Calculate health summary
  const healthScores = shards
    .filter(s => s.health?.score !== undefined)
    .map(s => s.health!.score);
  const avgHealthScore = healthScores.length > 0
    ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
    : 0;
  const avgHealthGrade = getGradeFromScore(avgHealthScore);

  const healthDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const shard of shards) {
    const grade = shard.health?.grade || 'F';
    healthDistribution[grade] = (healthDistribution[grade] || 0) + 1;
  }

  // Identify red list (low health score or drift alerts)
  const redList = shards.filter(s =>
    s.driftAlert || (s.health?.score !== undefined && s.health.score < 50)
  ).sort((a, b) => (a.health?.score || 0) - (b.health?.score || 0));

  // Identify projects needing attention (health grade C, D, or F)
  const needsAttention = shards.filter(s =>
    s.health?.grade && ['C', 'D', 'F'].includes(s.health.grade)
  ).sort((a, b) => (a.health?.score || 0) - (b.health?.score || 0));

  // Identify top performers (high health score + active)
  const topPerformers = shards
    .filter(s => s.metadata?.status === 'ACTIVE' && s.health?.score !== undefined && s.health.score >= 70)
    .sort((a, b) => (b.health?.score || 0) - (a.health?.score || 0))
    .slice(0, 5);

  // Cluster analysis with health metrics
  const clusterMap: Record<string, ProjectShard[]> = {};
  for (const shard of shards) {
    if (!clusterMap[shard.cluster]) {
      clusterMap[shard.cluster] = [];
    }
    clusterMap[shard.cluster].push(shard);
  }

  const clusterAnalysis = Object.entries(clusterMap).map(([cluster, projects]) => {
    const avgAlignment = projects.reduce((sum, p) => sum + p.alignmentScore, 0) / projects.length;
    const healthScores = projects.filter(p => p.health?.score !== undefined).map(p => p.health!.score);
    const avgClusterHealth = healthScores.length > 0
      ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
      : 0;
    return {
      cluster,
      count: projects.length,
      avgAlignment,
      avgHealthScore: avgClusterHealth,
      avgHealthGrade: getGradeFromScore(avgClusterHealth),
      projects: projects.map(p => p.project)
    };
  }).sort((a, b) => b.avgHealthScore - a.avgHealthScore);

  // Activity summary
  const activitySummary = {
    totalCommits7d: 0,
    totalCommits30d: 0,
    highVelocity: 0,
    mediumVelocity: 0,
    lowVelocity: 0,
    stale: 0
  };
  for (const shard of shards) {
    activitySummary.totalCommits7d += shard.activity?.commits7d || 0;
    activitySummary.totalCommits30d += shard.activity?.commits30d || 0;
    switch (shard.activity?.commitVelocity) {
      case 'high': activitySummary.highVelocity++; break;
      case 'medium': activitySummary.mediumVelocity++; break;
      case 'low': activitySummary.lowVelocity++; break;
      case 'stale': activitySummary.stale++; break;
    }
  }

  // Tech stack summary
  const languageCounts: Record<string, number> = {};
  const frameworkCounts: Record<string, number> = {};
  for (const shard of shards) {
    if (shard.techStack) {
      for (const lang of shard.techStack.languages || []) {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
      for (const fw of shard.techStack.frameworks || []) {
        frameworkCounts[fw] = (frameworkCounts[fw] || 0) + 1;
      }
    }
  }
  const techSummary = {
    languages: Object.entries(languageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    frameworks: Object.entries(frameworkCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  };

  // Integration summary
  const integrationSummary = {
    withCI: shards.filter(s => s.integrations?.hasCI).length,
    withTests: shards.filter(s => s.integrations?.hasTests).length,
    withDocker: shards.filter(s => s.integrations?.hasDocker).length,
    withTypeScript: shards.filter(s => s.integrations?.hasTypeScript).length,
    withSupabase: shards.filter(s => s.integrations?.hasSupabase).length,
    deployed: shards.filter(s => s.deployment?.status === 'deployed').length
  };

  return {
    metrics,
    shards,
    redList,
    topPerformers,
    needsAttention,
    clusterAnalysis,
    healthSummary: {
      avgScore: avgHealthScore,
      avgGrade: avgHealthGrade,
      distribution: healthDistribution
    },
    activitySummary,
    techSummary,
    integrationSummary
  };
}

/**
 * Converts numeric score to letter grade
 */
function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Generates markdown content for portfolio brief with enhanced metrics
 * @param data - Portfolio brief data
 * @returns Markdown string
 */
export function generateBriefMarkdown(data: PortfolioBriefData): string {
  const date = new Date().toISOString().split('T')[0];
  const healthScore = data.healthSummary.avgScore.toFixed(0);
  const healthGrade = data.healthSummary.avgGrade;
  const totalProjects = data.shards.length;

  let md = '';

  // Header with health score (replacing alignment)
  md += `# Portfolio Brief\n`;
  md += `**Date:** ${date}\n\n`;
  md += `## 🏥 Portfolio Health Score\n\n`;
  md += `# Grade: ${healthGrade} (${healthScore}/100)\n\n`;
  md += `| Grade | Count | Percentage |\n`;
  md += `|-------|-------|------------|\n`;
  for (const grade of ['A', 'B', 'C', 'D', 'F']) {
    const count = data.healthSummary.distribution[grade] || 0;
    const pct = totalProjects > 0 ? ((count / totalProjects) * 100).toFixed(0) : '0';
    const bar = '█'.repeat(Math.round(count / totalProjects * 20));
    md += `| ${grade} | ${count} | ${pct}% ${bar} |\n`;
  }
  md += `\n---\n\n`;

  // Executive Summary with enhanced metrics
  md += `## 📊 Executive Summary\n\n`;
  md += `### Project Status\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Projects | ${totalProjects} |\n`;
  md += `| Active | ${data.metrics.activeProjects} |\n`;
  md += `| Dormant | ${data.metrics.dormantProjects} |\n`;
  md += `| Needs Attention | ${data.needsAttention.length} |\n\n`;

  md += `### Development Activity (Last 7 Days)\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Commits | ${data.activitySummary.totalCommits7d} |\n`;
  md += `| High Velocity | ${data.activitySummary.highVelocity} projects |\n`;
  md += `| Medium Velocity | ${data.activitySummary.mediumVelocity} projects |\n`;
  md += `| Low Velocity | ${data.activitySummary.lowVelocity} projects |\n`;
  md += `| Stale | ${data.activitySummary.stale} projects |\n\n`;

  md += `### Infrastructure Coverage\n`;
  md += `| Integration | Count | Coverage |\n`;
  md += `|-------------|-------|----------|\n`;
  md += `| CI/CD | ${data.integrationSummary.withCI} | ${((data.integrationSummary.withCI / totalProjects) * 100).toFixed(0)}% |\n`;
  md += `| Tests | ${data.integrationSummary.withTests} | ${((data.integrationSummary.withTests / totalProjects) * 100).toFixed(0)}% |\n`;
  md += `| Docker | ${data.integrationSummary.withDocker} | ${((data.integrationSummary.withDocker / totalProjects) * 100).toFixed(0)}% |\n`;
  md += `| TypeScript | ${data.integrationSummary.withTypeScript} | ${((data.integrationSummary.withTypeScript / totalProjects) * 100).toFixed(0)}% |\n`;
  md += `| Supabase | ${data.integrationSummary.withSupabase} | ${((data.integrationSummary.withSupabase / totalProjects) * 100).toFixed(0)}% |\n`;
  md += `| Deployed | ${data.integrationSummary.deployed} | ${((data.integrationSummary.deployed / totalProjects) * 100).toFixed(0)}% |\n\n`;
  md += `---\n\n`;

  // Tech Stack Overview
  md += `## 💻 Tech Stack Overview\n\n`;
  if (data.techSummary.languages.length > 0) {
    md += `### Languages\n`;
    md += `| Language | Projects |\n`;
    md += `|----------|----------|\n`;
    for (const lang of data.techSummary.languages.slice(0, 8)) {
      const bar = '█'.repeat(Math.min(Math.round(lang.count / totalProjects * 20), 20));
      md += `| ${lang.name} | ${lang.count} ${bar} |\n`;
    }
    md += `\n`;
  }
  if (data.techSummary.frameworks.length > 0) {
    md += `### Frameworks\n`;
    md += `| Framework | Projects |\n`;
    md += `|-----------|----------|\n`;
    for (const fw of data.techSummary.frameworks.slice(0, 8)) {
      md += `| ${fw.name} | ${fw.count} |\n`;
    }
    md += `\n`;
  }
  md += `---\n\n`;

  // Projects Needing Attention (replacing Red List)
  md += `## 🚨 Projects Needing Attention\n\n`;
  if (data.needsAttention.length === 0) {
    md += `✅ **All projects are in good health**\n\n`;
  } else {
    md += `**${data.needsAttention.length} project(s) need improvement:**\n\n`;
    md += `| Project | Health | Grade | Issues | Recommendations |\n`;
    md += `|---------|--------|-------|--------|------------------|\n`;
    for (const shard of data.needsAttention.slice(0, 10)) {
      const healthScore = shard.health?.score?.toFixed(0) || 'N/A';
      const grade = shard.health?.grade || '?';
      const issues: string[] = [];
      if (!shard.integrations?.hasTests) issues.push('No tests');
      if (!shard.integrations?.hasCI) issues.push('No CI');
      if (!shard.integrations?.hasTypeScript) issues.push('No TS');
      if (shard.activity?.commitVelocity === 'stale') issues.push('Stale');
      const recs = shard.health?.recommendations?.slice(0, 2).join('; ') || '';
      md += `| ${shard.project} | ${healthScore} | ${grade} | ${issues.join(', ') || '-'} | ${truncateText(recs, 50)} |\n`;
    }
    md += `\n`;
  }
  md += `---\n\n`;

  // Cluster Analysis with health metrics
  md += `## 📦 Cluster Distribution\n\n`;
  md += `Portfolio organized across ${data.clusterAnalysis.length} strategic clusters:\n\n`;
  md += `| Cluster | Projects | Health | Grade |\n`;
  md += `|---------|----------|--------|-------|\n`;
  for (const cluster of data.clusterAnalysis) {
    md += `| ${cluster.cluster} | ${cluster.count} | ${cluster.avgHealthScore.toFixed(0)} | ${cluster.avgHealthGrade} |\n`;
  }
  md += `\n`;

  for (const cluster of data.clusterAnalysis) {
    md += `### ${cluster.cluster} (Grade ${cluster.avgHealthGrade})\n\n`;
    md += `**Projects:** ${cluster.projects.join(', ')}\n\n`;
  }
  md += `---\n\n`;

  // Top Performers with enhanced metrics
  md += `## 🏆 Top Performers\n\n`;
  if (data.topPerformers.length === 0) {
    md += `No active projects with high health scores yet.\n\n`;
  } else {
    md += `Projects excelling in health and development velocity:\n\n`;
    md += `| Rank | Project | Health | Grade | Commits (7d) | Tech Stack |\n`;
    md += `|------|---------|--------|-------|--------------|------------|\n`;
    let rank = 1;
    for (const shard of data.topPerformers) {
      const healthScore = shard.health?.score?.toFixed(0) || 'N/A';
      const grade = shard.health?.grade || '?';
      const commits = shard.activity?.commits7d || 0;
      const tech = shard.techStack?.primaryLanguage || 'Unknown';
      md += `| ${rank} | ${shard.project} | ${healthScore} | ${grade} | ${commits} | ${tech} |\n`;
      rank++;
    }
    md += `\n`;

    // Detailed breakdown
    rank = 1;
    for (const shard of data.topPerformers) {
      md += `### ${rank}. ${shard.project}\n\n`;
      md += `- **Health Score:** ${shard.health?.score?.toFixed(0) || 'N/A'}/100 (Grade ${shard.health?.grade || '?'})\n`;
      md += `- **Cluster:** ${shard.cluster}\n`;
      md += `- **Activity:** ${shard.activity?.commits7d || 0} commits (7d), ${shard.activity?.commits30d || 0} commits (30d)\n`;
      md += `- **Velocity:** ${shard.activity?.commitVelocity || 'unknown'}\n`;
      md += `- **Tech:** ${shard.techStack?.primaryLanguage || 'Unknown'}`;
      if (shard.techStack?.frameworks?.length) {
        md += ` + ${shard.techStack.frameworks.slice(0, 3).join(', ')}`;
      }
      md += `\n`;

      // Integrations
      const integrations: string[] = [];
      if (shard.integrations?.hasCI) integrations.push('CI/CD');
      if (shard.integrations?.hasTests) integrations.push('Tests');
      if (shard.integrations?.hasDocker) integrations.push('Docker');
      if (shard.integrations?.hasTypeScript) integrations.push('TypeScript');
      if (shard.integrations?.hasSupabase) integrations.push('Supabase');
      if (integrations.length > 0) {
        md += `- **Integrations:** ${integrations.join(', ')}\n`;
      }

      md += `- **Last Commit:** ${truncateText(shard.lastIntent, 80)}\n\n`;
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
  const totalProjects = data.shards.length;
  let recNum = 1;

  // Check overall health
  if (data.healthSummary.avgScore < 70) {
    recommendations.push(
      `${recNum}. **Improve Portfolio Health:** Average health score is ${data.healthSummary.avgScore.toFixed(0)}/100 (Grade ${data.healthSummary.avgGrade}). Focus on adding tests, CI/CD, and documentation to underperforming projects.`
    );
    recNum++;
  }

  // Check test coverage
  const testCoverage = (data.integrationSummary.withTests / totalProjects) * 100;
  if (testCoverage < 50) {
    recommendations.push(
      `${recNum}. **Add Test Coverage:** Only ${testCoverage.toFixed(0)}% of projects have tests. Prioritize adding tests to active projects.`
    );
    recNum++;
  }

  // Check CI/CD coverage
  const ciCoverage = (data.integrationSummary.withCI / totalProjects) * 100;
  if (ciCoverage < 40) {
    recommendations.push(
      `${recNum}. **Implement CI/CD:** Only ${ciCoverage.toFixed(0)}% of projects have CI/CD. Add GitHub Actions workflows to automate testing and deployment.`
    );
    recNum++;
  }

  // Check stale projects
  if (data.activitySummary.stale > totalProjects * 0.3) {
    const stalePercent = ((data.activitySummary.stale / totalProjects) * 100).toFixed(0);
    recommendations.push(
      `${recNum}. **Address Stale Projects:** ${data.activitySummary.stale} projects (${stalePercent}%) are stale. Consider archiving inactive ones or scheduling maintenance.`
    );
    recNum++;
  }

  // Check dormant projects
  if (data.metrics.dormantProjects > totalProjects * 0.5) {
    const dormantPercent = ((data.metrics.dormantProjects / totalProjects) * 100).toFixed(0);
    recommendations.push(
      `${recNum}. **Reduce Dormant Projects:** ${data.metrics.dormantProjects} projects (${dormantPercent}%) are dormant. Archive completed work or revive promising projects.`
    );
    recNum++;
  }

  // Check TypeScript adoption
  const tsCoverage = (data.integrationSummary.withTypeScript / totalProjects) * 100;
  if (tsCoverage < 30) {
    recommendations.push(
      `${recNum}. **Consider TypeScript:** Only ${tsCoverage.toFixed(0)}% of projects use TypeScript. Consider migrating JavaScript projects for better maintainability.`
    );
    recNum++;
  }

  // Check deployment status
  const deployedCoverage = (data.integrationSummary.deployed / totalProjects) * 100;
  if (deployedCoverage < 20 && totalProjects > 5) {
    recommendations.push(
      `${recNum}. **Improve Deployment:** Only ${deployedCoverage.toFixed(0)}% of projects are deployed. Add deployment configs (Vercel, Netlify, Docker) to share your work.`
    );
    recNum++;
  }

  // Check high velocity projects (good sign)
  if (data.activitySummary.highVelocity >= 3) {
    recommendations.push(
      `${recNum}. **Maintain Momentum:** ${data.activitySummary.highVelocity} projects have high velocity. Keep the momentum going and consider documenting best practices from these projects.`
    );
    recNum++;
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
    healthScore: data.healthSummary.avgScore,
    healthGrade: data.healthSummary.avgGrade,
    redListCount: data.needsAttention.length,
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

/**
 * Generates AI-powered portfolio strategy insights
 * Called once per brief generation (cached for 24h)
 * @param data - Portfolio brief data
 * @returns Portfolio strategy or null if API unavailable
 */
export async function generatePortfolioStrategy(
  data: PortfolioBriefData
): Promise<PortfolioStrategy | null> {
  // Check cache first
  const cacheKey = `strategy:${data.shards.length}:${data.healthSummary.avgScore.toFixed(0)}`;
  const cached = strategyCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.strategy;
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[brief-generator] ANTHROPIC_API_KEY not set, skipping AI strategy');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = buildStrategyPrompt(data);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return null;
    }

    // Parse JSON response
    const strategy = parseStrategyResponse(textBlock.text);

    // Cache the result
    strategyCache.set(cacheKey, {
      strategy,
      expiry: Date.now() + STRATEGY_CACHE_TTL_MS
    });

    return strategy;
  } catch (error) {
    console.error('[brief-generator] Claude API error:', error);
    return null;
  }
}

/**
 * Builds the Claude prompt for portfolio strategy analysis
 */
function buildStrategyPrompt(data: PortfolioBriefData): string {
  const projectSummaries = data.shards.slice(0, 30).map(s => ({
    name: s.project,
    cluster: s.cluster,
    health: s.health?.score || 0,
    grade: s.health?.grade || 'F',
    velocity: s.activity?.commitVelocity || 'unknown',
    commits7d: s.activity?.commits7d || 0,
    hasTests: s.integrations?.hasTests || false,
    hasCI: s.integrations?.hasCI || false,
    deployed: s.deployment?.status === 'deployed',
    tech: s.techStack?.primaryLanguage || 'unknown'
  }));

  return `You are a technical portfolio strategist helping a developer optimize their project portfolio.

## Portfolio Overview
- Total Projects: ${data.shards.length}
- Average Health: ${data.healthSummary.avgScore.toFixed(0)}/100 (Grade ${data.healthSummary.avgGrade})
- Grade Distribution: A=${data.healthSummary.distribution.A || 0}, B=${data.healthSummary.distribution.B || 0}, C=${data.healthSummary.distribution.C || 0}, D=${data.healthSummary.distribution.D || 0}, F=${data.healthSummary.distribution.F || 0}
- Active Commits (7d): ${data.activitySummary.totalCommits7d}
- High Velocity: ${data.activitySummary.highVelocity} projects
- Stale: ${data.activitySummary.stale} projects

## Cluster Distribution
${data.clusterAnalysis.map(c => `- ${c.cluster}: ${c.count} projects (Health: ${c.avgHealthGrade})`).join('\n')}

## Infrastructure Coverage
- CI/CD: ${data.integrationSummary.withCI}/${data.shards.length}
- Tests: ${data.integrationSummary.withTests}/${data.shards.length}
- TypeScript: ${data.integrationSummary.withTypeScript}/${data.shards.length}
- Deployed: ${data.integrationSummary.deployed}/${data.shards.length}

## Top Languages
${data.techSummary.languages.slice(0, 5).map(l => `- ${l.name}: ${l.count} projects`).join('\n')}

## Projects Summary (Top 30)
${JSON.stringify(projectSummaries, null, 2)}

## Projects Needing Attention
${data.needsAttention.slice(0, 10).map(s => `- ${s.project}: Health ${s.health?.score || 0}, ${s.health?.recommendations?.slice(0, 2).join('; ') || 'No recommendations'}`).join('\n')}

## Task
Provide strategic insights and actionable recommendations for this portfolio.

Respond ONLY with valid JSON in this exact format:
{
  "executiveSummary": "2-3 sentence high-level assessment of portfolio health and trajectory",
  "insights": [
    {
      "project": "project_name",
      "type": "consolidation|investment|maintenance|retirement|acceleration",
      "recommendation": "Specific action to take",
      "priority": "high|medium|low",
      "reasoning": "Why this recommendation"
    }
  ],
  "techDebtAssessment": {
    "overallLevel": "critical|high|moderate|low",
    "hotspots": ["area1", "area2"],
    "quickWins": ["quick_win1", "quick_win2"]
  },
  "riskWarnings": [
    {
      "type": "abandonment|complexity|dependency|security|performance",
      "description": "Risk description",
      "affectedProjects": ["project1", "project2"]
    }
  ],
  "focusAreas": {
    "immediate": ["This week priorities"],
    "shortTerm": ["This month priorities"],
    "longTerm": ["This quarter priorities"]
  },
  "portfolioTrend": "growing|stable|declining|transitioning"
}

Guidelines:
- Limit insights to 5-8 most impactful projects
- Focus on actionable, specific recommendations
- Be honest about technical debt without being alarmist
- Consider the developer's limited time and resources`;
}

/**
 * Parses Claude's response into PortfolioStrategy
 */
function parseStrategyResponse(response: string): PortfolioStrategy {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and sanitize response
    const validInsightTypes: StrategyInsightType[] = [
      'consolidation', 'investment', 'maintenance', 'retirement', 'acceleration'
    ];
    const validRiskTypes = ['abandonment', 'complexity', 'dependency', 'security', 'performance'];
    const validTrends = ['growing', 'stable', 'declining', 'transitioning'];
    const validDebtLevels = ['critical', 'high', 'moderate', 'low'];

    return {
      executiveSummary: String(parsed.executiveSummary || 'Portfolio analysis completed.'),
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.slice(0, 10).map((i: Record<string, unknown>) => ({
            project: String(i.project || 'Unknown'),
            type: validInsightTypes.includes(i.type as StrategyInsightType)
              ? i.type as StrategyInsightType
              : 'maintenance',
            recommendation: String(i.recommendation || 'Review project status'),
            priority: ['high', 'medium', 'low'].includes(i.priority as string)
              ? i.priority as 'high' | 'medium' | 'low'
              : 'medium',
            reasoning: String(i.reasoning || '')
          }))
        : [],
      techDebtAssessment: {
        overallLevel: validDebtLevels.includes(parsed.techDebtAssessment?.overallLevel)
          ? parsed.techDebtAssessment.overallLevel as 'critical' | 'high' | 'moderate' | 'low'
          : 'moderate',
        hotspots: Array.isArray(parsed.techDebtAssessment?.hotspots)
          ? parsed.techDebtAssessment.hotspots.slice(0, 5).map(String)
          : [],
        quickWins: Array.isArray(parsed.techDebtAssessment?.quickWins)
          ? parsed.techDebtAssessment.quickWins.slice(0, 5).map(String)
          : []
      },
      riskWarnings: Array.isArray(parsed.riskWarnings)
        ? parsed.riskWarnings.slice(0, 5).map((r: Record<string, unknown>) => ({
            type: validRiskTypes.includes(r.type as string)
              ? r.type as 'abandonment' | 'complexity' | 'dependency' | 'security' | 'performance'
              : 'complexity',
            description: String(r.description || ''),
            affectedProjects: Array.isArray(r.affectedProjects)
              ? r.affectedProjects.slice(0, 5).map(String)
              : []
          }))
        : [],
      focusAreas: {
        immediate: Array.isArray(parsed.focusAreas?.immediate)
          ? parsed.focusAreas.immediate.slice(0, 3).map(String)
          : [],
        shortTerm: Array.isArray(parsed.focusAreas?.shortTerm)
          ? parsed.focusAreas.shortTerm.slice(0, 3).map(String)
          : [],
        longTerm: Array.isArray(parsed.focusAreas?.longTerm)
          ? parsed.focusAreas.longTerm.slice(0, 3).map(String)
          : []
      },
      portfolioTrend: validTrends.includes(parsed.portfolioTrend)
        ? parsed.portfolioTrend as 'growing' | 'stable' | 'declining' | 'transitioning'
        : 'stable',
      analysisTimestamp: new Date().toISOString()
    };
  } catch {
    return {
      executiveSummary: 'Unable to generate AI strategy. Manual review recommended.',
      insights: [],
      techDebtAssessment: {
        overallLevel: 'moderate',
        hotspots: [],
        quickWins: []
      },
      riskWarnings: [],
      focusAreas: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      },
      portfolioTrend: 'stable',
      analysisTimestamp: new Date().toISOString()
    };
  }
}

/**
 * Generates AI strategy section for brief markdown
 * @param strategy - Portfolio strategy from AI
 * @returns Markdown string for AI strategy section
 */
export function generateStrategyMarkdown(strategy: PortfolioStrategy): string {
  let md = '';

  md += `## 🤖 AI Strategic Insights\n\n`;
  md += `**Portfolio Trend:** ${formatTrend(strategy.portfolioTrend)}\n\n`;
  md += `### Executive Summary\n\n`;
  md += `${strategy.executiveSummary}\n\n`;

  // Focus Areas
  if (strategy.focusAreas.immediate.length > 0 ||
      strategy.focusAreas.shortTerm.length > 0 ||
      strategy.focusAreas.longTerm.length > 0) {
    md += `### Focus Areas\n\n`;
    if (strategy.focusAreas.immediate.length > 0) {
      md += `**Immediate (This Week):**\n`;
      for (const item of strategy.focusAreas.immediate) {
        md += `- ${item}\n`;
      }
      md += `\n`;
    }
    if (strategy.focusAreas.shortTerm.length > 0) {
      md += `**Short-Term (This Month):**\n`;
      for (const item of strategy.focusAreas.shortTerm) {
        md += `- ${item}\n`;
      }
      md += `\n`;
    }
    if (strategy.focusAreas.longTerm.length > 0) {
      md += `**Long-Term (This Quarter):**\n`;
      for (const item of strategy.focusAreas.longTerm) {
        md += `- ${item}\n`;
      }
      md += `\n`;
    }
  }

  // Project Insights
  if (strategy.insights.length > 0) {
    md += `### Project-Specific Recommendations\n\n`;
    md += `| Project | Strategy | Priority | Recommendation |\n`;
    md += `|---------|----------|----------|----------------|\n`;
    for (const insight of strategy.insights) {
      const strategyIcon = getStrategyIcon(insight.type);
      md += `| ${insight.project} | ${strategyIcon} ${formatInsightType(insight.type)} | ${insight.priority.toUpperCase()} | ${truncateText(insight.recommendation, 60)} |\n`;
    }
    md += `\n`;

    // Detailed reasoning
    md += `<details>\n<summary>📋 Detailed Reasoning</summary>\n\n`;
    for (const insight of strategy.insights) {
      md += `**${insight.project}** (${formatInsightType(insight.type)})\n`;
      md += `> ${insight.reasoning}\n\n`;
    }
    md += `</details>\n\n`;
  }

  // Tech Debt Assessment
  md += `### Technical Debt Assessment\n\n`;
  md += `**Overall Level:** ${formatDebtLevel(strategy.techDebtAssessment.overallLevel)}\n\n`;
  if (strategy.techDebtAssessment.hotspots.length > 0) {
    md += `**Hotspots:**\n`;
    for (const hotspot of strategy.techDebtAssessment.hotspots) {
      md += `- ${hotspot}\n`;
    }
    md += `\n`;
  }
  if (strategy.techDebtAssessment.quickWins.length > 0) {
    md += `**Quick Wins:**\n`;
    for (const win of strategy.techDebtAssessment.quickWins) {
      md += `- ✅ ${win}\n`;
    }
    md += `\n`;
  }

  // Risk Warnings
  if (strategy.riskWarnings.length > 0) {
    md += `### Risk Warnings\n\n`;
    for (const risk of strategy.riskWarnings) {
      const icon = getRiskIcon(risk.type);
      md += `#### ${icon} ${formatRiskType(risk.type)}\n\n`;
      md += `${risk.description}\n\n`;
      if (risk.affectedProjects.length > 0) {
        md += `*Affected: ${risk.affectedProjects.join(', ')}*\n\n`;
      }
    }
  }

  md += `---\n\n`;
  md += `*AI analysis generated: ${new Date(strategy.analysisTimestamp).toLocaleString()}*\n\n`;

  return md;
}

/**
 * Formats portfolio trend for display
 */
function formatTrend(trend: string): string {
  const trends: Record<string, string> = {
    'growing': '📈 Growing',
    'stable': '📊 Stable',
    'declining': '📉 Declining',
    'transitioning': '🔄 Transitioning'
  };
  return trends[trend] || trend;
}

/**
 * Formats insight type for display
 */
function formatInsightType(type: StrategyInsightType): string {
  const types: Record<StrategyInsightType, string> = {
    'consolidation': 'Consolidate',
    'investment': 'Invest',
    'maintenance': 'Maintain',
    'retirement': 'Retire',
    'acceleration': 'Accelerate'
  };
  return types[type] || type;
}

/**
 * Gets icon for strategy type
 */
function getStrategyIcon(type: StrategyInsightType): string {
  const icons: Record<StrategyInsightType, string> = {
    'consolidation': '🔗',
    'investment': '💰',
    'maintenance': '🔧',
    'retirement': '📦',
    'acceleration': '🚀'
  };
  return icons[type] || '📌';
}

/**
 * Formats risk type for display
 */
function formatRiskType(type: string): string {
  const types: Record<string, string> = {
    'abandonment': 'Abandonment Risk',
    'complexity': 'Complexity Risk',
    'dependency': 'Dependency Risk',
    'security': 'Security Risk',
    'performance': 'Performance Risk'
  };
  return types[type] || type;
}

/**
 * Gets icon for risk type
 */
function getRiskIcon(type: string): string {
  const icons: Record<string, string> = {
    'abandonment': '⚠️',
    'complexity': '🔴',
    'dependency': '🔗',
    'security': '🛡️',
    'performance': '⏱️'
  };
  return icons[type] || '⚡';
}

/**
 * Formats debt level for display
 */
function formatDebtLevel(level: string): string {
  const levels: Record<string, string> = {
    'critical': '🔴 Critical',
    'high': '🟠 High',
    'moderate': '🟡 Moderate',
    'low': '🟢 Low'
  };
  return levels[level] || level;
}

/**
 * Clears the strategy cache
 */
export function clearStrategyCache(): void {
  strategyCache.clear();
}

/**
 * Generates brief with AI strategy enhancement
 * @param shardDir - Directory containing shard files
 * @param metricsPath - Path to cognitive_metrics.json
 * @param outputDir - Directory to save brief
 * @param includeAIStrategy - Whether to include AI strategy analysis
 * @returns Brief generation result
 */
export async function generateEnhancedBrief(
  shardDir: string,
  metricsPath: string,
  outputDir: string,
  includeAIStrategy: boolean = true
): Promise<BriefGeneratorResult> {
  // Load data
  const shards = loadShards(shardDir);
  const metrics = loadMetrics(metricsPath);

  // Analyze portfolio
  const data = analyzePortfolio(shards, metrics);

  // Generate AI strategy if enabled
  if (includeAIStrategy) {
    data.aiStrategy = await generatePortfolioStrategy(data);
  }

  // Generate markdown (enhanced with AI section)
  let markdown = generateBriefMarkdown(data);

  // Insert AI strategy section before Strategic Recommendations
  if (data.aiStrategy) {
    const aiSection = generateStrategyMarkdown(data.aiStrategy);
    const insertPoint = markdown.indexOf('## 💡 Strategic Recommendations');
    if (insertPoint > -1) {
      markdown = markdown.slice(0, insertPoint) + aiSection + markdown.slice(insertPoint);
    } else {
      // Append before footer
      const footerPoint = markdown.indexOf('*Generated by Portfolio');
      if (footerPoint > -1) {
        markdown = markdown.slice(0, footerPoint) + aiSection + markdown.slice(footerPoint);
      }
    }
  }

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
    healthScore: data.healthSummary.avgScore,
    healthGrade: data.healthSummary.avgGrade,
    redListCount: data.needsAttention.length,
    topPerformersCount: data.topPerformers.length,
    clusterCount: data.clusterAnalysis.length,
    generatedAt: new Date().toISOString()
  };
}
