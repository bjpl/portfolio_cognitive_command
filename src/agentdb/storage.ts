/**
 * Storage Interface Layer
 * Provides unified API for local file-based storage
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  CollectionName,
  QueryFilter,
  QueryOptions,
  QueryResult,
} from './types';

export interface StorageBackend {
  save<T extends Document>(collection: CollectionName, document: T): Promise<T>;
  load<T extends Document>(collection: CollectionName, id: string): Promise<T | null>;
  query<T extends Document>(
    collection: CollectionName,
    filter: QueryFilter,
    options?: QueryOptions
  ): Promise<QueryResult<T>>;
  update<T extends Document>(
    collection: CollectionName,
    id: string,
    changes: Partial<T>
  ): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<boolean>;
  list<T extends Document>(
    collection: CollectionName,
    options?: QueryOptions
  ): Promise<QueryResult<T>>;
}

/**
 * File-based storage backend
 * Stores documents as JSON files in the memory directory
 */
export class FileStorageBackend implements StorageBackend {
  private basePath: string;

  constructor(basePath: string = './memory') {
    this.basePath = path.resolve(basePath);
    this.ensureDirectories();
  }

  /**
   * Ensure all collection directories exist
   */
  private ensureDirectories(): void {
    const collections: CollectionName[] = [
      'agents',
      'sessions',
      'worldStates',
      'skills',
      'analyses',
      'driftAlerts',
      'neuralPatterns',
      'metrics',
      'goapPlans',
      'swarmExecutions',
      'enhancedAnalyses',
      'aiInsights',
    ];

    // Ensure base directories
    fs.mkdirSync(path.join(this.basePath, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'sessions'), { recursive: true });

    // Ensure collection directories
    for (const collection of collections) {
      const collectionPath = this.getCollectionPath(collection);
      fs.mkdirSync(collectionPath, { recursive: true });
    }
  }

  /**
   * Get path to collection directory
   */
  private getCollectionPath(collection: CollectionName): string {
    // Map collections to memory directory structure
    const pathMap: Record<CollectionName, string> = {
      agents: path.join(this.basePath, 'agents', 'data'),
      sessions: path.join(this.basePath, 'sessions', 'data'),
      worldStates: path.join(this.basePath, 'sessions', 'worldstates'),
      skills: path.join(this.basePath, 'agents', 'skills'),
      analyses: path.join(this.basePath, 'sessions', 'analyses'),
      driftAlerts: path.join(this.basePath, 'sessions', 'alerts'),
      neuralPatterns: path.join(this.basePath, 'agents', 'patterns'),
      metrics: path.join(this.basePath, 'sessions', 'metrics'),
      goapPlans: path.join(this.basePath, 'goap', 'plans'),
      swarmExecutions: path.join(this.basePath, 'swarm', 'executions'),
      enhancedAnalyses: path.join(this.basePath, 'sessions', 'enhanced'),
      aiInsights: path.join(this.basePath, 'ai', 'insights'),
    };

    return pathMap[collection] || path.join(this.basePath, collection);
  }

  /**
   * Sanitize document ID to prevent path traversal attacks
   * Only allows alphanumeric characters, hyphens, and underscores
   * @param id - Raw document ID
   * @returns Sanitized ID safe for use in file paths
   * @throws Error if ID is empty after sanitization
   */
  private sanitizeDocumentId(id: string): string {
    // Remove any path separators and traversal attempts
    const sanitized = id
      .replace(/\.\./g, '') // Remove path traversal
      .replace(/[/\\]/g, '') // Remove path separators
      .replace(/[^a-zA-Z0-9_-]/g, '_'); // Replace unsafe chars with underscore

    if (sanitized.length === 0) {
      throw new Error('Invalid document ID: empty after sanitization');
    }

    return sanitized;
  }

  /**
   * Get file path for a document
   * Uses sanitized ID to prevent path traversal vulnerabilities
   */
  private getDocumentPath(collection: CollectionName, id: string): string {
    const sanitizedId = this.sanitizeDocumentId(id);
    return path.join(this.getCollectionPath(collection), `${sanitizedId}.json`);
  }

  /**
   * Save a document to storage
   */
  async save<T extends Document>(collection: CollectionName, document: T): Promise<T> {
    // Ensure document has required fields
    const now = new Date();
    const fullDocument: T = {
      ...document,
      collection,
      createdAt: document.createdAt || now,
      updatedAt: now,
      version: (document.version || 0) + 1,
    };

    // Write to file
    const filePath = this.getDocumentPath(collection, document.id);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(fullDocument, null, 2),
      'utf-8'
    );

