/**
 * Semantic Analyzer Skill
 * Generates semantic embeddings using Claude API (Sonnet 4.5) as primary
 * Falls back to OpenAI embeddings, then keyword-based approach
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config';

// New 5-category taxonomy for better portfolio value representation
export type ClusterType =
  | 'Web Apps'        // Full-stack web applications with UI
  | 'AI & ML'         // AI-powered tools, LLMs, voice agents, media generation
  | 'Learning Tools'  // Educational apps, language learning, study tools
  | 'APIs & Services' // Backend services, data pipelines, integrations
  | 'Developer Tools'; // CLI tools, automation, DevOps, productivity

// Legacy cluster type for migration support
export type LegacyClusterType = 'Experience' | 'Core Systems' | 'Infra';

// Cluster colors for UI consistency
export const CLUSTER_COLORS: Record<ClusterType, string> = {
  'Web Apps': '#3b82f6',       // Blue
  'AI & ML': '#8b5cf6',        // Purple
  'Learning Tools': '#10b981', // Emerald
  'APIs & Services': '#f59e0b', // Amber
  'Developer Tools': '#6366f1'  // Indigo
};

// Cluster icons for UI
export const CLUSTER_ICONS: Record<ClusterType, string> = {
  'Web Apps': 'W',
  'AI & ML': 'AI',
  'Learning Tools': 'L',
  'APIs & Services': 'API',
  'Developer Tools': 'D'
};

export interface SemanticEmbedding {
  vector: number[];
  cluster: ClusterType;
  confidence: number;
}

// Initialize Claude client (primary)
let claudeClient: Anthropic | null = null;
if (config.anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
  claudeClient = new Anthropic({ apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY });
}

// Initialize OpenAI client (fallback)
let openaiClient: OpenAI | null = null;
if (config.openaiApiKey || process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY });
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

  // Calculate cluster scores using new 5-category taxonomy
  const clusterScores = {
    'Web Apps': calculateWebAppsScore(allText, filePaths),
    'AI & ML': calculateAIMLScore(allText, filePaths),
    'Learning Tools': calculateLearningToolsScore(allText, filePaths),
    'APIs & Services': calculateAPIsServicesScore(allText, filePaths),
    'Developer Tools': calculateDevToolsScore(allText, filePaths)
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
 * Calculates Web Apps cluster score
 * Full-stack web applications with significant UI component
 */
