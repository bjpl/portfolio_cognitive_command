import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

export interface Config {
  // Claude API Configuration (Primary)
  anthropicApiKey: string | undefined;
  claudeModel: string;
  useClaudeApi: boolean;

  // OpenAI API Configuration (Fallback)
  openaiApiKey: string | undefined;
  openaiEmbeddingModel: string;
  embeddingDimensions: number;
  useOpenAIApi: boolean;

  // Project Paths
  defaultScanDir: string;
  agentDbPath: string;
  outputDir: string;

  // Analysis Settings
  driftThreshold: number;
  minClusterSize: number;
  maxClusterSize: number;

  // System Settings
  verbose: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';

  // Embedding Settings
  fallbackToKeywords: boolean;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse number from environment variable with validation
 */
function parseNumber(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    console.warn(`Invalid number value: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  if (min !== undefined && parsed < min) {
    console.warn(`Value ${parsed} below minimum ${min}, using minimum`);
    return min;
  }
  if (max !== undefined && parsed > max) {
    console.warn(`Value ${parsed} above maximum ${max}, using maximum`);
    return max;
  }
  return parsed;
}

/**
 * Application configuration loaded from environment variables
 */
export const config: Config = {
  // Claude API Configuration (Primary)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  useClaudeApi: parseBoolean(process.env.USE_CLAUDE_API, true),

  // OpenAI API Configuration (Fallback)
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingDimensions: parseNumber(process.env.EMBEDDING_DIMENSIONS, 1536, 1, 3072),
  useOpenAIApi: parseBoolean(process.env.USE_OPENAI_API, false),

  // Project Paths
  defaultScanDir: process.env.SCAN_DIR || process.cwd(),
  agentDbPath: process.env.AGENTDB_PATH || path.join(process.cwd(), 'data', 'agentdb.json'),
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'output'),

  // Analysis Settings
  driftThreshold: parseNumber(process.env.DRIFT_THRESHOLD, 0.7, 0, 1),
  minClusterSize: parseNumber(process.env.MIN_CLUSTER_SIZE, 2, 1),
  maxClusterSize: parseNumber(process.env.MAX_CLUSTER_SIZE, 10, 2),

  // System Settings
  verbose: parseBoolean(process.env.VERBOSE, false),
  logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',

  // Embedding Settings
  fallbackToKeywords: parseBoolean(process.env.FALLBACK_TO_KEYWORDS, true),
};

/**
 * Validate configuration and warn about missing required settings
 */
export function validateConfig(): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check Claude API key (primary)
  if (config.useClaudeApi && !config.anthropicApiKey) {
    warnings.push('ANTHROPIC_API_KEY not set. System will try OpenAI or fall back to keywords.');
    config.useClaudeApi = false;
  }

  // Check OpenAI API key (fallback)
  if (!config.useClaudeApi && config.useOpenAIApi && !config.openaiApiKey) {
    warnings.push('OPENAI_API_KEY not set. System will use keyword-based fallback.');
    config.useOpenAIApi = false;
  }

  // Validate drift threshold
  if (config.driftThreshold < 0 || config.driftThreshold > 1) {
    errors.push(`DRIFT_THRESHOLD must be between 0 and 1, got: ${config.driftThreshold}`);
  }

  // Validate cluster sizes
  if (config.minClusterSize > config.maxClusterSize) {
    errors.push(`MIN_CLUSTER_SIZE (${config.minClusterSize}) cannot be greater than MAX_CLUSTER_SIZE (${config.maxClusterSize})`);
  }

  // Validate embedding dimensions
  const validDimensions = [256, 512, 1024, 1536, 3072];
  if (!validDimensions.includes(config.embeddingDimensions)) {
    warnings.push(`EMBEDDING_DIMENSIONS (${config.embeddingDimensions}) is not a standard value. Valid: ${validDimensions.join(', ')}`);
  }

  // Check if paths exist
  if (!config.defaultScanDir) {
    errors.push('SCAN_DIR is required');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Print configuration to console (hiding sensitive data)
 */
export function printConfig(): void {
  const maskedAnthropicKey = config.anthropicApiKey
    ? `${config.anthropicApiKey.substring(0, 10)}...${config.anthropicApiKey.substring(config.anthropicApiKey.length - 4)}`
    : 'Not set';
  const maskedOpenAIKey = config.openaiApiKey
    ? `${config.openaiApiKey.substring(0, 7)}...${config.openaiApiKey.substring(config.openaiApiKey.length - 4)}`
    : 'Not set';

  console.log('\n=== Portfolio Cognitive Command Configuration ===');
  console.log('\nClaude API Settings (Primary):');
  console.log(`  API Key: ${maskedAnthropicKey}`);
  console.log(`  Model: ${config.claudeModel}`);
  console.log(`  Use Claude API: ${config.useClaudeApi}`);
  console.log('\nOpenAI Settings (Fallback):');
  console.log(`  API Key: ${maskedOpenAIKey}`);
  console.log(`  Model: ${config.openaiEmbeddingModel}`);
  console.log(`  Dimensions: ${config.embeddingDimensions}`);
  console.log(`  Use OpenAI API: ${config.useOpenAIApi}`);

  console.log('\nPaths:');
  console.log(`  Scan Directory: ${config.defaultScanDir}`);
  console.log(`  Agent DB: ${config.agentDbPath}`);
  console.log(`  Output Directory: ${config.outputDir}`);

  console.log('\nAnalysis Settings:');
  console.log(`  Drift Threshold: ${config.driftThreshold}`);
  console.log(`  Min Cluster Size: ${config.minClusterSize}`);
  console.log(`  Max Cluster Size: ${config.maxClusterSize}`);

  console.log('\nSystem Settings:');
  console.log(`  Verbose: ${config.verbose}`);
  console.log(`  Log Level: ${config.logLevel}`);
  console.log(`  Fallback to Keywords: ${config.fallbackToKeywords}`);
  console.log('\n===============================================\n');
}

// Run validation on load
const validation = validateConfig();
if (validation.warnings.length > 0) {
  console.warn('\n⚠️  Configuration Warnings:');
  validation.warnings.forEach(w => console.warn(`  - ${w}`));
}
if (validation.errors.length > 0) {
  console.error('\n❌ Configuration Errors:');
  validation.errors.forEach(e => console.error(`  - ${e}`));
  console.error('\nPlease fix configuration errors before continuing.\n');
}

export default config;
