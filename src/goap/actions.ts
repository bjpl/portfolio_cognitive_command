/**
 * GOAP Actions - Portfolio Analysis Action Library
 * Defines actions that can be taken to achieve goals
 */

import { WorldState } from './goals';

/**
 * Action phase categories
 */
export type ActionPhase =
  | 'discovery'    // Initial discovery and scanning
  | 'analysis'     // Data analysis and processing
  | 'generation'   // Content generation
  | 'quality'      // Quality checks and validation
  | 'output'       // Report and file generation
  | 'learning'     // Neural pattern recording
  | 'memory';      // State persistence

/**
 * Action execution status
 */
export type ActionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

/**
 * Action definition for GOAP planner
 */
export interface Action {
  id: string;
  name: string;
  description: string;
  phase: ActionPhase;

  // What state conditions must be true to execute
  preconditions: Partial<WorldState>;

  // What state changes when action completes successfully
  effects: Partial<WorldState>;

  // Cost of executing this action (lower is better)
  cost: number;

  // Can this action run in parallel with others
  parallelizable: boolean;

  // Maximum time to allow for execution in ms
  timeout: number;

  // Associated skill module (if any)
  skillModule?: string;

  // Associated function to call
  executor?: string;
}

/**
 * Action execution result
 */
export interface ActionResult {
  actionId: string;
  status: ActionStatus;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  error?: string;
  stateChanges?: Partial<WorldState>;
  metadata?: Record<string, unknown>;
}

/**
 * Portfolio analysis action library
 * Organized by phases following SPARC methodology
 */
