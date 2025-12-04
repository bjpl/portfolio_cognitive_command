/**
 * MCP Memory Tools Adapter
 * Provides concrete implementation for claude-flow MCP integration
 */

import { MCPMemoryTools } from './sync';

/**
 * Adapter for claude-flow MCP memory tools
 * This should be implemented by calling actual MCP tools
 */
export class ClaudeFlowMCPAdapter implements MCPMemoryTools {
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Store a value in MCP memory
   */
  async store(
    key: string,
    value: string,
    namespace: string = 'default',
    ttl?: number
  ): Promise<boolean> {
    try {
      // Call mcp__claude-flow__memory_usage with action: 'store'
      const result = await this.mcpClient.call('mcp__claude-flow__memory_usage', {
        action: 'store',
        key,
        value,
        namespace,
        ttl,
      });

      return result?.success === true;
    } catch (error) {
      console.error('[MCPAdapter] Store failed:', error);
      return false;
    }
  }

  /**
   * Retrieve a value from MCP memory
   */
  async retrieve(key: string, namespace: string = 'default'): Promise<string | null> {
    try {
      // Call mcp__claude-flow__memory_usage with action: 'retrieve'
      const result = await this.mcpClient.call('mcp__claude-flow__memory_usage', {
        action: 'retrieve',
        key,
        namespace,
      });

      return (result?.value as string) || null;
    } catch (error) {
      console.error('[MCPAdapter] Retrieve failed:', error);
      return null;
    }
  }

  /**
   * Search for values in MCP memory
   */
  async search(
    pattern: string,
    namespace: string = 'default',
    limit: number = 100
  ): Promise<Array<{ key: string; value: string }>> {
    try {
      // Call mcp__claude-flow__memory_search
      const result = await this.mcpClient.call('mcp__claude-flow__memory_search', {
        pattern,
        namespace,
        limit,
      });

      return (result?.results as Array<{ key: string; value: string }>) || [];
    } catch (error) {
      console.error('[MCPAdapter] Search failed:', error);
      return [];
    }
  }

  /**
   * Delete a value from MCP memory
   */
  async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    try {
      // Call mcp__claude-flow__memory_usage with action: 'delete'
      const result = await this.mcpClient.call('mcp__claude-flow__memory_usage', {
        action: 'delete',
        key,
        namespace,
      });

      return result?.success === true;
    } catch (error) {
      console.error('[MCPAdapter] Delete failed:', error);
      return false;
    }
  }

  /**
   * List all keys in a namespace
   */
  async list(namespace: string = 'default'): Promise<string[]> {
    try {
      // Call mcp__claude-flow__memory_usage with action: 'list'
      const result = await this.mcpClient.call('mcp__claude-flow__memory_usage', {
        action: 'list',
        namespace,
      });

      return (result?.keys as string[]) || [];
    } catch (error) {
      console.error('[MCPAdapter] List failed:', error);
      return [];
    }
  }
}

/**
 * Generic MCP client interface
 * Should be implemented by your MCP client library
 */
export interface MCPClient {
  call(tool: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/**
 * Mock MCP client for testing
 */
export class MockMCPClient implements MCPClient {
  private storage = new Map<string, Map<string, { value: string; ttl?: number; created: number }>>();

  async call(tool: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const namespace = (params.namespace as string) || 'default';

    if (!this.storage.has(namespace)) {
      this.storage.set(namespace, new Map());
    }

    const ns = this.storage.get(namespace)!;

    switch (tool) {
      case 'mcp__claude-flow__memory_usage': {
        const action = params.action as string;
        const key = params.key as string;

        switch (action) {
          case 'store': {
            const value = params.value as string;
            const ttl = params.ttl as number | undefined;
            ns.set(key, { value, ttl, created: Date.now() });
            return { success: true };
          }

          case 'retrieve': {
            const entry = ns.get(key);
            if (!entry) return { value: null };

            // Check TTL
            if (entry.ttl && Date.now() - entry.created > entry.ttl * 1000) {
              ns.delete(key);
              return { value: null };
            }

            return { value: entry.value };
          }

          case 'delete': {
            const deleted = ns.delete(key);
            return { success: deleted };
          }

          case 'list': {
            const keys = Array.from(ns.keys());
            return { keys };
          }

          default:
            throw new Error(`Unknown action: ${action}`);
        }
      }

      case 'mcp__claude-flow__memory_search': {
        const pattern = params.pattern as string;
        const limit = (params.limit as number) || 100;

        const regex = new RegExp(pattern);
        const results: Array<{ key: string; value: string }> = [];

        for (const [key, entry] of ns.entries()) {
          if (regex.test(key)) {
            // Check TTL
            if (!entry.ttl || Date.now() - entry.created <= entry.ttl * 1000) {
              results.push({ key, value: entry.value });
              if (results.length >= limit) break;
            }
          }
        }

        return { results };
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all data (for testing)
   */
  getAllData(): Map<string, Map<string, { value: string; ttl?: number; created: number }>> {
    return this.storage;
  }
}

/**
 * Create MCP adapter for claude-flow integration
 */
export function createMCPAdapter(mcpClient: MCPClient): MCPMemoryTools {
  return new ClaudeFlowMCPAdapter(mcpClient);
}

/**
 * Create mock MCP adapter for testing
 */
export function createMockMCPAdapter(): {
  adapter: MCPMemoryTools;
  client: MockMCPClient;
} {
  const client = new MockMCPClient();
  const adapter = new ClaudeFlowMCPAdapter(client);
  return { adapter, client };
}
