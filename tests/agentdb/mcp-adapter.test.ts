/**
 * Tests for MCP Adapter
 * Covers ClaudeFlowMCPAdapter, MockMCPClient, and factory functions
 */

import {
  ClaudeFlowMCPAdapter,
  MockMCPClient,
  MCPClient,
  createMCPAdapter,
  createMockMCPAdapter,
} from '../../src/agentdb/mcp-adapter';

describe('ClaudeFlowMCPAdapter', () => {
  let mockClient: jest.Mocked<MCPClient>;
  let adapter: ClaudeFlowMCPAdapter;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockClient = {
      call: jest.fn(),
    };
    adapter = new ClaudeFlowMCPAdapter(mockClient);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('store', () => {
    it('should store value successfully with default namespace', async () => {
      mockClient.call.mockResolvedValue({ success: true });

      const result = await adapter.store('test-key', 'test-value');

      expect(result).toBe(true);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'test-key',
        value: 'test-value',
        namespace: 'default',
        ttl: undefined,
      });
    });

    it('should store value with custom namespace and TTL', async () => {
      mockClient.call.mockResolvedValue({ success: true });

      const result = await adapter.store('key', 'value', 'custom-ns', 3600);

      expect(result).toBe(true);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key',
        value: 'value',
        namespace: 'custom-ns',
        ttl: 3600,
      });
    });

    it('should return false when MCP call returns success: false', async () => {
      mockClient.call.mockResolvedValue({ success: false });

      const result = await adapter.store('key', 'value');

      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const error = new Error('Connection failed');
      mockClient.call.mockRejectedValue(error);

      const result = await adapter.store('key', 'value');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCPAdapter] Store failed:', error);
    });
  });

  describe('retrieve', () => {
    it('should retrieve value successfully', async () => {
      mockClient.call.mockResolvedValue({ value: 'stored-value' });

      const result = await adapter.retrieve('test-key');

      expect(result).toBe('stored-value');
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'test-key',
        namespace: 'default',
      });
    });

    it('should retrieve value from custom namespace', async () => {
      mockClient.call.mockResolvedValue({ value: 'custom-value' });

      const result = await adapter.retrieve('key', 'custom-ns');

      expect(result).toBe('custom-value');
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'key',
        namespace: 'custom-ns',
      });
    });

    it('should return null when key not found', async () => {
      mockClient.call.mockResolvedValue({ value: null });

      const result = await adapter.retrieve('nonexistent-key');

      expect(result).toBe(null);
    });

    it('should return null when MCP call returns empty object', async () => {
      mockClient.call.mockResolvedValue({});

      const result = await adapter.retrieve('key');

      expect(result).toBe(null);
    });

    it('should return null and log error on exception', async () => {
      const error = new Error('Network error');
      mockClient.call.mockRejectedValue(error);

      const result = await adapter.retrieve('key');

      expect(result).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCPAdapter] Retrieve failed:', error);
    });
  });

  describe('search', () => {
    it('should search and return results', async () => {
      const mockResults = [
        { key: 'test-1', value: 'value-1' },
        { key: 'test-2', value: 'value-2' },
      ];
      mockClient.call.mockResolvedValue({ results: mockResults });

      const results = await adapter.search('test-.*');

      expect(results).toEqual(mockResults);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_search', {
        pattern: 'test-.*',
        namespace: 'default',
        limit: 100,
      });
    });

    it('should search with custom namespace and limit', async () => {
      const mockResults = [{ key: 'key', value: 'value' }];
      mockClient.call.mockResolvedValue({ results: mockResults });

      const results = await adapter.search('pattern', 'custom-ns', 50);

      expect(results).toEqual(mockResults);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_search', {
        pattern: 'pattern',
        namespace: 'custom-ns',
        limit: 50,
      });
    });

    it('should return empty array when no results found', async () => {
      mockClient.call.mockResolvedValue({ results: [] });

      const results = await adapter.search('nonexistent');

      expect(results).toEqual([]);
    });

    it('should return empty array when MCP call returns no results property', async () => {
      mockClient.call.mockResolvedValue({});

      const results = await adapter.search('pattern');

      expect(results).toEqual([]);
    });

    it('should return empty array and log error on exception', async () => {
      const error = new Error('Search failed');
      mockClient.call.mockRejectedValue(error);

      const results = await adapter.search('pattern');

      expect(results).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCPAdapter] Search failed:', error);
    });
  });

  describe('delete', () => {
    it('should delete key successfully', async () => {
      mockClient.call.mockResolvedValue({ success: true });

      const result = await adapter.delete('test-key');

      expect(result).toBe(true);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'delete',
        key: 'test-key',
        namespace: 'default',
      });
    });

    it('should delete key from custom namespace', async () => {
      mockClient.call.mockResolvedValue({ success: true });

      const result = await adapter.delete('key', 'custom-ns');

      expect(result).toBe(true);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'delete',
        key: 'key',
        namespace: 'custom-ns',
      });
    });

    it('should return false when delete fails', async () => {
      mockClient.call.mockResolvedValue({ success: false });

      const result = await adapter.delete('key');

      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      const error = new Error('Delete failed');
      mockClient.call.mockRejectedValue(error);

      const result = await adapter.delete('key');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCPAdapter] Delete failed:', error);
    });
  });

  describe('list', () => {
    it('should list all keys in default namespace', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockClient.call.mockResolvedValue({ keys: mockKeys });

      const keys = await adapter.list();

      expect(keys).toEqual(mockKeys);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace: 'default',
      });
    });

    it('should list keys in custom namespace', async () => {
      const mockKeys = ['custom-key-1', 'custom-key-2'];
      mockClient.call.mockResolvedValue({ keys: mockKeys });

      const keys = await adapter.list('custom-ns');

      expect(keys).toEqual(mockKeys);
      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace: 'custom-ns',
      });
    });

    it('should return empty array when no keys found', async () => {
      mockClient.call.mockResolvedValue({ keys: [] });

      const keys = await adapter.list();

      expect(keys).toEqual([]);
    });

    it('should return empty array when MCP call returns no keys property', async () => {
      mockClient.call.mockResolvedValue({});

      const keys = await adapter.list();

      expect(keys).toEqual([]);
    });

    it('should return empty array and log error on exception', async () => {
      const error = new Error('List failed');
      mockClient.call.mockRejectedValue(error);

      const keys = await adapter.list();

      expect(keys).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCPAdapter] List failed:', error);
    });
  });
});

