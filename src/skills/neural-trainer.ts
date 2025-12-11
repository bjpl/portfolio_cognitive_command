/**
 * Neural Pattern Trainer
 * Records and learns from skill execution patterns
 */

import { createAgentDB } from '../agentdb/database';
import { NeuralPattern } from '../agentdb/types';
import { ClusterType, SemanticEmbedding } from './semantic-analyzer';
import { DriftResult } from './drift-detector';

// Singleton database instance for neural training
let db: ReturnType<typeof createAgentDB> | null = null;

function getDB() {
  if (!db) {
    db = createAgentDB('./memory');
  }
  return db;
}

/**
 * Pattern types that can be learned
 */
export type PatternType = 'coordination' | 'optimization' | 'prediction';

/**
 * Training trajectory record
 */
export interface TrainingTrajectory {
  skillType: string;
  input: {
    cluster?: ClusterType;
    confidence?: number;
    alignmentScore?: number;
    driftDetected?: boolean;
  };
  output: {
    success: boolean;
    executionTime: number;
    accuracy?: number;
  };
  context: {
    sessionId?: string;
    repository?: string;
    timestamp: Date;
  };
}

/**
 * Records a training trajectory from skill execution
 * @param trajectory - The execution trajectory to record
 * @returns The updated or created pattern
 */
export async function recordTrajectory(
  trajectory: TrainingTrajectory
): Promise<NeuralPattern> {
  const database = getDB();

  // Determine pattern type based on skill
  const patternType = determinePatternType(trajectory.skillType);
  const patternId = `pattern_${trajectory.skillType}_${patternType}`;

  // Try to load existing pattern
  let pattern = await database.load<NeuralPattern>('neuralPatterns', patternId);

  if (!pattern) {
    // Create new pattern
    pattern = createNewPattern(patternId, trajectory.skillType, patternType);
  }

  // Update pattern with new trajectory
  const updatedPattern = updatePatternWeights(pattern, trajectory);

  // Save pattern
  return database.save('neuralPatterns', updatedPattern);
}

/**
 * Determines pattern type based on skill type
 */
function determinePatternType(skillType: string): PatternType {
  const coordinationSkills = ['cognitive-linker', 'shard-generator'];
  const optimizationSkills = ['semantic-analyzer', 'dashboard-builder'];
  const predictionSkills = ['drift-detector', 'repo-scanner'];

  if (coordinationSkills.includes(skillType)) return 'coordination';
  if (optimizationSkills.includes(skillType)) return 'optimization';
  if (predictionSkills.includes(skillType)) return 'prediction';

  return 'optimization'; // default
}

/**
 * Creates a new neural pattern with initialized weights
 */
function createNewPattern(
  patternId: string,
  skillType: string,
  patternType: PatternType
): NeuralPattern {
  // Initialize with small random weights
  const inputDim = 8; // cluster, confidence, alignment, drift, time features
  const hiddenDim = 16;
  const outputDim = 4; // success probability, time prediction, accuracy, drift risk

  const weights: number[][] = [];

  // Input to hidden weights
  for (let i = 0; i < inputDim; i++) {
    const row: number[] = [];
    for (let j = 0; j < hiddenDim; j++) {
      row.push((Math.random() - 0.5) * 0.1);
    }
    weights.push(row);
  }

  // Hidden to output weights
  for (let i = 0; i < hiddenDim; i++) {
    const row: number[] = [];
    for (let j = 0; j < outputDim; j++) {
      row.push((Math.random() - 0.5) * 0.1);
    }
    weights.push(row);
  }

  // Initialize biases
  const biases = new Array(hiddenDim + outputDim).fill(0).map(() =>
    (Math.random() - 0.5) * 0.01
  );

  return {
    id: patternId,
    collection: 'neuralPatterns',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    patternId,
    patternType,
    name: `${skillType} ${patternType} pattern`,
    inputShape: [inputDim],
    outputShape: [outputDim],
    weights,
    biases,
    trainedOn: [],
    trainingEpochs: 0,
    accuracy: 0.5, // Initial guess
    loss: 1.0,
    usageCount: 0,
    successRate: 0.5,
    description: `Neural pattern for ${skillType} skill execution`,
    tags: [skillType, patternType],
    customData: {}
  };
}

