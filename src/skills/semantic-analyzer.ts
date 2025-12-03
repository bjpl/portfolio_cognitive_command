/**
 * Semantic Analyzer Skill
 * Generates semantic embeddings using Ruvector-style clustering
 * Optionally uses OpenAI API when available, falls back to keyword-based approach
 */

import OpenAI from 'openai';

export type ClusterType = 'Experience' | 'Core Systems' | 'Infra';

export interface SemanticEmbedding {
  vector: number[];
  cluster: ClusterType;
  confidence: number;
}

// Initialize OpenAI client if API key is available
let openaiClient: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Generates semantic embedding from commit messages and file paths
 * Uses OpenAI API if available, falls back to keyword-based clustering
 * @param commitMessages - Array of commit messages
 * @param filePaths - Array of file paths from commits
 * @returns Semantic embedding with cluster assignment
 */
export async function generateEmbedding(
  commitMessages: string[],
  filePaths: string[]
): Promise<SemanticEmbedding> {
  // Combine all text for analysis
  const allText = [...commitMessages, ...filePaths].join(' ').toLowerCase();

  // Calculate cluster scores
  const clusterScores = {
    'Experience': calculateExperienceScore(allText, filePaths),
    'Core Systems': calculateCoreSystemsScore(allText, filePaths),
    'Infra': calculateInfraScore(allText, filePaths)
  };

  // Determine primary cluster
  const cluster = Object.entries(clusterScores).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0] as ClusterType;

  // Generate embedding vector (try OpenAI first, fallback to keyword-based)
  const vector = await generateVector(allText, filePaths, cluster);

  // Calculate confidence (normalized max score)
  const maxScore = Math.max(...Object.values(clusterScores));
  const totalScore = Object.values(clusterScores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;

  return {
    vector,
    cluster,
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Calculates Experience cluster score
 * Focuses on frontend, UI, portfolio, user-facing work
 */
function calculateExperienceScore(text: string, paths: string[]): number {
  const keywords = [
    'ui', 'ux', 'frontend', 'react', 'vue', 'angular', 'component',
    'portfolio', 'website', 'landing', 'page', 'design', 'style',
    'css', 'html', 'responsive', 'mobile', 'user', 'interface',
    'experience', 'visual', 'interactive', 'animation'
  ];

  const pathPatterns = [
    /^src\/(components|pages|views|ui)/i,
    /^frontend/i,
    /\.(jsx?|tsx?|vue|svelte)$/i,
    /\.(css|scss|sass|less)$/i,
    /^public/i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates Core Systems cluster score
 * Focuses on backend, APIs, business logic, databases
 */
function calculateCoreSystemsScore(text: string, paths: string[]): number {
  const keywords = [
    'api', 'backend', 'server', 'endpoint', 'route', 'controller',
    'service', 'business', 'logic', 'database', 'model', 'schema',
    'query', 'transaction', 'auth', 'middleware', 'validation',
    'core', 'system', 'engine', 'processor', 'handler'
  ];

  const pathPatterns = [
    /^src\/(api|services|controllers|models|core)/i,
    /^backend/i,
    /^server/i,
    /\.(service|controller|repository|dao)\.ts$/i,
    /^src\/lib/i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates Infra cluster score
 * Focuses on DevOps, deployment, CI/CD, monitoring
 */
function calculateInfraScore(text: string, paths: string[]): number {
  const keywords = [
    'deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline',
    'build', 'test', 'infra', 'infrastructure', 'config',
    'environment', 'monitoring', 'logging', 'metrics', 'devops',
    'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab'
  ];

  const pathPatterns = [
    /^\.github\/workflows/i,
    /^\.gitlab-ci/i,
    /^docker/i,
    /^k8s/i,
    /^terraform/i,
    /^scripts/i,
    /^\.ci/i,
    /\.(yml|yaml|dockerfile)$/i,
    /^infrastructure/i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates weighted score based on keywords and path patterns
 */
function calculateScore(
  text: string,
  paths: string[],
  keywords: string[],
  pathPatterns: RegExp[]
): number {
  let score = 0;

  // Keyword matching (weight: 1.0 per match)
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  // Path pattern matching (weight: 3.0 per match - paths are strong signals)
  for (const path of paths) {
    for (const pattern of pathPatterns) {
      if (pattern.test(path)) {
        score += 3.0;
        break; // Only count once per path
      }
    }
  }

  return score;
}

/**
 * Generates embedding vector
 * Uses OpenAI API if available, falls back to keyword-based approach
 */
async function generateVector(
  text: string,
  paths: string[],
  cluster: ClusterType
): Promise<number[]> {
  // Try OpenAI API first if available
  if (openaiClient) {
    try {
      const combinedText = `${text} ${paths.join(' ')}`.substring(0, 8000);
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: combinedText,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn('[SemanticAnalyzer] OpenAI API failed, using fallback:', error);
    }
  }

  // Fallback: keyword-based vector generation
  return generateKeywordVector(text, paths, cluster);
}

/**
 * Generates a 1536-dimensional embedding vector using keyword distribution
 * Fallback when OpenAI API is unavailable
 */
function generateKeywordVector(
  text: string,
  paths: string[],
  cluster: ClusterType
): number[] {
  const dimensions = 1536; // Match OpenAI embedding dimension
  const vector: number[] = new Array(dimensions).fill(0);

  // Hash text into vector dimensions
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.length > 0) {
      const hash = simpleHash(word);
      const primaryIndex = Math.abs(hash) % dimensions;
      const secondaryIndex = Math.abs(hash >> 8) % dimensions;

      vector[primaryIndex] += 1.0;
      vector[secondaryIndex] += 0.5;
    }
  }

  // Hash file paths into vector (stronger signal)
  for (const path of paths) {
    const hash = simpleHash(path);
    const primaryIndex = Math.abs(hash) % dimensions;
    const secondaryIndex = Math.abs(hash >> 8) % dimensions;

    vector[primaryIndex] += 2.0;
    vector[secondaryIndex] += 1.0;
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  // Add cluster-specific bias to certain dimensions
  const clusterBias = getClusterBias(cluster);
  for (let i = 0; i < 10; i++) {
    vector[i] = (vector[i] * 0.7) + (clusterBias[i] * 0.3);
  }

  return vector;
}

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Returns cluster-specific bias vector for first 10 dimensions
 */
function getClusterBias(cluster: ClusterType): number[] {
  const biases = {
    'Experience': [0.8, 0.2, 0.1, 0.7, 0.3, 0.1, 0.5, 0.4, 0.2, 0.6],
    'Core Systems': [0.2, 0.8, 0.7, 0.1, 0.6, 0.5, 0.3, 0.7, 0.4, 0.2],
    'Infra': [0.1, 0.3, 0.8, 0.2, 0.4, 0.7, 0.6, 0.2, 0.8, 0.5]
  };

  return biases[cluster];
}

/**
 * Calculates cosine similarity between two vectors
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Similarity score between -1 and 1
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
