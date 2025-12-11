/**
 * Type definitions for AgentDB
 * Defines all data schemas for persistence
 */

import { ClusterType, SemanticEmbedding } from '../skills/semantic-analyzer';
import { DriftResult, DriftAnalysis } from '../skills/drift-detector';
import { PortfolioStrategy } from '../skills/brief-generator';
import { AIInsightsPanel } from '../skills/dashboard-builder';
import { Plan, PlannerOptions } from '../goap/planner';
import { WorldState as GOAPWorldState, Goal, GoalPriority } from '../goap/goals';
import { Action, ActionPhase, ActionStatus, ActionResult } from '../goap/actions';

// ============================================================================
// Core Document Types
// ============================================================================

export interface Document {
  id: string;
  collection: CollectionName;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type CollectionName =
  | 'agents'
  | 'sessions'
  | 'worldStates'
  | 'skills'
  | 'analyses'
  | 'driftAlerts'
  | 'neuralPatterns'
  | 'metrics'
  | 'goapPlans'
  | 'swarmExecutions'
  | 'enhancedAnalyses'
  | 'aiInsights';

// ============================================================================
// Agent Documents
// ============================================================================

export type AgentRole =
  | 'scanner'
  | 'analyzer'
  | 'detector'
  | 'generator'
  | 'builder'
  | 'linker'
  | 'coordinator';

export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'terminated';

export interface AgentCapability {
  name: string;
  version: string;
  parameters: Record<string, unknown>;
}

export interface AgentState extends Document {
  collection: 'agents';

  // Identity
  agentId: string;
  role: AgentRole;
  name: string;

  // Status
  status: AgentStatus;
  currentTask?: string;
  lastActivity: Date;

  // Configuration
  capabilities: AgentCapability[];
  config: Record<string, unknown>;

  // Performance
  tasksCompleted: number;
  tasksFailedCount: number;
  averageExecutionTime: number;

  // Memory references
  sessionIds: string[];
  skillIds: string[];

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Session Documents
// ============================================================================

export type SessionStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface SessionMetrics {
  duration: number; // milliseconds
  agentsUsed: number;
  tasksCompleted: number;
  filesModified: number;
  tokensUsed?: number;
}

export interface SessionDecision {
  timestamp: Date;
  description: string;
  rationale: string;
  outcome?: string;
}

export interface SessionState extends Document {
  collection: 'sessions';

  // Identity
  sessionId: string;
  name: string;
  description: string;

  // Status
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;

  // Participation
  agentIds: string[];
  coordinatorId?: string;

  // Context
  repository?: string;
  branch?: string;
  commitHash?: string;

  // Decisions & History
  decisions: SessionDecision[];
  conversationSummary: string;

  // Metrics
  metrics: SessionMetrics;

  // References
  worldStateIds: string[];
  analysisIds: string[];

  // Artifacts
  artifactPaths: string[];

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// GOAP World State Documents
// ============================================================================

export interface WorldStateFact {
  key: string;
  value: unknown;
  confidence: number; // 0-1
  source: string; // agent or skill that set this
  timestamp: Date;
}

export interface WorldStateGoal {
  description: string;
  priority: number; // 0-10
  satisfied: boolean;
  preconditions: Record<string, unknown>;
  effects: Record<string, unknown>;
}

export interface WorldState extends Document {
  collection: 'worldStates';

  // Identity
  worldStateId: string;
  sessionId: string;
  snapshotName: string;

  // State
  facts: WorldStateFact[];
  goals: WorldStateGoal[];

  // Context
  repository?: string;
  timestamp: Date;

  // Diff tracking
  previousStateId?: string;
  changedFacts: string[]; // keys of facts that changed

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Skill Configuration Documents
// ============================================================================

export type SkillType =
  | 'repo-scanner'
  | 'semantic-analyzer'
  | 'drift-detector'
  | 'shard-generator'
  | 'dashboard-builder'
  | 'cognitive-linker';

export interface SkillRegistration extends Document {
  collection: 'skills';

  // Identity
  skillId: string;
  skillType: SkillType;
  name: string;
  skillVersion: string; // Skill-specific version (renamed to avoid conflict with Document.version)

