/**
 * Session Capture Utility
 * Automatically captures development sessions and links commits to AgentDB
 */

import { AgentDB } from './database';
import { MCPMemoryTools } from './sync';
import { SessionState, SessionDecision } from './types';
import {
  AgentSession,
  addSessionToAgentDb,
  linkCommitToSession,
} from '../skills/cognitive-linker';

/**
 * Session capture configuration
 */
export interface SessionCaptureConfig {
  /** AgentDB instance for persistence */
  agentDb: AgentDB;
  /** MCP memory tools for session data */
  mcpTools: MCPMemoryTools;
  /** Namespace for MCP memory storage */
  namespace?: string;
  /** Path to agentdb.json file (for cognitive-linker) */
  agentDbPath?: string;
  /** Auto-commit session on end */
  autoCommit?: boolean;
}

/**
 * Session capture utility
 * Bridges MCP memory, AgentDB, and cognitive-linker
 */
export class SessionCapture {
  private config: SessionCaptureConfig;
  private namespace: string;

  constructor(config: SessionCaptureConfig) {
    this.config = config;
    this.namespace = config.namespace || 'sessions';
  }

  /**
   * Create and capture a new session
   */
  async createSession(session: Partial<SessionState>): Promise<SessionState> {
    const now = new Date();
    const sessionId = session.id || this.generateSessionId();

    const sessionState: SessionState = {
      id: sessionId,
      collection: 'sessions',
      sessionId,
      name: session.name || 'Development Session',
      description: session.description || 'Automatic session capture',
      status: session.status || 'active',
      startedAt: session.startedAt || now,
      createdAt: now,
      updatedAt: now,
      version: 1,
      agentIds: session.agentIds || [],
      repository: session.repository || process.cwd(),
      decisions: session.decisions || [],
      conversationSummary: session.conversationSummary || '',
      metrics: session.metrics || {
        duration: 0,
        agentsUsed: 0,
        tasksCompleted: 0,
        filesModified: 0,
        tokensUsed: 0,
      },
      worldStateIds: session.worldStateIds || [],
      analysisIds: session.analysisIds || [],
      artifactPaths: session.artifactPaths || [],
      tags: session.tags || [],
      customData: session.customData || {},
    };

    // Save to AgentDB
    const saved = await this.config.agentDb.createSession(sessionState);

    // Persist to MCP memory for cross-session access
    await this.persistToMCP(saved);

    // Add to cognitive-linker agentdb.json
    await this.addToCognitiveLinker(saved);

    return saved;
  }

  /**
   * Link a commit to the current session
   */
  async linkCommit(sessionId: string, commitHash: string): Promise<boolean> {
    try {
      // Update AgentDB session
      const session = await this.config.agentDb.getSession(sessionId);
      if (!session) {
        console.error(`Session not found: ${sessionId}`);
        return false;
      }

      // Add commit to session customData
      const commits = (session.customData.commits as string[]) || [];
      if (!commits.includes(commitHash)) {
        commits.push(commitHash);
        await this.config.agentDb.update<SessionState>('sessions', sessionId, {
          customData: { ...session.customData, commits },
        } as Partial<SessionState>);
      }

      // Link in cognitive-linker agentdb.json
      linkCommitToSession(sessionId, commitHash, this.config.agentDbPath);

      // Update MCP memory
      await this.persistToMCP(session);

      return true;
    } catch (error) {
      console.error('Failed to link commit:', error);
      return false;
    }
  }

  /**
   * End a session and capture final state
   */
  async endSession(
    sessionId: string,
    outcome?: string
  ): Promise<SessionState | null> {
    const session = await this.config.agentDb.getSession(sessionId);
    if (!session) {
      return null;
    }

    const updated = await this.config.agentDb.updateSessionStatus(
      sessionId,
      'completed'
    );

    // Update outcome if provided
    if (outcome) {
      await this.config.agentDb.update<SessionState>('sessions', sessionId, {
        customData: { ...updated.customData, outcome },
      } as Partial<SessionState>);
    }

    // Persist final state to MCP
    await this.persistToMCP(updated);

    // Update cognitive-linker
    await this.updateCognitiveLinker(updated, outcome);

    return updated;
  }

  /**
   * Get active session from MCP memory
   */
  async getActiveSession(): Promise<SessionState | null> {
    try {
      const key = 'active_session';
      const value = await this.config.mcpTools.retrieve(key, this.namespace);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as SessionState;
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }

  /**
   * Auto-capture current development context
   */
  async captureContext(sessionId: string, context: Record<string, unknown>): Promise<void> {
    const key = `session/${sessionId}/context`;
    const value = JSON.stringify(context);

    await this.config.mcpTools.store(key, value, this.namespace);

    // Also update session customData in AgentDB
    const session = await this.config.agentDb.getSession(sessionId);
    if (session) {
      await this.config.agentDb.update<SessionState>('sessions', sessionId, {
        customData: { ...session.customData, context },
      } as Partial<SessionState>);
    }
  }

  /**
   * Persist session to MCP memory
   */
  private async persistToMCP(session: SessionState): Promise<void> {
    const key = `session/${session.id}`;
    const value = JSON.stringify(session);

    await this.config.mcpTools.store(key, value, this.namespace);

    // Also store as active session if it's active
    if (session.status === 'active') {
      await this.config.mcpTools.store('active_session', value, this.namespace);
    }
  }

  /**
   * Add session to cognitive-linker agentdb.json
   */
  private async addToCognitiveLinker(session: SessionState): Promise<void> {
    const agentSession: AgentSession = {
      sessionId: session.id,
      startTime: session.startedAt.toISOString(),
      commits: (session.customData.commits as string[]) || [],
      reasoning: this.extractReasoning(session),
      prompt: session.description,
      outcome: session.customData.outcome as string | undefined,
    };

    addSessionToAgentDb(agentSession, this.config.agentDbPath);
  }

  /**
   * Update cognitive-linker when session ends
   */
  private async updateCognitiveLinker(
    session: SessionState,
    outcome?: string
  ): Promise<void> {
    const agentSession: AgentSession = {
      sessionId: session.id,
      startTime: session.startedAt.toISOString(),
      commits: (session.customData.commits as string[]) || [],
      reasoning: this.extractReasoning(session),
      prompt: session.description,
      outcome: outcome || (session.customData.outcome as string | undefined),
    };

    addSessionToAgentDb(agentSession, this.config.agentDbPath);
  }

  /**
   * Extract reasoning chain from session decisions
   */
  private extractReasoning(session: SessionState): string {
    if (!session.decisions || session.decisions.length === 0) {
      return 'No reasoning captured';
    }

    return session.decisions
      .map((d: SessionDecision, i: number) =>
        `${i + 1}. ${d.description} - ${d.rationale}${d.outcome ? ` → ${d.outcome}` : ''}`
      )
      .join('\n');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `session-${timestamp}-${random}`;
  }
}

/**
 * Create session capture utility
 */
export function createSessionCapture(
  config: SessionCaptureConfig
): SessionCapture {
  return new SessionCapture(config);
}

/**
 * Hook for automatic commit linking during development
 * Call this after git commits to auto-link to active session
 */
export async function autoLinkCommit(
  sessionCapture: SessionCapture,
  commitHash: string
): Promise<void> {
  const activeSession = await sessionCapture.getActiveSession();

  if (!activeSession) {
    console.warn('No active session found for commit linking');
    return;
  }

  const success = await sessionCapture.linkCommit(activeSession.id, commitHash);

  if (success) {
    console.log(`Linked commit ${commitHash} to session ${activeSession.id}`);
  }
}
