/**
 * Ledger Generator Skill
 * Generates Portfolio Progress Ledger for audit trail and compliance
 *
 * Purpose: Create structured audit logs that map git commits to agent reasoning
 * Format: Markdown document with cluster-grouped projects and verification logs
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectShard, loadShards } from './shard-generator';
import { AgentDatabase, AgentSession } from './cognitive-linker';

export interface LedgerEntry {
  commitHash: string;
  translatedValue: string;
  agentReasoning: string | null;
  sessionId: string | null;
  timestamp: string;
  source: 'agent_swarm' | 'manual_override';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING';
}

export interface ClusterLedger {
  cluster: string;
  projects: ProjectLedger[];
  totalCommits: number;
  verifiedCommits: number;
  alignmentScore: number;
}

export interface ProjectLedger {
  projectName: string;
  entries: LedgerEntry[];
  status: 'ACTIVE' | 'DORMANT';
  driftAlert: boolean;
  alignmentScore: number;
}

export interface LedgerGeneratorResult {
  ledgerPath: string;
  totalProjects: number;
  totalCommits: number;
  verifiedCommits: number;
  clusters: ClusterLedger[];
  generatedAt: string;
}

/**
 * Loads shard data from output/docs/shards directory
 * @param shardDir - Directory containing shard JSON files
 * @returns Array of project shards
 */
function loadShardData(shardDir: string): ProjectShard[] {
  const shards = loadShards(shardDir);

  // Also check for aggregated shards file
  const aggregatedPath = path.join(path.dirname(shardDir), 'project_shards.json');
  if (fs.existsSync(aggregatedPath)) {
    try {
      const content = fs.readFileSync(aggregatedPath, 'utf8');
      const data = JSON.parse(content);

      // Extract shards from aggregated format
      if (data.shards && Array.isArray(data.shards)) {
        const aggregatedShards = data.shards.map((s: any) => convertToProjectShard(s));
        return [...shards, ...aggregatedShards];
      }
    } catch (error) {
      console.error(`Error loading aggregated shards: ${error}`);
    }
  }

  return shards;
}

/**
 * Converts aggregated shard format to ProjectShard
 */
function convertToProjectShard(shard: any): ProjectShard {
  // Extract commit hash from raw_commit field
  const commitHashMatch = shard.raw_commit?.match(/^([a-f0-9]{7,40})/);
  const commitHash = commitHashMatch ? commitHashMatch[1] : 'unknown';

  return {
    project: shard.project,
    cluster: shard.cluster,
    alignmentScore: shard.alignment_score / 100, // Convert from percentage
    driftAlert: shard.drift_alert || false,
    lastIntent: shard.last_intent || '',
    executionSummary: shard.execution_summary || '',
    rawCommit: shard.raw_commit || '',
    source: shard.source || 'manual_override',
    metadata: {
      timestamp: new Date().toISOString(),
      commitHash: commitHash,
      sessionId: undefined,
      commitCount7d: 0,
      status: shard.recent_activity?.commits ? 'ACTIVE' : 'DORMANT'
    }
  };
}

/**
 * Loads AgentDB sessions from data/agentdb.json
 * @param dbPath - Path to agentdb.json file
 * @returns Agent database
 */