  // Configuration
  enabled: boolean;
  config: Record<string, unknown>;

  // Dependencies
  requiredSkills: string[];
  requiredCapabilities: string[];

  // Usage tracking
  executionCount: number;
  lastExecuted?: Date;
  averageExecutionTime: number;

  // Performance
  successRate: number; // 0-1
  errorCount: number;

  // Metadata
  description: string;
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Analysis Result Documents
// ============================================================================

export interface ClusterAnalysis {
  cluster: ClusterType;
  repositories: string[];
  commitCount: number;
  totalChanges: number;
  keyPaths: string[];
}

export interface RepositoryInsight {
  repository: string;
  primaryCluster: ClusterType;
  clusterDistribution: Record<ClusterType, number>;
  totalCommits: number;
  analyzedCommits: number;
  lastAnalyzed: Date;
}

export interface AnalysisResult extends Document {
  collection: 'analyses';

  // Identity
  analysisId: string;
  sessionId: string;
  analysisType: 'semantic' | 'drift' | 'cluster' | 'comprehensive';

  // Scope
  repositories: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };

  // Results
  clusterAnalysis?: ClusterAnalysis[];
  repositoryInsights?: RepositoryInsight[];
  embeddings?: SemanticEmbedding[];

  // Metrics
  totalRepositories: number;
  totalCommits: number;
  processingTime: number; // milliseconds

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;

