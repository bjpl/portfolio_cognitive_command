/**
 * Skills Module - Portfolio Cognitive Command Skill Library
 * Exports all skill implementations for GOAP action execution
 */

// Semantic Analysis
export {
  ClusterType,
  LegacyClusterType,
  SemanticEmbedding,
  CLUSTER_COLORS,
  CLUSTER_ICONS,
  generateEmbedding,
  migrateLegacyCluster,
  isNewClusterType,
  isLegacyClusterType,
  reclusterProject,
  cosineSimilarity,
} from './semantic-analyzer';

// Drift Detection
export {
  DriftResult,
  DriftCategory,
  DriftSeverity,
  DriftAnalysis,
  detectDrift,
  monitorDriftTrend,
  analyzeDriftAreas,
  generateDriftReport,
  analyzeDriftRootCause,
  generateEnhancedDriftReport,
  clearDriftAnalysisCache,
} from './drift-detector';

// Brief Generation
export {
  CognitiveMetrics,
  BriefGeneratorResult,
  PortfolioBriefData,
  StrategyInsightType,
  PortfolioStrategy,
  loadShards,
  loadMetrics,
  analyzePortfolio,
  generateBriefMarkdown,
  generateBrief,
  batchGenerateBriefs,
  generatePortfolioStrategy,
  generateStrategyMarkdown,
  clearStrategyCache,
  generateEnhancedBrief,
} from './brief-generator';

// Dashboard Building
export {
  DashboardConfig,
  AIInsightsPanel,
  buildDashboardHTML,
  generateDashboardInsights,
  clearInsightsCache,
  saveDashboard,
  createDashboardConfig,
} from './dashboard-builder';

// Skill Registry
export {
  DEFAULT_SKILL_REGISTRY,
  SkillRegistryManager,
  SkillExecutionResult,
  SkillExecutionContext,
  createSkillRegistry,
  getExecutorForAction,
} from './registry';

// Memory Coordinator
export {
  MemoryCoordinator,
  SessionContext,
  saveSessionContext,
  loadSessionContext,
  addSessionDecision,
  getMemoryCoordinator,
  createMemoryCoordinator,
  resetDefaultCoordinator,
} from './memory-coordinator';