function calculateWebAppsScore(text: string, paths: string[]): number {
  const keywords = [
    'ui', 'ux', 'frontend', 'react', 'vue', 'angular', 'next', 'nuxt',
    'component', 'page', 'dashboard', 'layout', 'responsive', 'css',
    'tailwind', 'styled', 'form', 'button', 'modal', 'navigation',
    'sidebar', 'header', 'footer', 'webapp', 'website', 'fullstack',
    'client', 'browser', 'dom', 'hook', 'state', 'redux', 'zustand'
  ];

  const pathPatterns = [
    /^src\/(components|pages|views|layouts|ui)/i,
    /^(frontend|app|client)/i,
    /\.(tsx?|jsx?)$/i,
    /^public/i,
    /^styles/i,
    /\.(css|scss|sass)$/i,
    /^(app|pages)\//i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates AI & ML cluster score
 * AI-powered tools, LLMs, voice agents, media generation
 */
function calculateAIMLScore(text: string, paths: string[]): number {
  const keywords = [
    'ai', 'ml', 'llm', 'gpt', 'claude', 'openai', 'anthropic', 'embedding',
    'vector', 'neural', 'model', 'inference', 'train', 'predict', 'whisper',
    'tts', 'stt', 'voice', 'agent', 'semantic', 'cognitive', 'video', 'audio',
    'generation', 'synthesis', 'recognition', 'nlp', 'transformer', 'langchain',
    'prompt', 'rag', 'chatbot', 'assistant', 'intelligence', 'machine learning',
    'deep learning', 'tensor', 'pytorch', 'tensorflow', 'huggingface'
  ];

  const pathPatterns = [
    /^(ml|ai|models|agents)/i,
    /embedding/i,
    /neural/i,
    /(whisper|tts|stt)/i,
    /vector/i,
    /^src\/(ai|ml|agents)/i,
    /\.model\./i,
    /cognitive/i
  ];

  // Higher weight for AI/ML projects (they're distinctive)
  return calculateScore(text, paths, keywords, pathPatterns) * 1.3;
}

/**
 * Calculates Learning Tools cluster score
 * Educational apps, language learning, study tools
 */
function calculateLearningToolsScore(text: string, paths: string[]): number {
  const keywords = [
    'learn', 'study', 'quiz', 'practice', 'education', 'tutorial', 'lesson',
    'course', 'vocabulary', 'grammar', 'spanish', 'language', 'flashcard',
    'exercise', 'puzzle', 'game', 'score', 'progress', 'achievement',
    'student', 'teacher', 'classroom', 'conjugation', 'verb', 'noun',
    'subjunctive', 'tense', 'drill', 'memorize', 'test', 'exam',
    'educational', 'knowledge', 'skill', 'training'
  ];

  const pathPatterns = [
    /^(lessons|exercises|quizzes)/i,
    /(learn|study|practice)/i,
    /vocab/i,
    /^src\/(games|puzzles|quizzes)/i,
    /flashcard/i,
    /conjugat/i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates APIs & Services cluster score
 * Backend services, data pipelines, integrations
 */
function calculateAPIsServicesScore(text: string, paths: string[]): number {
  const keywords = [
    'api', 'endpoint', 'route', 'controller', 'service', 'middleware',
    'database', 'postgresql', 'mongodb', 'redis', 'express', 'fastapi',
    'rest', 'graphql', 'mutation', 'query', 'resolver', 'schema', 'prisma',
    'supabase', 'authentication', 'jwt', 'session', 'backend', 'server',
    'handler', 'validation', 'crud', 'orm', 'migration', 'webhook',
    'integration', 'pipeline', 'etl', 'stream', 'queue', 'worker'
  ];

  const pathPatterns = [
    /^(api|backend|server|services)/i,
    /^src\/(api|services|controllers)/i,
    /\.service\.(ts|js)$/i,
    /\.controller\.(ts|js)$/i,
    /^routes/i,
    /^handlers/i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

/**
 * Calculates Developer Tools cluster score
 * CLI tools, automation, DevOps, productivity
 */
function calculateDevToolsScore(text: string, paths: string[]): number {
  const keywords = [
    'cli', 'command', 'script', 'automation', 'workflow', 'devops',
    'docker', 'kubernetes', 'ci', 'cd', 'pipeline', 'deploy', 'build',
    'espanso', 'snippet', 'shortcut', 'terminal', 'shell', 'bash',
    'config', 'tool', 'utility', 'generator', 'scaffold', 'boilerplate',
    'lint', 'format', 'prettier', 'eslint', 'husky', 'git', 'npm',
    'yarn', 'pnpm', 'package', 'monorepo', 'turbo', 'nx'
  ];

  const pathPatterns = [
    /^\.github\/workflows/i,
    /^(scripts|tools|cli)/i,
    /^docker/i,
    /^(infrastructure|infra|devops)/i,
    /espanso/i,
    /\.(ya?ml|dockerfile)$/i,
    /^bin\//i,
    /\.config\./i
  ];

  return calculateScore(text, paths, keywords, pathPatterns);
}

// ============================================================================
// Legacy Scoring Functions (kept for reference/migration)
// ============================================================================

/**
 * @deprecated Use calculateWebAppsScore instead
 */
function calculateExperienceScore(text: string, paths: string[]): number {
  return calculateWebAppsScore(text, paths);
}

/**
 * @deprecated Use calculateAPIsServicesScore instead
 */
function calculateCoreSystemsScore(text: string, paths: string[]): number {
  return calculateAPIsServicesScore(text, paths);
}

/**
 * @deprecated Use calculateDevToolsScore instead
 */
function calculateInfraScore(text: string, paths: string[]): number {
  return calculateDevToolsScore(text, paths);
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
 * Generates embedding vector using OpenAI API (primary), Claude semantic analysis (secondary), or keywords
 * Claude extracts semantic features which are then converted to a deterministic vector
 */
async function generateVector(
  text: string,
  paths: string[],
  cluster: ClusterType
): Promise<number[]> {
  const combinedText = `${text} ${paths.join(' ')}`.substring(0, 8000);

  // Try OpenAI embeddings API first (designed for embeddings)
  if (openaiClient) {
    try {
      const response = await openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: combinedText,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.warn('[SemanticAnalyzer] OpenAI API failed, trying Claude semantic analysis:', error);
    }
  }

  // Try Claude for semantic feature extraction (not raw embeddings)
  if (claudeClient && config.useClaudeApi) {
    try {
      const features = await extractClaudeSemanticFeatures(combinedText, cluster);
      if (features) {
        return generateVectorFromFeatures(features, text, paths, cluster);
      }
    } catch (error) {
      console.warn('[SemanticAnalyzer] Claude semantic analysis failed, using keyword fallback:', error);
    }
  }

  // Final fallback: keyword-based vector generation
  return generateKeywordVector(text, paths, cluster);
}

/**
 * Semantic features extracted by Claude for vector generation
 */
interface SemanticFeatures {
  domain: 'frontend' | 'backend' | 'infra' | 'fullstack' | 'unknown';
  technologies: string[];
  patterns: string[];
  complexity: 'low' | 'medium' | 'high';
  keywords: string[];
  projectType: string;
}

/**
 * Extracts semantic features using Claude API (Sonnet 4.5)
 * Returns structured features that can be deterministically converted to a vector
 */
async function extractClaudeSemanticFeatures(
  text: string,
  cluster: ClusterType
): Promise<SemanticFeatures | null> {
  if (!claudeClient) return null;

  try {
    const response = await claudeClient.messages.create({
      model: config.claudeModel,
      max_tokens: 1024,
      system: `You are a semantic analysis engine for a portfolio intelligence system. Your task is to extract structured features from code commits and file paths to enable vector-based similarity search and clustering.

Key guidelines:
- Be precise and consistent in categorization
- Extract meaningful technical signals, not generic terms
- Focus on architectural and domain-specific patterns
- Consider both the explicit content and implied context`,
      messages: [{
        role: 'user',
        content: `Analyze the following code/commit context and extract semantic features for embedding generation.

## Input Context
\`\`\`
${text.substring(0, 4000)}
\`\`\`

## Cluster Hint
Based on keyword analysis, this content appears to align with: **${cluster}**

## Required Output
Return a JSON object with these exact fields:

{
  "domain": "<frontend|backend|infra|fullstack|unknown>",
  "technologies": ["<primary tech stack items>"],
  "patterns": ["<architectural patterns detected: MVC, microservices, event-driven, etc.>"],
  "complexity": "<low|medium|high>",
  "keywords": ["<10 most semantically significant terms>"],
  "projectType": "<one-line description of project purpose>"
}

## Evaluation Criteria
- domain: Infer from file paths (src/components=frontend, src/api=backend, .github/=infra)
- technologies: Include languages, frameworks, libraries, and tools
- patterns: Look for architectural indicators (Redux, REST, GraphQL, hooks, etc.)
- complexity: Based on abstraction layers, dependencies, and integration points
- keywords: Exclude generic terms like "the", "and", "function"

Return ONLY valid JSON, no markdown code blocks or explanatory text.`
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      // Try to extract JSON from the response (handle markdown code blocks)
      let jsonText = content.text.trim();

      // Remove markdown code block if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (parsed.domain && parsed.technologies && parsed.keywords) {
        return {
          domain: parsed.domain || 'unknown',
          technologies: Array.isArray(parsed.technologies) ? parsed.technologies : [],
          patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
          complexity: parsed.complexity || 'medium',
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          projectType: parsed.projectType || 'unknown'
        };
      }
    }
    console.warn('[SemanticAnalyzer] Claude returned invalid feature format');
    return null;
  } catch (error) {
    console.warn('[SemanticAnalyzer] Claude feature extraction failed:', error);
    return null;
  }
}

/**
 * Generates a 1536-dimensional vector from extracted semantic features
 * Uses deterministic hashing to create consistent embeddings from features
 */
function generateVectorFromFeatures(
  features: SemanticFeatures,
  text: string,
  paths: string[],
  cluster: ClusterType
): number[] {
  const dimensions = 1536;
  const vector: number[] = new Array(dimensions).fill(0);

  // Domain encoding (dimensions 0-49)
  const domainOffsets = {
    'frontend': 0,
    'backend': 10,
    'infra': 20,
    'fullstack': 30,
    'unknown': 40
  };
  const domainOffset = domainOffsets[features.domain] || 40;
  for (let i = 0; i < 10; i++) {
    vector[domainOffset + i] = 0.8;
  }

  // Technology hashing (dimensions 50-549)
  for (const tech of features.technologies) {
    const hash = simpleHash(tech.toLowerCase());
    const idx = 50 + (Math.abs(hash) % 500);
    vector[idx] += 0.5;
    vector[(idx + 1) % dimensions] += 0.25;
  }

  // Pattern hashing (dimensions 550-799)
  for (const pattern of features.patterns) {
    const hash = simpleHash(pattern.toLowerCase());
    const idx = 550 + (Math.abs(hash) % 250);
    vector[idx] += 0.4;
  }

  // Complexity encoding (dimensions 800-849)
  const complexityValues = { 'low': 0.3, 'medium': 0.6, 'high': 0.9 };
  const complexityVal = complexityValues[features.complexity] || 0.5;
  for (let i = 800; i < 850; i++) {
    vector[i] = complexityVal * (1 - (i - 800) / 50);
  }

  // Keyword hashing (dimensions 850-1349)
  for (const keyword of features.keywords) {
    const hash = simpleHash(keyword.toLowerCase());
    const idx = 850 + (Math.abs(hash) % 500);
    vector[idx] += 0.6;
    vector[(idx + 7) % dimensions] += 0.3;
  }

  // Project type hashing (dimensions 1350-1449)
  const typeWords = features.projectType.toLowerCase().split(/\s+/);
  for (const word of typeWords) {
    if (word.length > 2) {
      const hash = simpleHash(word);
      const idx = 1350 + (Math.abs(hash) % 100);
      vector[idx] += 0.35;
    }
  }

  // Text and path contribution (dimensions 1450-1535)
  const baseVector = generateKeywordVector(text, paths, cluster);
  for (let i = 1450; i < dimensions; i++) {
    vector[i] = baseVector[i] * 0.5;
  }

  // Normalize to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  // Apply cluster bias
  const clusterBias = getClusterBias(cluster);
  for (let i = 0; i < 10; i++) {
    vector[i] = (vector[i] * 0.7) + (clusterBias[i] * 0.3);
  }

  return vector;
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
 * Each cluster has a unique signature to improve separation in vector space
 */
function getClusterBias(cluster: ClusterType): number[] {
  const biases: Record<ClusterType, number[]> = {
    'Web Apps':        [0.9, 0.3, 0.2, 0.8, 0.4, 0.2, 0.6, 0.5, 0.3, 0.7],
    'AI & ML':         [0.3, 0.9, 0.8, 0.2, 0.7, 0.6, 0.4, 0.8, 0.5, 0.3],
    'Learning Tools':  [0.7, 0.4, 0.3, 0.9, 0.5, 0.3, 0.7, 0.4, 0.6, 0.8],
    'APIs & Services': [0.2, 0.7, 0.6, 0.3, 0.9, 0.8, 0.5, 0.7, 0.4, 0.2],
    'Developer Tools': [0.1, 0.5, 0.9, 0.4, 0.6, 0.9, 0.8, 0.3, 0.9, 0.6]
  };

  return biases[cluster];
}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Migrates legacy cluster type to new taxonomy
 * @param legacyCluster - Old 3-category cluster type
 * @returns New 5-category cluster type
 */
export function migrateLegacyCluster(legacyCluster: LegacyClusterType | ClusterType): ClusterType {
  const migrations: Record<LegacyClusterType, ClusterType> = {
    'Experience': 'Web Apps',      // Experience mapped to Web Apps
    'Core Systems': 'APIs & Services', // Core Systems mapped to APIs
    'Infra': 'Developer Tools'     // Infra mapped to Dev Tools
  };

  // If already a new cluster type, return as-is
  if (isNewClusterType(legacyCluster)) {
    return legacyCluster;
  }

  return migrations[legacyCluster as LegacyClusterType] || 'Web Apps';
}

/**
 * Checks if a cluster type is from the new taxonomy
 */
export function isNewClusterType(cluster: string): cluster is ClusterType {
  const newTypes: ClusterType[] = ['Web Apps', 'AI & ML', 'Learning Tools', 'APIs & Services', 'Developer Tools'];
  return newTypes.includes(cluster as ClusterType);
}

/**
 * Checks if a cluster type is from the legacy taxonomy
 */
export function isLegacyClusterType(cluster: string): cluster is LegacyClusterType {
  const legacyTypes: LegacyClusterType[] = ['Experience', 'Core Systems', 'Infra'];
  return legacyTypes.includes(cluster as LegacyClusterType);
}

/**
 * Re-analyzes a project to assign new cluster based on content
 * More accurate than simple migration mapping
 * @param commitMessages - Array of commit messages
 * @param filePaths - Array of file paths
 * @returns New cluster assignment with confidence
 */
export async function reclusterProject(
  commitMessages: string[],
  filePaths: string[]
): Promise<{ cluster: ClusterType; confidence: number }> {
  const embedding = await generateEmbedding(commitMessages, filePaths);
  return {
    cluster: embedding.cluster,
    confidence: embedding.confidence
  };
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