  // Metadata
  performedBy: string; // agent ID
  performedAt: Date;
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Drift Alert Documents
// ============================================================================

export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DriftAlert extends Document {
  collection: 'driftAlerts';

  // Identity
  alertId: string;
  repository: string;

  // Drift Details
  driftResult: DriftResult;
  severity: DriftSeverity;

  // Context
  intentSummary: string;
  implementationSummary: string;
  commitRange?: string;

  // Status
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;

  // Recommendations
  recommendations: string[];
  actionsTaken: string[];

  // Tracking
  detectedBy: string; // agent ID
  detectedAt: Date;
  sessionId: string;

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Neural Pattern Documents
// ============================================================================

export interface NeuralPattern extends Document {
  collection: 'neuralPatterns';

  // Identity
  patternId: string;
  patternType: 'coordination' | 'optimization' | 'prediction';
  name: string;

  // Pattern Data
  inputShape: number[];
  outputShape: number[];
  weights: number[][];
  biases: number[];

  // Training
  trainedOn: string[]; // session IDs
  trainingEpochs: number;
  accuracy: number; // 0-1
  loss: number;

  // Usage
  usageCount: number;
  lastUsed?: Date;
  successRate: number;

  // Metadata
  description: string;
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Metrics Documents
// ============================================================================

export interface MetricSnapshot {
  timestamp: Date;
  value: number;
  unit: string;
}

export interface MetricsDocument extends Document {
  collection: 'metrics';

  // Identity
  metricsId: string;
  metricType: string;
  name: string;

  // Scope
  repository?: string;
  sessionId?: string;
  agentId?: string;

  // Data
  snapshots: MetricSnapshot[];
  current: number;
  average: number;
  min: number;
  max: number;

  // Aggregation
  aggregationPeriod: 'minute' | 'hour' | 'day' | 'week' | 'month';

  // Metadata
  description: string;
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// GOAP Plan Documents
// ============================================================================

export type GOAPPlanStatus =
  | 'planned'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'replanning';

export interface GOAPActionExecution {
  actionId: string;
  actionName: string;
  phase: ActionPhase;
  status: ActionStatus;
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  error?: string;
  stateChanges: Partial<GOAPWorldState>;
  metadata?: Record<string, unknown>;
}

export interface GOAPPlanDocument extends Document {
  collection: 'goapPlans';

  // Identity
  planId: string;
  sessionId: string;
  goalId: string;
  goalName: string;

  // Plan Details
  plan: Plan;
  plannerOptions: PlannerOptions;
  initialState: GOAPWorldState;
  targetState: Partial<GOAPWorldState>;

  // Execution
  status: GOAPPlanStatus;
  currentActionIndex: number;
  actionExecutions: GOAPActionExecution[];

  // Progress
  completionPercentage: number;
  estimatedRemainingMs: number;

  // Timing
  plannedAt: Date;
  executionStartedAt?: Date;
  executionEndedAt?: Date;
  totalDurationMs?: number;

  // Result
  finalState?: GOAPWorldState;
  success: boolean;
  failureReason?: string;

  // Replanning
  replanCount: number;
  previousPlanIds: string[];

  // Metadata
  performedBy: string; // agent ID
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Swarm Execution Documents
// ============================================================================

export type SwarmTopology = 'hierarchical' | 'mesh' | 'ring' | 'star';
export type SwarmStatus = 'initializing' | 'running' | 'paused' | 'completed' | 'failed';

export interface SwarmAgentAssignment {
  agentId: string;
  agentRole: AgentRole;
  assignedActions: string[];
  status: AgentStatus;
  progress: number;
  lastHeartbeat: Date;
}

export interface SwarmCoordinationEvent {
  timestamp: Date;
  eventType: 'spawn' | 'complete' | 'fail' | 'rebalance' | 'sync' | 'handoff';
  sourceAgent: string;
  targetAgent?: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface SwarmExecutionState extends Document {
  collection: 'swarmExecutions';

  // Identity
  swarmId: string;
  sessionId: string;
  planId?: string; // Link to GOAP plan if driven by planner

  // Configuration
  topology: SwarmTopology;
  maxAgents: number;
  strategy: 'balanced' | 'specialized' | 'adaptive';

  // Status
  status: SwarmStatus;
  phase: ActionPhase;

  // Agents
  coordinatorId: string;
  agents: SwarmAgentAssignment[];
  activeAgentCount: number;

  // Task Progress
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTasks: string[];

  // Coordination
  coordinationEvents: SwarmCoordinationEvent[];
  lastSyncTime: Date;
  consensusReached: boolean;

  // Performance
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  tokensUsed?: number;
  apiCalls?: number;

  // Memory Namespace
  memoryNamespace: string;
  sharedState: Record<string, unknown>;

  // Result
  success: boolean;
  artifacts: string[];
  errors: string[];

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Enhanced Analysis Documents
// ============================================================================

export interface EnhancedAnalysisResult extends Document {
  collection: 'enhancedAnalyses';

  // Identity
  analysisId: string;
  sessionId: string;
  planId?: string;
  swarmId?: string;

  // Analysis Type
  analysisType: 'full' | 'incremental' | 'targeted';
  scope: {
    repositories: string[];
    dateRange?: { start: Date; end: Date };
    categories?: ClusterType[];
  };

  // Core Results
  repositoryCount: number;
  projectShards: string[]; // IDs of generated shards
  clusterDistribution: Record<ClusterType, number>;

  // Semantic Analysis
  embeddings: SemanticEmbedding[];
  clusterAnalysis: ClusterAnalysis[];

  // Drift Analysis
  driftResults: Array<{
    repository: string;
    driftResult: DriftResult;
    driftAnalysis?: DriftAnalysis;
  }>;
  driftAlertCount: number;

  // AI Insights
  portfolioStrategy?: PortfolioStrategy;
  aiInsights?: AIInsightsPanel;

  // Health Metrics
  healthMetrics: {
    overall: number;
    byCategory: Record<ClusterType, number>;
    byGrade: Record<string, number>;
  };

  // Performance
  processingTime: number;
  tokensUsed?: number;
  cacheHits: number;

  // Status
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;

  // Metadata
  performedBy: string;
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// AI Insights Documents
// ============================================================================

export interface AIInsightDocument extends Document {
  collection: 'aiInsights';

  // Identity
  insightId: string;
  sessionId: string;
  analysisId?: string;

  // Type
  insightType: 'portfolio_strategy' | 'drift_analysis' | 'dashboard_insights' | 'health_insight';

  // Content
  portfolioStrategy?: PortfolioStrategy;
  driftAnalysis?: DriftAnalysis;
  dashboardInsights?: AIInsightsPanel;

  // Context
  inputData: {
    projectCount: number;
    overallHealth: number;
    driftAlertCount: number;
    categories: ClusterType[];
  };

  // Generation
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  generationTimeMs: number;

  // Caching
  cacheKey: string;
  cachedAt: Date;
  expiresAt: Date;
  cacheHit: boolean;

  // Validation
  validated: boolean;
  validationScore?: number;
  validationErrors?: string[];

  // Metadata
  tags: string[];
  customData: Record<string, unknown>;
}

// ============================================================================
// Skill Registry Types
// ============================================================================

export type SkillExecutorName =
  | 'discoverRepositories'
  | 'generateEmbedding'
  | 'generateShard'
  | 'calculateProjectHealth'
  | 'detectDrift'
  | 'analyzeDriftRootCause'
  | 'generateDashboardInsights'
  | 'generatePortfolioStrategy'
  | 'generateBrief'
  | 'buildDashboardHTML'
  | 'writeShardFiles'
  | 'writeMetrics'
  | 'recordSemanticPattern'
  | 'recordDriftPattern'
  | 'getPatternStats'
  | 'restoreSession'
  | 'persistSession';

export interface SkillExecutorConfig {
  name: SkillExecutorName;
  skillModule: SkillType | 'neural-trainer' | 'memory-coordinator' | 'brief-generator';
  description: string;
  timeout: number;
  retryCount: number;
  parallelizable: boolean;
  requiresAI: boolean;
  estimatedCost?: number; // API cost estimate
}

export interface SkillRegistry {
  version: string;
  lastUpdated: Date;
  executors: Record<SkillExecutorName, SkillExecutorConfig>;
  defaultConfig: {
    maxRetries: number;
    defaultTimeout: number;
    parallelLimit: number;
  };
}

// ============================================================================
// Memory Coordinator Types
// ============================================================================

export interface MemoryNamespace {
  name: string;
  prefix: string;
  ttl?: number; // seconds
  maxEntries?: number;
  compressionEnabled: boolean;
}

export interface MemoryEntry {
  key: string;
  namespace: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  size: number;
  compressed: boolean;
}

export interface MemoryCoordinatorConfig {
  namespaces: MemoryNamespace[];
  autoSync: {
    enabled: boolean;
    intervalMs: number;
  };
  compression: {
    enabled: boolean;
    threshold: number; // bytes
  };
  mcpIntegration: {
    enabled: boolean;
    serverName: string;
  };
}

export interface MemoryStats {
  totalEntries: number;
  totalSize: number;
  byNamespace: Record<string, { entries: number; size: number }>;
  cacheHitRate: number;
  lastSync?: Date;
  syncErrors: number;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface QueryFilter<T = unknown> {
  // Field-based filters
  [key: string]: T | QueryOperator<T>;
}

export interface QueryOperator<T = unknown> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $exists?: boolean;
  $regex?: string | RegExp;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  projection?: string[]; // fields to include
}

export interface QueryResult<T extends Document> {
  documents: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Vector Search Types
// ============================================================================

/**
 * Options for vector similarity search
 */
export interface VectorQueryOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Minimum similarity score threshold (0-1) */
  threshold?: number;
  /** Additional filters to apply to results */
  filter?: QueryFilter;
}

/**
 * Result from vector similarity search
 */
export interface VectorSearchResult<T extends Document> {
  /** The matching document */
  document: T;
  /** Similarity score (0-1, higher is more similar) */
  similarity: number;
  /** The embedding vector */
  vector: number[];
}

// ============================================================================
// Sync Types
// ============================================================================

export type SyncStrategy = 'push' | 'pull' | 'merge' | 'replace';

export interface SyncConfig {
  enabled: boolean;
  strategy: SyncStrategy;
  conflictResolution: 'local' | 'remote' | 'latest' | 'manual';
  autoSync: boolean;
  syncInterval?: number; // milliseconds
}

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: string[];
  timestamp: Date;
}

export interface ConflictResolution<T extends Document> {
  localVersion: T;
  remoteVersion: T;
  resolvedVersion: T;
  strategy: 'local' | 'remote' | 'merge';
}
