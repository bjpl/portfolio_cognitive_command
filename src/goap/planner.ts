/**
 * GOAP A* Planner - Goal-Oriented Action Planning
 * Uses A* search to find optimal action sequences to achieve goals
 */

import {
  WorldState,
  Goal,
  createInitialWorldState,
  isGoalSatisfied,
  PORTFOLIO_GOALS,
  getGoalById
} from './goals';

import {
  Action,
  PORTFOLIO_ACTIONS,
  canExecuteAction,
  applyActionEffects,
  calculateActionSequenceCost
} from './actions';

/**
 * Planning node for A* search
 */
interface PlanNode {
  state: WorldState;
  action: Action | null;
  parent: PlanNode | null;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to goal)
  f: number; // Total estimated cost (g + h)
}

/**
 * Plan result from the planner
 */
export interface Plan {
  actions: Action[];
  totalCost: number;
  estimatedDuration: number;
  goalId: string;
  startState: WorldState;
  endState: WorldState;
  planningTimeMs: number;
  nodesExplored: number;
}

/**
 * Planning options
 */
export interface PlannerOptions {
  maxIterations?: number;
  maxPlanLength?: number;
  heuristicWeight?: number;
  preferParallel?: boolean;
  timeoutMs?: number;
}

const DEFAULT_OPTIONS: Required<PlannerOptions> = {
  maxIterations: 1000,
  maxPlanLength: 50,
  heuristicWeight: 1.5,
  preferParallel: true,
  timeoutMs: 30000
};

/**
 * A* Planner for Goal-Oriented Action Planning
 */
export class GOAPPlanner {
  private actions: Action[];
  private options: Required<PlannerOptions>;

