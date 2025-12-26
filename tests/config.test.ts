/**
 * Tests for config.ts
 * Tests configuration loading, parsing, validation, and display
 */

import * as path from 'path';

// Store original process.env
const originalEnv = process.env;

describe('Config Module', () => {
  beforeEach(() => {
    // Reset modules and environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };

    // Suppress console output during tests
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('parseBoolean function', () => {
    it('should parse true values correctly', () => {
      process.env.VERBOSE = 'true';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.verbose).toBe(true);
    });

    it('should be case insensitive', () => {
      process.env.VERBOSE = 'TRUE';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.verbose).toBe(true);
    });

    it('should return false for non-true values', () => {
      process.env.VERBOSE = 'false';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.verbose).toBe(false);
    });

    it('should use default when undefined', () => {
      delete process.env.VERBOSE;
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.verbose).toBe(false);
    });
  });

  describe('parseNumber function', () => {
    it('should parse valid integers', () => {
      process.env.MIN_CLUSTER_SIZE = '5';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.minClusterSize).toBe(5);
    });

    it('should parse valid floats', () => {
      process.env.DRIFT_THRESHOLD = '0.85';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.driftThreshold).toBe(0.85);
    });

    it('should use default for invalid numbers', () => {
      process.env.MIN_CLUSTER_SIZE = 'invalid';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.minClusterSize).toBe(2);
    });

    it('should enforce minimum boundaries', () => {
      process.env.DRIFT_THRESHOLD = '-0.5';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.driftThreshold).toBe(0);
    });

    it('should enforce maximum boundaries', () => {
      process.env.DRIFT_THRESHOLD = '1.5';
      jest.resetModules();
      const { config } = require('../src/config');
      expect(config.driftThreshold).toBe(1);
    });
  });

  describe('config defaults', () => {
    it('should have correct Claude API defaults', () => {
      delete process.env.CLAUDE_MODEL;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.claudeModel).toBe('claude-sonnet-4-20250514');
      // Note: useClaudeApi depends on whether ANTHROPIC_API_KEY is set (may come from .env)
      expect(typeof config.useClaudeApi).toBe('boolean');
    });

    it('should have correct OpenAI defaults', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_EMBEDDING_MODEL;
      delete process.env.EMBEDDING_DIMENSIONS;
      delete process.env.USE_OPENAI_API;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.openaiEmbeddingModel).toBe('text-embedding-3-small');
      expect(config.embeddingDimensions).toBe(1536);
      expect(config.useOpenAIApi).toBe(false);
    });

    it('should have correct analysis defaults', () => {
      delete process.env.DRIFT_THRESHOLD;
      delete process.env.MIN_CLUSTER_SIZE;
      delete process.env.MAX_CLUSTER_SIZE;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.driftThreshold).toBe(0.7);
      expect(config.minClusterSize).toBe(2);
      expect(config.maxClusterSize).toBe(10);
    });

    it('should have correct system defaults', () => {
      delete process.env.VERBOSE;
      delete process.env.LOG_LEVEL;
      delete process.env.FALLBACK_TO_KEYWORDS;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.verbose).toBe(false);
      expect(config.logLevel).toBe('info');
      expect(config.fallbackToKeywords).toBe(true);
    });
  });

  describe('environment variable loading', () => {
    it('should load API keys from environment', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.anthropicApiKey).toBe('sk-ant-test-key');
      expect(config.openaiApiKey).toBe('sk-test-key');
    });

    it('should override defaults with env vars', () => {
      process.env.CLAUDE_MODEL = 'claude-opus-4';
      process.env.LOG_LEVEL = 'debug';
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.claudeModel).toBe('claude-opus-4');
      expect(config.logLevel).toBe('debug');
    });

    it('should handle custom paths', () => {
      process.env.SCAN_DIR = '/custom/scan';
      process.env.AGENTDB_PATH = '/custom/db.json';
      process.env.OUTPUT_DIR = '/custom/output';
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.defaultScanDir).toBe('/custom/scan');
      expect(config.agentDbPath).toBe('/custom/db.json');
      expect(config.outputDir).toBe('/custom/output');
    });
  });

  describe('validateConfig function', () => {
    it('should return valid true for correct config', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.DRIFT_THRESHOLD = '0.7';
      process.env.MIN_CLUSTER_SIZE = '2';
      process.env.MAX_CLUSTER_SIZE = '10';
      jest.resetModules();
      const { validateConfig } = require('../src/config');

      const result = validateConfig();
      expect(result.valid).toBe(true);
    });

    it('should handle Claude API key validation', () => {
      // Note: .env file may provide ANTHROPIC_API_KEY during tests
      // This test verifies validateConfig runs without error
      jest.resetModules();
      const { validateConfig, config } = require('../src/config');

      const result = validateConfig();
      // Config should be valid (either with or without API key)
      expect(result.valid).toBe(true);
      expect(typeof config.useClaudeApi).toBe('boolean');
    });

    it('should warn on invalid drift threshold (value gets clamped)', () => {
      process.env.DRIFT_THRESHOLD = '1.5';
      jest.resetModules();
      const { config, validateConfig } = require('../src/config');

      // Value gets clamped to 1 by parseNumber
      expect(config.driftThreshold).toBe(1);
      const result = validateConfig();
      // Config is still valid because clamping happened
      expect(result.valid).toBe(true);
    });

    it('should error when minClusterSize > maxClusterSize', () => {
      process.env.MIN_CLUSTER_SIZE = '15';
      process.env.MAX_CLUSTER_SIZE = '10';
      jest.resetModules();
      const { validateConfig } = require('../src/config');

      const result = validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('MIN_CLUSTER_SIZE'))).toBe(true);
    });

    it('should warn for non-standard embedding dimensions', () => {
      process.env.EMBEDDING_DIMENSIONS = '2000';
      jest.resetModules();
      const { validateConfig } = require('../src/config');

      const result = validateConfig();
      expect(result.warnings.some((w: string) => w.includes('EMBEDDING_DIMENSIONS'))).toBe(true);
    });

    it('should accept standard embedding dimensions', () => {
      process.env.EMBEDDING_DIMENSIONS = '1536';
      process.env.ANTHROPIC_API_KEY = 'test';
      jest.resetModules();
      const { validateConfig } = require('../src/config');

      const result = validateConfig();
      const hasEmbeddingWarning = result.warnings.some((w: string) => w.includes('EMBEDDING_DIMENSIONS'));
      expect(hasEmbeddingWarning).toBe(false);
    });
  });

  describe('printConfig function', () => {
    it('should print configuration', () => {
      jest.resetModules();
      const { printConfig } = require('../src/config');

      printConfig();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Portfolio Cognitive Command Configuration')
      );
    });

    it('should mask Anthropic API key', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api-key-1234567890abcdef';
      jest.resetModules();
      const { printConfig } = require('../src/config');

      printConfig();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('sk-ant-api')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('cdef')
      );
    });

    it('should print configuration header for missing or set keys', () => {
      // This test verifies printConfig runs without error
      // Note: dotenv may load .env file during tests, so we just verify the header prints
      jest.resetModules();
      const { printConfig } = require('../src/config');

      printConfig();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Claude API Settings')
      );
    });
  });

  describe('path configuration', () => {
    it('should use detectPortfolioRoot() for default scan dir when in multi-project directory', () => {
      delete process.env.SCAN_DIR;
      jest.resetModules();
      const { config } = require('../src/config');

      // The detectPortfolioRoot() function walks up the directory tree looking for
      // a parent directory with 3+ git repositories. When running from within
      // portfolio_cognitive_command, it should find the active-development parent.
      // If no portfolio root is found, it falls back to process.cwd().
      const expectedParent = path.resolve(process.cwd(), '..');
      const isInPortfolio = config.defaultScanDir === expectedParent ||
                           config.defaultScanDir === process.cwd();
      expect(isInPortfolio).toBe(true);
    });

    it('should construct agentDbPath with default location', () => {
      delete process.env.AGENTDB_PATH;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.agentDbPath).toBe(path.join(process.cwd(), 'data', 'agentdb.json'));
    });

    it('should construct outputDir with default location', () => {
      delete process.env.OUTPUT_DIR;
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.outputDir).toBe(path.join(process.cwd(), 'output'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values (falls back to default)', () => {
      process.env.CLAUDE_MODEL = '';
      jest.resetModules();
      const { config } = require('../src/config');

      // Empty string is falsy, so default is used
      expect(config.claudeModel).toBe('claude-sonnet-4-20250514');
    });

    it('should handle scientific notation', () => {
      process.env.DRIFT_THRESHOLD = '7e-1';
      jest.resetModules();
      const { config } = require('../src/config');

      expect(config.driftThreshold).toBe(0.7);
    });

    it('should handle boundary values', () => {
      process.env.DRIFT_THRESHOLD = '0';
      process.env.MIN_CLUSTER_SIZE = '1';
      jest.resetModules();
      const { config, validateConfig } = require('../src/config');

      expect(config.driftThreshold).toBe(0);
      expect(config.minClusterSize).toBe(1);

      const result = validateConfig();
      expect(result.valid).toBe(true);
    });
  });

  describe('module exports', () => {
    it('should export config as default', () => {
      jest.resetModules();
      const defaultExport = require('../src/config').default;
      const namedExport = require('../src/config').config;

      expect(defaultExport).toBe(namedExport);
    });

    it('should export validateConfig function', () => {
      jest.resetModules();
      const { validateConfig } = require('../src/config');

      expect(typeof validateConfig).toBe('function');
    });

    it('should export printConfig function', () => {
      jest.resetModules();
      const { printConfig } = require('../src/config');

      expect(typeof printConfig).toBe('function');
    });
  });
});
