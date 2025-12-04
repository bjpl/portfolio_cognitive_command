/**
 * Main AgentDB Database Interface
 * Unified API for all persistence operations
 */

import {
  Document,
  CollectionName,
  QueryFilter,
  QueryOptions,
  QueryResult,
  SyncConfig,
  SyncResult,
  AgentState,
  SessionState,
  WorldState,
  SkillRegistration,
  AnalysisResult,
  DriftAlert,
  NeuralPattern,
  MetricsDocument,
} from './types';
import { StorageBackend, FileStorageBackend } from './storage';
import { SyncManager, MCPMemoryTools } from './sync';
import { QueryBuilder } from './queries';

/**
 * Main AgentDB class
 * Provides unified interface for all database operations
 */
export class AgentDB {
  private storage: StorageBackend;
  private sync?: SyncManager;
  private queries: QueryBuilder;

  constructor(
    storage: StorageBackend,
    mcpTools?: MCPMemoryTools,
    syncConfig?: SyncConfig
  ) {
    this.storage = storage;
    this.queries = new QueryBuilder(storage);

    if (mcpTools && syncConfig) {
      this.sync = new SyncManager(storage, mcpTools, syncConfig);
    }
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Save a document to the database
   */
  async save<T extends Document>(
    collection: CollectionName,
    document: T
  ): Promise<T> {
    const saved = await this.storage.save(collection, document);

    // Sync to MCP if enabled
    if (this.sync) {
      await this.sync.syncDocument(collection, saved);
    }

    return saved;
  }

  /**
   * Load a document by ID
   */
  async load<T extends Document>(
    collection: CollectionName,
    id: string
  ): Promise<T | null> {
    return this.storage.load<T>(collection, id);
  }

  /**
   * Query documents with filters
   */
  async query<T extends Document>(
    collection: CollectionName,
    filter: QueryFilter,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    return this.storage.query<T>(collection, filter, options);
  }

  /**
   * Update a document
   */
  async update<T extends Document>(
    collection: CollectionName,
    id: string,
    changes: Partial<T>
  ): Promise<T> {
    const updated = await this.storage.update<T>(collection, id, changes);

    // Sync to MCP if enabled
    if (this.sync) {
      await this.sync.syncDocument(collection, updated);
    }

    return updated;
  }

  /**
   * Delete a document
   */
  async delete(collection: CollectionName, id: string): Promise<boolean> {
    return this.storage.delete(collection, id);
  }

  /**
   * List all documents in a collection
   */
  async list<T extends Document>(
    collection: CollectionName,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    return this.storage.list<T>(collection, options);
  }

  // ============================================================================
  // Agent Operations
  // ============================================================================

  /**
   * Create or update an agent
   */
  async saveAgent(agent: AgentState): Promise<AgentState> {
    return this.save('agents', agent);
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentState | null> {
    return this.load<AgentState>('agents', agentId);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    status: AgentState['status'],
    currentTask?: string
  ): Promise<AgentState> {
    return this.update<AgentState>('agents', agentId, {
      status,
      currentTask,
      lastActivity: new Date(),
    });
  }

  /**
   * Increment agent task counter
   */
  async recordAgentTaskCompletion(
    agentId: string,
    success: boolean,
    executionTime: number
  ): Promise<AgentState> {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const tasksCompleted = success
      ? agent.tasksCompleted + 1
      : agent.tasksCompleted;
    const tasksFailedCount = !success
      ? agent.tasksFailedCount + 1
      : agent.tasksFailedCount;

    // Calculate new average execution time
    const totalTasks = tasksCompleted + tasksFailedCount;
    const averageExecutionTime =
      (agent.averageExecutionTime * (totalTasks - 1) + executionTime) /
      totalTasks;

    return this.update<AgentState>('agents', agentId, {
      tasksCompleted,
      tasksFailedCount,
      averageExecutionTime,
      lastActivity: new Date(),
    });
  }

  // ============================================================================
  // Session Operations
  // ============================================================================

  /**
   * Create a new session
   */
  async createSession(session: SessionState): Promise<SessionState> {
    return this.save('sessions', session);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionState | null> {
    return this.load<SessionState>('sessions', sessionId);
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: SessionState['status']
  ): Promise<SessionState> {
    const updates: Partial<SessionState> = { status };

    if (status === 'completed' || status === 'failed') {
      updates.endedAt = new Date();
    }

    return this.update<SessionState>('sessions', sessionId, updates);
  }

  /**
   * Add decision to session
   */
  async addSessionDecision(
    sessionId: string,
    decision: SessionState['decisions'][0]
  ): Promise<SessionState> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const decisions = [...session.decisions, decision];
    return this.update<SessionState>('sessions', sessionId, { decisions });
  }

  // ============================================================================
  // World State Operations
  // ============================================================================

  /**
   * Save a world state snapshot
   */
  async saveWorldState(worldState: WorldState): Promise<WorldState> {
    return this.save('worldStates', worldState);
  }

  /**
   * Get latest world state for session
   */
  async getLatestWorldState(sessionId: string): Promise<WorldState | null> {
    return this.queries.getLatestWorldState(sessionId);
  }

  /**
   * Update world state facts
   */
  async updateWorldStateFacts(
    worldStateId: string,
    facts: WorldState['facts']
  ): Promise<WorldState> {
    const current = await this.load<WorldState>('worldStates', worldStateId);
    if (!current) {
      throw new Error(`World state not found: ${worldStateId}`);
    }

    // Merge facts, keeping latest version of each key
    const factMap = new Map(current.facts.map((f) => [f.key, f]));
    for (const fact of facts) {
      factMap.set(fact.key, fact);
    }

    const changedFacts = facts.map((f) => f.key);

    return this.update<WorldState>('worldStates', worldStateId, {
      facts: Array.from(factMap.values()),
      changedFacts,
    });
  }

  // ============================================================================
  // Analysis Operations
  // ============================================================================

  /**
   * Save analysis results
   */
  async saveAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
    return this.save('analyses', analysis);
  }

  /**
   * Get latest analysis for repository
   */
  async getLatestAnalysis(repository: string): Promise<AnalysisResult | null> {
    return this.queries.getLatestAnalysisForRepo(repository);
  }

  // ============================================================================
  // Drift Alert Operations
  // ============================================================================

  /**
   * Create a drift alert
   */
  async createDriftAlert(alert: DriftAlert): Promise<DriftAlert> {
    return this.save('driftAlerts', alert);
  }

  /**
   * Acknowledge a drift alert
   */
  async acknowledgeDriftAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<DriftAlert> {
    return this.update<DriftAlert>('driftAlerts', alertId, {
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt: new Date(),
    });
  }

  /**
   * Resolve a drift alert
   */
  async resolveDriftAlert(alertId: string): Promise<DriftAlert> {
    return this.update<DriftAlert>('driftAlerts', alertId, {
      resolved: true,
      resolvedAt: new Date(),
    });
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(): Promise<QueryResult<DriftAlert>> {
    return this.queries.getUnacknowledgedAlerts();
  }

  // ============================================================================
  // Skill Operations
  // ============================================================================

  /**
   * Register a skill
   */
  async registerSkill(skill: SkillRegistration): Promise<SkillRegistration> {
    return this.save('skills', skill);
  }

  /**
   * Get enabled skills
   */
  async getEnabledSkills(): Promise<QueryResult<SkillRegistration>> {
    return this.queries.getEnabledSkills();
  }

  /**
   * Record skill execution
   */
  async recordSkillExecution(
    skillId: string,
    success: boolean,
    executionTime: number
  ): Promise<SkillRegistration> {
    const skill = await this.load<SkillRegistration>('skills', skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const executionCount = skill.executionCount + 1;
    const errorCount = !success ? skill.errorCount + 1 : skill.errorCount;

    // Calculate success rate
    const successRate = (executionCount - errorCount) / executionCount;

    // Calculate average execution time
    const averageExecutionTime =
      (skill.averageExecutionTime * (executionCount - 1) + executionTime) /
      executionCount;

    return this.update<SkillRegistration>('skills', skillId, {
      executionCount,
      errorCount,
      successRate,
      averageExecutionTime,
      lastExecuted: new Date(),
    });
  }

  // ============================================================================
  // Neural Pattern Operations
  // ============================================================================

  /**
   * Save a neural pattern
   */
  async saveNeuralPattern(pattern: NeuralPattern): Promise<NeuralPattern> {
    return this.save('neuralPatterns', pattern);
  }

  /**
   * Record pattern usage
   */
  async recordPatternUsage(
    patternId: string,
    success: boolean
  ): Promise<NeuralPattern> {
    const pattern = await this.load<NeuralPattern>('neuralPatterns', patternId);
    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    const usageCount = pattern.usageCount + 1;
    const successRate =
      (pattern.successRate * pattern.usageCount + (success ? 1 : 0)) /
      usageCount;

    return this.update<NeuralPattern>('neuralPatterns', patternId, {
      usageCount,
      successRate,
      lastUsed: new Date(),
    });
  }

  // ============================================================================
  // Metrics Operations
  // ============================================================================

  /**
   * Save metrics
   */
  async saveMetrics(metrics: MetricsDocument): Promise<MetricsDocument> {
    return this.save('metrics', metrics);
  }

  /**
   * Add metric snapshot
   */
  async addMetricSnapshot(
    metricsId: string,
    value: number,
    unit: string
  ): Promise<MetricsDocument> {
    const metrics = await this.load<MetricsDocument>('metrics', metricsId);
    if (!metrics) {
      throw new Error(`Metrics not found: ${metricsId}`);
    }

    const snapshot = { timestamp: new Date(), value, unit };
    const snapshots = [...metrics.snapshots, snapshot];

    // Update aggregated values
    const values = snapshots.map((s) => s.value);
    const current = value;
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return this.update<MetricsDocument>('metrics', metricsId, {
      snapshots,
      current,
      average,
      min,
      max,
    });
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Sync all data with MCP memory
   */
  async syncAll(): Promise<SyncResult | null> {
    if (!this.sync) {
      return null;
    }

    return this.sync.syncAll();
  }

  /**
   * Sync specific collection
   */
  async syncCollection(collection: CollectionName): Promise<SyncResult | null> {
    if (!this.sync) {
      return null;
    }

    return this.sync.syncCollection(collection);
  }

  // ============================================================================
  // Query Shortcuts
  // ============================================================================

  /**
   * Get query builder for advanced queries
   */
  get queryBuilder(): QueryBuilder {
    return this.queries;
  }

  /**
   * Get session context
   */
  async getSessionContext(sessionId: string) {
    return this.queries.getSessionContext(sessionId);
  }

  /**
   * Get repository dashboard data
   */
  async getRepositoryDashboard(repository: string) {
    return this.queries.getRepositoryDashboard(repository);
  }

  /**
   * Global search
   */
  async search(searchTerm: string, limit?: number) {
    return this.queries.globalSearch(searchTerm, limit);
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.sync) {
      this.sync.destroy();
    }
  }
}

/**
 * Create AgentDB instance with default configuration
 */
export function createAgentDB(
  basePath?: string,
  mcpTools?: MCPMemoryTools,
  syncConfig?: SyncConfig
): AgentDB {
  const storage = new FileStorageBackend(basePath);
  return new AgentDB(storage, mcpTools, syncConfig);
}
