/**
 * Drift Detector Skill
 * Detects alignment drift between intent and implementation
 * with AI-powered root cause analysis
 */

import { generateEmbedding, cosineSimilarity } from './semantic-analyzer';
import Anthropic from '@anthropic-ai/sdk';

export interface DriftResult {
  alignmentScore: number;
  driftAlert: boolean;
  highPrecision: boolean;
  intentVector: number[];
  implementationVector: number[];
}

/**
 * Drift root cause categories
 */
export type DriftCategory =
  | 'scope_creep'       // Feature expansion beyond original intent
  | 'tech_pivot'        // Technology stack change mid-project
  | 'requirements_shift' // External requirements changed
  | 'maintenance_drift' // Gradual decay from bug fixes/patches
  | 'abandoned_direction' // Started feature never completed
  | 'refactoring_divergence' // Code structure changed without intent update
  | 'unknown';

/**
 * Severity levels for drift
 */
export type DriftSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * AI-powered drift root cause analysis
 */
export interface DriftAnalysis {
  rootCause: string;
  category: DriftCategory;
  severity: DriftSeverity;
  confidence: number;
  suggestedActions: string[];
  technicalDebt: {
    estimated: 'high' | 'medium' | 'low';
    areas: string[];
  };
  realignmentStrategy: string;
  analysisTimestamp: string;
}

/**
 * Cache for drift analysis to avoid repeated API calls
 */
const driftAnalysisCache = new Map<string, { analysis: DriftAnalysis; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    if (line.match(/[/\\]/) || line.match(/\.\w{1,4}$/)) {
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

/**
 * Analyzes drift root cause using Claude API
 * Only called when driftAlert === true to optimize API costs
 * @param projectName - Name of the project
 * @param intent - Original intent/requirements
 * @param implementation - Actual implementation details
 * @param driftResult - Existing drift detection result
 * @returns AI-powered drift analysis or null if API unavailable
 */
export async function analyzeDriftRootCause(
  projectName: string,
  intent: string,
  implementation: string,
  driftResult: DriftResult
): Promise<DriftAnalysis | null> {
  // Only analyze if drift is detected (cost optimization)
  if (!driftResult.driftAlert) {
    return null;
  }

  // Check cache first
  const cacheKey = `${projectName}:${driftResult.alignmentScore.toFixed(2)}`;
  const cached = driftAnalysisCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.analysis;
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[drift-detector] ANTHROPIC_API_KEY not set, skipping AI analysis');
    return createFallbackAnalysis(driftResult);
  }

  try {
    const client = new Anthropic({ apiKey });

    const prompt = buildDriftAnalysisPrompt(projectName, intent, implementation, driftResult);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content
    const textBlock = response.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return createFallbackAnalysis(driftResult);
    }

    // Parse JSON response
    const analysis = parseDriftAnalysisResponse(textBlock.text, driftResult);

    // Cache the result
    driftAnalysisCache.set(cacheKey, {
      analysis,
      expiry: Date.now() + CACHE_TTL_MS
    });

    return analysis;
  } catch (error) {
    console.error('[drift-detector] Claude API error:', error);
    return createFallbackAnalysis(driftResult);
  }
}

/**
 * Builds the Claude prompt for drift root cause analysis
 */
function buildDriftAnalysisPrompt(
  projectName: string,
  intent: string,
  implementation: string,
  driftResult: DriftResult
): string {
  return `You are a technical debt analyst specializing in software project drift detection.

Analyze the drift between stated intent and actual implementation for project "${projectName}".

## Alignment Metrics
- Alignment Score: ${(driftResult.alignmentScore * 100).toFixed(1)}%
- High Precision Analysis: ${driftResult.highPrecision ? 'Yes' : 'No'}

## Original Intent/Requirements
${intent.substring(0, 2000)}

## Actual Implementation
${implementation.substring(0, 2000)}

## Task
Identify the root cause of drift and provide actionable recommendations.

Respond ONLY with valid JSON in this exact format:
{
  "rootCause": "Brief 1-2 sentence explanation of why drift occurred",
  "category": "scope_creep|tech_pivot|requirements_shift|maintenance_drift|abandoned_direction|refactoring_divergence|unknown",
  "severity": "critical|high|medium|low",
  "confidence": 0.0-1.0,
  "suggestedActions": ["action1", "action2", "action3"],
  "technicalDebt": {
    "estimated": "high|medium|low",
    "areas": ["area1", "area2"]
  },
  "realignmentStrategy": "Specific strategy to bring implementation back in alignment with intent"
}

Choose category based on:
- scope_creep: Features added beyond original scope
- tech_pivot: Technology stack changed significantly
- requirements_shift: External requirements changed
- maintenance_drift: Gradual decay from patches/fixes
- abandoned_direction: Started feature never completed
- refactoring_divergence: Code restructured without updating intent
- unknown: Cannot determine root cause`;
}

/**
 * Parses Claude's response into DriftAnalysis
 */
