/**
 * Memory Coordinator - Centralized memory management with MCP integration
 * Handles state persistence, cross-session memory, and MCP sync
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import {
  MemoryNamespace,
  MemoryEntry,
  MemoryCoordinatorConfig,
  MemoryStats,
} from '../agentdb/types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_NAMESPACES: MemoryNamespace[] = [
  {
    name: 'session',
    prefix: 'portfolio-cognitive-command/session/',
    ttl: 86400, // 24 hours
    compressionEnabled: true,
  },
  {
    name: 'analysis',
    prefix: 'portfolio-cognitive-command/analysis/',
    ttl: 604800, // 7 days
    compressionEnabled: true,
  },
  {
    name: 'goap',
    prefix: 'portfolio-cognitive-command/goap/',
    ttl: 86400, // 24 hours
    compressionEnabled: false,
  },
  {
    name: 'swarm',
    prefix: 'portfolio-cognitive-command/swarm/',
    ttl: 3600, // 1 hour
    compressionEnabled: false,
  },
  {
    name: 'insights',
    prefix: 'portfolio-cognitive-command/insights/',
    ttl: 14400, // 4 hours (for AI insights caching)
    compressionEnabled: true,
  },
  {
    name: 'patterns',
    prefix: 'portfolio-cognitive-command/patterns/',
    maxEntries: 1000,
    compressionEnabled: true,
  },
];

const DEFAULT_CONFIG: MemoryCoordinatorConfig = {
  namespaces: DEFAULT_NAMESPACES,
  autoSync: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
  },
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
  },
  mcpIntegration: {
    enabled: true,
    serverName: 'claude-flow',
  },
};

// ============================================================================
// Memory Coordinator Class
// ============================================================================

export class MemoryCoordinator {
  private config: MemoryCoordinatorConfig;
  private entries: Map<string, MemoryEntry> = new Map();
  private basePath: string;
  private syncTimer?: NodeJS.Timeout;
  private stats: MemoryStats;

  constructor(
    basePath: string = './memory',
    config: Partial<MemoryCoordinatorConfig> = {}
  ) {
    this.basePath = path.resolve(basePath);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      byNamespace: {},
      cacheHitRate: 0,
      syncErrors: 0,
    };

    this.ensureDirectories();
    this.loadFromDisk();

    if (this.config.autoSync.enabled) {
      this.startAutoSync();
    }
  }

  /**
   * Ensure memory directories exist
   */
  private ensureDirectories(): void {
    const coordPath = path.join(this.basePath, 'coordinator');
    fs.mkdirSync(coordPath, { recursive: true });

    for (const ns of this.config.namespaces) {
      const nsPath = path.join(coordPath, ns.name);
      fs.mkdirSync(nsPath, { recursive: true });
    }
  }

  /**
   * Load existing entries from disk
   */
  private loadFromDisk(): void {
    const coordPath = path.join(this.basePath, 'coordinator');

    for (const ns of this.config.namespaces) {
      const nsPath = path.join(coordPath, ns.name);
      if (!fs.existsSync(nsPath)) continue;

      const files = fs.readdirSync(nsPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(nsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry: MemoryEntry = JSON.parse(content);

          // Check expiration
          if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
            fs.unlinkSync(filePath);
            continue;
          }

          const fullKey = `${ns.name}:${entry.key}`;
          this.entries.set(fullKey, entry);
        } catch {
          // Skip corrupted files
        }
      }
    }

    this.updateStats();
  }

  /**
   * Get namespace configuration
   */
  private getNamespace(name: string): MemoryNamespace | undefined {
    return this.config.namespaces.find((ns) => ns.name === name);
  }

  /**
   * Compress data if needed
   */
  private compress(data: string): { data: string; compressed: boolean } {
    if (
      !this.config.compression.enabled ||
      data.length < this.config.compression.threshold
    ) {
      return { data, compressed: false };
    }

    const compressed = zlib.gzipSync(Buffer.from(data, 'utf-8'));
    return {
      data: compressed.toString('base64'),
      compressed: true,
    };
  }

  /**
   * Decompress data if needed
   */
  private decompress(data: string, compressed: boolean): string {
    if (!compressed) return data;

    const buffer = Buffer.from(data, 'base64');
    return zlib.gunzipSync(buffer).toString('utf-8');
  }

  /**
   * Store a value in memory
   */
  async store(
    namespace: string,
    key: string,
    value: unknown,
    ttlOverride?: number
  ): Promise<void> {
    const ns = this.getNamespace(namespace);
    if (!ns) {
      throw new Error(`Unknown namespace: ${namespace}`);
    }

    const serialized = JSON.stringify(value);
    const { data, compressed } = this.compress(serialized);

    const now = new Date();
    const ttl = ttlOverride ?? ns.ttl;

    const entry: MemoryEntry = {
      key,
      namespace,
      value: data,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttl ? new Date(now.getTime() + ttl * 1000) : undefined,
      size: data.length,
      compressed,
    };

    const fullKey = `${namespace}:${key}`;
    this.entries.set(fullKey, entry);

    // Check max entries
    if (ns.maxEntries) {
      await this.enforceMaxEntries(namespace, ns.maxEntries);
    }

    // Write to disk
    await this.persistEntry(entry);
    this.updateStats();
  }

  /**
   * Retrieve a value from memory
   */
  async retrieve<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const fullKey = `${namespace}:${key}`;
    const entry = this.entries.get(fullKey);

    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
      await this.delete(namespace, key);
      return null;
    }

    const decompressed = this.decompress(entry.value as string, entry.compressed);
    return JSON.parse(decompressed) as T;
  }

  /**
   * Delete a value from memory
   */
  async delete(namespace: string, key: string): Promise<boolean> {
    const fullKey = `${namespace}:${key}`;
    const existed = this.entries.has(fullKey);

    this.entries.delete(fullKey);

    // Remove from disk
    const filePath = this.getEntryPath(namespace, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    this.updateStats();
    return existed;
  }

  /**
   * List all keys in a namespace
   */
  async list(namespace: string): Promise<string[]> {
    const prefix = `${namespace}:`;
    const keys: string[] = [];

    for (const [fullKey] of this.entries) {
      if (fullKey.startsWith(prefix)) {
        keys.push(fullKey.substring(prefix.length));
      }
    }

    return keys;
  }

  /**
   * Search entries by pattern
   */
  async search(namespace: string, pattern: string): Promise<MemoryEntry[]> {
    const prefix = `${namespace}:`;
    const regex = new RegExp(pattern);
    const results: MemoryEntry[] = [];

    for (const [fullKey, entry] of this.entries) {
      if (fullKey.startsWith(prefix)) {
        const key = fullKey.substring(prefix.length);
        if (regex.test(key)) {
          results.push(entry);
        }
      }
    }

    return results;
  }

  /**
   * Clear all entries in a namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    const prefix = `${namespace}:`;
    const keysToDelete: string[] = [];

    for (const fullKey of this.entries.keys()) {
      if (fullKey.startsWith(prefix)) {
        keysToDelete.push(fullKey);
      }
    }

    for (const key of keysToDelete) {
      this.entries.delete(key);
    }

    // Clear from disk
    const nsPath = path.join(this.basePath, 'coordinator', namespace);
    if (fs.existsSync(nsPath)) {
      const files = fs.readdirSync(nsPath);
      for (const file of files) {
        fs.unlinkSync(path.join(nsPath, file));
      }
    }

    this.updateStats();
    return keysToDelete.length;
  }

  /**
   * Get entry file path
   */
  private getEntryPath(namespace: string, key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(
      this.basePath,
      'coordinator',
      namespace,
      `${sanitizedKey}.json`
    );
  }

  /**
   * Persist entry to disk
   */
  private async persistEntry(entry: MemoryEntry): Promise<void> {
    const filePath = this.getEntryPath(entry.namespace, entry.key);
    await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * Enforce max entries limit
   */
  private async enforceMaxEntries(
    namespace: string,
    maxEntries: number
  ): Promise<void> {
    const prefix = `${namespace}:`;
    const entries: Array<{ key: string; createdAt: Date }> = [];

    for (const [fullKey, entry] of this.entries) {
      if (fullKey.startsWith(prefix)) {
        entries.push({
          key: fullKey.substring(prefix.length),
          createdAt: new Date(entry.createdAt),
        });
      }
    }

    if (entries.length <= maxEntries) return;

    // Sort by creation time (oldest first)
    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - maxEntries);
    for (const { key } of toRemove) {
      await this.delete(namespace, key);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.entries.size;
    this.stats.totalSize = 0;
    this.stats.byNamespace = {};

    for (const [fullKey, entry] of this.entries) {
      this.stats.totalSize += entry.size;

      const ns = fullKey.split(':')[0];
      if (!this.stats.byNamespace[ns]) {
        this.stats.byNamespace[ns] = { entries: 0, size: 0 };
      }
      this.stats.byNamespace[ns].entries++;
      this.stats.byNamespace[ns].size += entry.size;
    }
  }

  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncToMCP().catch(() => {
        this.stats.syncErrors++;
      });
    }, this.config.autoSync.intervalMs);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Sync to MCP memory tools
   * This is a placeholder that would integrate with claude-flow MCP
   */
  async syncToMCP(): Promise<void> {
    if (!this.config.mcpIntegration.enabled) return;

    // In a real implementation, this would use MCP tools:
    // mcp__claude-flow__memory_usage({ action: 'store', ... })

    this.stats.lastSync = new Date();
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Export all entries (for backup)
   */
  async exportAll(): Promise<Record<string, unknown>> {
    const exported: Record<string, unknown> = {};

    for (const [fullKey, entry] of this.entries) {
      const decompressed = this.decompress(
        entry.value as string,
        entry.compressed
      );
      exported[fullKey] = JSON.parse(decompressed);
    }

    return exported;
  }

  /**
   * Import entries (for restore)
   */
  async importAll(data: Record<string, unknown>): Promise<number> {
    let imported = 0;

    for (const [fullKey, value] of Object.entries(data)) {
      const [namespace, ...keyParts] = fullKey.split(':');
      const key = keyParts.join(':');

      if (this.getNamespace(namespace)) {
        await this.store(namespace, key, value);
        imported++;
      }
    }

    return imported;
  }

  /**
   * Create backup to file
   */
  async backup(backupPath: string): Promise<void> {
    const data = await this.exportAll();
    const backup = {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      data,
    };

    await fs.promises.writeFile(
      backupPath,
      JSON.stringify(backup, null, 2),
      'utf-8'
    );
  }

  /**
   * Restore from backup file
   */
  async restore(backupPath: string): Promise<number> {
    const content = await fs.promises.readFile(backupPath, 'utf-8');
    const backup = JSON.parse(content);
    return this.importAll(backup.data);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [fullKey, entry] of this.entries) {
      if (entry.expiresAt && new Date(entry.expiresAt) < now) {
        keysToDelete.push(fullKey);
      }
    }

    for (const fullKey of keysToDelete) {
      const [namespace, ...keyParts] = fullKey.split(':');
      const key = keyParts.join(':');
      await this.delete(namespace, key);
    }

    return keysToDelete.length;
  }
}

