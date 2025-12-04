/**
 * Query Patterns
 * Pre-built queries for common access patterns
 */

import {
  AgentState,
  SessionState,
  AnalysisResult,
  DriftAlert,
  WorldState,
  SkillRegistration,
  MetricsDocument,
  QueryFilter,
  QueryOptions,
  QueryResult,
  AgentRole,
  AgentStatus,
  SessionStatus,
  DriftSeverity,
} from './types';
import { StorageBackend } from './storage';

export class QueryBuilder {
  constructor(private storage: StorageBackend) {}

  // ============================================================================
  // Agent Queries
  // ============================================================================

  /**
   * Get all active agents
   */
  async getActiveAgents(): Promise<QueryResult<AgentState>> {
    return this.storage.query<AgentState>('agents', {
      status: { $in: ['active', 'busy'] },
    });
  }

  /**
   * Get agents by role
   */
  async getAgentsByRole(role: AgentRole): Promise<QueryResult<AgentState>> {
    return this.storage.query<AgentState>('agents', { role });
  }

  /**
   * Get agents by capability
   */
  async getAgentsByCapability(capabilityName: string): Promise<QueryResult<AgentState>> {
    const allAgents = await this.storage.list<AgentState>('agents');

    const filtered = allAgents.documents.filter((agent) =>
      agent.capabilities.some((cap) => cap.name === capabilityName)
    );

    return {
      documents: filtered,
      total: filtered.length,
      hasMore: false,
    };
  }

