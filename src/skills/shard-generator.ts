/**
 * Shard Generator Skill
 * Generates JSON shards for project aggregation and dashboard display
 */

import * as fs from 'fs';
import * as path from 'path';
import { RepoScanResult } from './repo-scanner';
import { SemanticEmbedding } from './semantic-analyzer';
import { CognitiveLink } from './cognitive-linker';
import { DriftResult } from './drift-detector';

export interface DeploymentInfo {
  platform: 'vercel' | 'netlify' | 'github-pages' | 'railway' | 'docker' | 'local' | 'unknown';
  status: 'deployed' | 'pending' | 'failed' | 'not-configured';
  url?: string;
  lastDeployDate?: string;
}

export interface TechStackInfo {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  primaryLanguage: string;
}

export interface ActivityMetrics {
  commits7d: number;
  commits30d: number;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  commitVelocity: 'high' | 'medium' | 'low' | 'stale';
  hasRecentBugFixes: boolean;
  hasRecentFeatures: boolean;
}

export interface IntegrationInfo {
  hasCI: boolean;
  ciPlatform?: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'other';
  hasTests: boolean;
  testCoverage?: number;
  hasDocker: boolean;
  hasLinting: boolean;
  hasTypeScript: boolean;
  hasSupabase?: boolean;
}

export interface ProjectHealth {
  score: number;  // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    activity: number;
    deployment: number;
    codeQuality: number;
    documentation: number;
    integrations: number;
  };
  recommendations: string[];
}

export interface ProjectShard {
  project: string;
  cluster: string;
  alignmentScore: number;
  driftAlert: boolean;
  lastIntent: string;
  executionSummary: string;
  rawCommit: string;
  source: 'agent_swarm' | 'manual_override';
  metadata?: {
    timestamp: string;
    commitHash: string;
    sessionId?: string;
    commitCount7d: number;
    status: 'ACTIVE' | 'DORMANT';
  };
  // Enhanced metrics
  deployment?: DeploymentInfo;
  techStack?: TechStackInfo;
  activity?: ActivityMetrics;
  integrations?: IntegrationInfo;
  health?: ProjectHealth;
}

/**
 * Generates a project shard from scan, embedding, and cognitive link data
 * @param repo - Repository scan result
 * @param embedding - Semantic embedding
 * @param link - Cognitive link to agent session
 * @param drift - Optional drift detection result
 * @returns Project shard
 */
export function generateShard(
  repo: RepoScanResult,
  embedding: SemanticEmbedding,
  link: CognitiveLink,
  drift?: DriftResult
): ProjectShard {
  // Extract last intent from reasoning chain or commit message
  const lastIntent = link.reasoningChain
    ? extractIntentFromReasoning(link.reasoningChain)
    : repo.lastCommit.message;

  // Generate execution summary
  const executionSummary = generateExecutionSummary(repo, link);

  // Calculate alignment score (from drift or default to high if no drift detected)
  const alignmentScore = drift?.alignmentScore ?? 0.95;
  const driftAlert = drift?.driftAlert ?? false;

  // Calculate activity metrics
  const activity = calculateActivityMetrics(repo);

  // Calculate project health
  const health = calculateProjectHealth(repo, activity);

  return {
    project: repo.name,
    cluster: embedding.cluster,
    alignmentScore,
    driftAlert,
    lastIntent,
    executionSummary,
    rawCommit: repo.lastCommit.message,
    source: link.source,
    metadata: {
      timestamp: repo.lastCommit.date,
      commitHash: repo.lastCommit.hash,
      sessionId: link.sessionId || undefined,
      commitCount7d: repo.commits7d,
      status: repo.status
    },
    // Enhanced metrics
    deployment: {
      platform: repo.deployment?.platform || 'unknown',
      status: repo.deployment?.hasConfig ? 'deployed' : 'not-configured'
    },
    techStack: repo.techStack,
    activity,
    integrations: repo.integrations,
    health
  };
}

/**
 * Calculates activity metrics from repo scan data
 */