describe('MockMCPClient', () => {
  let client: MockMCPClient;

  beforeEach(() => {
    client = new MockMCPClient();
  });

  describe('store and retrieve operations', () => {
    it('should store and retrieve value', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'test-key',
        value: 'test-value',
        namespace: 'default',
      });

      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'test-key',
        namespace: 'default',
      });

      expect(result).toEqual({ value: 'test-value' });
    });

    it('should return null for nonexistent key', async () => {
      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'nonexistent',
        namespace: 'default',
      });

      expect(result).toEqual({ value: null });
    });

    it('should store multiple values', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key1',
        value: 'value1',
        namespace: 'default',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key2',
        value: 'value2',
        namespace: 'default',
      });

      const result1 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'key1',
        namespace: 'default',
      });

      const result2 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'key2',
        namespace: 'default',
      });

      expect(result1).toEqual({ value: 'value1' });
      expect(result2).toEqual({ value: 'value2' });
    });
  });

  describe('TTL expiration', () => {
    it('should expire value after TTL', async () => {
      // Store with 0.5 second TTL
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ttl-key',
        value: 'ttl-value',
        namespace: 'default',
        ttl: 0.5,
      });

      // Wait for 600ms to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 600));

      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'ttl-key',
        namespace: 'default',
      });

      expect(result).toEqual({ value: null });
    });

    it('should not expire value before TTL', async () => {
      // Store with 10 second TTL
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ttl-key',
        value: 'ttl-value',
        namespace: 'default',
        ttl: 10,
      });

      // Immediately retrieve
      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'ttl-key',
        namespace: 'default',
      });

      expect(result).toEqual({ value: 'ttl-value' });
    });

    it('should exclude expired entries from search results', async () => {
      // Store with short TTL
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'expire-key',
        value: 'expire-value',
        namespace: 'default',
        ttl: 0.5,
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 600));

      const result = await client.call('mcp__claude-flow__memory_search', {
        pattern: 'expire-.*',
        namespace: 'default',
        limit: 100,
      });

      expect(result).toEqual({ results: [] });
    });
  });

  describe('namespace isolation', () => {
    it('should isolate values between namespaces', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'shared-key',
        value: 'value-in-ns1',
        namespace: 'namespace1',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'shared-key',
        value: 'value-in-ns2',
        namespace: 'namespace2',
      });

      const result1 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'shared-key',
        namespace: 'namespace1',
      });

      const result2 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'shared-key',
        namespace: 'namespace2',
      });

      expect(result1).toEqual({ value: 'value-in-ns1' });
      expect(result2).toEqual({ value: 'value-in-ns2' });
    });

    it('should not find keys from other namespaces', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ns1-key',
        value: 'ns1-value',
        namespace: 'namespace1',
      });

      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'ns1-key',
        namespace: 'namespace2',
      });

      expect(result).toEqual({ value: null });
    });

    it('should list keys only from specified namespace', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ns1-key1',
        value: 'value1',
        namespace: 'namespace1',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ns1-key2',
        value: 'value2',
        namespace: 'namespace1',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'ns2-key1',
        value: 'value3',
        namespace: 'namespace2',
      });

      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace: 'namespace1',
      });

      expect(result).toEqual({ keys: ['ns1-key1', 'ns1-key2'] });
    });
  });

  describe('delete operation', () => {
    it('should delete existing key', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'delete-key',
        value: 'delete-value',
        namespace: 'default',
      });

      const deleteResult = await client.call('mcp__claude-flow__memory_usage', {
        action: 'delete',
        key: 'delete-key',
        namespace: 'default',
      });

      expect(deleteResult).toEqual({ success: true });

      const retrieveResult = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'delete-key',
        namespace: 'default',
      });

      expect(retrieveResult).toEqual({ value: null });
    });

    it('should return false when deleting nonexistent key', async () => {
      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'delete',
        key: 'nonexistent',
        namespace: 'default',
      });

      expect(result).toEqual({ success: false });
    });
  });

  describe('list operation', () => {
    it('should list all keys in namespace', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key1',
        value: 'value1',
        namespace: 'default',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key2',
        value: 'value2',
        namespace: 'default',
      });

      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace: 'default',
      });

      expect(result).toEqual({ keys: ['key1', 'key2'] });
    });

    it('should return empty array for empty namespace', async () => {
      const result = await client.call('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace: 'empty-namespace',
      });

      expect(result).toEqual({ keys: [] });
    });
  });

  describe('search operation', () => {
    beforeEach(async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'test-1',
        value: 'value-1',
        namespace: 'default',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'test-2',
        value: 'value-2',
        namespace: 'default',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'other-1',
        value: 'value-3',
        namespace: 'default',
      });
    });

    it('should search by pattern', async () => {
      const result = await client.call('mcp__claude-flow__memory_search', {
        pattern: 'test-.*',
        namespace: 'default',
        limit: 100,
      });

      expect(result).toEqual({
        results: [
          { key: 'test-1', value: 'value-1' },
          { key: 'test-2', value: 'value-2' },
        ],
      });
    });

    it('should respect search limit', async () => {
      const result = await client.call('mcp__claude-flow__memory_search', {
        pattern: 'test-.*',
        namespace: 'default',
        limit: 1,
      });

      expect(result).toEqual({
        results: [{ key: 'test-1', value: 'value-1' }],
      });
    });

    it('should return empty results for non-matching pattern', async () => {
      const result = await client.call('mcp__claude-flow__memory_search', {
        pattern: 'nonexistent-.*',
        namespace: 'default',
        limit: 100,
      });

      expect(result).toEqual({ results: [] });
    });
  });

  describe('utility methods', () => {
    it('should clear all data', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key1',
        value: 'value1',
        namespace: 'namespace1',
      });

      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key2',
        value: 'value2',
        namespace: 'namespace2',
      });

      client.clear();

      const result1 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'key1',
        namespace: 'namespace1',
      });

      const result2 = await client.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key: 'key2',
        namespace: 'namespace2',
      });

      expect(result1).toEqual({ value: null });
      expect(result2).toEqual({ value: null });
    });

    it('should get all data', async () => {
      await client.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'key1',
        value: 'value1',
        namespace: 'namespace1',
      });

      const allData = client.getAllData();

      expect(allData.has('namespace1')).toBe(true);
      expect(allData.get('namespace1')?.has('key1')).toBe(true);
      expect(allData.get('namespace1')?.get('key1')?.value).toBe('value1');
    });
  });

  describe('error handling', () => {
    it('should throw on unknown tool', async () => {
      await expect(
        client.call('unknown-tool', { param: 'value' })
      ).rejects.toThrow('Unknown tool: unknown-tool');
    });

    it('should throw on unknown action', async () => {
      await expect(
        client.call('mcp__claude-flow__memory_usage', {
          action: 'invalid-action',
          key: 'key',
          namespace: 'default',
        })
      ).rejects.toThrow('Unknown action: invalid-action');
    });
  });
});

