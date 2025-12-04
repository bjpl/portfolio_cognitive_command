/**
 * Unit Tests for AgentDB Storage Module
 * Tests FileStorageBackend implementation with comprehensive coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileStorageBackend } from '../../src/agentdb/storage';
import {
  Document,
  CollectionName,
  AgentState,
  SessionState,
  QueryFilter,
  QueryOptions,
} from '../../src/agentdb/types';

// Helper to create temporary test directory
function createTempDir(): string {
  const tmpDir = path.join(os.tmpdir(), `agentdb-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

// Helper to create test document
function createTestDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: `test-${Date.now()}`,
    collection: 'agents' as CollectionName,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    version: 1,
    ...overrides,
  };
}

describe('FileStorageBackend', () => {
  let storage: FileStorageBackend;
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    storage = new FileStorageBackend(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // Constructor & Initialization Tests
  // ============================================================================

  describe('constructor', () => {
    it('should create storage backend with default path', () => {
      const defaultStorage = new FileStorageBackend();
      expect(defaultStorage).toBeInstanceOf(FileStorageBackend);
    });

    it('should create storage backend with custom path', () => {
      expect(storage).toBeInstanceOf(FileStorageBackend);
    });

    it('should create all collection directories on initialization', () => {
      const expectedDirs = [
        path.join(tempDir, 'agents', 'data'),
        path.join(tempDir, 'agents', 'skills'),
        path.join(tempDir, 'agents', 'patterns'),
        path.join(tempDir, 'sessions', 'data'),
        path.join(tempDir, 'sessions', 'worldstates'),
        path.join(tempDir, 'sessions', 'analyses'),
        path.join(tempDir, 'sessions', 'alerts'),
        path.join(tempDir, 'sessions', 'metrics'),
      ];

      for (const dir of expectedDirs) {
        expect(fs.existsSync(dir)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Save Operation Tests
  // ============================================================================

  describe('save', () => {
    it('should save a new document with metadata', async () => {
      const doc = createTestDocument({ id: 'agent-1' });
      const saved = await storage.save('agents', doc);

      expect(saved.id).toBe('agent-1');
      expect(saved.collection).toBe('agents');
      expect(saved.version).toBe(2); // incremented from 1
      expect(saved.createdAt).toEqual(doc.createdAt);
      expect(saved.updatedAt).toBeInstanceOf(Date);
      expect(saved.updatedAt.getTime()).toBeGreaterThanOrEqual(doc.updatedAt.getTime());
    });

    it('should create document with default createdAt if missing', async () => {
      const doc = { ...createTestDocument({ id: 'agent-2' }) };
      delete (doc as Partial<Document>).createdAt;

      const saved = await storage.save('agents', doc as Document);

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should increment version on save', async () => {
      const doc = createTestDocument({ id: 'agent-3', version: 5 });
      const saved = await storage.save('agents', doc);

      expect(saved.version).toBe(6);
    });

    it('should write document to correct file path', async () => {
      const doc = createTestDocument({ id: 'agent-4' });
      await storage.save('agents', doc);

      const filePath = path.join(tempDir, 'agents', 'data', 'agent-4.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should save document with complex nested data', async () => {
      const complexDoc: AgentState = {
        ...createTestDocument({ id: 'agent-5' }),
        collection: 'agents',
        agentId: 'agent-5',
        role: 'analyzer',
        name: 'Test Agent',
        status: 'active',
        lastActivity: new Date('2025-01-02T00:00:00Z'),
        capabilities: [
          { name: 'scan', version: '1.0.0', parameters: { depth: 3 } },
        ],
        config: { timeout: 5000 },
        tasksCompleted: 10,
        tasksFailedCount: 1,
        averageExecutionTime: 1500,
        sessionIds: ['session-1', 'session-2'],
        skillIds: ['skill-1'],
        tags: ['test', 'development'],
        customData: { key: 'value' },
      };

      const saved = await storage.save('agents', complexDoc);
      expect(saved.capabilities).toEqual(complexDoc.capabilities);
      expect(saved.config).toEqual(complexDoc.config);
      expect(saved.tags).toEqual(complexDoc.tags);
    });
  });

  // ============================================================================
  // Load Operation Tests
  // ============================================================================

  describe('load', () => {
    it('should load existing document', async () => {
      const doc = createTestDocument({ id: 'agent-10' });
      await storage.save('agents', doc);

      const loaded = await storage.load('agents', 'agent-10');

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('agent-10');
      expect(loaded!.collection).toBe('agents');
    });

    it('should return null for non-existent document', async () => {
      const loaded = await storage.load('agents', 'non-existent');

      expect(loaded).toBeNull();
    });

    it('should deserialize dates correctly', async () => {
      const doc = createTestDocument({ id: 'agent-11' });
      await storage.save('agents', doc);

      const loaded = await storage.load('agents', 'agent-11');

      expect(loaded!.createdAt).toBeInstanceOf(Date);
      expect(loaded!.updatedAt).toBeInstanceOf(Date);
    });

    it('should deserialize nested dates in arrays', async () => {
      const sessionDoc: SessionState = {
        ...createTestDocument({ id: 'session-1' }),
        collection: 'sessions',
        sessionId: 'session-1',
        name: 'Test Session',
        description: 'Test',
        status: 'active',
        startedAt: new Date('2025-01-01T10:00:00Z'),
        agentIds: [],
        decisions: [
          {
            timestamp: new Date('2025-01-01T10:30:00Z'),
            description: 'Decision 1',
            rationale: 'Rationale 1',
          },
        ],
        conversationSummary: 'Summary',
        metrics: {
          duration: 1000,
          agentsUsed: 1,
          tasksCompleted: 5,
          filesModified: 3,
        },
        worldStateIds: [],
        analysisIds: [],
        artifactPaths: [],
        tags: [],
        customData: {},
      };

      await storage.save('sessions', sessionDoc);
      const loaded = await storage.load<SessionState>('sessions', 'session-1');

      expect(loaded!.decisions[0].timestamp).toBeInstanceOf(Date);
      expect(loaded!.startedAt).toBeInstanceOf(Date);
    });

    it('should throw error for read errors other than ENOENT', async () => {
      const doc = createTestDocument({ id: 'agent-12' });
      await storage.save('agents', doc);

      // Make file unreadable (if supported on platform)
      const filePath = path.join(tempDir, 'agents', 'data', 'agent-12.json');
      try {
        fs.chmodSync(filePath, 0o000);
        await expect(storage.load('agents', 'agent-12')).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        fs.chmodSync(filePath, 0o644);
      }
    });
  });

  // ============================================================================
  // Update Operation Tests
  // ============================================================================

  describe('update', () => {
    it('should update existing document', async () => {
      const doc = createTestDocument({ id: 'agent-20' });
      await storage.save('agents', doc);

      const updated = await storage.update('agents', 'agent-20', {
        version: 10, // This should be overridden
      });

      expect(updated.version).toBe(4); // Original 2, update +1, save +1 = 4
      expect(updated.updatedAt.getTime()).toBeGreaterThan(doc.updatedAt.getTime());
    });

    it('should merge changes without overwriting untouched fields', async () => {
      const agentDoc: AgentState = {
        ...createTestDocument({ id: 'agent-21' }),
        collection: 'agents',
        agentId: 'agent-21',
        role: 'scanner',
        name: 'Original Name',
        status: 'idle',
        lastActivity: new Date(),
        capabilities: [],
        config: { key: 'original' },
        tasksCompleted: 5,
        tasksFailedCount: 0,
        averageExecutionTime: 100,
        sessionIds: [],
        skillIds: [],
        tags: ['original'],
        customData: {},
      };

      await storage.save('agents', agentDoc);

      const updated = await storage.update<AgentState>('agents', 'agent-21', {
        name: 'Updated Name',
        tasksCompleted: 10,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.tasksCompleted).toBe(10);
      expect(updated.role).toBe('scanner'); // Unchanged
      expect(updated.tags).toEqual(['original']); // Unchanged
    });

    it('should preserve id, collection, and createdAt', async () => {
      const doc = createTestDocument({ id: 'agent-22' });
      const saved = await storage.save('agents', doc);

      const updated = await storage.update('agents', 'agent-22', {
        id: 'should-not-change',
        collection: 'sessions' as CollectionName,
        createdAt: new Date('2000-01-01'),
      });

      expect(updated.id).toBe('agent-22');
      expect(updated.collection).toBe('agents');
      expect(updated.createdAt).toEqual(saved.createdAt);
    });

    it('should throw error for non-existent document', async () => {
      await expect(
        storage.update('agents', 'non-existent', { version: 1 })
      ).rejects.toThrow('Document not found: agents/non-existent');
    });

    it('should increment version on update', async () => {
      const doc = createTestDocument({ id: 'agent-23', version: 1 });
      await storage.save('agents', doc);

      const updated = await storage.update('agents', 'agent-23', {});

      expect(updated.version).toBe(4); // 1 -> 2 (save) -> 4 (update+save)
    });
  });

  // ============================================================================
  // Delete Operation Tests
  // ============================================================================

  describe('delete', () => {
    it('should delete existing document', async () => {
      const doc = createTestDocument({ id: 'agent-30' });
      await storage.save('agents', doc);

      const result = await storage.delete('agents', 'agent-30');

      expect(result).toBe(true);
      const loaded = await storage.load('agents', 'agent-30');
      expect(loaded).toBeNull();
    });

    it('should return false for non-existent document', async () => {
      const result = await storage.delete('agents', 'non-existent');

      expect(result).toBe(false);
    });

    it('should remove file from filesystem', async () => {
      const doc = createTestDocument({ id: 'agent-31' });
      await storage.save('agents', doc);

      const filePath = path.join(tempDir, 'agents', 'data', 'agent-31.json');
      expect(fs.existsSync(filePath)).toBe(true);

      await storage.delete('agents', 'agent-31');
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  // ============================================================================
  // List Operation Tests
  // ============================================================================

  describe('list', () => {
    beforeEach(async () => {
      // Create test documents
      for (let i = 1; i <= 5; i++) {
        await storage.save('agents', createTestDocument({ id: `agent-${i}` }));
      }
    });

    it('should list all documents in collection', async () => {
      const result = await storage.list('agents');

      expect(result.documents).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty result for empty collection', async () => {
      const result = await storage.list('sessions');

      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should apply pagination with limit', async () => {
      const result = await storage.list('agents', { limit: 3 });

      expect(result.documents).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('should apply pagination with offset', async () => {
      const result = await storage.list('agents', { offset: 2, limit: 2 });

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(true);
    });

    it('should apply pagination with offset and limit at end', async () => {
      const result = await storage.list('agents', { offset: 3, limit: 5 });

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(false);
    });

    it('should sort documents in ascending order', async () => {
      const options: QueryOptions = {
        sort: { field: 'id', order: 'asc' },
      };

      const result = await storage.list('agents', options);

      expect(result.documents[0].id).toBe('agent-1');
      expect(result.documents[4].id).toBe('agent-5');
    });

    it('should sort documents in descending order', async () => {
      const options: QueryOptions = {
        sort: { field: 'id', order: 'desc' },
      };

      const result = await storage.list('agents', options);

      expect(result.documents[0].id).toBe('agent-5');
      expect(result.documents[4].id).toBe('agent-1');
    });
  });

  // ============================================================================
  // Query Operation Tests
  // ============================================================================

  describe('query', () => {
    beforeEach(async () => {
      // Create test agents with different properties
      const agents: AgentState[] = [
        {
          ...createTestDocument({ id: 'agent-100' }),
          collection: 'agents',
          agentId: 'agent-100',
          role: 'scanner',
          name: 'Scanner Agent',
          status: 'active',
          lastActivity: new Date(),
          capabilities: [],
          config: {},
          tasksCompleted: 10,
          tasksFailedCount: 1,
          averageExecutionTime: 100,
          sessionIds: [],
          skillIds: [],
          tags: ['scanner', 'active'],
          customData: {},
        },
        {
          ...createTestDocument({ id: 'agent-101' }),
          collection: 'agents',
          agentId: 'agent-101',
          role: 'analyzer',
          name: 'Analyzer Agent',
          status: 'idle',
          lastActivity: new Date(),
          capabilities: [],
          config: {},
          tasksCompleted: 20,
          tasksFailedCount: 0,
          averageExecutionTime: 200,
          sessionIds: [],
          skillIds: [],
          tags: ['analyzer', 'idle'],
          customData: {},
        },
        {
          ...createTestDocument({ id: 'agent-102' }),
          collection: 'agents',
          agentId: 'agent-102',
          role: 'analyzer',
          name: 'Another Analyzer',
          status: 'busy',
          lastActivity: new Date(),
          capabilities: [],
          config: {},
          tasksCompleted: 15,
          tasksFailedCount: 2,
          averageExecutionTime: 150,
          sessionIds: [],
          skillIds: [],
          tags: ['analyzer', 'busy'],
          customData: {},
        },
      ];

      for (const agent of agents) {
        await storage.save('agents', agent);
      }
    });

    it('should filter by direct equality', async () => {
      const result = await storage.query<AgentState>('agents', { role: 'scanner' });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].role).toBe('scanner');
    });

    it('should filter by multiple fields (AND logic)', async () => {
      const result = await storage.query<AgentState>('agents', {
        role: 'analyzer',
        status: 'idle',
      });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].id).toBe('agent-101');
    });

    it('should apply sorting to query results', async () => {
      const result = await storage.query<AgentState>(
        'agents',
        { role: 'analyzer' },
        { sort: { field: 'tasksCompleted', order: 'desc' } }
      );

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].tasksCompleted).toBe(20);
      expect(result.documents[1].tasksCompleted).toBe(15);
    });

    it('should apply pagination to query results', async () => {
      const result = await storage.query<AgentState>(
        'agents',
        {},
        { limit: 2, offset: 1 }
      );

      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should apply field projection', async () => {
      const result = await storage.query<AgentState>(
        'agents',
        { role: 'scanner' },
        { projection: ['id', 'name', 'role'] }
      );

      expect(result.documents).toHaveLength(1);
      const doc = result.documents[0];
      expect(doc.id).toBeDefined();
      expect(doc.name).toBeDefined();
      expect(doc.role).toBeDefined();
      expect(doc.status).toBeUndefined();
      expect(doc.tasksCompleted).toBeUndefined();
    });
  });

  // ============================================================================
  // Query Operator Tests
  // ============================================================================

  describe('query operators', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        const agent: AgentState = {
          ...createTestDocument({ id: `agent-${i}` }),
          collection: 'agents',
          agentId: `agent-${i}`,
          role: 'scanner',
          name: `Agent ${i}`,
          status: i % 2 === 0 ? 'active' : 'idle',
          lastActivity: new Date(),
          capabilities: [],
          config: {},
          tasksCompleted: i * 10,
          tasksFailedCount: i % 3,
          averageExecutionTime: i * 100,
          sessionIds: [],
          skillIds: [],
          tags: i <= 5 ? ['group-a'] : ['group-b'],
          customData: {},
        };
        await storage.save('agents', agent);
      }
    });

    it('should filter with $eq operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $eq: 50 },
      });

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].tasksCompleted).toBe(50);
    });

    it('should filter with $ne operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        status: { $ne: 'active' },
      });

      expect(result.documents).toHaveLength(5);
      result.documents.forEach((doc) => {
        expect(doc.status).not.toBe('active');
      });
    });

    it('should filter with $gt operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $gt: 50 },
      });

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach((doc) => {
        expect(doc.tasksCompleted).toBeGreaterThan(50);
      });
    });

    it('should filter with $gte operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $gte: 50 },
      });

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach((doc) => {
        expect(doc.tasksCompleted).toBeGreaterThanOrEqual(50);
      });
    });

    it('should filter with $lt operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $lt: 50 },
      });

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach((doc) => {
        expect(doc.tasksCompleted).toBeLessThan(50);
      });
    });

    it('should filter with $lte operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $lte: 50 },
      });

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach((doc) => {
        expect(doc.tasksCompleted).toBeLessThanOrEqual(50);
      });
    });

    it('should filter with $in operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $in: [10, 30, 50] },
      });

      expect(result.documents).toHaveLength(3);
      result.documents.forEach((doc) => {
        expect([10, 30, 50]).toContain(doc.tasksCompleted);
      });
    });

    it('should filter with $nin operator', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $nin: [10, 20, 30, 40, 50] },
      });

      expect(result.documents).toHaveLength(5);
      result.documents.forEach((doc) => {
        expect([10, 20, 30, 40, 50]).not.toContain(doc.tasksCompleted);
      });
    });

    it('should filter with $exists operator (true)', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $exists: true },
      });

      expect(result.documents).toHaveLength(10);
    });

    it('should filter with $exists operator (false)', async () => {
      const result = await storage.query<AgentState>('agents', {
        nonExistentField: { $exists: false },
      });

      expect(result.documents).toHaveLength(10);
    });

    it('should filter with $regex operator (string)', async () => {
      const result = await storage.query<AgentState>('agents', {
        name: { $regex: 'Agent [1-3]$' },
      });

      expect(result.documents).toHaveLength(3);
    });

    it('should filter with $regex operator (RegExp)', async () => {
      const result = await storage.query<AgentState>('agents', {
        name: { $regex: /Agent [789]/ },
      });

      expect(result.documents).toHaveLength(3);
    });

    it('should combine multiple operators', async () => {
      const result = await storage.query<AgentState>('agents', {
        tasksCompleted: { $gte: 30, $lte: 70 },
      });

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach((doc) => {
        expect(doc.tasksCompleted).toBeGreaterThanOrEqual(30);
        expect(doc.tasksCompleted).toBeLessThanOrEqual(70);
      });
    });
  });

  // ============================================================================
  // Edge Cases & Error Handling
  // ============================================================================

  describe('edge cases', () => {
    it('should handle documents with null values', async () => {
      const doc = {
        ...createTestDocument({ id: 'edge-1' }),
        nullField: null,
      };

      const saved = await storage.save('agents', doc as Document);
      const loaded = await storage.load('agents', 'edge-1');

      expect(loaded).not.toBeNull();
      expect((loaded as unknown as Record<string, unknown>).nullField).toBeNull();
    });

    it('should handle documents with undefined fields', async () => {
      const doc = {
        ...createTestDocument({ id: 'edge-2' }),
        undefinedField: undefined,
      };

      const saved = await storage.save('agents', doc as Document);
      const loaded = await storage.load('agents', 'edge-2');

      expect(loaded).not.toBeNull();
    });

    it('should handle empty query filter', async () => {
      await storage.save('agents', createTestDocument({ id: 'edge-3' }));
      await storage.save('agents', createTestDocument({ id: 'edge-4' }));

      const result = await storage.query('agents', {});

      expect(result.documents.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle query with no matches', async () => {
      await storage.save('agents', createTestDocument({ id: 'edge-5' }));

      const result = await storage.query('agents', {
        nonExistentField: 'impossible-value',
      });

      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle special characters in document IDs', async () => {
      const doc = createTestDocument({ id: 'agent-with-special_chars.123' });
      await storage.save('agents', doc);

      const loaded = await storage.load('agents', 'agent-with-special_chars.123');

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('agent-with-special_chars.123');
    });

    it('should deserialize deeply nested date structures', async () => {
      const deepDoc = {
        ...createTestDocument({ id: 'deep-1' }),
        nested: {
          level1: {
            level2: {
              timestamp: new Date('2025-01-01T12:00:00Z'),
            },
          },
          dates: [new Date('2025-01-02T12:00:00Z'), new Date('2025-01-03T12:00:00Z')],
        },
      };

      await storage.save('agents', deepDoc as unknown as Document);
      const loaded = await storage.load('agents', 'deep-1');

      const nested = (loaded as unknown as Record<string, unknown>).nested as Record<string, unknown>;
      const level1 = nested.level1 as Record<string, unknown>;
      const level2 = level1.level2 as Record<string, unknown>;
      expect(level2.timestamp).toBeInstanceOf(Date);

      const dates = nested.dates as Date[];
      expect(dates[0]).toBeInstanceOf(Date);
      expect(dates[1]).toBeInstanceOf(Date);
    });

    it('should handle projection with non-existent fields', async () => {
      await storage.save('agents', createTestDocument({ id: 'proj-1' }));

      const result = await storage.query('agents', { id: 'proj-1' }, {
        projection: ['id', 'nonExistentField', 'collection'],
      });

      expect(result.documents[0].id).toBeDefined();
      expect(result.documents[0].collection).toBeDefined();
      expect((result.documents[0] as unknown as Record<string, unknown>).nonExistentField).toBeUndefined();
    });

    it('should handle sorting on undefined values', async () => {
      await storage.save('agents', { ...createTestDocument({ id: 'sort-1' }), customField: 5 } as Document);
      await storage.save('agents', { ...createTestDocument({ id: 'sort-2' }), customField: undefined } as Document);
      await storage.save('agents', { ...createTestDocument({ id: 'sort-3' }), customField: 3 } as Document);

      const result = await storage.query('agents', {}, {
        sort: { field: 'customField', order: 'asc' },
      });

      // Should not throw error
      expect(result.documents.length).toBeGreaterThanOrEqual(3);
    });
  });
});
