/**
 * Drift Detector Skill
 * Detects alignment drift between intent and implementation
 */

import { generateEmbedding, cosineSimilarity } from './semantic-analyzer';

export interface DriftResult {
  alignmentScore: number;
  driftAlert: boolean;
  highPrecision: boolean;
  intentVector: number[];
  implementationVector: number[];
}

/**
 * Detects drift between stated intent and actual implementation
 * @param intent - Original intent or plan (commit messages, requirements)
 * @param implementation - Actual implementation (code changes, files)
 * @returns Drift analysis result
 */
export async function detectDrift(
  intent: string,
  implementation: string
): Promise<DriftResult> {
  // Parse intent and implementation into components
  const intentParts = parseText(intent);
  const implParts = parseText(implementation);

  // Generate semantic embeddings
  const intentEmbedding = await generateEmbedding(
    intentParts.messages,
    intentParts.paths
  );

  const implEmbedding = await generateEmbedding(
    implParts.messages,
    implParts.paths
  );

  // Calculate alignment score using cosine similarity
  const alignmentScore = cosineSimilarity(
    intentEmbedding.vector,
    implEmbedding.vector
  );

  // Determine if there's drift (threshold: 0.7)
  const driftAlert = alignmentScore < 0.7;

  // High precision if both embeddings have high confidence
  const highPrecision =
    intentEmbedding.confidence > 0.6 &&
    implEmbedding.confidence > 0.6;

  return {
    alignmentScore: Math.max(0, Math.min(1, alignmentScore)), // Clamp to [0, 1]
    driftAlert,
    highPrecision,
    intentVector: intentEmbedding.vector,
    implementationVector: implEmbedding.vector
  };
}

/**
 * Parses text into commit messages and file paths
 */
function parseText(text: string): { messages: string[]; paths: string[] } {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const messages: string[] = [];
  const paths: string[] = [];

  for (const line of lines) {
    // Detect file paths (contain / or \ and file extensions)
    if (line.match(/[\/\\]/) || line.match(/\.\w{1,4}$/)) {
      paths.push(line.trim());
    } else {
      // Treat as commit message or description
      messages.push(line.trim());
    }
  }

  // If no clear separation, treat first line as message, rest as context
  if (messages.length === 0 && lines.length > 0) {
    messages.push(lines[0]);
  }

  return { messages, paths };
}

/**
 * Performs continuous drift monitoring over time
 * @param intentHistory - Array of historical intents
 * @param implementationHistory - Array of historical implementations
 * @returns Drift trend analysis
 */
export async function monitorDriftTrend(
  intentHistory: string[],
  implementationHistory: string[]
): Promise<{
  trend: 'improving' | 'stable' | 'degrading';
  recentScores: number[];
  averageScore: number;
}> {
  const scores: number[] = [];

  // Calculate drift for each intent-implementation pair
  const pairCount = Math.min(intentHistory.length, implementationHistory.length);
  for (let i = 0; i < pairCount; i++) {
    const result = await detectDrift(intentHistory[i], implementationHistory[i]);
    scores.push(result.alignmentScore);
  }

  if (scores.length === 0) {
    return {
      trend: 'stable',
      recentScores: [],
      averageScore: 0
    };
  }

  // Calculate average
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Determine trend (compare first half vs second half)
  let trend: 'improving' | 'stable' | 'degrading' = 'stable';
  if (scores.length >= 4) {
    const midpoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, midpoint);
    const secondHalf = scores.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    if (difference > 0.1) {
      trend = 'improving';
    } else if (difference < -0.1) {
      trend = 'degrading';
    }
  }

  return {
    trend,
    recentScores: scores.slice(-5), // Last 5 scores
    averageScore
  };
}

/**
 * Identifies specific areas of drift
 * @param driftResult - Result from detectDrift
 * @returns Detailed breakdown of drift areas
 */
export function analyzeDriftAreas(driftResult: DriftResult): {
  clustersMatch: boolean;
  vectorDivergence: number;
  recommendations: string[];
} {
  const { intentVector, implementationVector, alignmentScore } = driftResult;

  // Calculate per-dimension divergence
  const divergences: number[] = [];
  for (let i = 0; i < intentVector.length; i++) {
    divergences.push(Math.abs(intentVector[i] - implementationVector[i]));
  }

  // Find top divergent dimensions
  const sortedIndices = divergences
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 10)
    .map(x => x.idx);

  const vectorDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;

  // Generate recommendations
  const recommendations: string[] = [];

  if (alignmentScore < 0.5) {
    recommendations.push('CRITICAL: Major drift detected. Review implementation against original intent.');
  } else if (alignmentScore < 0.7) {
    recommendations.push('WARNING: Moderate drift detected. Consider realignment.');
  }

  if (vectorDivergence > 0.3) {
    recommendations.push('Semantic vectors show significant divergence in key areas.');
  }

  if (!driftResult.highPrecision) {
    recommendations.push('Low confidence in drift analysis. Provide more detailed intent/implementation data.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Implementation aligns well with stated intent.');
  }

  return {
    clustersMatch: alignmentScore > 0.7,
    vectorDivergence,
    recommendations
  };
}

/**
 * Generates a drift report for documentation
 * @param driftResult - Result from detectDrift
 * @returns Formatted report string
 */
export function generateDriftReport(driftResult: DriftResult): string {
  const analysis = analyzeDriftAreas(driftResult);

  const report = [
    '=== DRIFT ANALYSIS REPORT ===',
    '',
    `Alignment Score: ${(driftResult.alignmentScore * 100).toFixed(1)}%`,
    `Drift Alert: ${driftResult.driftAlert ? 'YES' : 'NO'}`,
    `High Precision: ${driftResult.highPrecision ? 'YES' : 'NO'}`,
    `Vector Divergence: ${(analysis.vectorDivergence * 100).toFixed(1)}%`,
    '',
    '--- Recommendations ---',
    ...analysis.recommendations.map(r => `• ${r}`),
    '',
    '=== END REPORT ==='
  ];

  return report.join('\n');
}
