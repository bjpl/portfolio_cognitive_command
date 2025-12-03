/**
 * Cognitive Linker Skill
 * Links git commits to AgentDB sessions and reasoning chains
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CognitiveLink {
  commitHash: string;
  sessionId: string | null;
  reasoningChain: string | null;
  userPrompt: string | null;
  source: 'agent_swarm' | 'manual_override';
}

export interface AgentSession {
  sessionId: string;
  timestamp: string;
  reasoning: string[];
  prompt: string;
  outcome: string;
}

/**
 * Links a git commit to AgentDB session data
 * @param commitTimestamp - Timestamp of the commit
 * @param commitHash - Git commit hash
 * @param agentDbPath - Path to AgentDB storage (optional)
 * @returns Cognitive link with session data
 */
export async function linkToAgentDB(
  commitTimestamp: Date,
  commitHash: string = 'unknown',
  agentDbPath?: string
): Promise<CognitiveLink> {
  const dbPath = agentDbPath || findAgentDbPath();

  if (!dbPath || !fs.existsSync(dbPath)) {
    return createManualLink(commitHash);
  }

  // Search for session near commit timestamp (±1 hour window)
  const session = await findNearestSession(dbPath, commitTimestamp);

  if (!session) {
    return createManualLink(commitHash);
  }

  // Extract reasoning chain (join all reasoning steps)
  const reasoningChain = session.reasoning.join(' → ');

  return {
    commitHash,
    sessionId: session.sessionId,
    reasoningChain,
    userPrompt: session.prompt,
    source: 'agent_swarm'
  };
}

/**
 * Creates a manual link when no agent session is found
 */
function createManualLink(commitHash: string): CognitiveLink {
  return {
    commitHash,
    sessionId: null,
    reasoningChain: null,
    userPrompt: null,
    source: 'manual_override'
  };
}

/**
 * Finds AgentDB path in common locations
 */
function findAgentDbPath(): string | null {
  const commonPaths = [
    path.join(process.env.HOME || '', '.agentdb'),
    path.join(process.cwd(), 'agentdb'),
    path.join(process.cwd(), '.agentdb'),
    path.join(process.cwd(), 'data', 'agentdb'),
    '/tmp/agentdb'
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Finds nearest agent session to a given timestamp
 */
async function findNearestSession(
  dbPath: string,
  targetTime: Date
): Promise<AgentSession | null> {
  try {
    const sessionFiles = fs.readdirSync(dbPath)
      .filter(f => f.endsWith('.json'));

    let nearestSession: AgentSession | null = null;
    let minTimeDiff = Infinity;

    for (const file of sessionFiles) {
      const filePath = path.join(dbPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const session = JSON.parse(content) as AgentSession;

      const sessionTime = new Date(session.timestamp);
      const timeDiff = Math.abs(sessionTime.getTime() - targetTime.getTime());

      // Within 1 hour window (3600000 ms)
      if (timeDiff < 3600000 && timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nearestSession = session;
      }
    }

    return nearestSession;
  } catch (error) {
    console.error(`Error searching AgentDB: ${error}`);
    return null;
  }
}

/**
 * Batch links multiple commits to agent sessions
 * @param commits - Array of commit data with timestamps and hashes
 * @param agentDbPath - Path to AgentDB storage
 * @returns Array of cognitive links
 */
export async function batchLinkCommits(
  commits: Array<{ hash: string; timestamp: Date }>,
  agentDbPath?: string
): Promise<CognitiveLink[]> {
  const links: CognitiveLink[] = [];

  for (const commit of commits) {
    const link = await linkToAgentDB(commit.timestamp, commit.hash, agentDbPath);
    links.push(link);
  }

  return links;
}

/**
 * Extracts key reasoning steps from a reasoning chain
 * @param reasoningChain - Full reasoning chain string
 * @returns Array of key reasoning steps
 */
export function extractKeyReasoningSteps(reasoningChain: string | null): string[] {
  if (!reasoningChain) return [];

  const steps = reasoningChain.split('→').map(s => s.trim());

  // Filter out very short or redundant steps
  const keySteps = steps.filter(step =>
    step.length > 10 &&
    !step.match(/^(then|next|and|also)/i)
  );

  return keySteps;
}

/**
 * Creates a cognitive trace document
 * @param link - Cognitive link data
 * @returns Formatted trace document
 */
export function createCognitiveTrace(link: CognitiveLink): string {
  const trace = [
    '=== COGNITIVE TRACE ===',
    '',
    `Commit: ${link.commitHash}`,
    `Source: ${link.source}`,
    ''
  ];

  if (link.source === 'agent_swarm' && link.sessionId) {
    trace.push(`Session ID: ${link.sessionId}`);
    trace.push('');

    if (link.userPrompt) {
      trace.push('--- Original Prompt ---');
      trace.push(link.userPrompt);
      trace.push('');
    }

    if (link.reasoningChain) {
      trace.push('--- Reasoning Chain ---');
      const steps = extractKeyReasoningSteps(link.reasoningChain);
      steps.forEach((step, i) => {
        trace.push(`${i + 1}. ${step}`);
      });
      trace.push('');
    }
  } else {
    trace.push('Source: Manual Override (no agent session found)');
    trace.push('');
  }

  trace.push('=== END TRACE ===');

  return trace.join('\n');
}

/**
 * Saves cognitive link to disk
 * @param link - Cognitive link to save
 * @param outputPath - Directory to save to
 */
export async function saveCognitiveLink(
  link: CognitiveLink,
  outputPath: string
): Promise<void> {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const filename = `cognitive_link_${link.commitHash.substring(0, 7)}.json`;
  const filepath = path.join(outputPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(link, null, 2), 'utf8');
}

/**
 * Loads all cognitive links from a directory
 * @param linkPath - Directory containing cognitive link files
 * @returns Array of cognitive links
 */
export function loadCognitiveLinks(linkPath: string): CognitiveLink[] {
  if (!fs.existsSync(linkPath)) {
    return [];
  }

  const files = fs.readdirSync(linkPath)
    .filter(f => f.startsWith('cognitive_link_') && f.endsWith('.json'));

  return files.map(f => {
    const content = fs.readFileSync(path.join(linkPath, f), 'utf8');
    return JSON.parse(content) as CognitiveLink;
  });
}