/**
 * Updates pattern weights using simple gradient descent
 */
function updatePatternWeights(
  pattern: NeuralPattern,
  trajectory: TrainingTrajectory
): NeuralPattern {
  const learningRate = 0.01;

  // Extract input features
  const input = extractFeatures(trajectory);

  // Forward pass to get prediction
  const prediction = forwardPass(pattern, input);

  // Calculate target based on actual outcome
  const target = [
    trajectory.output.success ? 1.0 : 0.0,
    Math.min(trajectory.output.executionTime / 10000, 1.0), // Normalize time
    trajectory.output.accuracy ?? (trajectory.output.success ? 0.8 : 0.2),
    trajectory.input.driftDetected ? 1.0 : 0.0
  ];

  // Calculate error
  const error = target.map((t, i) => t - prediction[i]);
  const mse = error.reduce((sum, e) => sum + e * e, 0) / error.length;

  // Simple weight update (gradient approximation)
  const updatedWeights = pattern.weights.map((row, i) =>
    row.map((w, j) => {
      // Simplified gradient: error * input feature (if available)
      const gradient = i < input.length ? error[j % error.length] * input[i] : error[j % error.length] * 0.1;
      return w + learningRate * gradient;
    })
  );

  // Update biases
  const updatedBiases = pattern.biases.map((b, i) => {
    const errorIdx = i % error.length;
    return b + learningRate * error[errorIdx] * 0.1;
  });

  // Update accuracy using exponential moving average
  const actualAccuracy = trajectory.output.success ? 1.0 : 0.0;
  const newAccuracy = pattern.accuracy * 0.9 + actualAccuracy * 0.1;

  // Update success rate
  const totalAttempts = pattern.usageCount + 1;
  const newSuccessRate = (pattern.successRate * pattern.usageCount + actualAccuracy) / totalAttempts;

  // Add session to training history
  const trainedOn = [...pattern.trainedOn];
  if (trajectory.context.sessionId && !trainedOn.includes(trajectory.context.sessionId)) {
    trainedOn.push(trajectory.context.sessionId);
    if (trainedOn.length > 100) trainedOn.shift(); // Keep last 100
  }

  return {
    ...pattern,
    weights: updatedWeights,
    biases: updatedBiases,
    trainedOn,
    trainingEpochs: pattern.trainingEpochs + 1,
    accuracy: newAccuracy,
    loss: mse,
    usageCount: totalAttempts,
    lastUsed: new Date(),
    successRate: newSuccessRate,
    updatedAt: new Date(),
    version: pattern.version + 1
  };
}

/**
 * Extracts feature vector from trajectory
 */
function extractFeatures(trajectory: TrainingTrajectory): number[] {
  const clusterMap: Record<ClusterType, number> = {
    'Experience': 0.0,
    'Core Systems': 0.5,
    'Infra': 1.0
  };

  return [
    clusterMap[trajectory.input.cluster ?? 'Core Systems'],
    trajectory.input.confidence ?? 0.5,
    trajectory.input.alignmentScore ?? 0.7,
    trajectory.input.driftDetected ? 1.0 : 0.0,
    Math.min(trajectory.output.executionTime / 10000, 1.0),
    trajectory.output.success ? 1.0 : 0.0,
    new Date().getHours() / 24, // Time of day feature
    new Date().getDay() / 7 // Day of week feature
  ];
}

/**
 * Simple forward pass through the network
 */
function forwardPass(pattern: NeuralPattern, input: number[]): number[] {
  const inputDim = pattern.inputShape[0];
  const outputDim = pattern.outputShape[0];
  const hiddenDim = pattern.biases.length - outputDim;

  // Input to hidden
  const hidden: number[] = [];
  for (let j = 0; j < hiddenDim; j++) {
    let sum = pattern.biases[j];
    for (let i = 0; i < Math.min(input.length, inputDim); i++) {
      if (pattern.weights[i] && pattern.weights[i][j] !== undefined) {
        sum += input[i] * pattern.weights[i][j];
      }
    }
    hidden.push(relu(sum));
  }

  // Hidden to output
  const output: number[] = [];
  for (let j = 0; j < outputDim; j++) {
    let sum = pattern.biases[hiddenDim + j];
    for (let i = 0; i < hiddenDim; i++) {
      const weightIdx = inputDim + i;
      if (pattern.weights[weightIdx] && pattern.weights[weightIdx][j] !== undefined) {
        sum += hidden[i] * pattern.weights[weightIdx][j];
      }
    }
    output.push(sigmoid(sum));
  }

  return output;
}

