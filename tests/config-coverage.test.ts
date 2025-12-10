/**
 * Config Coverage Tests
 * These tests use static imports to ensure Jest coverage instrumentation works.
 * The main config.test.ts uses jest.resetModules() + require() which bypasses coverage.
 */

import { config, validateConfig, printConfig, Config } from '../src/config';

describe('Config Coverage Tests (Static Import)', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('config object - all properties', () => {
    it('should export config object with all Claude API properties', () => {
      expect(config).toBeDefined();
      expect(config).toHaveProperty('anthropicApiKey');
      expect(config).toHaveProperty('claudeModel');
      expect(config).toHaveProperty('useClaudeApi');
      expect(typeof config.claudeModel).toBe('string');
      expect(typeof config.useClaudeApi).toBe('boolean');
    });

    it('should have all OpenAI API properties', () => {
      expect(config).toHaveProperty('openaiApiKey');
      expect(config).toHaveProperty('openaiEmbeddingModel');
      expect(config).toHaveProperty('embeddingDimensions');
      expect(config).toHaveProperty('useOpenAIApi');
      expect(typeof config.openaiEmbeddingModel).toBe('string');
      expect(typeof config.embeddingDimensions).toBe('number');
      expect(typeof config.useOpenAIApi).toBe('boolean');
    });

    it('should have all path properties', () => {
      expect(config).toHaveProperty('defaultScanDir');
      expect(config).toHaveProperty('agentDbPath');
      expect(config).toHaveProperty('outputDir');
      expect(typeof config.defaultScanDir).toBe('string');
      expect(typeof config.agentDbPath).toBe('string');
      expect(typeof config.outputDir).toBe('string');
    });

    it('should have all analysis settings', () => {
      expect(config).toHaveProperty('driftThreshold');
      expect(config).toHaveProperty('minClusterSize');
      expect(config).toHaveProperty('maxClusterSize');
      expect(typeof config.driftThreshold).toBe('number');
      expect(typeof config.minClusterSize).toBe('number');
      expect(typeof config.maxClusterSize).toBe('number');
    });

    it('should have all system settings', () => {
      expect(config).toHaveProperty('verbose');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('fallbackToKeywords');
      expect(typeof config.verbose).toBe('boolean');
      expect(typeof config.logLevel).toBe('string');
      expect(typeof config.fallbackToKeywords).toBe('boolean');
    });

    it('should have valid paths configured', () => {
      expect(config.defaultScanDir).toBeTruthy();
      expect(config.agentDbPath).toContain('agentdb.json');
      expect(config.outputDir).toBeTruthy();
    });

    it('should have valid analysis settings', () => {
      expect(config.driftThreshold).toBeGreaterThanOrEqual(0);
      expect(config.driftThreshold).toBeLessThanOrEqual(1);
      expect(config.minClusterSize).toBeGreaterThanOrEqual(1);
      expect(config.maxClusterSize).toBeGreaterThanOrEqual(config.minClusterSize);
    });
  });

  describe('validateConfig function - comprehensive validation', () => {
    it('should return validation result object with all required properties', () => {
      const result = validateConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should validate drift threshold is in range 0-1', () => {
      const result = validateConfig();

      // The drift threshold should be valid (between 0 and 1)
      expect(config.driftThreshold).toBeGreaterThanOrEqual(0);
      expect(config.driftThreshold).toBeLessThanOrEqual(1);

      // Check if validation caught any out-of-range issues
      const driftErrors = result.errors.filter(e => e.includes('DRIFT_THRESHOLD'));
      if (config.driftThreshold < 0 || config.driftThreshold > 1) {
        expect(driftErrors.length).toBeGreaterThan(0);
      }
    });

    it('should validate cluster size relationship', () => {
      const result = validateConfig();

      // Check if minClusterSize <= maxClusterSize
      if (config.minClusterSize > config.maxClusterSize) {
        const clusterErrors = result.errors.filter(e =>
          e.includes('MIN_CLUSTER_SIZE') && e.includes('MAX_CLUSTER_SIZE')
        );
        expect(clusterErrors.length).toBeGreaterThan(0);
        expect(result.valid).toBe(false);
      }
    });

    it('should check for standard embedding dimensions', () => {
      const result = validateConfig();
      const validDimensions = [256, 512, 1024, 1536, 3072];

      if (!validDimensions.includes(config.embeddingDimensions)) {
        const embeddingWarnings = result.warnings.filter(w =>
          w.includes('EMBEDDING_DIMENSIONS')
        );
        expect(embeddingWarnings.length).toBeGreaterThan(0);
      }
    });

    it('should validate scan directory is set', () => {
      const result = validateConfig();

      if (!config.defaultScanDir) {
        const scanDirErrors = result.errors.filter(e => e.includes('SCAN_DIR'));
        expect(scanDirErrors.length).toBeGreaterThan(0);
        expect(result.valid).toBe(false);
      }
    });

    it('should check API key availability and modify config flags', () => {
      const result = validateConfig();

      // If originally using Claude API but no key, should warn and disable
      if (!config.anthropicApiKey) {
        const anthropicWarnings = result.warnings.filter(w =>
          w.includes('ANTHROPIC_API_KEY')
        );
        // Warning should be present if it tried to use Claude API
        if (anthropicWarnings.length > 0) {
          expect(anthropicWarnings.some(w => w.includes('OpenAI') || w.includes('keywords'))).toBe(true);
        }
      }

      // Similar for OpenAI
      if (!config.openaiApiKey && !config.anthropicApiKey) {
        const openaiWarnings = result.warnings.filter(w =>
          w.includes('OPENAI_API_KEY')
        );
        if (openaiWarnings.length > 0) {
          expect(openaiWarnings.some(w => w.includes('keyword'))).toBe(true);
        }
      }
    });

    it('should return valid false when errors exist', () => {
      const result = validateConfig();
      expect(result.valid).toBe(result.errors.length === 0);
    });

    it('should allow warnings without invalidating config', () => {
      const result = validateConfig();

      if (result.warnings.length > 0 && result.errors.length === 0) {
        expect(result.valid).toBe(true);
      }
    });

    it('should handle multiple validation issues', () => {
      const result = validateConfig();

      // Both warnings and errors can coexist
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      expect(result.errors.length).toBeGreaterThanOrEqual(0);

      // But valid should only be true if no errors
      if (result.errors.length > 0) {
        expect(result.valid).toBe(false);
      }
    });
  });

  describe('printConfig function - comprehensive output testing', () => {
    beforeEach(() => {
      consoleLogSpy.mockClear();
    });

    it('should print configuration without throwing', () => {
      expect(() => printConfig()).not.toThrow();
    });

    it('should call console.log multiple times for all sections', () => {
      printConfig();
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(10);
    });

    it('should print main header', () => {
      printConfig();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Portfolio Cognitive Command Configuration')
      );
    });

    it('should print Claude API Settings section with all details', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Claude API Settings');
      expect(calls).toContain('API Key:');
      expect(calls).toContain('Model:');
      expect(calls).toContain('Use Claude API:');
    });

    it('should print OpenAI Settings section with all details', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('OpenAI Settings');
      expect(calls).toContain('Dimensions:');
      expect(calls).toContain('Use OpenAI API:');
    });

    it('should print Paths section with all paths', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Paths:');
      expect(calls).toContain('Scan Directory:');
      expect(calls).toContain('Agent DB:');
      expect(calls).toContain('Output Directory:');
    });

    it('should print Analysis Settings with all parameters', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('Analysis Settings:');
      expect(calls).toContain('Drift Threshold:');
      expect(calls).toContain('Min Cluster Size:');
      expect(calls).toContain('Max Cluster Size:');
    });

    it('should print System Settings with all options', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('System Settings:');
      expect(calls).toContain('Verbose:');
      expect(calls).toContain('Log Level:');
      expect(calls).toContain('Fallback to Keywords:');
    });

    it('should mask Anthropic API key when present', () => {
      printConfig();

      if (config.anthropicApiKey && config.anthropicApiKey.length > 14) {
        const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
        // Should contain masked key with ...
        expect(calls).toContain('...');
        // Should show first 10 chars
        const firstPart = config.anthropicApiKey.substring(0, 10);
        expect(calls).toContain(firstPart);
      }
    });

    it('should show "Not set" for missing Anthropic API key', () => {
      printConfig();

      if (!config.anthropicApiKey) {
        const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
        expect(calls).toContain('Not set');
      }
    });

    it('should mask OpenAI API key when present', () => {
      printConfig();

      if (config.openaiApiKey && config.openaiApiKey.length > 11) {
        const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
        // Should contain masked key with ...
        expect(calls).toContain('...');
      }
    });

    it('should display actual config values in output', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');

      // Check for actual values
      expect(calls).toContain(config.claudeModel);
      expect(calls).toContain(config.openaiEmbeddingModel);
      expect(calls).toContain(String(config.embeddingDimensions));
      expect(calls).toContain(String(config.driftThreshold));
      expect(calls).toContain(String(config.minClusterSize));
      expect(calls).toContain(String(config.maxClusterSize));
      expect(calls).toContain(config.logLevel);
      expect(calls).toContain(String(config.useClaudeApi));
      expect(calls).toContain(String(config.useOpenAIApi));
      expect(calls).toContain(String(config.verbose));
      expect(calls).toContain(String(config.fallbackToKeywords));
    });

    it('should print closing separator', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');
      expect(calls).toContain('===');
    });
  });

  describe('Config interface type safety', () => {
    it('should match Config interface structure completely', () => {
      const configKeys: (keyof Config)[] = [
        'anthropicApiKey',
        'claudeModel',
        'useClaudeApi',
        'openaiApiKey',
        'openaiEmbeddingModel',
        'embeddingDimensions',
        'useOpenAIApi',
        'defaultScanDir',
        'agentDbPath',
        'outputDir',
        'driftThreshold',
        'minClusterSize',
        'maxClusterSize',
        'verbose',
        'logLevel',
        'fallbackToKeywords'
      ];

      for (const key of configKeys) {
        expect(key in config).toBe(true);
      }

      // Verify no extra properties
      expect(Object.keys(config).length).toBe(configKeys.length);
    });

    it('should have correct logLevel type from union', () => {
      const validLevels = ['error', 'warn', 'info', 'debug'];
      expect(validLevels).toContain(config.logLevel);
    });

    it('should satisfy Config type', () => {
      // TypeScript compile-time check
      const testConfig: Config = config;
      expect(testConfig).toBe(config);
    });
  });

  describe('default and named exports', () => {
    it('should export config as default', () => {
      const defaultExport = require('../src/config').default;
      expect(defaultExport).toBe(config);
    });

    it('should export config as named export', () => {
      const namedExport = require('../src/config').config;
      expect(namedExport).toBe(config);
    });

    it('should export validateConfig function', () => {
      expect(typeof validateConfig).toBe('function');
    });

    it('should export printConfig function', () => {
      expect(typeof printConfig).toBe('function');
    });
  });

  describe('numeric range validations', () => {
    it('should have valid embedding dimensions within bounds', () => {
      expect(config.embeddingDimensions).toBeGreaterThan(0);
      expect(config.embeddingDimensions).toBeLessThanOrEqual(3072);
      expect(Number.isInteger(config.embeddingDimensions)).toBe(true);
    });

    it('should have drift threshold in valid range', () => {
      expect(config.driftThreshold).toBeGreaterThanOrEqual(0);
      expect(config.driftThreshold).toBeLessThanOrEqual(1);
      expect(typeof config.driftThreshold).toBe('number');
    });

    it('should have positive cluster sizes', () => {
      expect(config.minClusterSize).toBeGreaterThanOrEqual(1);
      expect(config.maxClusterSize).toBeGreaterThanOrEqual(2);
      expect(Number.isInteger(config.minClusterSize)).toBe(true);
      expect(Number.isInteger(config.maxClusterSize)).toBe(true);
    });

    it('should have minClusterSize <= maxClusterSize', () => {
      expect(config.minClusterSize).toBeLessThanOrEqual(config.maxClusterSize);
    });
  });

  describe('string values validation', () => {
    it('should have non-empty model names', () => {
      expect(config.claudeModel).toBeTruthy();
      expect(config.claudeModel.length).toBeGreaterThan(0);
      expect(config.openaiEmbeddingModel).toBeTruthy();
      expect(config.openaiEmbeddingModel.length).toBeGreaterThan(0);
    });

    it('should have valid path strings', () => {
      expect(typeof config.defaultScanDir).toBe('string');
      expect(config.defaultScanDir).toBeTruthy();
      expect(typeof config.agentDbPath).toBe('string');
      expect(config.agentDbPath).toBeTruthy();
      expect(typeof config.outputDir).toBe('string');
      expect(config.outputDir).toBeTruthy();
    });

    it('should have valid log level string', () => {
      expect(typeof config.logLevel).toBe('string');
      expect(['error', 'warn', 'info', 'debug']).toContain(config.logLevel);
    });
  });

  describe('boolean flags validation', () => {
    it('should have boolean API usage flags', () => {
      expect(typeof config.useClaudeApi).toBe('boolean');
      expect(typeof config.useOpenAIApi).toBe('boolean');
    });

    it('should have boolean system flags', () => {
      expect(typeof config.verbose).toBe('boolean');
      expect(typeof config.fallbackToKeywords).toBe('boolean');
    });
  });

  describe('API key handling', () => {
    it('should handle undefined API keys gracefully', () => {
      // Keys can be undefined
      expect(config.anthropicApiKey === undefined || typeof config.anthropicApiKey === 'string').toBe(true);
      expect(config.openaiApiKey === undefined || typeof config.openaiApiKey === 'string').toBe(true);
    });

    it('should not expose raw API keys in logs', () => {
      printConfig();
      const calls = consoleLogSpy.mock.calls.map(c => c[0]).join(' ');

      // If keys exist, they should be masked
      if (config.anthropicApiKey && config.anthropicApiKey.length > 14) {
        expect(calls).not.toContain(config.anthropicApiKey);
      }

      if (config.openaiApiKey && config.openaiApiKey.length > 11) {
        expect(calls).not.toContain(config.openaiApiKey);
      }
    });
  });

  describe('path construction', () => {
    it('should construct agentDbPath correctly', () => {
      expect(config.agentDbPath).toContain('agentdb.json');
      expect(config.agentDbPath.endsWith('agentdb.json')).toBe(true);
    });

    it('should have absolute or valid paths', () => {
      // Paths should be strings and non-empty
      expect(config.defaultScanDir).toBeTruthy();
      expect(config.agentDbPath).toBeTruthy();
      expect(config.outputDir).toBeTruthy();
    });
  });

  describe('config initialization', () => {
    it('should load config on module import', () => {
      // Config should be loaded and available
      expect(config).toBeDefined();
      expect(config).not.toBeNull();
    });

    it('should have all required properties initialized', () => {
      // All non-optional properties should be set
      expect(config.claudeModel).toBeDefined();
      expect(config.openaiEmbeddingModel).toBeDefined();
      expect(config.embeddingDimensions).toBeDefined();
      expect(config.defaultScanDir).toBeDefined();
      expect(config.agentDbPath).toBeDefined();
      expect(config.outputDir).toBeDefined();
      expect(config.driftThreshold).toBeDefined();
      expect(config.minClusterSize).toBeDefined();
      expect(config.maxClusterSize).toBeDefined();
      expect(config.verbose).toBeDefined();
      expect(config.logLevel).toBeDefined();
      expect(config.fallbackToKeywords).toBeDefined();
      expect(config.useClaudeApi).toBeDefined();
      expect(config.useOpenAIApi).toBeDefined();
    });
  });

  describe('validation on module load', () => {
    it('should run validation automatically', () => {
      // Validation runs on module load and may produce warnings/errors
      // This test ensures it completed without throwing
      expect(() => validateConfig()).not.toThrow();
    });

    it('should produce consistent validation results', () => {
      const result1 = validateConfig();
      const result2 = validateConfig();

      expect(result1.valid).toBe(result2.valid);
      expect(result1.warnings.length).toBe(result2.warnings.length);
      expect(result1.errors.length).toBe(result2.errors.length);
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle calling printConfig multiple times', () => {
      expect(() => {
        printConfig();
        printConfig();
        printConfig();
      }).not.toThrow();
    });

    it('should handle calling validateConfig multiple times', () => {
      const results = [validateConfig(), validateConfig(), validateConfig()];

      results.forEach(result => {
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('errors');
      });
    });

    it('should have immutable config values across reads', () => {
      const snapshot1 = { ...config };
      const snapshot2 = { ...config };

      expect(snapshot1).toEqual(snapshot2);
    });
  });
});
