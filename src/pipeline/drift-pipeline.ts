/**
 * Drift Detection Pipeline
 * Portfolio Cognitive Command v8.0
 *
 * Purpose: Calculate semantic alignment between Intent (AgentDB) and Implementation (Git)
 *
 * Input: Intent Vector (from AgentDB) + Implementation Vector (from Git Embedding)
 * Output: Drift Score with alert classification
 *
 * Scoring:
 * - Score < 0.5: drift_alert = true (Agent hallucinating or distracted)
 * - Score > 0.8: high_precision = true (Perfect alignment)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface IntentContext {
  sessionId: string;
  timestamp: string;
  userPrompt: string;
  reasoningSummary: string;
  intentVector?: number[];
  extractedIntent: string;
  intentCategory: string;
  source: 'agent_swarm' | 'manual_override';
}

interface ImplementationContext {
  commitHash: string;
  timestamp: string;
  message: string;
  filesChanged: string[];
  cluster: string;
  embedding?: number[];
  topKeywords: string[];
}

interface DriftAnalysisResult {
  commitHash: string;
  sessionId?: string;
  alignmentScore: number;
  driftAlert: boolean;
  highPrecision: boolean;
  driftCategory: 'critical' | 'moderate' | 'low' | 'aligned' | 'perfect';
  analysis: {
    cosineSimilarity: number;
    intentMatch: number;
    keywordOverlap: number;
    clusterConsistency: number;
  };
  recommendations: string[];
  metadata: {
    intentTimestamp?: string;
    implementationTimestamp: string;
    timeDelta?: number; // seconds
    source?: 'agent_swarm' | 'manual_override';
  };
}

interface DriftConfig {
  thresholds: {
    driftAlert: number;       // < 0.5
    highPrecision: number;    // > 0.8
    moderate: number;         // 0.5 - 0.65
    low: number;              // 0.65 - 0.8
  };
  weights: {
    cosineSimilarity: number;
    intentMatch: number;
    keywordOverlap: number;
    clusterConsistency: number;
  };
  recommendations: {
    [key: string]: string[];
  };
}

// ============================================================================
// DRIFT DETECTION PIPELINE CLASS
// ============================================================================

export class DriftPipeline {
  private config: DriftConfig;

  constructor() {
    this.config = this.loadDefaultConfig();
  }

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  /**
   * Analyze drift between intent and implementation
   */
  public async analyzeDrift(
    intent: IntentContext,
    implementation: ImplementationContext
  ): Promise<DriftAnalysisResult> {
    // 1. Calculate cosine similarity if vectors are available
    const cosineSimilarity = this.calculateCosineSimilarity(
      intent.intentVector,
      implementation.embedding
    );

    // 2. Calculate intent matching score
    const intentMatch = this.calculateIntentMatch(intent, implementation);

    // 3. Calculate keyword overlap
    const keywordOverlap = this.calculateKeywordOverlap(intent, implementation);

    // 4. Calculate cluster consistency
    const clusterConsistency = this.calculateClusterConsistency(intent, implementation);

    // 5. Compute weighted alignment score
    const alignmentScore = this.computeAlignmentScore({
      cosineSimilarity,
      intentMatch,
      keywordOverlap,
      clusterConsistency,
    });

    // 6. Classify drift
    const { driftAlert, highPrecision, driftCategory } = this.classifyDrift(alignmentScore);

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(driftCategory, {
      cosineSimilarity,
      intentMatch,
      keywordOverlap,
      clusterConsistency,
    });

    // 8. Calculate time delta
    const timeDelta = this.calculateTimeDelta(intent.timestamp, implementation.timestamp);

    // 9. Construct result
    const result: DriftAnalysisResult = {
      commitHash: implementation.commitHash,
      sessionId: intent.sessionId,
      alignmentScore,
      driftAlert,
      highPrecision,
      driftCategory,
      analysis: {
        cosineSimilarity,
        intentMatch,
        keywordOverlap,
        clusterConsistency,
      },
      recommendations,
      metadata: {
        intentTimestamp: intent.timestamp,
        implementationTimestamp: implementation.timestamp,
        timeDelta,
        source: intent.source,
      },
    };

    return result;
  }

  /**
   * Analyze drift for implementation without matched intent (manual override)
   */
  public async analyzeManualCommit(
    implementation: ImplementationContext
  ): Promise<DriftAnalysisResult> {
    // For manual commits, we can't calculate alignment
    // Return a baseline result
    const result: DriftAnalysisResult = {
      commitHash: implementation.commitHash,
      alignmentScore: 0, // No alignment data available
      driftAlert: false,
      highPrecision: false,
      driftCategory: 'aligned', // Assume manual work is intentional
      analysis: {
        cosineSimilarity: 0,
        intentMatch: 0,
        keywordOverlap: 0,
        clusterConsistency: 1, // Assume consistency
      },
      recommendations: [
        'Manual commit detected - no agent session found',
        'Consider documenting intent in commit message',
      ],
      metadata: {
        implementationTimestamp: implementation.timestamp,
        source: 'manual_override',
      },
    };

    return result;
  }

  /**
   * Process batch of intent-implementation pairs
   */
  public async analyzeBatch(
    pairs: Array<{ intent?: IntentContext; implementation: ImplementationContext }>
  ): Promise<DriftAnalysisResult[]> {
    const results: DriftAnalysisResult[] = [];

    for (const pair of pairs) {
      try {
        let result: DriftAnalysisResult;

        if (pair.intent) {
          result = await this.analyzeDrift(pair.intent, pair.implementation);
        } else {
          result = await this.analyzeManualCommit(pair.implementation);
        }

        results.push(result);
      } catch (error) {
        console.error(`Error analyzing drift for commit ${pair.implementation.commitHash}:`, error);
        // Continue processing other pairs
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Similarity Calculations
  // --------------------------------------------------------------------------

  private calculateCosineSimilarity(vectorA?: number[], vectorB?: number[]): number {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  private calculateIntentMatch(intent: IntentContext, implementation: ImplementationContext): number {
    // Compare extracted intent with commit message and implementation
    const intentText = intent.extractedIntent.toLowerCase();
    const commitText = implementation.message.toLowerCase();

    // Simple word overlap calculation
    const intentWords = new Set(intentText.split(/\s+/));
    const commitWords = new Set(commitText.split(/\s+/));

    let overlap = 0;
    for (const word of intentWords) {
      if (commitWords.has(word)) {
        overlap++;
      }
    }

    const maxWords = Math.max(intentWords.size, commitWords.size);
    return maxWords > 0 ? overlap / maxWords : 0;
  }

  private calculateKeywordOverlap(intent: IntentContext, implementation: ImplementationContext): number {
    // Extract keywords from intent reasoning
    const intentKeywords = this.extractKeywords(
      intent.userPrompt + ' ' + intent.reasoningSummary
    );

    const implKeywords = new Set(implementation.topKeywords);

    let overlap = 0;
    for (const keyword of intentKeywords) {
      if (implKeywords.has(keyword)) {
        overlap++;
      }
    }

    return intentKeywords.length > 0 ? overlap / intentKeywords.length : 0;
  }

  private calculateClusterConsistency(intent: IntentContext, implementation: ImplementationContext): number {
    // Infer expected cluster from intent category
    const expectedCluster = this.inferClusterFromIntent(intent.intentCategory);

    if (expectedCluster === implementation.cluster) {
      return 1.0;
    }

    // Partial credit for related clusters
    if (this.areClustersRelated(expectedCluster, implementation.cluster)) {
      return 0.5;
    }

    return 0;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Scoring & Classification
  // --------------------------------------------------------------------------

  private computeAlignmentScore(components: {
    cosineSimilarity: number;
    intentMatch: number;
    keywordOverlap: number;
    clusterConsistency: number;
  }): number {
    const { cosineSimilarity, intentMatch, keywordOverlap, clusterConsistency } = components;
    const weights = this.config.weights;

    const totalWeight =
      weights.cosineSimilarity +
      weights.intentMatch +
      weights.keywordOverlap +
      weights.clusterConsistency;

    const weightedScore =
      (cosineSimilarity * weights.cosineSimilarity +
       intentMatch * weights.intentMatch +
       keywordOverlap * weights.keywordOverlap +
       clusterConsistency * weights.clusterConsistency) / totalWeight;

    return Math.max(0, Math.min(1, weightedScore)); // Clamp to [0, 1]
  }

  private classifyDrift(alignmentScore: number): {
    driftAlert: boolean;
    highPrecision: boolean;
    driftCategory: 'critical' | 'moderate' | 'low' | 'aligned' | 'perfect';
  } {
    const { driftAlert: driftThreshold, highPrecision: precisionThreshold, moderate, low } = this.config.thresholds;

    let driftCategory: 'critical' | 'moderate' | 'low' | 'aligned' | 'perfect';

    if (alignmentScore < driftThreshold) {
      driftCategory = 'critical';
    } else if (alignmentScore < moderate) {
      driftCategory = 'moderate';
    } else if (alignmentScore < low) {
      driftCategory = 'low';
    } else if (alignmentScore < precisionThreshold) {
      driftCategory = 'aligned';
    } else {
      driftCategory = 'perfect';
    }

    return {
      driftAlert: alignmentScore < driftThreshold,
      highPrecision: alignmentScore > precisionThreshold,
      driftCategory,
    };
  }

  private generateRecommendations(
    driftCategory: string,
    analysis: {
      cosineSimilarity: number;
      intentMatch: number;
      keywordOverlap: number;
      clusterConsistency: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    // Category-specific recommendations
    if (this.config.recommendations[driftCategory]) {
      recommendations.push(...this.config.recommendations[driftCategory]);
    }

    // Component-specific recommendations
    if (analysis.intentMatch < 0.3) {
      recommendations.push('Low intent match - verify commit message aligns with agent task');
    }

    if (analysis.keywordOverlap < 0.3) {
      recommendations.push('Low keyword overlap - check if implementation matches planned approach');
    }

    if (analysis.clusterConsistency < 0.5) {
      recommendations.push('Cluster mismatch - verify files changed align with intended domain');
    }

    return recommendations;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Utilities
  // --------------------------------------------------------------------------

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const filtered = words.filter(word => word.length > 3);
    return Array.from(new Set(filtered)).slice(0, 10);
  }

  private inferClusterFromIntent(intentCategory: string): string {
    const categoryMapping: { [key: string]: string } = {
      feature: 'coreSystems',
      bugfix: 'coreSystems',
      refactor: 'coreSystems',
      optimization: 'coreSystems',
      maintenance: 'infrastructure',
      documentation: 'experience',
      testing: 'coreSystems',
      ui: 'experience',
      frontend: 'experience',
      backend: 'coreSystems',
      devops: 'infrastructure',
    };

    return categoryMapping[intentCategory.toLowerCase()] || 'coreSystems';
  }

  private areClustersRelated(clusterA: string, clusterB: string): boolean {
    // Define related cluster pairs
    const relatedPairs: { [key: string]: string[] } = {
      experience: ['coreSystems'],
      coreSystems: ['experience', 'infrastructure'],
      infrastructure: ['coreSystems'],
    };

    return relatedPairs[clusterA]?.includes(clusterB) || false;
  }

  private calculateTimeDelta(timestampA: string, timestampB: string): number {
    const dateA = new Date(timestampA);
    const dateB = new Date(timestampB);
    return Math.abs(dateB.getTime() - dateA.getTime()) / 1000; // Convert to seconds
  }

  private loadDefaultConfig(): DriftConfig {
    return {
      thresholds: {
        driftAlert: 0.5,
        highPrecision: 0.8,
        moderate: 0.65,
        low: 0.8,
      },
      weights: {
        cosineSimilarity: 0.4,
        intentMatch: 0.3,
        keywordOverlap: 0.2,
        clusterConsistency: 0.1,
      },
      recommendations: {
        critical: [
          'CRITICAL: Significant drift detected between intent and implementation',
          'Review agent reasoning chain and commit changes for inconsistencies',
          'Consider rolling back and re-executing with clearer instructions',
        ],
        moderate: [
          'Moderate drift detected - implementation partially aligns with intent',
          'Verify all requirements from original task are addressed',
          'Consider adding clarifying comments or documentation',
        ],
        low: [
          'Minor drift detected - implementation mostly aligns with intent',
          'Review edge cases and ensure full coverage',
        ],
        aligned: [
          'Good alignment between intent and implementation',
          'Standard review and testing recommended',
        ],
        perfect: [
          'Excellent alignment - intent perfectly matches implementation',
          'Minimal review required',
        ],
      },
    };
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  public async saveMetrics(results: DriftAnalysisResult[], outputPath: string): Promise<void> {
    const metrics = {
      timestamp: new Date().toISOString(),
      totalAnalyzed: results.length,
      driftAlerts: results.filter(r => r.driftAlert).length,
      highPrecision: results.filter(r => r.highPrecision).length,
      averageAlignment: results.reduce((sum, r) => sum + r.alignmentScore, 0) / results.length,
      categoryCounts: {
        critical: results.filter(r => r.driftCategory === 'critical').length,
        moderate: results.filter(r => r.driftCategory === 'moderate').length,
        low: results.filter(r => r.driftCategory === 'low').length,
        aligned: results.filter(r => r.driftCategory === 'aligned').length,
        perfect: results.filter(r => r.driftCategory === 'perfect').length,
      },
      results,
    };

    const metricsDir = path.dirname(outputPath);
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    console.log('[DriftPipeline] Metrics saved to:', outputPath);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { IntentContext, ImplementationContext, DriftAnalysisResult, DriftConfig };