/**
 * ReLU activation function
 */
function relu(x: number): number {
  return Math.max(0, x);
}

/**
 * Sigmoid activation function
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

/**
 * Records semantic analysis pattern
 */
export async function recordSemanticPattern(
  embedding: SemanticEmbedding,
  executionTime: number,
  sessionId?: string
): Promise<NeuralPattern> {
  return recordTrajectory({
    skillType: 'semantic-analyzer',
    input: {
      cluster: embedding.cluster,
      confidence: embedding.confidence
    },
    output: {
      success: embedding.confidence > 0.3,
      executionTime,
      accuracy: embedding.confidence
    },
    context: {
      sessionId,
      timestamp: new Date()
    }
  });
}

/**
 * Records drift detection pattern
 */
export async function recordDriftPattern(
  driftResult: DriftResult,
  executionTime: number,
  sessionId?: string
): Promise<NeuralPattern> {
  return recordTrajectory({
    skillType: 'drift-detector',
    input: {
      alignmentScore: driftResult.alignmentScore,
      driftDetected: driftResult.driftAlert,
      confidence: driftResult.highPrecision ? 0.9 : 0.5
    },
    output: {
      success: driftResult.highPrecision,
      executionTime,
      accuracy: driftResult.alignmentScore
    },
    context: {
      sessionId,
      timestamp: new Date()
    }
  });
}

/**
 * Gets all trained patterns with statistics
 */
export async function getPatternStats(): Promise<{
  totalPatterns: number;
  totalTrainingEpochs: number;
  averageAccuracy: number;
  averageSuccessRate: number;
  patterns: Array<{
    name: string;
    type: PatternType;
    epochs: number;
    accuracy: number;
    successRate: number;
  }>;
}> {
  const database = getDB();
  const result = await database.list<NeuralPattern>('neuralPatterns');

  const patterns = result.documents;

  if (patterns.length === 0) {
    return {
      totalPatterns: 0,
      totalTrainingEpochs: 0,
      averageAccuracy: 0,
      averageSuccessRate: 0,
      patterns: []
    };
  }

  const totalTrainingEpochs = patterns.reduce((sum, p) => sum + p.trainingEpochs, 0);
  const averageAccuracy = patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length;
  const averageSuccessRate = patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length;

  return {
    totalPatterns: patterns.length,
    totalTrainingEpochs,
    averageAccuracy,
    averageSuccessRate,
    patterns: patterns.map(p => ({
      name: p.name,
      type: p.patternType,
      epochs: p.trainingEpochs,
      accuracy: p.accuracy,
      successRate: p.successRate
    }))
  };
}

/**
 * Predicts execution outcome using trained pattern
 */
export async function predictOutcome(
  skillType: string,
  input: {
    cluster?: ClusterType;
    confidence?: number;
    alignmentScore?: number;
    driftDetected?: boolean;
  }
): Promise<{
  successProbability: number;
  estimatedTime: number;
  predictedAccuracy: number;
  driftRisk: number;
} | null> {
  const database = getDB();
  const patternType = determinePatternType(skillType);
  const patternId = `pattern_${skillType}_${patternType}`;

  const pattern = await database.load<NeuralPattern>('neuralPatterns', patternId);

  if (!pattern || pattern.trainingEpochs < 5) {
    return null; // Not enough training data
  }

  const features = extractFeatures({
    skillType,
    input,
    output: { success: true, executionTime: 0 },
    context: { timestamp: new Date() }
  });

  const prediction = forwardPass(pattern, features);

  return {
    successProbability: prediction[0],
    estimatedTime: prediction[1] * 10000, // Denormalize
    predictedAccuracy: prediction[2],
    driftRisk: prediction[3]
  };
}
