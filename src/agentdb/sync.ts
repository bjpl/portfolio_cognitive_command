/**
 * Synchronization Layer
 * Syncs data between local storage and claude-flow MCP memory
 */

import {
  Document,
  CollectionName,
  SyncConfig,
  SyncResult,
  ConflictResolution,
  SyncStrategy,
} from './types';
import { StorageBackend } from './storage';

export interface MCPMemoryTools {
  store(key: string, value: string, namespace?: string, ttl?: number): Promise<boolean>;
  retrieve(key: string, namespace?: string): Promise<string | null>;
  search(pattern: string, namespace?: string, limit?: number): Promise<Array<{ key: string; value: string }>>;
  delete(key: string, namespace?: string): Promise<boolean>;
  list(namespace?: string): Promise<string[]>;
}

/**
 * Sync manager for coordinating local and MCP memory
 */
export class SyncManager {
  private storage: StorageBackend;
  private mcp: MCPMemoryTools;
  private config: SyncConfig;
  private syncInterval?: NodeJS.Timeout;

  constructor(
    storage: StorageBackend,
    mcp: MCPMemoryTools,
    config: SyncConfig = {
      enabled: true,
      strategy: 'merge',
      conflictResolution: 'latest',
      autoSync: false,
    }
  ) {
    this.storage = storage;
    this.mcp = mcp;
    this.config = config;

    if (config.autoSync && config.syncInterval) {
      this.startAutoSync(config.syncInterval);
    }
  }