function calculateActivityMetrics(repo: RepoScanResult): ActivityMetrics {
  const lastCommitDate = new Date(repo.lastCommit.date);
  const now = new Date();
  const daysSinceLastCommit = Math.floor((now.getTime() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine commit velocity
  let commitVelocity: ActivityMetrics['commitVelocity'];
  if (repo.commits7d >= 10) {
    commitVelocity = 'high';
  } else if (repo.commits7d >= 3) {
    commitVelocity = 'medium';
  } else if (repo.commits7d >= 1 || daysSinceLastCommit < 14) {
    commitVelocity = 'low';
  } else {
    commitVelocity = 'stale';
  }

  // Check for recent bug fixes and features
  const hasRecentBugFixes = (repo.recentCommitTypes?.fixes || 0) > 0;
  const hasRecentFeatures = (repo.recentCommitTypes?.features || 0) > 0;

  return {
    commits7d: repo.commits7d,
    commits30d: repo.commits30d || repo.commits7d,
    lastCommitDate: repo.lastCommit.date,
    daysSinceLastCommit,
    commitVelocity,
    hasRecentBugFixes,
    hasRecentFeatures
  };
}

/**
 * Calculates project health score based on multiple factors
 */
function calculateProjectHealth(repo: RepoScanResult, activity: ActivityMetrics): ProjectHealth {
  const factors = {
    activity: 0,
    deployment: 0,
    codeQuality: 0,
    documentation: 0,
    integrations: 0
  };

  const recommendations: string[] = [];

  // Activity score (0-100)
  if (activity.commitVelocity === 'high') {
    factors.activity = 100;
  } else if (activity.commitVelocity === 'medium') {
    factors.activity = 75;
  } else if (activity.commitVelocity === 'low') {
    factors.activity = 50;
  } else {
    factors.activity = 25;
    recommendations.push('Consider reviving this project or archiving it');
  }

  // Deployment score (0-100)
  if (repo.deployment?.hasConfig) {
    factors.deployment = 100;
  } else {
    factors.deployment = 30;
    recommendations.push('Add deployment configuration (Vercel, Netlify, Docker)');
  }

  // Code quality score (0-100)
  let codeQualityScore = 40; // Base score
  if (repo.integrations?.hasTypeScript) codeQualityScore += 20;
  if (repo.integrations?.hasLinting) codeQualityScore += 20;
  if (repo.integrations?.hasTests) codeQualityScore += 20;
  factors.codeQuality = Math.min(codeQualityScore, 100);

  if (!repo.integrations?.hasTypeScript) {
    recommendations.push('Consider adding TypeScript for type safety');
  }
  if (!repo.integrations?.hasLinting) {
    recommendations.push('Add ESLint/Prettier for consistent code style');
  }
  if (!repo.integrations?.hasTests) {
    recommendations.push('Add test coverage');
  }

  // Documentation score (0-100)
  factors.documentation = repo.integrations?.hasReadme ? 80 : 20;
  if (!repo.integrations?.hasReadme) {
    recommendations.push('Add a README.md file');
  }

  // Integrations score (0-100)
  let integrationScore = 30; // Base score
  if (repo.integrations?.hasCI) integrationScore += 40;
  if (repo.integrations?.hasDocker) integrationScore += 30;
  factors.integrations = Math.min(integrationScore, 100);

  if (!repo.integrations?.hasCI) {
    recommendations.push('Add CI/CD pipeline (GitHub Actions recommended)');
  }

  // Calculate overall health score (weighted average)
  const weights = {
    activity: 0.25,
    deployment: 0.15,
    codeQuality: 0.30,
    documentation: 0.10,
    integrations: 0.20
  };

  const score = Math.round(
    factors.activity * weights.activity +
    factors.deployment * weights.deployment +
    factors.codeQuality * weights.codeQuality +
    factors.documentation * weights.documentation +
    factors.integrations * weights.integrations
  );

  // Determine grade
  let grade: ProjectHealth['grade'];
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    factors,
    recommendations: recommendations.slice(0, 3) // Top 3 recommendations
  };
}

/**
 * Extracts primary intent from reasoning chain
 */
function extractIntentFromReasoning(reasoning: string): string {
  // Split by arrow or newline
  const steps = reasoning.split(/→|\n/).map(s => s.trim()).filter(s => s.length > 0);

  // Return first substantial step (> 20 chars)
  const intent = steps.find(s => s.length > 20) || steps[0] || 'Unknown intent';

  // Truncate if too long
  return intent.length > 150 ? intent.substring(0, 147) + '...' : intent;
}

/**
 * Generates execution summary from repo and cognitive link
 */
function generateExecutionSummary(repo: RepoScanResult, link: CognitiveLink): string {
  const parts: string[] = [];

  // Status
  parts.push(`Status: ${repo.status}`);

  // Activity level
  if (repo.commits7d > 0) {
    parts.push(`${repo.commits7d} commits in last 7 days`);
  } else {
    parts.push('No recent activity');
  }

  // Source information
  if (link.source === 'agent_swarm' && link.sessionId) {
    parts.push(`Agent session: ${link.sessionId.substring(0, 8)}`);
  } else {
    parts.push('Manual implementation');
  }

  return parts.join(' • ');
}

/**
 * Batch generates shards for multiple repositories
 * @param repoData - Array of repo scan results with embeddings and links
 * @returns Array of project shards
 */
export function batchGenerateShards(
  repoData: Array<{
    repo: RepoScanResult;
    embedding: SemanticEmbedding;
    link: CognitiveLink;
    drift?: DriftResult;
  }>
): ProjectShard[] {
  return repoData.map(data =>
    generateShard(data.repo, data.embedding, data.link, data.drift)
  );
}

/**
 * Saves a shard to disk as JSON
 * @param shard - Project shard to save
 * @param outputDir - Output directory
 */
export function saveShard(shard: ProjectShard, outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${shard.project}_shard.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(shard, null, 2), 'utf8');
}

