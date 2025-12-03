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
  startTime: string;
  commits: string[];  // commit hashes created in this session
  reasoning: string;
  prompt: string;
  outcome?: string;
}

export interface AgentDatabase {
  sessions: AgentSession[];
  lastUpdated: string;
}

/**
 * Loads AgentDB from JSON file
 * @param dbPath - Path to agentdb.json file
 * @returns Agent database or empty structure
 */
function loadAgentDb(dbPath: string): AgentDatabase {
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
 * Saves AgentDB to JSON file
 * @param db - Agent database to save
 * @param dbPath - Path to agentdb.json file
 */
function saveAgentDb(db: AgentDatabase, dbPath: string): void {
  try {
    const dirPath = path.dirname(dbPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    db.lastUpdated = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving AgentDB: ${error}`);
  }
}

/**
 * Finds session for a specific commit hash
 * @param commitHash - Git commit hash
 * @param dbPath - Path to agentdb.json file
 * @returns Agent session or null
 */
function findSessionForCommit(commitHash: string, dbPath: string): AgentSession | null {
  const db = loadAgentDb(dbPath);
  return db.sessions.find(s => s.commits.includes(commitHash)) || null;
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
  const dbPath = agentDbPath || getDefaultAgentDbPath();

  // First try to find by commit hash (direct link)
  const sessionByHash = findSessionForCommit(commitHash, dbPath);
  if (sessionByHash) {
    return {
      commitHash,
      sessionId: sessionByHash.sessionId,
      reasoningChain: sessionByHash.reasoning,
      userPrompt: sessionByHash.prompt,
      source: 'agent_swarm'
    };
  }

  // Fallback: Search for session near commit timestamp (±1 hour window)
  const sessionByTime = await findNearestSession(dbPath, commitTimestamp);

  if (!sessionByTime) {
    return createManualLink(commitHash);
  }

  return {
    commitHash,
    sessionId: sessionByTime.sessionId,
    reasoningChain: sessionByTime.reasoning,
    userPrompt: sessionByTime.prompt,
    source: 'agent_swarm'
  };
}

/**
 * Adds a new session to AgentDB
 * @param session - Agent session to add
 * @param dbPath - Path to agentdb.json file (optional)
 */
export function addSessionToAgentDb(session: AgentSession, dbPath?: string): void {
  const finalDbPath = dbPath || getDefaultAgentDbPath();
  const db = loadAgentDb(finalDbPath);

  // Check if session already exists
  const existingIndex = db.sessions.findIndex(s => s.sessionId === session.sessionId);
  if (existingIndex >= 0) {
    db.sessions[existingIndex] = session;
  } else {
    db.sessions.push(session);
  }

  saveAgentDb(db, finalDbPath);
}

/**
 * Links a commit hash to an existing session
 * @param sessionId - Session ID to link to
 * @param commitHash - Git commit hash
 * @param dbPath - Path to agentdb.json file (optional)
 */
export function linkCommitToSession(
  sessionId: string,
  commitHash: string,
  dbPath?: string
): boolean {
  const finalDbPath = dbPath || getDefaultAgentDbPath();
  const db = loadAgentDb(finalDbPath);

  const session = db.sessions.find(s => s.sessionId === sessionId);
  if (!session) {
    return false;
  }

  if (!session.commits.includes(commitHash)) {
    session.commits.push(commitHash);
    saveAgentDb(db, finalDbPath);
  }

  return true;
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
 * Gets the default AgentDB file path
 * @returns Path to data/agentdb.json
 */
function getDefaultAgentDbPath(): string {
  return path.join(process.cwd(), 'data', 'agentdb.json');
}

/**
 * Finds nearest agent session to a given timestamp
 * @param dbPath - Path to agentdb.json file
 * @param targetTime - Target timestamp to match
 * @returns Nearest session or null
 */
async function findNearestSession(
  dbPath: string,
  targetTime: Date
): Promise<AgentSession | null> {
  try {
    const db = loadAgentDb(dbPath);

    let nearestSession: AgentSession | null = null;
    let minTimeDiff = Infinity;

    for (const session of db.sessions) {
      const sessionTime = new Date(session.startTime);
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

  // Split by arrow separator or newlines
  const steps = reasoningChain
    .split(/→|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

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
