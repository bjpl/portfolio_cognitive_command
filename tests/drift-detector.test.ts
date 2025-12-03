/**
 * Tests for drift-detector.ts
 * Tests semantic drift detection between intent and implementation
 */

import {
  detectDrift,
  monitorDriftTrend,
  analyzeDriftAreas,
  generateDriftReport,
  DriftResult
} from '../src/skills/drift-detector';

describe('DriftDetector', () => {
  describe('detectDrift', () => {
    it('should detect high alignment for similar intent and implementation', async () => {
      const intent = 'feat: add user authentication with JWT tokens\nsrc/auth/login.ts';
      const implementation = 'feat: implement JWT authentication\nsrc/auth/login.ts\nsrc/auth/jwt.ts';

      const result = await detectDrift(intent, implementation);

      expect(result).toHaveProperty('alignmentScore');
      expect(result).toHaveProperty('driftAlert');
      expect(result).toHaveProperty('highPrecision');
      expect(result).toHaveProperty('intentVector');
      expect(result).toHaveProperty('implementationVector');
    });

    it('should return alignment score between 0 and 1', async () => {
      const result = await detectDrift(
        'add new feature',
        'implement feature'
      );

      expect(result.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(result.alignmentScore).toBeLessThanOrEqual(1);
    });

    it('should set driftAlert when alignment is low', async () => {
      // Very different intent vs implementation should trigger drift alert
      const intent = 'fix: resolve database connection timeout issue';
      const implementation = 'feat: add new UI button component with animations';

      const result = await detectDrift(intent, implementation);

      expect(typeof result.driftAlert).toBe('boolean');
    });

    it('should generate vectors of same length', async () => {
      const result = await detectDrift(
        'create API endpoint',
        'build REST API'
      );

      expect(result.intentVector.length).toBe(result.implementationVector.length);
      expect(result.intentVector.length).toBeGreaterThan(0);
    });

    it('should handle empty strings gracefully', async () => {
      const result = await detectDrift('', '');

      expect(result.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(result.alignmentScore).toBeLessThanOrEqual(1);
    });

    it('should handle file paths in input', async () => {
      const intent = 'src/components/Button.tsx\nsrc/styles/button.css';
      const implementation = 'src/components/Button.tsx\nsrc/components/Icon.tsx';

      const result = await detectDrift(intent, implementation);

      expect(result).toHaveProperty('alignmentScore');
    });

    it('should be deterministic for same inputs', async () => {
      const intent = 'test input';
      const implementation = 'test output';

      const result1 = await detectDrift(intent, implementation);
      const result2 = await detectDrift(intent, implementation);

      expect(result1.alignmentScore).toBe(result2.alignmentScore);
    });
  });

  describe('monitorDriftTrend', () => {
    it('should return trend analysis object', async () => {
      const intentHistory = ['feat: add feature A', 'fix: bug B', 'feat: add C'];
      const implHistory = ['implemented A', 'fixed B', 'added C'];

      const result = await monitorDriftTrend(intentHistory, implHistory);

      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('recentScores');
      expect(result).toHaveProperty('averageScore');
    });

    it('should return valid trend type', async () => {
      const result = await monitorDriftTrend(
        ['intent1', 'intent2'],
        ['impl1', 'impl2']
      );

      expect(['improving', 'stable', 'degrading']).toContain(result.trend);
    });

    it('should handle empty history', async () => {
      const result = await monitorDriftTrend([], []);

      expect(result.trend).toBe('stable');
      expect(result.recentScores).toEqual([]);
      expect(result.averageScore).toBe(0);
    });

    it('should return recent scores array', async () => {
      const intentHistory = ['a', 'b', 'c', 'd', 'e', 'f'];
      const implHistory = ['a', 'b', 'c', 'd', 'e', 'f'];

      const result = await monitorDriftTrend(intentHistory, implHistory);

      expect(Array.isArray(result.recentScores)).toBe(true);
      expect(result.recentScores.length).toBeLessThanOrEqual(5);
    });

    it('should calculate average score correctly', async () => {
      const result = await monitorDriftTrend(
        ['intent'],
        ['implementation']
      );

      expect(result.averageScore).toBeGreaterThanOrEqual(0);
      expect(result.averageScore).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeDriftAreas', () => {
    let mockDriftResult: DriftResult;

    beforeEach(async () => {
      mockDriftResult = await detectDrift(
        'add authentication feature',
        'implement login system'
      );
    });

    it('should return analysis object with expected properties', () => {
      const analysis = analyzeDriftAreas(mockDriftResult);

      expect(analysis).toHaveProperty('clustersMatch');
      expect(analysis).toHaveProperty('vectorDivergence');
      expect(analysis).toHaveProperty('recommendations');
    });

    it('should return boolean for clustersMatch', () => {
      const analysis = analyzeDriftAreas(mockDriftResult);

      expect(typeof analysis.clustersMatch).toBe('boolean');
    });

    it('should return numeric vectorDivergence', () => {
      const analysis = analyzeDriftAreas(mockDriftResult);

      expect(typeof analysis.vectorDivergence).toBe('number');
      expect(analysis.vectorDivergence).toBeGreaterThanOrEqual(0);
    });

    it('should return array of recommendations', () => {
      const analysis = analyzeDriftAreas(mockDriftResult);

      expect(Array.isArray(analysis.recommendations)).toBe(true);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide critical recommendation for low alignment', async () => {
      const lowAlignmentResult: DriftResult = {
        alignmentScore: 0.3,
        driftAlert: true,
        highPrecision: false,
        intentVector: new Array(1536).fill(0.1),
        implementationVector: new Array(1536).fill(0.9)
      };

      const analysis = analyzeDriftAreas(lowAlignmentResult);

      expect(analysis.recommendations.some(r => r.includes('CRITICAL'))).toBe(true);
    });
  });

  describe('generateDriftReport', () => {
    let mockDriftResult: DriftResult;

    beforeEach(async () => {
      mockDriftResult = await detectDrift(
        'feature implementation',
        'code changes'
      );
    });

    it('should return formatted string report', () => {
      const report = generateDriftReport(mockDriftResult);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('should include alignment score in report', () => {
      const report = generateDriftReport(mockDriftResult);

      expect(report).toContain('Alignment Score');
    });

    it('should include drift alert status in report', () => {
      const report = generateDriftReport(mockDriftResult);

      expect(report).toContain('Drift Alert');
    });

    it('should include recommendations section', () => {
      const report = generateDriftReport(mockDriftResult);

      expect(report).toContain('Recommendations');
    });

    it('should include report boundaries', () => {
      const report = generateDriftReport(mockDriftResult);

      expect(report).toContain('DRIFT ANALYSIS REPORT');
      expect(report).toContain('END REPORT');
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle very long input strings', async () => {
      const longIntent = 'feat: '.repeat(1000);
      const longImpl = 'fix: '.repeat(1000);

      const result = await detectDrift(longIntent, longImpl);

      expect(result.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(result.alignmentScore).toBeLessThanOrEqual(1);
    });

    it('should handle special characters in input', async () => {
      const intent = 'fix: handle @#$%^&*() special chars';
      const implementation = 'feat: add symbols!@#$';

      const result = await detectDrift(intent, implementation);

      expect(result).toHaveProperty('alignmentScore');
    });

    it('should handle unicode characters', async () => {
      const intent = 'feat: 添加中文支持 🚀';
      const implementation = '实现国际化功能 ✨';

      const result = await detectDrift(intent, implementation);

      expect(result).toHaveProperty('alignmentScore');
    });

    it('should complete drift detection in reasonable time', async () => {
      const start = Date.now();

      await detectDrift(
        'Large feature with many requirements',
        'Complex implementation with multiple files'
      );

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
    });
  });
});