// ============================================================================
// Session Management Helpers
// ============================================================================

export interface SessionContext {
  sessionId: string;
  startedAt: Date;
  repository?: string;
  branch?: string;
  analysisState: Record<string, unknown>;
  decisions: Array<{
    timestamp: Date;
    description: string;
    rationale: string;
  }>;
  artifacts: string[];
}

/**
 * Save session context
 */
export async function saveSessionContext(
  coordinator: MemoryCoordinator,
  context: SessionContext
): Promise<void> {
  await coordinator.store('session', context.sessionId, context);
}

/**
 * Load session context
 */
export async function loadSessionContext(
  coordinator: MemoryCoordinator,
  sessionId: string
): Promise<SessionContext | null> {
  return coordinator.retrieve<SessionContext>('session', sessionId);
}

/**
 * Add decision to session
 */
export async function addSessionDecision(
  coordinator: MemoryCoordinator,
  sessionId: string,
  description: string,
  rationale: string
): Promise<void> {
  const context = await loadSessionContext(coordinator, sessionId);
  if (!context) return;

  context.decisions.push({
    timestamp: new Date(),
    description,
    rationale,
  });

  await saveSessionContext(coordinator, context);
}

// ============================================================================
// Factory Functions
// ============================================================================

let defaultCoordinator: MemoryCoordinator | null = null;

/**
 * Create or get the default memory coordinator
 */
export function getMemoryCoordinator(
  basePath?: string,
  config?: Partial<MemoryCoordinatorConfig>
): MemoryCoordinator {
  if (!defaultCoordinator) {
    defaultCoordinator = new MemoryCoordinator(basePath, config);
  }
  return defaultCoordinator;
}

/**
 * Create a new memory coordinator instance
 */
export function createMemoryCoordinator(
  basePath?: string,
  config?: Partial<MemoryCoordinatorConfig>
): MemoryCoordinator {
  return new MemoryCoordinator(basePath, config);
}

/**
 * Reset the default coordinator (for testing)
 */
export function resetDefaultCoordinator(): void {
  if (defaultCoordinator) {
    defaultCoordinator.stopAutoSync();
    defaultCoordinator = null;
  }
}
