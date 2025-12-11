/**
 * GOAP Goals - Portfolio Analysis Goal Definitions
 * Defines goals for Goal-Oriented Action Planning
 */

/**
 * World state representation for GOAP planner
 */
export interface WorldState {
  // Analysis state
  reposScanned: boolean;
  shardsGenerated: boolean;
  metricsCalculated: boolean;
  briefGenerated: boolean;
  dashboardBuilt: boolean;

  // Quality state
  driftAnalyzed: boolean;
  healthScoresComputed: boolean;
  aiInsightsGenerated: boolean;
  strategicRecommendationsReady: boolean;

  // Neural training state
  neuralPatternsRecorded: boolean;
  semanticEmbeddingsComputed: boolean;

  // Memory state
  memoryPersisted: boolean;
  sessionContextRestored: boolean;

  // Output state
  outputFilesWritten: boolean;
  reportDelivered: boolean;

  // Numeric metrics (for precondition thresholds)
  projectCount: number;
  healthScore: number;
  driftAlerts: number;
  completionPercentage: number;
}

/**
 * Creates a default/initial world state
 */
export function createInitialWorldState(): WorldState {
  return {
    reposScanned: false,
    shardsGenerated: false,
    metricsCalculated: false,
    briefGenerated: false,
    dashboardBuilt: false,
    driftAnalyzed: false,
    healthScoresComputed: false,
    aiInsightsGenerated: false,
    strategicRecommendationsReady: false,
    neuralPatternsRecorded: false,
    semanticEmbeddingsComputed: false,
    memoryPersisted: false,
    sessionContextRestored: false,
    outputFilesWritten: false,
    reportDelivered: false,
    projectCount: 0,
    healthScore: 0,
    driftAlerts: 0,
    completionPercentage: 0
  };
}

/**
 * Goal priority levels
 */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Goal categories for portfolio analysis
 */
export type GoalCategory =
  | 'analysis'    // Core analysis tasks
  | 'quality'     // Quality and health checks
  | 'insight'     // AI-powered insights
  | 'output'      // Report and dashboard generation
  | 'learning'    // Neural pattern recording
  | 'memory';     // State persistence

/**
 * Goal definition for GOAP planner
 */
export interface Goal {
  id: string;
  name: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;

  // Target state conditions
  targetState: Partial<WorldState>;

  // Preconditions that must be met
  preconditions?: (state: WorldState) => boolean;

  // How important is achieving this goal (0-1)
  desirability: number;

  // Estimated time to complete in ms
  estimatedDuration: number;

  // Can this goal be pursued in parallel with others
  parallelizable: boolean;

  // Dependencies on other goals (by ID)
  dependsOn?: string[];
}

/**
 * Portfolio analysis goals
 */
