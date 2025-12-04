/**
 * Tests for SyncManager
 * Comprehensive coverage of synchronization between local storage and MCP memory
 */

import { SyncManager, MCPMemoryTools } from '../../src/agentdb/sync';
import { StorageBackend } from '../../src/agentdb/storage';
import { Document, CollectionName, SyncConfig } from '../../src/agentdb/types';

describe('SyncManager', () => {
  let mockStorage: jest.Mocked<StorageBackend>;
  let mockMCP: jest.Mocked<MCPMemoryTools>;

  beforeEach(() => {
    mockStorage = {
      list: jest.fn(),
      save: jest.fn(),
      load: jest.fn(),
      query: jest.fn(),
    } as unknown as jest.Mocked<StorageBackend>;

    mockMCP = {
      store: jest.fn(),
      retrieve: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    };

    // Default mock implementations
    mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
    mockMCP.list.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create SyncManager with default config', () => {
      const syncManager = new SyncManager(mockStorage, mockMCP);
      expect(syncManager).toBeDefined();
    });

    it('should create SyncManager with custom config', () => {
      const config: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'local',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      expect(syncManager).toBeDefined();
    });

    it('should create SyncManager with sync disabled', () => {
      const config: SyncConfig = {
        enabled: false,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      expect(syncManager).toBeDefined();
    });

    it('should start auto-sync if enabled in config', () => {
      jest.useFakeTimers();

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: true,
        syncInterval: 5000,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);

      // Fast-forward time to trigger auto-sync
      jest.advanceTimersByTime(5000);

      // Should have called list on storage for all collections
      expect(mockStorage.list).toHaveBeenCalled();

      syncManager.destroy();
      jest.useRealTimers();
    });
  });

  describe('Auto-sync Management', () => {
    it('should start auto-sync on interval', async () => {
      jest.useFakeTimers();

      const syncManager = new SyncManager(mockStorage, mockMCP);
      syncManager.startAutoSync(1000);

      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);

      // Should have triggered 3 sync cycles
      expect(mockStorage.list).toHaveBeenCalled();

      syncManager.stopAutoSync();
      jest.useRealTimers();
    });

    it('should stop auto-sync when requested', async () => {
      jest.useFakeTimers();

      const syncManager = new SyncManager(mockStorage, mockMCP);
      syncManager.startAutoSync(1000);

      jest.advanceTimersByTime(1000);
      const callCountAfter1 = mockStorage.list.mock.calls.length;

      syncManager.stopAutoSync();

      jest.advanceTimersByTime(2000);
      const callCountAfter3 = mockStorage.list.mock.calls.length;

      // Should not increase after stopping
      expect(callCountAfter3).toBe(callCountAfter1);

      jest.useRealTimers();
    });

    it('should replace existing auto-sync interval when called twice', () => {
      jest.useFakeTimers();

      const syncManager = new SyncManager(mockStorage, mockMCP);
      syncManager.startAutoSync(1000);
      syncManager.startAutoSync(2000);

      jest.advanceTimersByTime(1000);
      const callsAt1s = mockStorage.list.mock.calls.length;

      jest.advanceTimersByTime(1000);
      const callsAt2s = mockStorage.list.mock.calls.length;

      // Should trigger at 2s, not 1s
      expect(callsAt2s).toBeGreaterThan(callsAt1s);

      syncManager.destroy();
      jest.useRealTimers();
    });
  });

  describe('Disabled Sync', () => {
    it('should return early when sync is disabled in syncAll', async () => {
      const config: SyncConfig = {
        enabled: false,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncAll();

      expect(result.success).toBe(false);
      expect(result.synced).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.errors).toContain('Sync is disabled');
      expect(mockStorage.list).not.toHaveBeenCalled();
    });

    it('should return false when sync is disabled in syncDocument', async () => {
      const config: SyncConfig = {
        enabled: false,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const doc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await syncManager.syncDocument('agents', doc);

      expect(result).toBe(false);
      expect(mockMCP.store).not.toHaveBeenCalled();
    });
  });

  describe('Push Strategy', () => {
    it('should push all local documents to MCP memory', async () => {
      const localDocs: Document[] = [
        {
          id: 'doc1',
          collection: 'agents',
          version: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'doc2',
          collection: 'agents',
          version: 1,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockStorage.list.mockResolvedValue({ documents: localDocs, total: 2, hasMore: false });
      mockMCP.list.mockResolvedValue([]);
      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
      expect(result.conflicts).toBe(0);
      expect(mockMCP.store).toHaveBeenCalledTimes(2);
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        JSON.stringify(localDocs[0]),
        'agentdb/agents'
      );
    });

    it('should handle errors during push', async () => {
      const localDocs: Document[] = [
        {
          id: 'doc1',
          collection: 'agents',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStorage.list.mockResolvedValue({ documents: localDocs, total: 1, hasMore: false });
      mockMCP.store.mockRejectedValue(new Error('MCP store failed'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(false);
      expect(result.synced).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to push');
    });
  });

  describe('Pull Strategy', () => {
    it('should pull all remote documents to local storage', async () => {
      const remoteDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1', 'agents/doc2']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(remoteDoc));
      mockStorage.save.mockResolvedValue(remoteDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'pull',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(true);
      expect(result.synced).toBe(2);
      expect(result.conflicts).toBe(0);
      expect(mockStorage.save).toHaveBeenCalledTimes(2);
    });

    it('should skip null remote values during pull', async () => {
      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(null);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'pull',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(0);
      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should handle errors during pull', async () => {
      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockRejectedValue(new Error('MCP retrieve failed'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'pull',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(false);
      expect(result.synced).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to pull');
    });
  });

  describe('Merge Strategy', () => {
    it('should push local-only documents to remote', async () => {
      const localDoc: Document = {
        id: 'local1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.list.mockResolvedValue({ documents: [localDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue([]);
      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(1);
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/local1',
        JSON.stringify(localDoc),
        'agentdb/agents'
      );
    });

    it('should pull remote-only documents to local', async () => {
      const remoteDoc: Document = {
        id: 'remote1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/remote1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(remoteDoc));
      mockStorage.save.mockResolvedValue(remoteDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(1);
      // Dates are serialized/deserialized through JSON
      expect(mockStorage.save).toHaveBeenCalledWith('agents', expect.objectContaining({
        id: 'remote1',
        version: 1,
      }));
    });

    it('should resolve conflicts for documents in both local and remote', async () => {
      const localDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      };

      const remoteDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockStorage.list.mockResolvedValue({ documents: [localDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(remoteDoc));
      mockMCP.store.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue(localDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(1);
      expect(result.conflicts).toBe(1); // Conflict resolved using 'latest' strategy
      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockMCP.store).toHaveBeenCalled();
    });
  });

  describe('Replace Strategy', () => {
    it('should delete all remote keys and push all local documents', async () => {
      const localDocs: Document[] = [
        {
          id: 'doc1',
          collection: 'agents',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStorage.list.mockResolvedValue({ documents: localDocs, total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/old1', 'agents/old2']);
      mockMCP.delete.mockResolvedValue(true);
      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'replace',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(1);
      expect(mockMCP.delete).toHaveBeenCalledTimes(2);
      expect(mockMCP.store).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during delete in replace', async () => {
      const localDocs: Document[] = [
        {
          id: 'doc1',
          collection: 'agents',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStorage.list.mockResolvedValue({ documents: localDocs, total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/old1']);
      mockMCP.delete.mockRejectedValue(new Error('Delete failed'));
      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'replace',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to delete remote');
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should prefer local version with "local" resolution', async () => {
      const localDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const remoteDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      };

      mockStorage.list.mockResolvedValue({ documents: [localDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(remoteDoc));
      mockMCP.store.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue(localDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'local',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      await syncManager.syncCollection('agents');

      // Should save local version to both storage and MCP
      expect(mockStorage.save).toHaveBeenCalledWith('agents', expect.objectContaining({
        id: 'doc1',
        version: 1,
      }));
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        expect.any(String),
        'agentdb/agents'
      );
    });

    it('should prefer remote version with "remote" resolution', async () => {
      const localDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      };

      const remoteDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockStorage.list.mockResolvedValue({ documents: [localDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(remoteDoc));
      mockMCP.store.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue(remoteDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'remote',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      await syncManager.syncCollection('agents');

      // Should save remote version to both storage and MCP
      // Note: Dates are serialized/deserialized through JSON, so they become strings
      expect(mockStorage.save).toHaveBeenCalledWith('agents', expect.objectContaining({
        id: 'doc1',
        version: 1,
      }));
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        expect.any(String),
        'agentdb/agents'
      );
    });

    it('should prefer latest timestamp with "latest" resolution', async () => {
      const olderDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const newerDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
      };

      mockStorage.list.mockResolvedValue({ documents: [olderDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(newerDoc));
      mockMCP.store.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue(newerDoc);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      await syncManager.syncCollection('agents');

      // Should save newer version to both
      // Note: Dates are serialized/deserialized through JSON, so they become strings
      expect(mockStorage.save).toHaveBeenCalledWith('agents', expect.objectContaining({
        id: 'doc1',
        version: 2,
      }));
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        expect.any(String),
        'agentdb/agents'
      );
    });

    it('should prefer higher version with "manual" resolution', async () => {
      const lowerVersion: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
      };

      const higherVersion: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockStorage.list.mockResolvedValue({ documents: [lowerVersion], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue(['agents/doc1']);
      mockMCP.retrieve.mockResolvedValue(JSON.stringify(higherVersion));
      mockMCP.store.mockResolvedValue(true);
      mockStorage.save.mockResolvedValue(higherVersion);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'manual',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      await syncManager.syncCollection('agents');

      // Should save higher version to both
      // Note: Dates are serialized/deserialized through JSON, so they become strings
      expect(mockStorage.save).toHaveBeenCalledWith('agents', expect.objectContaining({
        id: 'doc1',
        version: 3,
      }));
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        expect.any(String),
        'agentdb/agents'
      );
    });
  });

  describe('syncDocument', () => {
    it('should sync a single document to MCP memory', async () => {
      const doc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncDocument('agents', doc);

      expect(result).toBe(true);
      expect(mockMCP.store).toHaveBeenCalledWith(
        'agents/doc1',
        JSON.stringify(doc),
        'agentdb/agents'
      );
    });

    it('should return false on sync error', async () => {
      const doc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMCP.store.mockRejectedValue(new Error('Store failed'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncDocument('agents', doc);

      expect(result).toBe(false);
    });
  });

  describe('syncAll', () => {
    it('should sync all collections', async () => {
      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockResolvedValue([]);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncAll();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(0);
      expect(result.conflicts).toBe(0);

      // Should call list for each collection
      expect(mockStorage.list).toHaveBeenCalledTimes(8); // 8 collections
    });

    it('should aggregate errors from all collections', async () => {
      mockStorage.list.mockRejectedValue(new Error('Storage error'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncAll();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should aggregate sync counts from all collections', async () => {
      const localDoc: Document = {
        id: 'doc1',
        collection: 'agents',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.list.mockResolvedValue({ documents: [localDoc], total: 1, hasMore: false });
      mockMCP.list.mockResolvedValue([]);
      mockMCP.store.mockResolvedValue(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncAll();

      expect(result.success).toBe(true);
      expect(result.synced).toBe(8); // 1 doc per collection x 8 collections
    });
  });

  describe('Error Handling', () => {
    it('should handle storage.list errors gracefully', async () => {
      mockStorage.list.mockRejectedValue(new Error('Storage list failed'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle MCP.list errors gracefully', async () => {
      mockStorage.list.mockResolvedValue({ documents: [], total: 0, hasMore: false });
      mockMCP.list.mockRejectedValue(new Error('MCP list failed'));

      const config: SyncConfig = {
        enabled: true,
        strategy: 'merge',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue syncing other documents when one fails', async () => {
      const localDocs: Document[] = [
        {
          id: 'doc1',
          collection: 'agents',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'doc2',
          collection: 'agents',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStorage.list.mockResolvedValue({ documents: localDocs, total: 2, hasMore: false });
      mockMCP.list.mockResolvedValue([]);
      mockMCP.store
        .mockRejectedValueOnce(new Error('First doc failed'))
        .mockResolvedValueOnce(true);

      const config: SyncConfig = {
        enabled: true,
        strategy: 'push',
        conflictResolution: 'latest',
        autoSync: false,
      };

      const syncManager = new SyncManager(mockStorage, mockMCP, config);
      const result = await syncManager.syncCollection('agents');

      expect(result.synced).toBe(1); // Only second doc succeeded
      expect(result.errors.length).toBe(1);
      expect(mockMCP.store).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy', () => {
    it('should stop auto-sync when destroyed', () => {
      jest.useFakeTimers();

      const syncManager = new SyncManager(mockStorage, mockMCP);
      syncManager.startAutoSync(1000);

      jest.advanceTimersByTime(1000);
      const callsBeforeDestroy = mockStorage.list.mock.calls.length;

      syncManager.destroy();

      jest.advanceTimersByTime(2000);
      const callsAfterDestroy = mockStorage.list.mock.calls.length;

      expect(callsAfterDestroy).toBe(callsBeforeDestroy);

      jest.useRealTimers();
    });
  });
});