  /**
   * Start automatic sync on interval
   */
  startAutoSync(interval: number): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAll();
      } catch (error) {
        console.error('[SyncManager] Auto-sync failed:', error);
      }
    }, interval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Sync all collections
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: ['Sync is disabled'],
        timestamp: new Date(),
      };
    }

    const collections: CollectionName[] = [
      'agents',
      'sessions',
      'worldStates',
      'skills',
      'analyses',
      'driftAlerts',
      'neuralPatterns',
      'metrics',
    ];

    let totalSynced = 0;
    let totalConflicts = 0;
    const errors: string[] = [];

    for (const collection of collections) {
      try {
        const result = await this.syncCollection(collection);
        totalSynced += result.synced;
        totalConflicts += result.conflicts;
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`Failed to sync ${collection}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      synced: totalSynced,
      conflicts: totalConflicts,
      errors,
      timestamp: new Date(),
    };
  }

  /**
   * Sync a specific collection
   */
  async syncCollection(collection: CollectionName): Promise<SyncResult> {
    const namespace = `agentdb/${collection}`;
    let synced = 0;
    let conflicts = 0;
    let errors: string[] = [];

    try {
      // Get local documents
      const localDocs = await this.storage.list(collection);

      // Get remote keys
      const remoteKeys = await this.mcp.list(namespace);

      // Determine sync strategy
      switch (this.config.strategy) {
        case 'push':
          ({ synced, conflicts, errors: errors } = await this.push(
            collection,
            localDocs.documents,
            namespace
          ));
          break;

        case 'pull':
          ({ synced, conflicts, errors: errors } = await this.pull(
            collection,
            remoteKeys,
            namespace
          ));
          break;

        case 'merge':
          ({ synced, conflicts, errors: errors } = await this.merge(
            collection,
            localDocs.documents,
            remoteKeys,
            namespace
          ));
          break;

        case 'replace':
          ({ synced, conflicts, errors: errors } = await this.replace(
            collection,
            localDocs.documents,
            namespace
          ));
          break;
      }
    } catch (error) {
      errors.push(`Sync error: ${error}`);
    }

    return {
      success: errors.length === 0,
      synced,
      conflicts,
      errors,
      timestamp: new Date(),
    };
  }

  /**
   * Push local changes to MCP memory
   */
  private async push(
    collection: CollectionName,
    localDocs: Document[],
    namespace: string
  ): Promise<{ synced: number; conflicts: number; errors: string[] }> {
    let synced = 0;
    const errors: string[] = [];

    for (const doc of localDocs) {
      try {
        const key = this.getMemoryKey(collection, doc.id);
        const value = JSON.stringify(doc);
        await this.mcp.store(key, value, namespace);
        synced++;
      } catch (error) {
        errors.push(`Failed to push ${doc.id}: ${error}`);
      }
    }

    return { synced, conflicts: 0, errors };
  }

  /**
   * Pull remote changes to local storage
   */
  private async pull(
    collection: CollectionName,
    remoteKeys: string[],
    namespace: string
  ): Promise<{ synced: number; conflicts: number; errors: string[] }> {
    let synced = 0;
    const errors: string[] = [];

    for (const key of remoteKeys) {
      try {
        const value = await this.mcp.retrieve(key, namespace);
        if (value) {
          const doc = JSON.parse(value) as Document;
          await this.storage.save(collection, doc);
          synced++;
        }
      } catch (error) {
        errors.push(`Failed to pull ${key}: ${error}`);
      }
    }

    return { synced, conflicts: 0, errors };
  }

  /**
   * Merge local and remote changes
   */
  private async merge(
    collection: CollectionName,
    localDocs: Document[],
    remoteKeys: string[],
    namespace: string
  ): Promise<{ synced: number; conflicts: number; errors: string[] }> {
    let synced = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Create maps for efficient lookup
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc]));
    const remoteKeyMap = new Map(
      remoteKeys.map((key) => [this.extractIdFromKey(key), key])
    );

    // Process all unique IDs
    const allIds = new Set([...localMap.keys(), ...remoteKeyMap.keys()]);

    for (const id of allIds) {
      try {
        const localDoc = localMap.get(id);
        const remoteKey = remoteKeyMap.get(id);

        if (localDoc && !remoteKey) {
          // Local only - push to remote
          const key = this.getMemoryKey(collection, id);
          await this.mcp.store(key, JSON.stringify(localDoc), namespace);
          synced++;
        } else if (!localDoc && remoteKey) {
          // Remote only - pull to local
          const value = await this.mcp.retrieve(remoteKey, namespace);
          if (value) {
            const doc = JSON.parse(value) as Document;
            await this.storage.save(collection, doc);
            synced++;
          }
        } else if (localDoc && remoteKey) {
          // Both exist - resolve conflict
          const remoteValue = await this.mcp.retrieve(remoteKey, namespace);
          if (remoteValue) {
            const remoteDoc = JSON.parse(remoteValue) as Document;
            const resolution = await this.resolveConflict(localDoc, remoteDoc);

            // Apply resolution
            await this.storage.save(collection, resolution.resolvedVersion);
            await this.mcp.store(
              remoteKey,
              JSON.stringify(resolution.resolvedVersion),
              namespace
            );

            if (resolution.strategy !== 'merge') {
              conflicts++;
            }
            synced++;
          }
        }
      } catch (error) {
        errors.push(`Failed to merge ${id}: ${error}`);
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Replace remote with local (force push)
   */
  private async replace(
    collection: CollectionName,
    localDocs: Document[],
    namespace: string
  ): Promise<{ synced: number; conflicts: number; errors: string[] }> {
    let synced = 0;
    const errors: string[] = [];

    // Delete all remote keys
    const remoteKeys = await this.mcp.list(namespace);
    for (const key of remoteKeys) {
      try {
        await this.mcp.delete(key, namespace);
      } catch (error) {
        errors.push(`Failed to delete remote ${key}: ${error}`);
      }
    }

    // Push all local docs
    for (const doc of localDocs) {
      try {
        const key = this.getMemoryKey(collection, doc.id);
        await this.mcp.store(key, JSON.stringify(doc), namespace);
        synced++;
      } catch (error) {
        errors.push(`Failed to replace ${doc.id}: ${error}`);
      }
    }

    return { synced, conflicts: 0, errors };
  }

  /**
   * Resolve conflict between local and remote versions
   */
  private async resolveConflict<T extends Document>(
    localDoc: T,
    remoteDoc: T
  ): Promise<ConflictResolution<T>> {
    switch (this.config.conflictResolution) {
      case 'local':
        return {
          localVersion: localDoc,
          remoteVersion: remoteDoc,
          resolvedVersion: localDoc,
          strategy: 'local',
        };

      case 'remote':
        return {
          localVersion: localDoc,
          remoteVersion: remoteDoc,
          resolvedVersion: remoteDoc,
          strategy: 'remote',
        };

      case 'latest':
        const latest =
          localDoc.updatedAt > remoteDoc.updatedAt ? localDoc : remoteDoc;
        return {
          localVersion: localDoc,
          remoteVersion: remoteDoc,
          resolvedVersion: latest,
          strategy: latest === localDoc ? 'local' : 'remote',
        };

      case 'manual':
      default:
        // For manual resolution, prefer the version with higher version number
        const resolved = localDoc.version > remoteDoc.version ? localDoc : remoteDoc;
        return {
          localVersion: localDoc,
          remoteVersion: remoteDoc,
          resolvedVersion: resolved,
          strategy: 'merge',
        };
    }
  }

  /**
   * Get MCP memory key for a document
   */
  private getMemoryKey(collection: CollectionName, id: string): string {
    return `${collection}/${id}`;
  }

  /**
   * Extract document ID from MCP memory key
   */
  private extractIdFromKey(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Sync a single document
   */
  async syncDocument<T extends Document>(
    collection: CollectionName,
    document: T
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const namespace = `agentdb/${collection}`;
      const key = this.getMemoryKey(collection, document.id);
      const value = JSON.stringify(document);

      await this.mcp.store(key, value, namespace);
      return true;
    } catch (error) {
      console.error(`[SyncManager] Failed to sync document ${document.id}:`, error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSync();
  }
}