  constructor(
    actions: Action[] = PORTFOLIO_ACTIONS,
    options: PlannerOptions = {}
  ) {
    this.actions = actions;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Creates a plan to achieve the specified goal
   * @param goal - Target goal to achieve
   * @param initialState - Starting world state
   * @returns Plan or null if no plan found
   */
  plan(goal: Goal, initialState: WorldState = createInitialWorldState()): Plan | null {
    const startTime = Date.now();

    // Check if goal already satisfied
    if (isGoalSatisfied(goal, initialState)) {
      return {
        actions: [],
        totalCost: 0,
        estimatedDuration: 0,
        goalId: goal.id,
        startState: initialState,
        endState: initialState,
        planningTimeMs: Date.now() - startTime,
        nodesExplored: 0
      };
    }

    // Initialize A* search
    const openSet: PlanNode[] = [];
    const closedSet = new Set<string>();
    let nodesExplored = 0;

    const startNode: PlanNode = {
      state: initialState,
      action: null,
      parent: null,
      g: 0,
      h: this.calculateHeuristic(initialState, goal),
      f: 0
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0 && nodesExplored < this.options.maxIterations) {
      // Check timeout
      if (Date.now() - startTime > this.options.timeoutMs) {
        console.warn(`[GOAPPlanner] Timeout after ${nodesExplored} nodes`);
        break;
      }

      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      nodesExplored++;

      // Check if goal reached
      if (isGoalSatisfied(goal, current.state)) {
        return this.reconstructPlan(current, goal, initialState, startTime, nodesExplored);
      }

      // Mark as explored
      const stateKey = this.stateToKey(current.state);
      if (closedSet.has(stateKey)) continue;
      closedSet.add(stateKey);

      // Check max plan length
      const currentPlanLength = this.getPlanLength(current);
      if (currentPlanLength >= this.options.maxPlanLength) continue;

      // Expand node with all applicable actions
      for (const action of this.actions) {
        if (!canExecuteAction(action, current.state)) continue;

        const newState = applyActionEffects(action, current.state);
        const newStateKey = this.stateToKey(newState);
        if (closedSet.has(newStateKey)) continue;

        const g = current.g + this.getActionCost(action);
        const h = this.calculateHeuristic(newState, goal);
        const f = g + this.options.heuristicWeight * h;

        const newNode: PlanNode = {
          state: newState,
          action,
          parent: current,
          g,
          h,
          f
        };

        // Add to open set
        const existingIdx = openSet.findIndex(n =>
          this.stateToKey(n.state) === newStateKey
        );
        if (existingIdx >= 0) {
          if (g < openSet[existingIdx].g) {
            openSet[existingIdx] = newNode;
          }
        } else {
          openSet.push(newNode);
        }
      }
    }

    // No plan found
    return null;
  }

  /**
   * Plans to achieve multiple goals in optimal order
   * @param goals - Array of goals to achieve
   * @param initialState - Starting world state
   * @returns Array of plans or null if any goal cannot be achieved
   */
  planMultiple(
    goals: Goal[],
    initialState: WorldState = createInitialWorldState()
  ): Plan[] | null {
    const plans: Plan[] = [];
    let currentState = { ...initialState };

    // Sort goals by dependency and priority
    const sortedGoals = this.sortGoalsByDependency(goals);

    for (const goal of sortedGoals) {
      if (isGoalSatisfied(goal, currentState)) {
        continue;
      }

      const plan = this.plan(goal, currentState);
      if (!plan) {
        console.warn(`[GOAPPlanner] Failed to plan for goal: ${goal.id}`);
        return null;
      }

      plans.push(plan);
      currentState = plan.endState;
    }

    return plans;
  }

  /**
   * Plans full portfolio analysis workflow
   */
  planFullAnalysis(
    initialState: WorldState = createInitialWorldState()
  ): Plan | null {
    // Find the final goal
    const deliverReportGoal = getGoalById('deliver_report');
    if (!deliverReportGoal) return null;

    return this.plan(deliverReportGoal, initialState);
  }

  /**
   * Calculates heuristic for A* search
   * Estimates remaining cost to reach goal
   */
  private calculateHeuristic(state: WorldState, goal: Goal): number {
    let h = 0;
    const targetKeys = Object.keys(goal.targetState) as (keyof WorldState)[];

    for (const key of targetKeys) {
      if (state[key] !== goal.targetState[key]) {
        // Find minimum cost action that provides this effect
        const minCost = this.findMinCostForEffect(key, goal.targetState[key]!);
        h += minCost;
      }
    }

    return h;
  }

  /**
   * Finds minimum cost action that achieves a specific effect
   */
  private findMinCostForEffect(key: keyof WorldState, value: unknown): number {
    let minCost = Infinity;

    for (const action of this.actions) {
      if ((action.effects as Record<string, unknown>)[key] === value) {
        minCost = Math.min(minCost, action.cost);
      }
    }

    return minCost === Infinity ? 10 : minCost;
  }

  /**
   * Gets action cost, with optional preference for parallel actions
   */
  private getActionCost(action: Action): number {
    let cost = action.cost;

    if (this.options.preferParallel && action.parallelizable) {
      cost *= 0.9; // Small discount for parallelizable actions
    }

    return cost;
  }

  /**
   * Reconstructs plan from goal node back to start
   */
  private reconstructPlan(
    node: PlanNode,
    goal: Goal,
    startState: WorldState,
    startTime: number,
    nodesExplored: number
  ): Plan {
    const actions: Action[] = [];
    let current: PlanNode | null = node;

    while (current && current.action) {
      actions.unshift(current.action);
      current = current.parent;
    }

    const totalCost = calculateActionSequenceCost(actions);
    const estimatedDuration = this.estimateDuration(actions);

    return {
      actions,
      totalCost,
      estimatedDuration,
      goalId: goal.id,
      startState,
      endState: node.state,
      planningTimeMs: Date.now() - startTime,
      nodesExplored
    };
  }

  /**
   * Gets the length of the plan from root to node
   */
  private getPlanLength(node: PlanNode): number {
    let length = 0;
    let current: PlanNode | null = node;
    while (current && current.parent) {
      length++;
      current = current.parent;
    }
    return length;
  }

  /**
   * Converts state to string key for comparison
   */
  private stateToKey(state: WorldState): string {
    return JSON.stringify(state);
  }

  /**
   * Estimates duration considering parallel execution
   */
  private estimateDuration(actions: Action[]): number {
    if (actions.length === 0) return 0;

    // Group consecutive parallelizable actions
    let totalDuration = 0;
    let parallelGroup: Action[] = [];

    for (const action of actions) {
      if (action.parallelizable) {
        parallelGroup.push(action);
      } else {
        // Flush parallel group
        if (parallelGroup.length > 0) {
          totalDuration += Math.max(...parallelGroup.map(a => a.timeout));
          parallelGroup = [];
        }
        totalDuration += action.timeout;
      }
    }

    // Flush remaining parallel group
    if (parallelGroup.length > 0) {
      totalDuration += Math.max(...parallelGroup.map(a => a.timeout));
    }

    return totalDuration;
  }

  /**
   * Sorts goals by dependency order
   */
  private sortGoalsByDependency(goals: Goal[]): Goal[] {
    const sorted: Goal[] = [];
    const remaining = [...goals];

    while (remaining.length > 0) {
      const next = remaining.find(goal => {
        if (!goal.dependsOn || goal.dependsOn.length === 0) return true;
        return goal.dependsOn.every(depId =>
          sorted.some(s => s.id === depId) ||
          !remaining.some(r => r.id === depId)
        );
      });

      if (next) {
        sorted.push(next);
        remaining.splice(remaining.indexOf(next), 1);
      } else {
        // Break cycle by taking first remaining
        sorted.push(remaining.shift()!);
      }
    }

    return sorted;
  }
}

/**
 * Formats a plan for display
 */
export function formatPlan(plan: Plan): string {
  const lines: string[] = [
    `=== GOAP Plan for Goal: ${plan.goalId} ===`,
    `Total Cost: ${plan.totalCost}`,
    `Estimated Duration: ${(plan.estimatedDuration / 1000).toFixed(1)}s`,
    `Planning Time: ${plan.planningTimeMs}ms`,
    `Nodes Explored: ${plan.nodesExplored}`,
    '',
    '--- Action Sequence ---'
  ];

  plan.actions.forEach((action, idx) => {
    const parallel = action.parallelizable ? ' [P]' : '';
    lines.push(`${idx + 1}. ${action.name}${parallel} (cost: ${action.cost})`);
    lines.push(`   └─ ${action.description}`);
  });

  lines.push('', '=== End Plan ===');
  return lines.join('\n');
}

/**
 * Creates a planner instance with default configuration
 */
export function createPlanner(options?: PlannerOptions): GOAPPlanner {
  return new GOAPPlanner(PORTFOLIO_ACTIONS, options);
}

/**
 * Quick plan to full analysis
 */
export function planFullAnalysis(
  initialState?: WorldState,
  options?: PlannerOptions
): Plan | null {
  const planner = createPlanner(options);
  return planner.planFullAnalysis(initialState);
}
