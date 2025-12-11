/**
 * Skill Registry - Centralized skill registration and execution
 * Maps GOAP action executors to actual skill implementations
 */

import {
  SkillType,
  SkillExecutorName,
  SkillExecutorConfig,
  SkillRegistry,
  SkillRegistration,
} from '../agentdb/types';

// ============================================================================
// Skill Executor Registry
// ============================================================================

/**
 * Default skill executor configurations
 */
const SKILL_EXECUTORS: Record<SkillExecutorName, SkillExecutorConfig> = {
  // Discovery Phase
  discoverRepositories: {
    name: 'discoverRepositories',
    skillModule: 'repo-scanner',
    description: 'Scan filesystem for project repositories',
    timeout: 60000,
    retryCount: 2,
    parallelizable: false,
    requiresAI: false,
  },

  // Analysis Phase
  generateEmbedding: {
    name: 'generateEmbedding',
    skillModule: 'semantic-analyzer',
    description: 'Generate semantic embeddings for project categorization',
    timeout: 90000,
    retryCount: 3,
    parallelizable: true,
    requiresAI: true,
    estimatedCost: 0.01,
  },
  generateShard: {
    name: 'generateShard',
    skillModule: 'shard-generator',
    description: 'Create detailed project shard document',
    timeout: 120000,
    retryCount: 2,
    parallelizable: true,
    requiresAI: false,
  },
  calculateProjectHealth: {
    name: 'calculateProjectHealth',
    skillModule: 'shard-generator',
    description: 'Calculate health scores and factor breakdown',
    timeout: 30000,
    retryCount: 1,
    parallelizable: true,
    requiresAI: false,
  },

  // Quality Phase
  detectDrift: {
    name: 'detectDrift',
    skillModule: 'drift-detector',
    description: 'Detect intent-implementation drift',
    timeout: 45000,
    retryCount: 2,
    parallelizable: true,
    requiresAI: false,
  },
  analyzeDriftRootCause: {
    name: 'analyzeDriftRootCause',
    skillModule: 'drift-detector',
    description: 'AI analysis of drift root cause',
    timeout: 30000,
    retryCount: 2,
    parallelizable: false,
    requiresAI: true,
    estimatedCost: 0.02,
  },

  // Generation Phase (AI Insights)
  generateDashboardInsights: {
    name: 'generateDashboardInsights',
    skillModule: 'dashboard-builder',
    description: 'Generate AI insights for dashboard',
    timeout: 30000,
    retryCount: 2,
    parallelizable: false,
    requiresAI: true,
    estimatedCost: 0.03,
  },
  generatePortfolioStrategy: {
    name: 'generatePortfolioStrategy',
    skillModule: 'brief-generator',
    description: 'Generate strategic portfolio recommendations',
    timeout: 45000,
    retryCount: 2,
    parallelizable: false,
    requiresAI: true,
    estimatedCost: 0.05,
  },

  // Output Phase
  generateBrief: {
    name: 'generateBrief',
    skillModule: 'brief-generator',
    description: 'Generate portfolio brief markdown',
    timeout: 15000,
    retryCount: 1,
    parallelizable: true,
    requiresAI: false,
  },
  buildDashboardHTML: {
    name: 'buildDashboardHTML',
    skillModule: 'dashboard-builder',
    description: 'Build interactive HTML dashboard',
    timeout: 15000,
    retryCount: 1,
    parallelizable: true,
    requiresAI: false,
  },
  writeShardFiles: {
    name: 'writeShardFiles',
    skillModule: 'shard-generator',
    description: 'Write project shard files to disk',
    timeout: 10000,
    retryCount: 2,
    parallelizable: true,
    requiresAI: false,
  },
  writeMetrics: {
    name: 'writeMetrics',
    skillModule: 'cognitive-linker',
    description: 'Write cognitive metrics JSON',
    timeout: 5000,
    retryCount: 2,
    parallelizable: true,
    requiresAI: false,
  },

  // Learning Phase
  recordSemanticPattern: {
    name: 'recordSemanticPattern',
    skillModule: 'neural-trainer',
    description: 'Record semantic analysis patterns',
    timeout: 15000,
    retryCount: 1,
    parallelizable: true,
    requiresAI: false,
  },
  recordDriftPattern: {
    name: 'recordDriftPattern',
    skillModule: 'neural-trainer',
    description: 'Record drift detection patterns',
    timeout: 15000,
    retryCount: 1,
    parallelizable: true,
    requiresAI: false,
  },
  getPatternStats: {
    name: 'getPatternStats',
    skillModule: 'neural-trainer',
    description: 'Get neural pattern statistics',
    timeout: 10000,
    retryCount: 1,
    parallelizable: false,
    requiresAI: false,
  },

  // Memory Phase
  restoreSession: {
    name: 'restoreSession',
    skillModule: 'memory-coordinator',
    description: 'Restore previous session context',
    timeout: 5000,
    retryCount: 2,
    parallelizable: false,
    requiresAI: false,
  },
  persistSession: {
    name: 'persistSession',
    skillModule: 'memory-coordinator',
    description: 'Persist current session state',
    timeout: 10000,
    retryCount: 3,
    parallelizable: true,
    requiresAI: false,
  },
};

/**
 * Default skill registry configuration
 */
export const DEFAULT_SKILL_REGISTRY: SkillRegistry = {
  version: '1.0.0',
  lastUpdated: new Date(),
  executors: SKILL_EXECUTORS,
  defaultConfig: {
    maxRetries: 3,
    defaultTimeout: 30000,
    parallelLimit: 5,
  },
};

// ============================================================================
// Skill Registry Manager
// ============================================================================