export const PORTFOLIO_ACTIONS: Action[] = [
  // === DISCOVERY PHASE ===
  {
    id: 'restore_session',
    name: 'Restore Previous Session',
    description: 'Load context from previous session if available',
    phase: 'discovery',
    preconditions: {},
    effects: {
      sessionContextRestored: true
    },
    cost: 1,
    parallelizable: false,
    timeout: 5000,
    skillModule: 'memory-coordinator',
    executor: 'restoreSession'
  },
  {
    id: 'discover_repos',
    name: 'Discover Repositories',
    description: 'Scan filesystem for project repositories',
    phase: 'discovery',
    preconditions: {},
    effects: {
      reposScanned: true
    },
    cost: 3,
    parallelizable: false,
    timeout: 60000,
    skillModule: 'repo-scanner',
    executor: 'discoverRepositories'
  },

  // === ANALYSIS PHASE ===
  {
    id: 'compute_semantic_embeddings',
    name: 'Compute Semantic Embeddings',
    description: 'Generate semantic vectors for project categorization',
    phase: 'analysis',
    preconditions: {
      reposScanned: true
    },
    effects: {
      semanticEmbeddingsComputed: true
    },
    cost: 4,
    parallelizable: true,
    timeout: 90000,
    skillModule: 'semantic-analyzer',
    executor: 'generateEmbedding'
  },
  {
    id: 'generate_project_shards',
    name: 'Generate Project Shards',
    description: 'Create detailed shard documents for each project',
    phase: 'analysis',
    preconditions: {
      reposScanned: true
    },
    effects: {
      shardsGenerated: true
    },
    cost: 5,
    parallelizable: true,
    timeout: 120000,
    skillModule: 'shard-generator',
    executor: 'generateShard'
  },
  {
    id: 'compute_health_metrics',
    name: 'Compute Health Metrics',
    description: 'Calculate health scores and factor breakdown',
    phase: 'analysis',
    preconditions: {
      shardsGenerated: true
    },
    effects: {
      healthScoresComputed: true,
      metricsCalculated: true
    },
    cost: 3,
    parallelizable: true,
    timeout: 30000,
    skillModule: 'shard-generator',
    executor: 'calculateProjectHealth'
  },

  // === QUALITY PHASE ===
  {
    id: 'detect_drift',
    name: 'Detect Intent Drift',
    description: 'Analyze drift between intent and implementation',
    phase: 'quality',
    preconditions: {
      shardsGenerated: true,
      semanticEmbeddingsComputed: true
    },
    effects: {
      driftAnalyzed: true
    },
    cost: 4,
    parallelizable: true,
    timeout: 45000,
    skillModule: 'drift-detector',
    executor: 'detectDrift'
  },
  {
    id: 'analyze_drift_root_cause',
    name: 'Analyze Drift Root Cause',
    description: 'Use AI to identify root cause of drift',
    phase: 'quality',
    preconditions: {
      driftAnalyzed: true
    },
    effects: {}, // Enhances drift analysis but no state change
    cost: 6,
    parallelizable: false,
    timeout: 30000,
    skillModule: 'drift-detector',
    executor: 'analyzeDriftRootCause'
  },

  // === GENERATION PHASE (AI Insights) ===
  {
    id: 'generate_ai_dashboard_insights',
    name: 'Generate Dashboard AI Insights',
    description: 'Use Claude to generate daily focus and trends',
    phase: 'generation',
    preconditions: {
      healthScoresComputed: true,
      driftAnalyzed: true
    },
    effects: {
      aiInsightsGenerated: true
    },
    cost: 6,
    parallelizable: false,
    timeout: 30000,
    skillModule: 'dashboard-builder',
    executor: 'generateDashboardInsights'
  },
  {
    id: 'generate_portfolio_strategy',
    name: 'Generate Portfolio Strategy',
    description: 'Use Claude to create strategic recommendations',
    phase: 'generation',
    preconditions: {
      healthScoresComputed: true,
      metricsCalculated: true
    },
    effects: {
      strategicRecommendationsReady: true
    },
    cost: 6,
    parallelizable: false,
    timeout: 45000,
    skillModule: 'brief-generator',
    executor: 'generatePortfolioStrategy'
  },

  // === OUTPUT PHASE ===
  {
    id: 'generate_portfolio_brief',
    name: 'Generate Portfolio Brief',
    description: 'Create comprehensive markdown brief',
    phase: 'output',
    preconditions: {
      metricsCalculated: true,
      healthScoresComputed: true
    },
    effects: {
      briefGenerated: true
    },
    cost: 2,
    parallelizable: true,
    timeout: 15000,
    skillModule: 'brief-generator',
    executor: 'generateBrief'
  },
  {
    id: 'build_html_dashboard',
    name: 'Build HTML Dashboard',
    description: 'Generate interactive HTML dashboard',
    phase: 'output',
    preconditions: {
      metricsCalculated: true,
      healthScoresComputed: true
    },
    effects: {
      dashboardBuilt: true
    },
    cost: 2,
    parallelizable: true,
    timeout: 15000,
    skillModule: 'dashboard-builder',
    executor: 'buildDashboardHTML'
  },
  {
    id: 'write_shard_files',
    name: 'Write Shard Files',
    description: 'Save project shards to JSON files',
    phase: 'output',
    preconditions: {
      shardsGenerated: true
    },
    effects: {}, // Part of output process
    cost: 1,
    parallelizable: true,
    timeout: 10000,
    skillModule: 'shard-generator',
    executor: 'writeShardFiles'
  },
  {
    id: 'write_metrics_json',
    name: 'Write Metrics JSON',
    description: 'Save cognitive metrics to JSON',
    phase: 'output',
    preconditions: {
      metricsCalculated: true
    },
    effects: {}, // Part of output process
    cost: 1,
    parallelizable: true,
    timeout: 5000,
    skillModule: 'cognitive-linker',
    executor: 'writeMetrics'
  },
  {
    id: 'finalize_output_files',
    name: 'Finalize Output Files',
    description: 'Ensure all output files are written',
    phase: 'output',
    preconditions: {
      briefGenerated: true,
      dashboardBuilt: true
    },
    effects: {
      outputFilesWritten: true
    },
    cost: 1,
    parallelizable: false,
    timeout: 5000
  },

  // === LEARNING PHASE ===
  {
    id: 'record_semantic_patterns',
    name: 'Record Semantic Patterns',
    description: 'Train neural patterns on semantic analysis',
    phase: 'learning',
    preconditions: {
      semanticEmbeddingsComputed: true
    },
    effects: {},
    cost: 3,
    parallelizable: true,
    timeout: 15000,
    skillModule: 'neural-trainer',
    executor: 'recordSemanticPattern'
  },
  {
    id: 'record_drift_patterns',
    name: 'Record Drift Patterns',
    description: 'Train neural patterns on drift detection',
    phase: 'learning',
    preconditions: {
      driftAnalyzed: true
    },
    effects: {},
    cost: 3,
    parallelizable: true,
    timeout: 15000,
    skillModule: 'neural-trainer',
    executor: 'recordDriftPattern'
  },
  {
    id: 'finalize_neural_training',
    name: 'Finalize Neural Training',
    description: 'Complete neural pattern recording',
    phase: 'learning',
    preconditions: {
      outputFilesWritten: true
    },
    effects: {
      neuralPatternsRecorded: true
    },
    cost: 2,
    parallelizable: false,
    timeout: 10000,
    skillModule: 'neural-trainer',
    executor: 'getPatternStats'
  },

  // === MEMORY PHASE ===
  {
    id: 'persist_session_state',
    name: 'Persist Session State',
    description: 'Save session context for future reference',
    phase: 'memory',
    preconditions: {
      outputFilesWritten: true
    },
    effects: {
      memoryPersisted: true
    },
    cost: 2,
    parallelizable: true,
    timeout: 10000,
    skillModule: 'memory-coordinator',
    executor: 'persistSession'
  },
  {
    id: 'deliver_final_report',
    name: 'Deliver Final Report',
    description: 'Mark analysis as complete',
    phase: 'output',
    preconditions: {
      outputFilesWritten: true
    },
    effects: {
      reportDelivered: true
    },
    cost: 1,
    parallelizable: false,
    timeout: 3000
  }
];