export const PORTFOLIO_GOALS: Goal[] = [
  // === ANALYSIS PHASE ===
  {
    id: 'scan_repositories',
    name: 'Scan Repositories',
    description: 'Discover and scan all project repositories',
    category: 'analysis',
    priority: 'critical',
    targetState: {
      reposScanned: true
    },
    desirability: 1.0,
    estimatedDuration: 30000,
    parallelizable: false
  },
  {
    id: 'generate_shards',
    name: 'Generate Project Shards',
    description: 'Create semantic shards for each project',
    category: 'analysis',
    priority: 'critical',
    targetState: {
      shardsGenerated: true
    },
    preconditions: (state) => state.reposScanned,
    desirability: 0.95,
    estimatedDuration: 60000,
    parallelizable: true,
    dependsOn: ['scan_repositories']
  },
  {
    id: 'compute_embeddings',
    name: 'Compute Semantic Embeddings',
    description: 'Generate semantic vectors for clustering',
    category: 'analysis',
    priority: 'high',
    targetState: {
      semanticEmbeddingsComputed: true
    },
    preconditions: (state) => state.reposScanned,
    desirability: 0.85,
    estimatedDuration: 45000,
    parallelizable: true,
    dependsOn: ['scan_repositories']
  },

  // === QUALITY PHASE ===
  {
    id: 'compute_health_scores',
    name: 'Compute Health Scores',
    description: 'Calculate health scores and grades for all projects',
    category: 'quality',
    priority: 'high',
    targetState: {
      healthScoresComputed: true,
      metricsCalculated: true
    },
    preconditions: (state) => state.shardsGenerated,
    desirability: 0.9,
    estimatedDuration: 20000,
    parallelizable: true,
    dependsOn: ['generate_shards']
  },
  {
    id: 'analyze_drift',
    name: 'Analyze Project Drift',
    description: 'Detect drift between intent and implementation',
    category: 'quality',
    priority: 'high',
    targetState: {
      driftAnalyzed: true
    },
    preconditions: (state) => state.shardsGenerated && state.semanticEmbeddingsComputed,
    desirability: 0.85,
    estimatedDuration: 30000,
    parallelizable: true,
    dependsOn: ['generate_shards', 'compute_embeddings']
  },

  // === INSIGHT PHASE ===
  {
    id: 'generate_ai_insights',
    name: 'Generate AI Insights',
    description: 'Use Claude to generate strategic insights',
    category: 'insight',
    priority: 'medium',
    targetState: {
      aiInsightsGenerated: true
    },
    preconditions: (state) =>
      state.healthScoresComputed &&
      state.driftAnalyzed &&
      state.projectCount > 0,
    desirability: 0.8,
    estimatedDuration: 15000,
    parallelizable: false,
    dependsOn: ['compute_health_scores', 'analyze_drift']
  },
  {
    id: 'generate_strategic_recommendations',
    name: 'Generate Strategic Recommendations',
    description: 'Create actionable portfolio recommendations',
    category: 'insight',
    priority: 'medium',
    targetState: {
      strategicRecommendationsReady: true
    },
    preconditions: (state) => state.aiInsightsGenerated,
    desirability: 0.75,
    estimatedDuration: 10000,
    parallelizable: false,
    dependsOn: ['generate_ai_insights']
  },

  // === OUTPUT PHASE ===
  {
    id: 'generate_brief',
    name: 'Generate Portfolio Brief',
    description: 'Create markdown brief document',
    category: 'output',
    priority: 'high',
    targetState: {
      briefGenerated: true
    },
    preconditions: (state) =>
      state.metricsCalculated &&
      state.healthScoresComputed,
    desirability: 0.9,
    estimatedDuration: 5000,
    parallelizable: true,
    dependsOn: ['compute_health_scores']
  },
  {
    id: 'build_dashboard',
    name: 'Build HTML Dashboard',
    description: 'Generate interactive dashboard',
    category: 'output',
    priority: 'high',
    targetState: {
      dashboardBuilt: true
    },
    preconditions: (state) =>
      state.metricsCalculated &&
      state.healthScoresComputed,
    desirability: 0.9,
    estimatedDuration: 8000,
    parallelizable: true,
    dependsOn: ['compute_health_scores']
  },
  {
    id: 'write_output_files',
    name: 'Write Output Files',
    description: 'Save all generated reports and data',
    category: 'output',
    priority: 'critical',
    targetState: {
      outputFilesWritten: true
    },
    preconditions: (state) =>
      state.briefGenerated &&
      state.dashboardBuilt,
    desirability: 0.95,
    estimatedDuration: 3000,
    parallelizable: false,
    dependsOn: ['generate_brief', 'build_dashboard']
  },

  // === LEARNING PHASE ===
  {
    id: 'record_neural_patterns',
    name: 'Record Neural Patterns',
    description: 'Train neural networks on execution patterns',
    category: 'learning',
    priority: 'low',
    targetState: {
      neuralPatternsRecorded: true
    },
    preconditions: (state) => state.outputFilesWritten,
    desirability: 0.6,
    estimatedDuration: 10000,
    parallelizable: true,
    dependsOn: ['write_output_files']
  },

  // === MEMORY PHASE ===
  {
    id: 'persist_memory',
    name: 'Persist Session Memory',
    description: 'Save session state for future reference',
    category: 'memory',
    priority: 'medium',
    targetState: {
      memoryPersisted: true
    },
    preconditions: (state) => state.outputFilesWritten,
    desirability: 0.7,
    estimatedDuration: 5000,
    parallelizable: true,
    dependsOn: ['write_output_files']
  },
  {
    id: 'restore_session_context',
    name: 'Restore Session Context',
    description: 'Load previous session context if available',
    category: 'memory',
    priority: 'low',
    targetState: {
      sessionContextRestored: true
    },
    desirability: 0.5,
    estimatedDuration: 3000,
    parallelizable: false
  },

  // === COMPLETION ===
  {
    id: 'deliver_report',
    name: 'Deliver Final Report',
    description: 'Mark analysis as complete and ready for delivery',
    category: 'output',
    priority: 'critical',
    targetState: {
      reportDelivered: true,
      completionPercentage: 100
    },
    preconditions: (state) =>
      state.outputFilesWritten &&
      state.healthScore >= 0,
    desirability: 1.0,
    estimatedDuration: 1000,
    parallelizable: false,
    dependsOn: ['write_output_files']
  }
];

/**
 * Gets goals by category
 */
export function getGoalsByCategory(category: GoalCategory): Goal[] {
  return PORTFOLIO_GOALS.filter(g => g.category === category);
}

/**
 * Gets goals by priority
 */
export function getGoalsByPriority(priority: GoalPriority): Goal[] {
  return PORTFOLIO_GOALS.filter(g => g.priority === priority);
}

/**
 * Gets goal by ID
 */
export function getGoalById(id: string): Goal | undefined {
  return PORTFOLIO_GOALS.find(g => g.id === id);
}

/**
 * Gets all goals that can be achieved given current state
 */
export function getAchievableGoals(currentState: WorldState): Goal[] {
  return PORTFOLIO_GOALS.filter(goal => {
    // Check if goal is not already achieved
    const targetKeys = Object.keys(goal.targetState) as (keyof WorldState)[];
    const alreadyAchieved = targetKeys.every(key =>
      currentState[key] === goal.targetState[key]
    );
    if (alreadyAchieved) return false;

    // Check preconditions
    if (goal.preconditions && !goal.preconditions(currentState)) {
      return false;
    }

    return true;
  });
}

/**
 * Checks if a goal is satisfied by the current state
 */
export function isGoalSatisfied(goal: Goal, state: WorldState): boolean {
  const targetKeys = Object.keys(goal.targetState) as (keyof WorldState)[];
  return targetKeys.every(key => state[key] === goal.targetState[key]);
}

/**
 * Calculates distance between current state and goal state
 * Lower is better (0 = goal achieved)
 */
export function calculateGoalDistance(goal: Goal, state: WorldState): number {
  const targetKeys = Object.keys(goal.targetState) as (keyof WorldState)[];
  let distance = 0;

  for (const key of targetKeys) {
    if (state[key] !== goal.targetState[key]) {
      distance += 1;
    }
  }

  return distance;
}