function loadAgentDBSessions(dbPath: string): AgentDatabase {
  if (!fs.existsSync(dbPath)) {
    return {
      sessions: [],
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const content = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(content) as AgentDatabase;
  } catch (error) {
    console.error(`Error loading AgentDB: ${error}`);
    return {
      sessions: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Correlates commits to agent sessions
 * @param shard - Project shard with commit data
 * @param agentDb - Agent database with sessions
 * @returns Ledger entry with correlated data
 */
function correlateCommitToSession(
  shard: ProjectShard,
  agentDb: AgentDatabase
): LedgerEntry {
  const commitHash = shard.metadata?.commitHash || 'unknown';

  // Find session that includes this commit
  const session = agentDb.sessions.find(s =>
    s.commits.includes(commitHash)
  );

  // Determine verification status
  let verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PENDING' = 'UNVERIFIED';
  if (session && session.outcome) {
    verificationStatus = 'VERIFIED';
  } else if (session) {
    verificationStatus = 'PENDING';
  }

  return {
    commitHash: commitHash,
    translatedValue: shard.lastIntent,
    agentReasoning: session?.reasoning || null,
    sessionId: session?.sessionId || null,
    timestamp: shard.metadata?.timestamp || new Date().toISOString(),
    source: shard.source,
    verificationStatus
  };
}

/**
 * Correlates all commits to sessions for batch processing
 * @param shards - Array of project shards
 * @param agentDb - Agent database
 * @returns Map of project names to ledger entries
 */
function correlateCommitsToSessions(
  shards: ProjectShard[],
  agentDb: AgentDatabase
): Map<string, LedgerEntry[]> {
  const ledgerMap = new Map<string, LedgerEntry[]>();

  for (const shard of shards) {
    const entry = correlateCommitToSession(shard, agentDb);

    const projectName = shard.project;
    if (!ledgerMap.has(projectName)) {
      ledgerMap.set(projectName, []);
    }

    ledgerMap.get(projectName)!.push(entry);
  }

  return ledgerMap;
}

/**
 * Groups projects by cluster
 * @param shards - Array of project shards
 * @param ledgerMap - Map of project names to ledger entries
 * @returns Array of cluster ledgers
 */
function groupByCluster(
  shards: ProjectShard[],
  ledgerMap: Map<string, LedgerEntry[]>
): ClusterLedger[] {
  const clusterMap = new Map<string, ProjectLedger[]>();

  for (const shard of shards) {
    const cluster = shard.cluster;
    const entries = ledgerMap.get(shard.project) || [];

    const projectLedger: ProjectLedger = {
      projectName: shard.project,
      entries: entries,
      status: shard.metadata?.status || 'DORMANT',
      driftAlert: shard.driftAlert,
      alignmentScore: shard.alignmentScore
    };

    if (!clusterMap.has(cluster)) {
      clusterMap.set(cluster, []);
    }

    clusterMap.get(cluster)!.push(projectLedger);
  }

  // Convert to ClusterLedger array
  const clusterLedgers: ClusterLedger[] = [];
  const clusterNames = Array.from(clusterMap.keys());

  for (const cluster of clusterNames) {
    const projects = clusterMap.get(cluster)!;
    const totalCommits = projects.reduce((sum, p) => sum + p.entries.length, 0);
    const verifiedCommits = projects.reduce(
      (sum, p) => sum + p.entries.filter(e => e.verificationStatus === 'VERIFIED').length,
      0
    );
    const avgAlignment = projects.reduce((sum, p) => sum + p.alignmentScore, 0) / projects.length;

    clusterLedgers.push({
      cluster,
      projects,
      totalCommits,
      verifiedCommits,
      alignmentScore: avgAlignment
    });
  }

  // Sort by cluster name (Experience, Core Systems, Infra)
  return clusterLedgers.sort((a, b) => {
    const order = ['Experience', 'Core Systems', 'Infra'];
    return order.indexOf(a.cluster) - order.indexOf(b.cluster);
  });
}

/**
 * Formats ledger entry as verification log
 * @param entry - Ledger entry
 * @returns Formatted verification log string
 */
function formatVerificationLog(entry: LedgerEntry): string {
  const lines: string[] = [];

  lines.push(`  **Commit:** \`${entry.commitHash}\``);
  lines.push(`  **Timestamp:** ${new Date(entry.timestamp).toLocaleString()}`);
  lines.push(`  **Status:** ${entry.verificationStatus}`);
  lines.push(`  **Source:** ${entry.source === 'agent_swarm' ? '🤖 Agent Swarm' : '👤 Manual Override'}`);
  lines.push('');

  lines.push(`  **Translated Value:**`);
  lines.push(`  > ${entry.translatedValue.split('\n')[0]}`);
  lines.push('');

  if (entry.agentReasoning) {
    lines.push(`  **Agent Reasoning:**`);
    lines.push(`  \`\`\``);
    lines.push(`  ${entry.agentReasoning}`);
    lines.push(`  \`\`\``);
    lines.push('');
  }

  if (entry.sessionId) {
    lines.push(`  **Session ID:** \`${entry.sessionId}\``);
    lines.push('');
  }

  lines.push(`  ---`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates complete ledger markdown document
 * @param clusters - Array of cluster ledgers
 * @param generatedAt - Generation timestamp
 * @returns Markdown string
 */
function generateLedgerMarkdown(clusters: ClusterLedger[], generatedAt: string): string {
  const lines: string[] = [];

  // Header
  const date = new Date(generatedAt);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  lines.push(`# Portfolio Progress Ledger`);
  lines.push(`**Generated:** ${date.toLocaleString()}`);
  lines.push('');
  lines.push(`---`);
  lines.push('');

  // Executive Summary
  lines.push(`## Executive Summary`);
  lines.push('');

  const totalProjects = clusters.reduce((sum, c) => sum + c.projects.length, 0);
  const totalCommits = clusters.reduce((sum, c) => sum + c.totalCommits, 0);
  const totalVerified = clusters.reduce((sum, c) => sum + c.verifiedCommits, 0);
  const verificationRate = totalCommits > 0 ? ((totalVerified / totalCommits) * 100).toFixed(1) : '0.0';

  lines.push(`- **Total Projects:** ${totalProjects}`);
  lines.push(`- **Total Commits Tracked:** ${totalCommits}`);
  lines.push(`- **Verified Commits:** ${totalVerified} (${verificationRate}%)`);
  lines.push(`- **Clusters:** ${clusters.length}`);
  lines.push('');

  // Cluster breakdown
  lines.push(`### Cluster Breakdown`);
  lines.push('');
  for (const cluster of clusters) {
    const avgScore = (cluster.alignmentScore * 100).toFixed(1);
    lines.push(`- **${cluster.cluster}:** ${cluster.projects.length} projects, ${cluster.totalCommits} commits, ${avgScore}% alignment`);
  }
  lines.push('');
  lines.push(`---`);
  lines.push('');

  // Cluster-grouped projects
  for (const cluster of clusters) {
    lines.push(`## Cluster: ${cluster.cluster}`);
    lines.push('');
    lines.push(`**Projects:** ${cluster.projects.length} | **Commits:** ${cluster.totalCommits} | **Verified:** ${cluster.verifiedCommits} | **Alignment:** ${(cluster.alignmentScore * 100).toFixed(1)}%`);
    lines.push('');

    // Projects in this cluster
    for (const project of cluster.projects) {
      lines.push(`### Project: ${project.projectName}`);
      lines.push('');

      const statusEmoji = project.status === 'ACTIVE' ? '✅' : '💤';
      const driftEmoji = project.driftAlert ? '⚠️' : '✓';
      const alignmentPercent = (project.alignmentScore * 100).toFixed(1);

      lines.push(`**Status:** ${statusEmoji} ${project.status} | **Drift:** ${driftEmoji} ${project.driftAlert ? 'ALERT' : 'OK'} | **Alignment:** ${alignmentPercent}%`);
      lines.push('');

      // Commit entries
      lines.push(`#### Commit Verification Log`);
      lines.push('');

      for (const entry of project.entries) {
        lines.push(formatVerificationLog(entry));
      }

      lines.push('');
    }

    lines.push(`---`);
    lines.push('');
  }

  // Footer - Audit Trail
  lines.push(`## Audit Trail`);
  lines.push('');
  lines.push(`This ledger provides a compliance-ready audit trail mapping git commits to agent reasoning chains.`);
  lines.push('');
  lines.push(`**Format:**`);
  lines.push(`- Cluster-grouped projects (Experience, Core Systems, Infra)`);
  lines.push(`- Commit hash → Translated value mapping`);
  lines.push(`- Agent reasoning quotes from AgentDB`);
  lines.push(`- Verification status for each commit`);
  lines.push('');
  lines.push(`**Generated by:** Portfolio Cognitive Command v1.0.0`);
  lines.push(`**Generator:** ledger-generator skill`);
  lines.push(`**Timestamp:** ${generatedAt}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Main ledger generation function
 * @param options - Generation options
 * @returns Ledger generation result
 */
export async function generateLedger(options?: {
  shardDir?: string;
  agentDbPath?: string;
  outputDir?: string;
}): Promise<LedgerGeneratorResult> {
  // Default paths
  const shardDir = options?.shardDir || path.join(process.cwd(), 'output', 'docs', 'shards');
  const agentDbPath = options?.agentDbPath || path.join(process.cwd(), 'data', 'agentdb.json');
  const outputDir = options?.outputDir || path.join(process.cwd(), 'output', 'docs');

  // Load data
  const shards = loadShardData(shardDir);
  const agentDb = loadAgentDBSessions(agentDbPath);

  // Correlate commits to sessions
  const ledgerMap = correlateCommitsToSessions(shards, agentDb);

  // Group by cluster
  const clusters = groupByCluster(shards, ledgerMap);

  // Generate timestamp
  const generatedAt = new Date().toISOString();
  const dateStr = generatedAt.split('T')[0]; // YYYY-MM-DD

  // Generate markdown
  const markdown = generateLedgerMarkdown(clusters, generatedAt);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save to file
  const filename = `Portfolio_Progress_Ledger_${dateStr}.md`;
  const ledgerPath = path.join(outputDir, filename);
  fs.writeFileSync(ledgerPath, markdown, 'utf8');

  // Calculate totals
  const totalProjects = clusters.reduce((sum, c) => sum + c.projects.length, 0);
  const totalCommits = clusters.reduce((sum, c) => sum + c.totalCommits, 0);
  const totalVerified = clusters.reduce((sum, c) => sum + c.verifiedCommits, 0);

  return {
    ledgerPath,
    totalProjects,
    totalCommits,
    verifiedCommits: totalVerified,
    clusters,
    generatedAt
  };
}

/**
 * Loads an existing ledger file
 * @param ledgerPath - Path to ledger markdown file
 * @returns Ledger content
 */
export function loadLedger(ledgerPath: string): string {
  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`Ledger file not found: ${ledgerPath}`);
  }

  return fs.readFileSync(ledgerPath, 'utf8');
}

/**
 * Lists all available ledgers in output directory
 * @param outputDir - Directory to search
 * @returns Array of ledger file paths
 */
export function listLedgers(outputDir?: string): string[] {
  const dir = outputDir || path.join(process.cwd(), 'output', 'docs');

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter(f => f.startsWith('Portfolio_Progress_Ledger_') && f.endsWith('.md'))
    .map(f => path.join(dir, f))
    .sort()
    .reverse(); // Most recent first
}

/**
 * Gets summary statistics from generated ledger
 * @param result - Ledger generation result
 * @returns Summary object
 */
export function getLedgerSummary(result: LedgerGeneratorResult): {
  totalProjects: number;
  totalCommits: number;
  verifiedCommits: number;
  verificationRate: number;
  clusters: Array<{
    name: string;
    projects: number;
    commits: number;
    alignment: number;
  }>;
} {
  const verificationRate = result.totalCommits > 0
    ? (result.verifiedCommits / result.totalCommits) * 100
    : 0;

  return {
    totalProjects: result.totalProjects,
    totalCommits: result.totalCommits,
    verifiedCommits: result.verifiedCommits,
    verificationRate: parseFloat(verificationRate.toFixed(2)),
    clusters: result.clusters.map(c => ({
      name: c.cluster,
      projects: c.projects.length,
      commits: c.totalCommits,
      alignment: parseFloat((c.alignmentScore * 100).toFixed(2))
    }))
  };
}