    return fullDocument;
  }

  /**
   * Load a document from storage
   */
  async load<T extends Document>(
    collection: CollectionName,
    id: string
  ): Promise<T | null> {
    const filePath = this.getDocumentPath(collection, id);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const document = JSON.parse(content) as T;

      // Convert date strings back to Date objects
      this.deserializeDates(document as unknown as Record<string, unknown>);

      return document;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Query documents with filters
   */
  async query<T extends Document>(
    collection: CollectionName,
    filter: QueryFilter,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    // List all documents in collection
    const allDocs = await this.list<T>(collection);

    // Apply filters
    let filtered = allDocs.documents.filter((doc) =>
      this.matchesFilter(doc, filter)
    );

    // Apply sorting
    if (options?.sort) {
      filtered = this.sortDocuments(filtered, options.sort);
    }

    // Calculate pagination
    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || total;

    // Apply pagination
    const documents = filtered.slice(offset, offset + limit);

    // Apply projection
    const projected = options?.projection
      ? documents.map((doc) => this.projectFields(doc, options.projection!))
      : documents;

    return {
      documents: projected as T[],
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update a document
   */
  async update<T extends Document>(
    collection: CollectionName,
    id: string,
    changes: Partial<T>
  ): Promise<T> {
    // Load existing document
    const existing = await this.load<T>(collection, id);
    if (!existing) {
      throw new Error(`Document not found: ${collection}/${id}`);
    }

    // Merge changes
    const updated: T = {
      ...existing,
      ...changes,
      id: existing.id, // Preserve ID
      collection: existing.collection, // Preserve collection
      createdAt: existing.createdAt, // Preserve creation date
      updatedAt: new Date(),
      version: existing.version + 1,
    };

    // Save updated document
    return this.save(collection, updated);
  }

  /**
   * Delete a document
   */
  async delete(collection: CollectionName, id: string): Promise<boolean> {
    const filePath = this.getDocumentPath(collection, id);

    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List all documents in a collection
   */
  async list<T extends Document>(
    collection: CollectionName,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const collectionPath = this.getCollectionPath(collection);

    try {
      const files = await fs.promises.readdir(collectionPath);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      // Load all documents
      const documents: T[] = [];
      for (const file of jsonFiles) {
        const content = await fs.promises.readFile(
          path.join(collectionPath, file),
          'utf-8'
        );
        const doc = JSON.parse(content) as T;
        this.deserializeDates(doc as unknown as Record<string, unknown>);
        documents.push(doc);
      }

      // Apply sorting
      let sorted = documents;
      if (options?.sort) {
        sorted = this.sortDocuments(documents, options.sort);
      }

      // Apply pagination
      const total = sorted.length;
      const offset = options?.offset || 0;
      const limit = options?.limit || total;
      const paginated = sorted.slice(offset, offset + limit);

      return {
        documents: paginated,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { documents: [], total: 0, hasMore: false };
      }
      throw error;
    }
  }

  /**
   * Check if document matches filter
   */
  private matchesFilter(doc: Document, filter: QueryFilter): boolean {
    for (const [key, value] of Object.entries(filter)) {
      const docValue = (doc as unknown as Record<string, unknown>)[key];

      // Handle operators
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!this.matchesOperator(docValue, value as Record<string, unknown>)) {
          return false;
        }
      } else {
        // Direct equality
        if (docValue !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if value matches query operator
   */
  private matchesOperator(value: unknown, operator: Record<string, unknown>): boolean {
    if ('$eq' in operator && value !== operator.$eq) return false;
    if ('$ne' in operator && value === operator.$ne) return false;
    if ('$gt' in operator && (value as number) <= (operator.$gt as number)) return false;
    if ('$gte' in operator && (value as number) < (operator.$gte as number)) return false;
    if ('$lt' in operator && (value as number) >= (operator.$lt as number)) return false;
    if ('$lte' in operator && (value as number) > (operator.$lte as number)) return false;
    if ('$in' in operator && !(operator.$in as unknown[]).includes(value)) return false;
    if ('$nin' in operator && (operator.$nin as unknown[]).includes(value)) return false;
    if ('$exists' in operator) {
      const exists = value !== undefined && value !== null;
      if (exists !== operator.$exists) return false;
    }
    if ('$regex' in operator) {
      const regex = typeof operator.$regex === 'string'
        ? new RegExp(operator.$regex)
        : operator.$regex as RegExp;
      if (!regex.test(String(value))) return false;
    }

    return true;
  }

  /**
   * Sort documents
   */
  private sortDocuments<T extends Document>(
    documents: T[],
    sort: { field: string; order: 'asc' | 'desc' }
  ): T[] {
    return [...documents].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sort.field];
      const bVal = (b as unknown as Record<string, unknown>)[sort.field];

      let comparison = 0;
      // Type-safe comparison for unknown values
      if (aVal !== undefined && aVal !== null && bVal !== undefined && bVal !== null) {
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Project specific fields from document
   */
  private projectFields<T extends Document>(doc: T, fields: string[]): Partial<T> {
    const projected: Partial<T> = {};
    for (const field of fields) {
      if (field in doc) {
        (projected as Record<string, unknown>)[field] = (doc as Record<string, unknown>)[field];
      }
    }
    return projected;
  }

  /**
   * Deserialize date strings to Date objects
   */
  private deserializeDates(obj: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        obj[key] = new Date(value);
      } else if (typeof value === 'object' && value !== null) {
        this.deserializeDates(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            this.deserializeDates(item as Record<string, unknown>);
          }
        });
      }
    }
  }
}