/**
 * Gets actions by phase
 */
export function getActionsByPhase(phase: ActionPhase): Action[] {
  return PORTFOLIO_ACTIONS.filter(a => a.phase === phase);
}

/**
 * Gets action by ID
 */
export function getActionById(id: string): Action | undefined {
  return PORTFOLIO_ACTIONS.find(a => a.id === id);
}

/**
 * Checks if an action's preconditions are met
 */
export function canExecuteAction(action: Action, state: WorldState): boolean {
  const preconditionKeys = Object.keys(action.preconditions) as (keyof WorldState)[];

  for (const key of preconditionKeys) {
    if (state[key] !== action.preconditions[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Applies action effects to world state
 */
export function applyActionEffects(
  action: Action,
  state: WorldState
): WorldState {
  return {
    ...state,
    ...action.effects
  };
}

/**
 * Gets all executable actions given current state
 */
export function getExecutableActions(state: WorldState): Action[] {
  return PORTFOLIO_ACTIONS.filter(action => canExecuteAction(action, state));
}

/**
 * Gets actions that can run in parallel
 */
export function getParallelizableActions(actions: Action[]): Action[] {
  return actions.filter(a => a.parallelizable);
}

/**
 * Calculates total cost of a sequence of actions
 */
export function calculateActionSequenceCost(actions: Action[]): number {
  return actions.reduce((sum, action) => sum + action.cost, 0);
}

/**
 * Estimates total duration of a sequence of actions
 * Takes into account parallel execution where possible
 */
export function estimateActionSequenceDuration(actions: Action[]): number {
  if (actions.length === 0) return 0;

  // Group actions that can run in parallel
  const groups: Action[][] = [];
  let currentGroup: Action[] = [];

  for (const action of actions) {
    if (action.parallelizable && currentGroup.length > 0 && currentGroup[0].parallelizable) {
      currentGroup.push(action);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [action];
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // For each group, take max duration (parallel) or sum (sequential)
  return groups.reduce((total, group) => {
    if (group.length === 1) {
      return total + group[0].timeout;
    }
    // Parallel group - take maximum
    return total + Math.max(...group.map(a => a.timeout));
  }, 0);
}

/**
 * Orders actions by dependency
 */
export function orderActionsByDependency(actions: Action[]): Action[] {
  const ordered: Action[] = [];
  const remaining = [...actions];

  // Simple topological sort based on preconditions and effects
  while (remaining.length > 0) {
    const canExecute = remaining.filter(action => {
      const preconditions = Object.keys(action.preconditions) as (keyof WorldState)[];
      return preconditions.every(key => {
        // Check if precondition is met by already ordered actions
        return ordered.some(prev =>
          (prev.effects as Record<string, unknown>)[key] === action.preconditions[key]
        ) || Object.keys(action.preconditions).length === 0;
      });
    });

    if (canExecute.length === 0 && remaining.length > 0) {
      // No more actions can be ordered - take first remaining
      ordered.push(remaining.shift()!);
    } else {
      // Add all executable actions (they can run in parallel if needed)
      for (const action of canExecute) {
        ordered.push(action);
        const idx = remaining.indexOf(action);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }
  }

  return ordered;
}