/**
 * Saves multiple shards in batch
 * @param shards - Array of project shards
 * @param outputDir - Output directory
 */
export function saveShards(shards: ProjectShard[], outputDir: string): void {
  for (const shard of shards) {
    saveShard(shard, outputDir);
  }
}

/**
 * Loads all shards from a directory
 * @param shardDir - Directory containing shard files
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
 * Aggregates shards by cluster
 * @param shards - Array of project shards
 * @returns Object mapping cluster names to arrays of shards
 */
export function aggregateByCluster(
  shards: ProjectShard[]
): Record<string, ProjectShard[]> {
  const clusters: Record<string, ProjectShard[]> = {};

  for (const shard of shards) {
    if (!clusters[shard.cluster]) {
      clusters[shard.cluster] = [];
    }
    clusters[shard.cluster].push(shard);
  }

  return clusters;
}

/**
 * Filters shards by status
 * @param shards - Array of project shards
 * @param status - Status to filter by ('ACTIVE' or 'DORMANT')
 * @returns Filtered array of shards
 */
export function filterByStatus(
  shards: ProjectShard[],
  status: 'ACTIVE' | 'DORMANT'
): ProjectShard[] {
  return shards.filter(s => s.metadata?.status === status);
}

/**
 * Sorts shards by alignment score (descending)
 * @param shards - Array of project shards
 * @returns Sorted array
 */
export function sortByAlignment(shards: ProjectShard[]): ProjectShard[] {
  return [...shards].sort((a, b) => b.alignmentScore - a.alignmentScore);
}

/**
 * Filters shards with drift alerts
 * @param shards - Array of project shards
 * @returns Array of shards with drift alerts
 */
export function getDriftAlerts(shards: ProjectShard[]): ProjectShard[] {
  return shards.filter(s => s.driftAlert);
}

/**
 * Calculates aggregate statistics from shards
 * @param shards - Array of project shards
 * @returns Statistics object
 */
export function calculateStats(shards: ProjectShard[]): {
  total: number;
  active: number;
  dormant: number;
  driftAlerts: number;
  averageAlignment: number;
  agentDriven: number;
  manualOverride: number;
  byClusters: Record<string, number>;
} {
  const stats = {
    total: shards.length,
    active: 0,
    dormant: 0,
    driftAlerts: 0,
    averageAlignment: 0,
    agentDriven: 0,
    manualOverride: 0,
    byClusters: {} as Record<string, number>
  };

  let totalAlignment = 0;

  for (const shard of shards) {
    // Status counts
    if (shard.metadata?.status === 'ACTIVE') stats.active++;
    if (shard.metadata?.status === 'DORMANT') stats.dormant++;

    // Drift alerts
    if (shard.driftAlert) stats.driftAlerts++;

    // Alignment
    totalAlignment += shard.alignmentScore;

    // Source
    if (shard.source === 'agent_swarm') stats.agentDriven++;
    if (shard.source === 'manual_override') stats.manualOverride++;

    // Clusters
    if (!stats.byClusters[shard.cluster]) {
      stats.byClusters[shard.cluster] = 0;
    }
    stats.byClusters[shard.cluster]++;
  }

  stats.averageAlignment = shards.length > 0
    ? totalAlignment / shards.length
    : 0;

  return stats;
}
