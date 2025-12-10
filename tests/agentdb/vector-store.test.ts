/**
 * Comprehensive Tests for AgentDB Vector Store
 * Tests vector storage, HNSW indexing, similarity search, and persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VectorStore, HNSWIndex, createVectorStore, VectorDocument } from '../../src/agentdb/vector-store';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a test vector with deterministic values
 */
function createTestVector(seed: number, dimensions: number = 128): number[] {
  const vector: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    vector.push(Math.sin(seed * (i + 1)) * 0.5 + 0.5);
  }
  // Normalize
  const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / mag);
}

/**
 * Creates a vector similar to another with controlled similarity
 */
function createSimilarVector(base: number[], noise: number = 0.1): number[] {
  const similar = base.map(v => v + (Math.random() - 0.5) * noise);
  const mag = Math.sqrt(similar.reduce((sum, v) => sum + v * v, 0));
  return similar.map(v => v / mag);
}

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vector-store-test-'));
});

afterEach(async () => {
  try {
    await fs.promises.rm(tempDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});

// ============================================================================
// VectorStore Basic Operations
// ============================================================================

describe('VectorStore', () => {
  describe('Basic Operations', () => {
    it('should create vector store with default dimensions', () => {
      const store = createVectorStore();
      expect(store).toBeDefined();
      expect(store.size()).toBe(0);
    });

    it('should create vector store with custom dimensions', () => {
      const store = createVectorStore(64);
      expect(store).toBeDefined();
    });

    it('should add vectors with metadata', async () => {
      const store = createVectorStore(128);
      const vector = createTestVector(1, 128);

      const doc = await store.add('test-1', vector, { type: 'test' });

      expect(doc.id).toBe('test-1');
      expect(doc.vector).toEqual(vector);
      expect(doc.metadata.type).toBe('test');
      expect(store.size()).toBe(1);
    });

    it('should retrieve vector by ID', async () => {
      const store = createVectorStore(128);
      const vector = createTestVector(1, 128);

      await store.add('test-1', vector, { label: 'first' });

      const retrieved = await store.get('test-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('test-1');
      expect(retrieved!.vector).toEqual(vector);
      expect(retrieved!.metadata.label).toBe('first');
    });

    it('should delete vectors', async () => {
      const store = createVectorStore(128);
      const vector = createTestVector(1, 128);

      await store.add('test-1', vector);
      expect(store.size()).toBe(1);

      const deleted = await store.delete('test-1');

      expect(deleted).toBe(true);
      expect(store.size()).toBe(0);

      const retrieved = await store.get('test-1');
      expect(retrieved).toBeNull();
    });

    it('should return null for non-existent vectors', async () => {
      const store = createVectorStore(128);

      const retrieved = await store.get('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent vector', async () => {
      const store = createVectorStore(128);

      const deleted = await store.delete('non-existent');

      expect(deleted).toBe(false);
    });

    it('should throw error for dimension mismatch on add', async () => {
      const store = createVectorStore(128);
      const wrongVector = createTestVector(1, 64);

      await expect(store.add('test-1', wrongVector)).rejects.toThrow(/dimension/i);
    });
  });

  // ============================================================================
  // Vector Search Tests
  // ============================================================================

  describe('Vector Search', () => {
    it('should find exact match with similarity close to 1.0', async () => {
      const store = createVectorStore(128);
      const vector = createTestVector(42, 128);

      await store.add('exact', vector, { type: 'target' });

      const results = await store.search(vector, 1);

      expect(results.length).toBe(1);
      expect(results[0].doc.id).toBe('exact');
      expect(results[0].similarity).toBeCloseTo(1.0, 1);
    });

    it('should find similar vectors in correct order', async () => {
      const store = createVectorStore(128);
      const baseVector = createTestVector(1, 128);

      // Add vectors with decreasing similarity
      await store.add('exact', baseVector);
      await store.add('similar', createSimilarVector(baseVector, 0.2));
      await store.add('different', createTestVector(999, 128));

      const results = await store.search(baseVector, 3);

      expect(results.length).toBe(3);
      expect(results[0].doc.id).toBe('exact');
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
      expect(results[1].similarity).toBeGreaterThan(results[2].similarity);
    });

    it('should respect limit parameter', async () => {
      const store = createVectorStore(128);

      // Add 10 vectors
      for (let i = 0; i < 10; i++) {
        await store.add(`vec-${i}`, createTestVector(i, 128));
      }

      const query = createTestVector(5, 128);
      const results = await store.search(query, 3);

      expect(results.length).toBe(3);
    });

    it('should return empty array for no matches when store is empty', async () => {
      const store = createVectorStore(128);
      const query = createTestVector(1, 128);

      const results = await store.search(query, 5);

      expect(results).toEqual([]);
    });

    it('should handle high-dimensional vectors (1536 dimensions)', async () => {
      const store = createVectorStore(1536);
      const vector = createTestVector(1, 1536);

      await store.add('high-dim', vector);

      const results = await store.search(vector, 1);

      expect(results.length).toBe(1);
      expect(results[0].similarity).toBeCloseTo(1.0, 1);
    });

    it('should throw error for dimension mismatch on search', async () => {
      const store = createVectorStore(128);
      await store.add('test', createTestVector(1, 128));

      const wrongQuery = createTestVector(1, 64);

      await expect(store.search(wrongQuery, 5)).rejects.toThrow(/dimension/i);
    });
  });

  // ============================================================================
  // HNSW Index Tests
  // ============================================================================

  describe('HNSW Index', () => {
    it('should create index with specified dimensions', () => {
      const index = new HNSWIndex(128);
      expect(index.size()).toBe(0);
    });

    it('should insert and search vectors', () => {
      const index = new HNSWIndex(64);
      const vec1 = createTestVector(1, 64);
      const vec2 = createTestVector(2, 64);

      index.insert('v1', vec1);
      index.insert('v2', vec2);

      expect(index.size()).toBe(2);

      const results = index.search(vec1, 2);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe('v1');
    });

    it('should return k nearest neighbors', () => {
      const index = new HNSWIndex(64);

      for (let i = 0; i < 20; i++) {
        index.insert(`v-${i}`, createTestVector(i, 64));
      }

      const query = createTestVector(5, 64);
      const results = index.search(query, 5);

      expect(results.length).toBe(5);
      expect(results[0].id).toBe('v-5'); // Exact match should be first
    });

    it('should handle empty index', () => {
      const index = new HNSWIndex(64);

      const results = index.search(createTestVector(1, 64), 5);

      expect(results).toEqual([]);
    });

    it('should handle single vector', () => {
      const index = new HNSWIndex(64);
      const vec = createTestVector(1, 64);

      index.insert('only', vec);

      const results = index.search(vec, 5);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('only');
    });

    it('should maintain correct size after deletions', () => {
      const index = new HNSWIndex(64);

      index.insert('v1', createTestVector(1, 64));
      index.insert('v2', createTestVector(2, 64));
      index.insert('v3', createTestVector(3, 64));

      expect(index.size()).toBe(3);

      index.remove('v2');

      expect(index.size()).toBe(2);
    });
  });

  // ============================================================================
  // Persistence Tests
  // ============================================================================

  describe('Persistence', () => {
    it('should persist store to file', async () => {
      const store = createVectorStore(128);
      await store.add('test-1', createTestVector(1, 128), { label: 'first' });
      await store.add('test-2', createTestVector(2, 128), { label: 'second' });

      const filePath = path.join(tempDir, 'store.json');
      await store.persist(filePath);

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should load store from file', async () => {
      const store = createVectorStore(128);
      await store.add('test-1', createTestVector(1, 128), { label: 'first' });

      const filePath = path.join(tempDir, 'store.json');
      await store.persist(filePath);

      const loadedStore = createVectorStore(128);
      await loadedStore.load(filePath);

      expect(loadedStore.size()).toBe(1);

      const doc = await loadedStore.get('test-1');
      expect(doc).not.toBeNull();
      expect(doc!.metadata.label).toBe('first');
    });

    it('should maintain search accuracy after reload', async () => {
      const store = createVectorStore(128);
      const targetVector = createTestVector(42, 128);

      await store.add('target', targetVector);
      await store.add('other-1', createTestVector(1, 128));
      await store.add('other-2', createTestVector(2, 128));

      const filePath = path.join(tempDir, 'store.json');
      await store.persist(filePath);

      const loadedStore = createVectorStore(128);
      await loadedStore.load(filePath);

      const results = await loadedStore.search(targetVector, 1);

      expect(results.length).toBe(1);
      expect(results[0].doc.id).toBe('target');
      expect(results[0].similarity).toBeCloseTo(1.0, 1);
    });

    it('should create directory if it does not exist', async () => {
      const store = createVectorStore(128);
      await store.add('test', createTestVector(1, 128));

      const nestedPath = path.join(tempDir, 'nested', 'dir', 'store.json');
      await store.persist(nestedPath);

      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  // ============================================================================
  // Performance and Edge Cases
  // ============================================================================

  describe('Performance and Edge Cases', () => {
    it('should handle large number of vectors', async () => {
      const store = createVectorStore(64);

      // Add 100 vectors
      for (let i = 0; i < 100; i++) {
        await store.add(`vec-${i}`, createTestVector(i, 64));
      }

      expect(store.size()).toBe(100);

      const query = createTestVector(50, 64);
      const results = await store.search(query, 5);

      expect(results.length).toBe(5);
      expect(results[0].doc.id).toBe('vec-50');
    });

    it('should handle vectors with all zeros', async () => {
      const store = createVectorStore(64);
      const zeroVector = new Array(64).fill(0);

      await store.add('zero', zeroVector);

      const doc = await store.get('zero');
      expect(doc).not.toBeNull();
      expect(doc!.vector.every(v => v === 0)).toBe(true);
    });

    it('should handle vectors with negative values', async () => {
      const store = createVectorStore(64);
      const vector = createTestVector(1, 64).map(v => v - 0.5);

      await store.add('negative', vector);

      const results = await store.search(vector, 1);
      expect(results.length).toBe(1);
    });

    it('should handle concurrent operations', async () => {
      const store = createVectorStore(64);

      // Add vectors concurrently
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(store.add(`vec-${i}`, createTestVector(i, 64)));
      }

      await Promise.all(promises);

      expect(store.size()).toBe(20);
    });

    it('should maintain precision with similar vectors', async () => {
      const store = createVectorStore(128);
      const base = createTestVector(1, 128);

      // Add very similar vectors
      await store.add('base', base);
      await store.add('similar-1', createSimilarVector(base, 0.01));
      await store.add('similar-2', createSimilarVector(base, 0.05));

      const results = await store.search(base, 3);

      expect(results.length).toBe(3);
      // All should have high similarity due to low noise
      expect(results[0].similarity).toBeGreaterThan(0.9);
    });

    it('should clear all documents', async () => {
      const store = createVectorStore(64);

      await store.add('v1', createTestVector(1, 64));
      await store.add('v2', createTestVector(2, 64));

      expect(store.size()).toBe(2);

      store.clear();

      expect(store.size()).toBe(0);
    });
  });
});
