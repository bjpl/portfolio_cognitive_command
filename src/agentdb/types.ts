/**
 * Type definitions for AgentDB
 * Defines all data schemas for persistence
 */

import { ClusterType, SemanticEmbedding } from '../skills/semantic-analyzer';
import { DriftResult } from '../skills/drift-detector';

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
  | 'metrics';

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