describe('Factory functions', () => {
  describe('createMCPAdapter', () => {
    it('should create adapter with provided client', async () => {
      const mockClient: MCPClient = {
        call: jest.fn().mockResolvedValue({ success: true }),
      };

      const adapter = createMCPAdapter(mockClient);

      await adapter.store('test-key', 'test-value');

      expect(mockClient.call).toHaveBeenCalledWith('mcp__claude-flow__memory_usage', {
        action: 'store',
        key: 'test-key',
        value: 'test-value',
        namespace: 'default',
        ttl: undefined,
      });
    });
  });

  describe('createMockMCPAdapter', () => {
    it('should create mock adapter with client', async () => {
      const { adapter, client } = createMockMCPAdapter();

      expect(adapter).toBeInstanceOf(ClaudeFlowMCPAdapter);
      expect(client).toBeInstanceOf(MockMCPClient);
    });

    it('should create functional mock adapter', async () => {
      const { adapter } = createMockMCPAdapter();

      await adapter.store('test-key', 'test-value');
      const result = await adapter.retrieve('test-key');

      expect(result).toBe('test-value');
    });

    it('should provide access to mock client for testing', async () => {
      const { adapter, client } = createMockMCPAdapter();

      await adapter.store('key1', 'value1');
      await adapter.store('key2', 'value2', 'custom-ns');

      const allData = client.getAllData();

      expect(allData.has('default')).toBe(true);
      expect(allData.has('custom-ns')).toBe(true);
      expect(allData.get('default')?.get('key1')?.value).toBe('value1');
      expect(allData.get('custom-ns')?.get('key2')?.value).toBe('value2');
    });

    it('should allow clearing data via client', async () => {
      const { adapter, client } = createMockMCPAdapter();

      await adapter.store('key', 'value');
      client.clear();

      const result = await adapter.retrieve('key');

      expect(result).toBe(null);
    });
  });
});