function parseDriftAnalysisResponse(
  response: string,
  driftResult: DriftResult
): DriftAnalysis {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and sanitize response
    const validCategories: DriftCategory[] = [
      'scope_creep', 'tech_pivot', 'requirements_shift',
      'maintenance_drift', 'abandoned_direction', 'refactoring_divergence', 'unknown'
    ];
    const validSeverities: DriftSeverity[] = ['critical', 'high', 'medium', 'low'];
    const validDebtLevels = ['high', 'medium', 'low'];

    return {
      rootCause: String(parsed.rootCause || 'Unable to determine root cause'),
      category: validCategories.includes(parsed.category) ? parsed.category : 'unknown',
      severity: validSeverities.includes(parsed.severity)
        ? parsed.severity
        : driftResult.alignmentScore < 0.5 ? 'critical' : 'high',
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      suggestedActions: Array.isArray(parsed.suggestedActions)
        ? parsed.suggestedActions.slice(0, 5).map(String)
        : ['Review implementation against original requirements'],
      technicalDebt: {
        estimated: validDebtLevels.includes(parsed.technicalDebt?.estimated)
          ? parsed.technicalDebt.estimated
          : 'medium',
        areas: Array.isArray(parsed.technicalDebt?.areas)
          ? parsed.technicalDebt.areas.slice(0, 5).map(String)
          : ['Unknown']
      },
      realignmentStrategy: String(parsed.realignmentStrategy || 'Conduct thorough code review'),
      analysisTimestamp: new Date().toISOString()
    };
  } catch {
    return createFallbackAnalysis(driftResult);
  }
}

/**
 * Creates fallback analysis when AI is unavailable
 */
function createFallbackAnalysis(driftResult: DriftResult): DriftAnalysis {
  const severity: DriftSeverity = driftResult.alignmentScore < 0.3 ? 'critical'
    : driftResult.alignmentScore < 0.5 ? 'high'
    : driftResult.alignmentScore < 0.7 ? 'medium'
    : 'low';

  return {
    rootCause: 'Automated analysis unavailable. Manual review recommended.',
    category: 'unknown',
    severity,
    confidence: 0.3,
    suggestedActions: [
      'Compare current implementation with original requirements',
      'Review recent commit history for scope changes',
      'Document any intentional pivots'
    ],
    technicalDebt: {
      estimated: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
      areas: ['Implementation-intent alignment']
    },
    realignmentStrategy: 'Manual code review and requirements reconciliation needed',
    analysisTimestamp: new Date().toISOString()
  };
}

/**
 * Generates enhanced drift report with AI analysis
 * @param driftResult - Result from detectDrift
 * @param aiAnalysis - Optional AI-powered analysis
 * @returns Enhanced formatted report string
 */
export function generateEnhancedDriftReport(
  driftResult: DriftResult,
  aiAnalysis?: DriftAnalysis | null
): string {
  const basicAnalysis = analyzeDriftAreas(driftResult);

  const report = [
    '=== ENHANCED DRIFT ANALYSIS REPORT ===',
    '',
    `Alignment Score: ${(driftResult.alignmentScore * 100).toFixed(1)}%`,
    `Drift Alert: ${driftResult.driftAlert ? 'YES' : 'NO'}`,
    `High Precision: ${driftResult.highPrecision ? 'YES' : 'NO'}`,
    `Vector Divergence: ${(basicAnalysis.vectorDivergence * 100).toFixed(1)}%`,
    ''
  ];

  if (aiAnalysis) {
    report.push(
      '--- AI Root Cause Analysis ---',
      `Category: ${formatCategory(aiAnalysis.category)}`,
      `Severity: ${aiAnalysis.severity.toUpperCase()}`,
      `Confidence: ${(aiAnalysis.confidence * 100).toFixed(0)}%`,
      '',
      `Root Cause: ${aiAnalysis.rootCause}`,
      '',
      'Suggested Actions:',
      ...aiAnalysis.suggestedActions.map((a, i) => `  ${i + 1}. ${a}`),
      '',
      `Technical Debt: ${aiAnalysis.technicalDebt.estimated.toUpperCase()}`,
      `  Areas: ${aiAnalysis.technicalDebt.areas.join(', ')}`,
      '',
      `Realignment Strategy: ${aiAnalysis.realignmentStrategy}`,
      ''
    );
  }

  report.push(
    '--- Basic Recommendations ---',
    ...basicAnalysis.recommendations.map(r => `• ${r}`),
    '',
    '=== END REPORT ==='
  );

  return report.join('\n');
}

/**
 * Formats drift category for display
 */
function formatCategory(category: DriftCategory): string {
  const labels: Record<DriftCategory, string> = {
    'scope_creep': 'Scope Creep',
    'tech_pivot': 'Technology Pivot',
    'requirements_shift': 'Requirements Shift',
    'maintenance_drift': 'Maintenance Drift',
    'abandoned_direction': 'Abandoned Direction',
    'refactoring_divergence': 'Refactoring Divergence',
    'unknown': 'Unknown'
  };
  return labels[category] || 'Unknown';
}

/**
 * Clears the drift analysis cache
 */
export function clearDriftAnalysisCache(): void {
  driftAnalysisCache.clear();
}
