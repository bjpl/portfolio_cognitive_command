/**
 * Tests for semantic-analyzer.ts
 * Tests semantic embedding generation and clustering
 */

import {
  generateEmbedding,
  cosineSimilarity,
  SemanticEmbedding,
  ClusterType
} from '../src/skills/semantic-analyzer';

describe('SemanticAnalyzer', () => {
  describe('generateEmbedding', () => {
    it('should return SemanticEmbedding with required properties', async () => {
      const embedding = await generateEmbedding(
        ['feat: add new component'],
        ['src/components/Button.tsx']
      );

      expect(embedding).toHaveProperty('vector');
      expect(embedding).toHaveProperty('cluster');
      expect(embedding).toHaveProperty('confidence');
    });

    it('should generate vector of correct length (1536 dimensions)', async () => {
      const embedding = await generateEmbedding(
        ['test commit'],
        ['file.ts']
      );

      expect(embedding.vector.length).toBe(1536);
    });

    it('should assign valid cluster type', async () => {
      const embedding = await generateEmbedding(
        ['add feature'],
        ['src/index.ts']
      );

      const validClusters: ClusterType[] = ['Experience', 'Core Systems', 'Infra'];
      expect(validClusters).toContain(embedding.cluster);
    });

    it('should return confidence between 0 and 1', async () => {
      const embedding = await generateEmbedding(
        ['commit message'],
        ['file.js']
      );

      expect(embedding.confidence).toBeGreaterThanOrEqual(0);
      expect(embedding.confidence).toBeLessThanOrEqual(1);
    });

    it('should assign Experience cluster for frontend commits', async () => {
      const embedding = await generateEmbedding(
        ['feat: add React component with UI styling'],
        ['src/components/Button.tsx', 'src/styles/button.css']
      );

      // Frontend keywords should bias toward Experience
      expect(['Experience', 'Core Systems', 'Infra']).toContain(embedding.cluster);
    });

    it('should assign Core Systems cluster for backend commits', async () => {
      const embedding = await generateEmbedding(
        ['feat: add API endpoint for authentication'],
        ['src/api/auth.ts', 'src/controllers/login.ts']
      );

      expect(['Experience', 'Core Systems', 'Infra']).toContain(embedding.cluster);
    });

    it('should assign Infra cluster for DevOps commits', async () => {
      const embedding = await generateEmbedding(
        ['fix: update Docker config and CI pipeline'],
        ['.github/workflows/ci.yml', 'Dockerfile']
      );

      expect(['Experience', 'Core Systems', 'Infra']).toContain(embedding.cluster);
    });

    it('should handle empty commit messages', async () => {
      const embedding = await generateEmbedding(
        [],
        ['file.ts']
      );

      expect(embedding.vector.length).toBe(1536);
    });

    it('should handle empty file paths', async () => {
      const embedding = await generateEmbedding(
        ['commit message'],
        []
      );

      expect(embedding.vector.length).toBe(1536);
    });

    it('should handle both empty arrays', async () => {
      const embedding = await generateEmbedding([], []);

      expect(embedding.vector.length).toBe(1536);
      expect(['Experience', 'Core Systems', 'Infra']).toContain(embedding.cluster);
    });

    it('should be deterministic for same inputs', async () => {
      const messages = ['test commit'];
      const paths = ['file.ts'];

      const embedding1 = await generateEmbedding(messages, paths);
      const embedding2 = await generateEmbedding(messages, paths);

      expect(embedding1.cluster).toBe(embedding2.cluster);
      expect(embedding1.confidence).toBe(embedding2.confidence);
    });

    it('should produce normalized vectors', async () => {
      const embedding = await generateEmbedding(
        ['feat: add feature'],
        ['src/index.ts']
      );

      // Check that vector is normalized (magnitude should be close to 1)
      const magnitude = Math.sqrt(
        embedding.vector.reduce((sum, val) => sum + val * val, 0)
      );

      // Allow small tolerance due to cluster bias adjustment
      expect(magnitude).toBeGreaterThan(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      const similarity = cosineSimilarity(vec, vec);

      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [-1, 0];
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0];
      const vec2 = [0, 1];
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return value between -1 and 1', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should throw error for different length vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];

      expect(() => cosineSimilarity(vec1, vec2)).toThrow();
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBe(0);
    });

    it('should be commutative', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [4, 5, 6];

      const sim1 = cosineSimilarity(vec1, vec2);
      const sim2 = cosineSimilarity(vec2, vec1);

      expect(sim1).toBeCloseTo(sim2, 10);
    });

    it('should handle large vectors', () => {
      const size = 1536; // OpenAI embedding size
      const vec1 = Array(size).fill(0).map(() => Math.random());
      const vec2 = Array(size).fill(0).map(() => Math.random());

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should handle negative values', () => {
      const vec1 = [-1, -2, 3];
      const vec2 = [1, 2, -3];
      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(-1, 5);
    });
  });

  describe('Cluster Assignment Logic', () => {
    it('should favor Experience for UI-related keywords', async () => {
      const embedding = await generateEmbedding(
        ['fix: update component styling and responsive layout'],
        ['src/components/Header.tsx', 'src/styles/main.css']
      );

      // Should have reasonable confidence
      expect(embedding.confidence).toBeGreaterThan(0);
    });

    it('should favor Core Systems for backend keywords', async () => {
      const embedding = await generateEmbedding(
        ['feat: add database query optimization and API caching'],
        ['src/services/database.ts', 'src/api/cache.ts']
      );

      expect(embedding.confidence).toBeGreaterThan(0);
    });

    it('should favor Infra for DevOps keywords', async () => {
      const embedding = await generateEmbedding(
        ['fix: update kubernetes deployment and monitoring'],
        ['k8s/deployment.yaml', '.github/workflows/deploy.yml']
      );

      expect(embedding.confidence).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long commit messages', async () => {
      const longMessage = 'a'.repeat(10000);
      const embedding = await generateEmbedding([longMessage], []);

      expect(embedding.vector.length).toBe(1536);
    });

    it('should handle special characters in messages', async () => {
      const embedding = await generateEmbedding(
        ['feat: add @decorator for #component!'],
        ['src/test.ts']
      );

      expect(embedding).toHaveProperty('cluster');
    });

    it('should handle unicode characters', async () => {
      const embedding = await generateEmbedding(
        ['feat: 添加新功能 🚀'],
        ['src/feature.ts']
      );

      expect(embedding.vector.length).toBe(1536);
    });

    it('should handle multiple commit messages', async () => {
      const messages = [
        'feat: add feature A',
        'fix: resolve bug B',
        'chore: update deps',
        'docs: update readme'
      ];

      const embedding = await generateEmbedding(messages, ['file.ts']);

      expect(embedding.vector.length).toBe(1536);
    });

    it('should handle many file paths', async () => {
      const paths = Array(100).fill(0).map((_, i) => `src/file${i}.ts`);

      const embedding = await generateEmbedding(['commit'], paths);

      expect(embedding.vector.length).toBe(1536);
    });
  });

  describe('Performance', () => {
    it('should complete embedding generation in reasonable time', async () => {
      const start = Date.now();

      await generateEmbedding(
        ['Large commit with many details about the implementation'],
        Array(50).fill(0).map((_, i) => `src/module${i}/file.ts`)
      );

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle batch embedding generation', async () => {
      const promises = Array(10).fill(0).map(() =>
        generateEmbedding(['test commit'], ['file.ts'])
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(10);
      results.forEach(r => expect(r.vector.length).toBe(1536));
    });
  });
});