  /**
   * Get top performing agents
   */
  async getTopPerformers(limit: number = 10): Promise<QueryResult<AgentState>> {
    const allAgents = await this.storage.list<AgentState>('agents');

    // Calculate performance score
    const scored = allAgents.documents.map((agent) => ({
      agent,
      score: this.calculateAgentPerformanceScore(agent),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, limit).map((s) => s.agent);

    return {
      documents: top,
      total: allAgents.total,
      hasMore: false,
    };
  }

  /**
   * Calculate agent performance score
   */
  private calculateAgentPerformanceScore(agent: AgentState): number {
    const completionRate =
      agent.tasksCompleted / (agent.tasksCompleted + agent.tasksFailedCount || 1);
    const efficiencyScore = 1000 / (agent.averageExecutionTime || 1000);

    return completionRate * 0.7 + efficiencyScore * 0.3;
  }

  // ============================================================================
  // Session Queries
  // ============================================================================

  /**
   * Get sessions by date range
   */
  async getSessionsByDateRange(
    start: Date,
    end: Date
  ): Promise<QueryResult<SessionState>> {
    return this.storage.query<SessionState>('sessions', {
      startedAt: { $gte: start, $lte: end },
    });
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<QueryResult<SessionState>> {
    return this.storage.query<SessionState>('sessions', {
      status: { $in: ['active', 'paused'] },
    });
  }

  /**
   * Get sessions by repository
   */
  async getSessionsByRepository(repository: string): Promise<QueryResult<SessionState>> {
    return this.storage.query<SessionState>('sessions', {
      repository,
    });
  }

  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<QueryResult<SessionState>> {
    return this.storage.query<SessionState>(
      'sessions',
      {},
      {
        sort: { field: 'startedAt', order: 'desc' },
        limit,
      }
    );
  }

  /**
   * Get long-running sessions
   */
  async getLongRunningSessions(
    thresholdMinutes: number = 60
  ): Promise<QueryResult<SessionState>> {
    const allSessions = await this.storage.list<SessionState>('sessions');
    const thresholdMs = thresholdMinutes * 60 * 1000;

    const longRunning = allSessions.documents.filter((session) => {
      if (session.status !== 'active') return false;
      const duration = Date.now() - session.startedAt.getTime();
      return duration > thresholdMs;
    });

    return {
      documents: longRunning,
      total: longRunning.length,
      hasMore: false,
    };
  }

  // ============================================================================
  // Analysis Queries
  // ============================================================================

  /**
   * Get latest analysis for repository
   */
  async getLatestAnalysisForRepo(
    repository: string
  ): Promise<AnalysisResult | null> {
    const results = await this.storage.query<AnalysisResult>(
      'analyses',
      {
        repositories: repository,
        status: 'completed',
      },
      {
        sort: { field: 'performedAt', order: 'desc' },
        limit: 1,
      }
    );

    return results.documents[0] || null;
  }

  /**
   * Get analyses by type
   */
  async getAnalysesByType(
    analysisType: AnalysisResult['analysisType']
  ): Promise<QueryResult<AnalysisResult>> {
    return this.storage.query<AnalysisResult>('analyses', {
      analysisType,
      status: 'completed',
    });
  }

  /**
   * Get failed analyses
   */
  async getFailedAnalyses(): Promise<QueryResult<AnalysisResult>> {
    return this.storage.query<AnalysisResult>('analyses', {
      status: 'failed',
    });
  }

  /**
   * Get comprehensive analysis history
   */
  async getAnalysisHistory(
    repository: string,
    limit: number = 20
  ): Promise<QueryResult<AnalysisResult>> {
    return this.storage.query<AnalysisResult>(
      'analyses',
      {
        repositories: repository,
      },
      {
        sort: { field: 'performedAt', order: 'desc' },
        limit,
      }
    );
  }

  // ============================================================================
  // Drift Alert Queries
  // ============================================================================

  /**
   * Get unacknowledged drift alerts
   */
  async getUnacknowledgedAlerts(): Promise<QueryResult<DriftAlert>> {
    return this.storage.query<DriftAlert>('driftAlerts', {
      acknowledged: false,
    });
  }

  /**
   * Get drift alerts by severity
   */
  async getAlertsBySeverity(
    severity: DriftSeverity
  ): Promise<QueryResult<DriftAlert>> {
    return this.storage.query<DriftAlert>('driftAlerts', {
      severity,
    });
  }

  /**
   * Get critical unresolved alerts
   */
  async getCriticalUnresolvedAlerts(): Promise<QueryResult<DriftAlert>> {
    return this.storage.query<DriftAlert>('driftAlerts', {
      severity: 'critical',
      resolved: false,
    });
  }

  /**
   * Get drift alerts for repository
   */
  async getDriftAlertsForRepo(
    repository: string
  ): Promise<QueryResult<DriftAlert>> {
    return this.storage.query<DriftAlert>(
      'driftAlerts',
      {
        repository,
      },
      {
        sort: { field: 'detectedAt', order: 'desc' },
      }
    );
  }

  /**
   * Get drift alert statistics
   */
  async getDriftAlertStats(repository?: string): Promise<{
    total: number;
    bySeverity: Record<DriftSeverity, number>;
    acknowledged: number;
    resolved: number;
    criticalUnresolved: number;
  }> {
    const filter = repository ? { repository } : {};
    const allAlerts = await this.storage.query<DriftAlert>('driftAlerts', filter);

    const stats = {
      total: allAlerts.total,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      } as Record<DriftSeverity, number>,
      acknowledged: 0,
      resolved: 0,
      criticalUnresolved: 0,
    };

    for (const alert of allAlerts.documents) {
      stats.bySeverity[alert.severity]++;
      if (alert.acknowledged) stats.acknowledged++;
      if (alert.resolved) stats.resolved++;
      if (alert.severity === 'critical' && !alert.resolved) {
        stats.criticalUnresolved++;
      }
    }

    return stats;
  }

  // ============================================================================
  // World State Queries
  // ============================================================================

  /**
   * Get latest world state for session
   */
  async getLatestWorldState(sessionId: string): Promise<WorldState | null> {
    const results = await this.storage.query<WorldState>(
      'worldStates',
      {
        sessionId,
      },
      {
        sort: { field: 'timestamp', order: 'desc' },
        limit: 1,
      }
    );

    return results.documents[0] || null;
  }

  /**
   * Get world state history
   */
  async getWorldStateHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<QueryResult<WorldState>> {
    return this.storage.query<WorldState>(
      'worldStates',
      {
        sessionId,
      },
      {
        sort: { field: 'timestamp', order: 'desc' },
        limit,
      }
    );
  }

  /**
   * Get world states by repository
   */
  async getWorldStatesByRepo(
    repository: string
  ): Promise<QueryResult<WorldState>> {
    return this.storage.query<WorldState>('worldStates', {
      repository,
    });
  }

  // ============================================================================
  // Skill Queries
  // ============================================================================

  /**
   * Get enabled skills
   */
  async getEnabledSkills(): Promise<QueryResult<SkillRegistration>> {
    return this.storage.query<SkillRegistration>('skills', {
      enabled: true,
    });
  }

  /**
   * Get skills by type
   */
  async getSkillsByType(
    skillType: SkillRegistration['skillType']
  ): Promise<QueryResult<SkillRegistration>> {
    return this.storage.query<SkillRegistration>('skills', {
      skillType,
    });
  }

  /**
   * Get high-performing skills
   */
  async getHighPerformingSkills(
    minSuccessRate: number = 0.8
  ): Promise<QueryResult<SkillRegistration>> {
    const allSkills = await this.storage.list<SkillRegistration>('skills');

    const highPerforming = allSkills.documents.filter(
      (skill) => skill.successRate >= minSuccessRate
    );

    return {
      documents: highPerforming,
      total: highPerforming.length,
      hasMore: false,
    };
  }

  // ============================================================================
  // Metrics Queries
  // ============================================================================

  /**
   * Get metrics for repository
   */
  async getMetricsForRepo(
    repository: string
  ): Promise<QueryResult<MetricsDocument>> {
    return this.storage.query<MetricsDocument>('metrics', {
      repository,
    });
  }

  /**
   * Get metrics for session
   */
  async getMetricsForSession(
    sessionId: string
  ): Promise<QueryResult<MetricsDocument>> {
    return this.storage.query<MetricsDocument>('metrics', {
      sessionId,
    });
  }

  /**
   * Get metrics for agent
   */
  async getMetricsForAgent(
    agentId: string
  ): Promise<QueryResult<MetricsDocument>> {
    return this.storage.query<MetricsDocument>('metrics', {
      agentId,
    });
  }

  /**
   * Get metrics by type
   */
  async getMetricsByType(
    metricType: string
  ): Promise<QueryResult<MetricsDocument>> {
    return this.storage.query<MetricsDocument>('metrics', {
      metricType,
    });
  }

  // ============================================================================
  // Cross-Collection Queries
  // ============================================================================

  /**
   * Get complete session context
   */
  async getSessionContext(sessionId: string): Promise<{
    session: SessionState | null;
    agents: AgentState[];
    worldStates: WorldState[];
    analyses: AnalysisResult[];
    driftAlerts: DriftAlert[];
    metrics: MetricsDocument[];
  }> {
    const [session, agents, worldStates, analyses, driftAlerts, metrics] =
      await Promise.all([
        this.storage.load<SessionState>('sessions', sessionId),
        this.storage
          .query<AgentState>('agents', {
            sessionIds: sessionId,
          })
          .then((r) => r.documents),
        this.getWorldStateHistory(sessionId).then((r) => r.documents),
        this.storage
          .query<AnalysisResult>('analyses', {
            sessionId,
          })
          .then((r) => r.documents),
        this.storage
          .query<DriftAlert>('driftAlerts', {
            sessionId,
          })
          .then((r) => r.documents),
        this.getMetricsForSession(sessionId).then((r) => r.documents),
      ]);

    return {
      session,
      agents,
      worldStates,
      analyses,
      driftAlerts,
      metrics,
    };
  }

  /**
   * Get repository dashboard data
   */
  async getRepositoryDashboard(repository: string): Promise<{
    latestAnalysis: AnalysisResult | null;
    driftAlerts: DriftAlert[];
    sessions: SessionState[];
    worldStates: WorldState[];
    metrics: MetricsDocument[];
    alertStats: {
      total: number;
      bySeverity: Record<DriftSeverity, number>;
      acknowledged: number;
      resolved: number;
      criticalUnresolved: number;
    };
  }> {
    const [
      latestAnalysis,
      driftAlerts,
      sessions,
      worldStates,
      metrics,
      alertStats,
    ] = await Promise.all([
      this.getLatestAnalysisForRepo(repository),
      this.getDriftAlertsForRepo(repository).then((r) => r.documents),
      this.getSessionsByRepository(repository).then((r) => r.documents),
      this.getWorldStatesByRepo(repository).then((r) => r.documents),
      this.getMetricsForRepo(repository).then((r) => r.documents),
      this.getDriftAlertStats(repository),
    ]);

    return {
      latestAnalysis,
      driftAlerts,
      sessions,
      worldStates,
      metrics,
      alertStats,
    };
  }

  /**
   * Search across all collections
   */
  async globalSearch(searchTerm: string, limit: number = 50): Promise<{
    agents: AgentState[];
    sessions: SessionState[];
    analyses: AnalysisResult[];
    driftAlerts: DriftAlert[];
  }> {
    const regex = new RegExp(searchTerm, 'i');

    const [agents, sessions, analyses, driftAlerts] = await Promise.all([
      this.storage
        .query<AgentState>(
          'agents',
          {
            $or: [{ name: { $regex: regex } }, { agentId: { $regex: regex } }],
          } as QueryFilter,
          { limit }
        )
        .then((r) => r.documents),
      this.storage
        .query<SessionState>(
          'sessions',
          {
            $or: [
              { name: { $regex: regex } },
              { description: { $regex: regex } },
            ],
          } as QueryFilter,
          { limit }
        )
        .then((r) => r.documents),
      this.storage
        .query<AnalysisResult>(
          'analyses',
          {
            repositories: { $regex: regex },
          },
          { limit }
        )
        .then((r) => r.documents),
      this.storage
        .query<DriftAlert>(
          'driftAlerts',
          {
            $or: [
              { repository: { $regex: regex } },
              { intentSummary: { $regex: regex } },
            ],
          } as QueryFilter,
          { limit }
        )
        .then((r) => r.documents),
    ]);

    return {
      agents,
      sessions,
      analyses,
      driftAlerts,
    };
  }
}
