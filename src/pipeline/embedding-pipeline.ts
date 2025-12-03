/**
 * Embedding Pipeline
 * Portfolio Cognitive Command v8.0
 *
 * Purpose: Generate vector embeddings for git commits and assign strategic cluster
 *
 * Input: Commit Messages + File Paths Changed + Diff Summary
 * Output: Vector embedding with cluster assignment
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CommitInput {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
  filesChanged: string[];
  diffSummary: string;
  additions: number;
  deletions: number;
}

interface EmbeddingOutput {
  commitHash: string;
  embedding?: number[];
  cluster: 'experience' | 'coreSystems' | 'infrastructure' | 'uncategorized';
  clusterConfidence: number;
  clusterProbabilities: {
    experience: number;
    coreSystems: number;
    infrastructure: number;
  };
  topKeywords: string[];
  metadata: {
    timestamp: string;
    filesChanged: string[];
    additions: number;
    deletions: number;
  };
}

interface RuvectorConfig {
  strategicCentroids: {
    [key: string]: {
      name: string;
      keywords: string[];
      filePatterns: string[];
      weight: number;
      color: string;
    };
  };
  clusteringConfig: {
    algorithm: string;
    threshold: number;
    minimumConfidence: number;
    multiClusterAllowed: boolean;
    fallbackCluster: string;
  };
  preprocessing: {
    normalizeCase: boolean;
    removeStopWords: boolean;
    maxInputLength: number;
    includeFilePaths: boolean;
    includeCommitMessages: boolean;
    includeDiffSummary: boolean;
  };
}

// ============================================================================
// EMBEDDING PIPELINE CLASS
// ============================================================================

export class EmbeddingPipeline {
  private config: RuvectorConfig;
  private stopWords: Set<string>;
  private openai: OpenAI | null = null;

  constructor(configPath: string) {
    this.config = this.loadConfig(configPath);
    this.stopWords = this.loadStopWords();
    this.initOpenAI();
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: OpenAI Initialization
  // --------------------------------------------------------------------------

  private initOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      console.log('[EmbeddingPipeline] OpenAI API initialized successfully');
    } else {
      console.warn('[EmbeddingPipeline] OPENAI_API_KEY not found, using keyword-based fallback');
    }
  }

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  /**
   * Process a single commit and generate embedding with cluster assignment
   */
  public async processCommit(commit: CommitInput): Promise<EmbeddingOutput> {
    // 1. Preprocess input data
    const preprocessedText = this.preprocessInput(commit);

    // 2. Generate embedding (placeholder - integrate with Ruvector API)
    const embedding = await this.generateEmbedding(preprocessedText);

    // 3. Assign cluster based on semantic analysis
    const clusterResult = this.assignCluster(commit, embedding);

    // 4. Extract top keywords
    const topKeywords = this.extractKeywords(preprocessedText);

    // 5. Construct output
    const output: EmbeddingOutput = {
      commitHash: commit.hash,
      embedding: this.config.preprocessing.includeFilePaths ? embedding : undefined,
      cluster: clusterResult.cluster,
      clusterConfidence: clusterResult.confidence,
      clusterProbabilities: clusterResult.probabilities,
      topKeywords,
      metadata: {
        timestamp: commit.timestamp,
        filesChanged: commit.filesChanged,
        additions: commit.additions,
        deletions: commit.deletions,
      },
    };

    return output;
  }

  /**
   * Process multiple commits in batch
   */
  public async processBatch(commits: CommitInput[]): Promise<EmbeddingOutput[]> {
    const results: EmbeddingOutput[] = [];

    for (const commit of commits) {
      try {
        const result = await this.processCommit(commit);
        results.push(result);
      } catch (error) {
        console.error(`Error processing commit ${commit.hash}:`, error);
        // Continue processing other commits
      }
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Preprocessing
  // --------------------------------------------------------------------------

  private preprocessInput(commit: CommitInput): string {
    const parts: string[] = [];

    // Include commit message
    if (this.config.preprocessing.includeCommitMessages) {
      parts.push(commit.message);
    }

    // Include file paths
    if (this.config.preprocessing.includeFilePaths) {
      parts.push(commit.filesChanged.join(' '));
    }

    // Include diff summary
    if (this.config.preprocessing.includeDiffSummary) {
      parts.push(commit.diffSummary);
    }

    let text = parts.join(' ');

    // Normalize case
    if (this.config.preprocessing.normalizeCase) {
      text = text.toLowerCase();
    }

    // Remove stop words
    if (this.config.preprocessing.removeStopWords) {
      text = this.removeStopWordsFromText(text);
    }

    // Truncate to max length
    if (text.length > this.config.preprocessing.maxInputLength) {
      text = text.substring(0, this.config.preprocessing.maxInputLength);
    }

    return text;
  }

  private removeStopWordsFromText(text: string): string {
    const words = text.split(/\s+/);
    const filtered = words.filter((word) => !this.stopWords.has(word));
    return filtered.join(' ');
  }

  private loadStopWords(): Set<string> {
    // Common English stop words
    return new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that',
      'these', 'those', 'it', 'its', 'if', 'then', 'else', 'when', 'where',
      'how', 'why', 'what', 'which', 'who', 'whom', 'whose',
    ]);
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Embedding Generation
  // --------------------------------------------------------------------------

  private async generateEmbedding(text: string): Promise<number[]> {
    console.log('[EmbeddingPipeline] Generating embedding for text (length:', text.length, ')');

    // Try OpenAI API first if available
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // OpenAI has 8191 token limit, truncate to be safe
        });
        console.log('[EmbeddingPipeline] Successfully generated OpenAI embedding');
        return response.data[0].embedding;
      } catch (error) {
        console.warn('[EmbeddingPipeline] OpenAI API failed, falling back to keyword-based vector:', error);
      }
    }

    // Fallback: Generate keyword-based vector
    console.log('[EmbeddingPipeline] Using keyword-based fallback embedding');
    return this.generateKeywordVector(text);
  }

  /**
   * Fallback embedding generation using keyword-based approach
   * Generates a semantic vector based on word frequency and distribution
   */
  private generateKeywordVector(text: string): number[] {
    const dimensions = 1536; // Match OpenAI's text-embedding-3-small dimension
    const vector = new Array(dimensions).fill(0);

    // Tokenize and analyze text
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    // Build word frequency map
    for (const word of words) {
      if (!this.stopWords.has(word) && word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Hash each word into vector dimensions with weighted frequency
    for (const [word, freq] of wordFreq.entries()) {
      const hash = this.hashString(word);
      const primaryIndex = Math.abs(hash) % dimensions;
      const secondaryIndex = Math.abs(hash >> 8) % dimensions;

      // Distribute word signal across multiple dimensions for better semantics
      vector[primaryIndex] += freq * 1.0;
      vector[secondaryIndex] += freq * 0.5;

      // Add tertiary spread for common words
      if (freq > 2) {
        const tertiaryIndex = Math.abs(hash >> 16) % dimensions;
        vector[tertiaryIndex] += freq * 0.3;
      }
    }

    // Normalize vector to unit length (like real embeddings)
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Cluster Assignment
  // --------------------------------------------------------------------------

  private assignCluster(
    commit: CommitInput,
    embedding: number[]
  ): {
    cluster: 'experience' | 'coreSystems' | 'infrastructure' | 'uncategorized';
    confidence: number;
    probabilities: { experience: number; coreSystems: number; infrastructure: number };
  } {
    const scores = {
      experience: 0,
      coreSystems: 0,
      infrastructure: 0,
    };

    // Score based on file patterns
    for (const [clusterKey, clusterConfig] of Object.entries(this.config.strategicCentroids)) {
      const filePatternScore = this.scoreFilePatterns(commit.filesChanged, clusterConfig.filePatterns);
      const keywordScore = this.scoreKeywords(commit.message + ' ' + commit.diffSummary, clusterConfig.keywords);

      const totalScore = (filePatternScore * 0.6 + keywordScore * 0.4) * clusterConfig.weight;

      if (clusterKey === 'experience') scores.experience = totalScore;
      if (clusterKey === 'coreSystems') scores.coreSystems = totalScore;
      if (clusterKey === 'infrastructure') scores.infrastructure = totalScore;
    }

    // Normalize scores to probabilities
    const total = scores.experience + scores.coreSystems + scores.infrastructure;
    const probabilities = {
      experience: total > 0 ? scores.experience / total : 0,
      coreSystems: total > 0 ? scores.coreSystems / total : 0,
      infrastructure: total > 0 ? scores.infrastructure / total : 0,
    };

    // Determine winning cluster
    let winningCluster: 'experience' | 'coreSystems' | 'infrastructure' | 'uncategorized' = 'uncategorized';
    let maxScore = 0;

    for (const [cluster, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winningCluster = cluster as 'experience' | 'coreSystems' | 'infrastructure';
      }
    }

    // Check confidence threshold
    const confidence = maxScore;
    if (confidence < this.config.clusteringConfig.minimumConfidence) {
      winningCluster = 'uncategorized';
    }

    return {
      cluster: winningCluster,
      confidence,
      probabilities,
    };
  }

  private scoreFilePatterns(filesChanged: string[], patterns: string[]): number {
    let matches = 0;

    for (const file of filesChanged) {
      for (const pattern of patterns) {
        if (this.matchGlobPattern(file, pattern)) {
          matches++;
          break; // Count each file only once
        }
      }
    }

    return filesChanged.length > 0 ? matches / filesChanged.length : 0;
  }

  private matchGlobPattern(filePath: string, pattern: string): boolean {
    // Simple glob matching (basic implementation)
    // Replace ** with .* and * with [^/]*
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  private scoreKeywords(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    return keywords.length > 0 ? matches / keywords.length : 0;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Keyword Extraction
  // --------------------------------------------------------------------------

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      // Filter out stop words and short words
      if (!this.stopWords.has(word) && word.length > 3) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and return top 10
    const sorted = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return sorted;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS: Configuration
  // --------------------------------------------------------------------------

  private loadConfig(configPath: string): RuvectorConfig {
    try {
      const configFile = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configFile);
    } catch (error) {
      console.error('Error loading Ruvector config:', error);
      throw new Error('Failed to load Ruvector configuration');
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  public async saveMetrics(outputPath: string): Promise<void> {
    const metrics = {
      timestamp: new Date().toISOString(),
      config: this.config,
      // Add more metrics as needed
    };

    const metricsDir = path.dirname(outputPath);
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    console.log('[EmbeddingPipeline] Metrics saved to:', outputPath);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { CommitInput, EmbeddingOutput, RuvectorConfig };