export interface SkillExecutionResult {
  success: boolean;
  executorName: SkillExecutorName;
  durationMs: number;
  result?: unknown;
  error?: string;
  retryCount: number;
}

export interface SkillExecutionContext {
  sessionId: string;
  agentId?: string;
  planId?: string;
  swarmId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Skill Registry Manager
 * Handles skill registration, lookup, and execution coordination
 */
export class SkillRegistryManager {
  private registry: SkillRegistry;
  private registrations: Map<string, SkillRegistration> = new Map();

  constructor(registry: SkillRegistry = DEFAULT_SKILL_REGISTRY) {
    this.registry = registry;
  }

  /**
   * Get executor configuration by name
   */
  getExecutor(name: SkillExecutorName): SkillExecutorConfig | undefined {
    return this.registry.executors[name];
  }

  /**
   * Get all executors for a skill module
   */
  getExecutorsByModule(module: SkillType | string): SkillExecutorConfig[] {
    return Object.values(this.registry.executors).filter(
      (e) => e.skillModule === module
    );
  }

  /**
   * Get all AI-requiring executors
   */
  getAIExecutors(): SkillExecutorConfig[] {
    return Object.values(this.registry.executors).filter((e) => e.requiresAI);
  }

  /**
   * Get all parallelizable executors
   */
  getParallelizableExecutors(): SkillExecutorConfig[] {
    return Object.values(this.registry.executors).filter((e) => e.parallelizable);
  }

  /**
   * Estimate total API cost for a set of executors
   */
  estimateExecutionCost(executorNames: SkillExecutorName[]): number {
    return executorNames.reduce((total, name) => {
      const executor = this.registry.executors[name];
      return total + (executor?.estimatedCost || 0);
    }, 0);
  }

  /**
   * Get execution timeout for an executor
   */
  getExecutorTimeout(name: SkillExecutorName): number {
    const executor = this.registry.executors[name];
    return executor?.timeout || this.registry.defaultConfig.defaultTimeout;
  }

  /**
   * Register a skill implementation
   */
  registerSkill(registration: SkillRegistration): void {
    this.registrations.set(registration.skillId, registration);
  }

  /**
   * Get skill registration by ID
   */
  getSkillRegistration(skillId: string): SkillRegistration | undefined {
    return this.registrations.get(skillId);
  }

  /**
   * Get all registered skills
   */
  getAllRegistrations(): SkillRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Check if a skill is enabled
   */
  isSkillEnabled(skillId: string): boolean {
    const registration = this.registrations.get(skillId);
    return registration?.enabled ?? false;
  }

  /**
   * Update skill statistics after execution
   */
  updateSkillStats(
    skillId: string,
    executionTimeMs: number,
    success: boolean
  ): void {
    const registration = this.registrations.get(skillId);
    if (!registration) return;

    registration.executionCount++;
    registration.lastExecuted = new Date();

    // Update rolling average execution time
    const newAvg =
      (registration.averageExecutionTime * (registration.executionCount - 1) +
        executionTimeMs) /
      registration.executionCount;
    registration.averageExecutionTime = newAvg;

    // Update success rate
    if (!success) {
      registration.errorCount++;
    }
    registration.successRate =
      (registration.executionCount - registration.errorCount) /
      registration.executionCount;

    this.registrations.set(skillId, registration);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalExecutors: number;
    aiExecutors: number;
    parallelizable: number;
    estimatedTotalCost: number;
    registeredSkills: number;
  } {
    const executors = Object.values(this.registry.executors);
    return {
      totalExecutors: executors.length,
      aiExecutors: executors.filter((e) => e.requiresAI).length,
      parallelizable: executors.filter((e) => e.parallelizable).length,
      estimatedTotalCost: executors.reduce(
        (sum, e) => sum + (e.estimatedCost || 0),
        0
      ),
      registeredSkills: this.registrations.size,
    };
  }

  /**
   * Export registry configuration
   */
  exportRegistry(): SkillRegistry {
    return { ...this.registry };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a skill registry manager instance
 */
export function createSkillRegistry(
  customRegistry?: Partial<SkillRegistry>
): SkillRegistryManager {
  const registry: SkillRegistry = {
    ...DEFAULT_SKILL_REGISTRY,
    ...customRegistry,
    executors: {
      ...DEFAULT_SKILL_REGISTRY.executors,
      ...customRegistry?.executors,
    },
    defaultConfig: {
      ...DEFAULT_SKILL_REGISTRY.defaultConfig,
      ...customRegistry?.defaultConfig,
    },
  };

  return new SkillRegistryManager(registry);
}

/**
 * Get executor by action ID (maps GOAP action IDs to executors)
 */
export function getExecutorForAction(actionId: string): SkillExecutorName | null {
  const actionToExecutorMap: Record<string, SkillExecutorName> = {
    restore_session: 'restoreSession',
    discover_repos: 'discoverRepositories',
    compute_semantic_embeddings: 'generateEmbedding',
    generate_project_shards: 'generateShard',
    compute_health_metrics: 'calculateProjectHealth',
    detect_drift: 'detectDrift',
    analyze_drift_root_cause: 'analyzeDriftRootCause',
    generate_ai_dashboard_insights: 'generateDashboardInsights',
    generate_portfolio_strategy: 'generatePortfolioStrategy',
    generate_portfolio_brief: 'generateBrief',
    build_html_dashboard: 'buildDashboardHTML',
    write_shard_files: 'writeShardFiles',
    write_metrics_json: 'writeMetrics',
    record_semantic_patterns: 'recordSemanticPattern',
    record_drift_patterns: 'recordDriftPattern',
    finalize_neural_training: 'getPatternStats',
    persist_session_state: 'persistSession',
  };

  return actionToExecutorMap[actionId] || null;
}
