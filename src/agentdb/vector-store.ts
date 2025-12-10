/**
 * Vector Store with HNSW-based Approximate Nearest Neighbor Search
 * Provides fast similarity search for high-dimensional embeddings
 */

import { cosineSimilarity } from '../skills/semantic-analyzer';
import { promises as fs } from 'fs';
import * as path from 'path';

// ============================================================================
// Interfaces
// ============================================================================

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface HNSWNode {
  id: string;
  vector: number[];
  connections: Map<number, Set<string>>; // layer -> connected node IDs
}

interface SearchResult {
  id: string;
  distance: number;
}

interface VectorSearchResult {
  doc: VectorDocument;
  similarity: number;
}

interface VectorStoreData {
  documents: Array<{
    id: string;
    vector: number[];
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  indexData: {
    dimensions: number;
    M: number;
    efConstruction: number;
    maxLayer: number;
    entryPoint: string | null;
    nodes: Array<{
      id: string;
      vector: number[];
      connections: Array<[number, string[]]>;
    }>;
  };
}

// ============================================================================
// HNSW Index Implementation
// ============================================================================

/**
 * Hierarchical Navigable Small World (HNSW) index for ANN search
 * Based on "Efficient and robust approximate nearest neighbor search using
 * Hierarchical Navigable Small World graphs" (Malkov & Yashunin, 2016)
 */
export class HNSWIndex {
  private dimensions: number;
  private M: number; // Max number of bi-directional links per node
  private efConstruction: number; // Size of dynamic candidate list
  private maxLayer: number;
  private nodes: Map<string, HNSWNode>;
  private entryPoint: string | null;
  private ml: number; // Normalization factor for level generation

  /**
   * Creates a new HNSW index
   * @param dimensions - Vector dimensionality (e.g., 1536 for OpenAI embeddings)
   * @param M - Maximum number of connections per layer (default: 16)
   * @param efConstruction - Size of dynamic candidate list during construction (default: 100)
   */
  constructor(dimensions: number, M = 16, efConstruction = 100) {
    this.dimensions = dimensions;
    this.M = M;
    this.efConstruction = efConstruction;
    this.maxLayer = 0;
    this.nodes = new Map();
    this.entryPoint = null;
    this.ml = 1 / Math.log(2); // Normalization factor for level generation
  }

  /**
   * Inserts a vector into the index
   * @param id - Unique identifier for the vector
   * @param vector - Embedding vector
   */
  insert(id: string, vector: number[]): void {
    if (vector.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`
      );
    }

    // Create new node
    const node: HNSWNode = {
      id,
      vector,
      connections: new Map(),
    };

    // Determine random layer for this node
    const nodeLayer = this.randomLevel();

    // Initialize connections for each layer
    for (let layer = 0; layer <= nodeLayer; layer++) {
      node.connections.set(layer, new Set());
    }

    // Add node to the index early (needed for pruning to work correctly)
    this.nodes.set(id, node);

    // If this is the first node
    if (this.entryPoint === null) {
      this.entryPoint = id;
      this.maxLayer = nodeLayer;
      return;
    }

    // Search for nearest neighbors at all layers
    const entryPointId = this.entryPoint;
    let currentNearest = entryPointId;

    // Navigate from top layer to nodeLayer + 1
    for (let layer = this.maxLayer; layer > nodeLayer; layer--) {
      const nearest = this.searchLayer(vector, currentNearest, 1, layer);
      if (nearest.length > 0) {
        currentNearest = nearest[0].id;
      }
    }

    // Insert node at all layers from nodeLayer to 0
    for (let layer = nodeLayer; layer >= 0; layer--) {
      const candidates = this.searchLayer(
        vector,
        currentNearest,
        this.efConstruction,
        layer
      );

      // Select M nearest neighbors
      const M = layer === 0 ? this.M * 2 : this.M;
      const neighbors = this.selectNeighbors(candidates, M);

      // Add bidirectional links
      for (const neighbor of neighbors) {
        node.connections.get(layer)!.add(neighbor.id);

        const neighborNode = this.nodes.get(neighbor.id)!;
        // Only add bidirectional link if neighbor exists at this layer
        if (neighborNode.connections.has(layer)) {
          neighborNode.connections.get(layer)!.add(id);

          // Prune neighbors if needed
          this.pruneConnections(neighborNode, layer, M);
        }
      }

      if (candidates.length > 0) {
        currentNearest = candidates[0].id;
      }
    }

    // Update entry point if needed
    if (nodeLayer > this.maxLayer) {
      this.maxLayer = nodeLayer;
      this.entryPoint = id;
    }
  }

  /**
   * Searches for k nearest neighbors
   * @param query - Query vector
   * @param k - Number of results to return
   * @returns Array of search results sorted by distance (ascending)
   */
  search(query: number[], k: number): SearchResult[] {
    if (query.length !== this.dimensions) {
      throw new Error(
        `Query dimension mismatch: expected ${this.dimensions}, got ${query.length}`
      );
    }

    if (this.entryPoint === null || this.nodes.size === 0) {
      return [];
    }

    let currentNearest = this.entryPoint;

    // Navigate from top layer to layer 1
    for (let layer = this.maxLayer; layer > 0; layer--) {
      const nearest = this.searchLayer(query, currentNearest, 1, layer);
      if (nearest.length > 0) {
        currentNearest = nearest[0].id;
      }
    }

    // Search at layer 0
    const ef = Math.max(this.efConstruction, k);
    const results = this.searchLayer(query, currentNearest, ef, 0);

    // Return top k results
    return results.slice(0, k);
  }

  /**
   * Removes a vector from the index
   * @param id - Identifier of the vector to remove
   * @returns true if removed, false if not found
   */
  remove(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) {
      return false;
    }

    // Remove bidirectional connections
    for (const [layer, connections] of node.connections) {
      for (const neighborId of connections) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          neighbor.connections.get(layer)?.delete(id);
        }
      }
    }

    // Update entry point if necessary
    if (this.entryPoint === id) {
      // Find new entry point (any node at the highest layer)
      let newEntryPoint: string | null = null;
      for (const [nodeId, n] of this.nodes) {
        if (nodeId !== id) {
          const nodeLayer = Math.max(...Array.from(n.connections.keys()));
          if (newEntryPoint === null || nodeLayer >= this.maxLayer) {
            newEntryPoint = nodeId;
          }
        }
      }
      this.entryPoint = newEntryPoint;

      // Update maxLayer
      if (newEntryPoint) {
        const newEntryNode = this.nodes.get(newEntryPoint)!;
        this.maxLayer = Math.max(...Array.from(newEntryNode.connections.keys()));
      } else {
        this.maxLayer = 0;
      }
    }

    this.nodes.delete(id);
    return true;
  }

  /**
   * Returns the number of vectors in the index
   */
  size(): number {
    return this.nodes.size;
  }

  /**
   * Generates random layer for a new node
   * Uses exponential decay probability distribution
   */
  private randomLevel(): number {
    let level = 0;
    while (Math.random() < 0.5 && level < 16) {
      level++;
    }
    return level;
  }

  /**
   * Searches for nearest neighbors at a specific layer
   */
  private searchLayer(
    query: number[],
    entryPoint: string,
    ef: number,
    layer: number
  ): SearchResult[] {
    const visited = new Set<string>();
    const candidates: SearchResult[] = [];
    const results: SearchResult[] = [];

    // Start with entry point
    const entryNode = this.nodes.get(entryPoint)!;
    const entryDistance = this.distance(query, entryNode.vector);

    candidates.push({ id: entryPoint, distance: entryDistance });
    results.push({ id: entryPoint, distance: entryDistance });
    visited.add(entryPoint);

    while (candidates.length > 0) {
      // Get closest candidate
      candidates.sort((a, b) => a.distance - b.distance);
      const current = candidates.shift()!;

      // Stop if current is farther than the furthest result
      if (results.length >= ef && current.distance > results[results.length - 1].distance) {
        break;
      }

      // Explore neighbors
      const currentNode = this.nodes.get(current.id)!;
      const connections = currentNode.connections.get(layer);

      if (connections) {
        for (const neighborId of connections) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);

            const neighborNode = this.nodes.get(neighborId)!;
            const distance = this.distance(query, neighborNode.vector);

            // Add to results if better than worst result or results not full
            if (results.length < ef || distance < results[results.length - 1].distance) {
              candidates.push({ id: neighborId, distance });
              results.push({ id: neighborId, distance });

              // Keep results sorted and trimmed
              results.sort((a, b) => a.distance - b.distance);
              if (results.length > ef) {
                results.pop();
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Selects M neighbors using a simple heuristic
   */
  private selectNeighbors(candidates: SearchResult[], M: number): SearchResult[] {
    // Simple heuristic: just take the M closest neighbors
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, M);
  }

  /**
   * Prunes connections to maintain maximum M connections per layer
   */
  private pruneConnections(node: HNSWNode, layer: number, M: number): void {
    const connections = node.connections.get(layer);
    if (!connections || connections.size <= M) {
      return;
    }

    // Collect all neighbors with distances
    const neighbors: SearchResult[] = [];
    for (const neighborId of connections) {
      const neighbor = this.nodes.get(neighborId);
      if (!neighbor) {
        // Remove stale connection
        connections.delete(neighborId);
        continue;
      }
      const distance = this.distance(node.vector, neighbor.vector);
      neighbors.push({ id: neighborId, distance });
    }

    // Select M best neighbors
    const selected = this.selectNeighbors(neighbors, M);
    const selectedIds = new Set(selected.map(s => s.id));

    // Remove connections not in selected set
    for (const neighborId of connections) {
      if (!selectedIds.has(neighborId)) {
        connections.delete(neighborId);

        // Remove reverse connection
        const neighbor = this.nodes.get(neighborId)!;
        neighbor.connections.get(layer)?.delete(node.id);
      }
    }
  }

  /**
   * Calculates cosine distance between vectors (1 - cosine similarity)
   */
  private distance(vec1: number[], vec2: number[]): number {
    const similarity = cosineSimilarity(vec1, vec2);
    return 1 - similarity; // Convert similarity to distance
  }

  /**
   * Exports index state for persistence
   */
  toJSON(): VectorStoreData['indexData'] {
    const nodes = Array.from(this.nodes.values()).map(node => ({
      id: node.id,
      vector: node.vector,
      connections: Array.from(node.connections.entries()).map(
        ([layer, ids]) => [layer, Array.from(ids)] as [number, string[]]
      ),
    }));

    return {
      dimensions: this.dimensions,
      M: this.M,
      efConstruction: this.efConstruction,
      maxLayer: this.maxLayer,
      entryPoint: this.entryPoint,
      nodes,
    };
  }

  /**
   * Restores index from persisted state
   */
  static fromJSON(data: VectorStoreData['indexData']): HNSWIndex {
    const index = new HNSWIndex(data.dimensions, data.M, data.efConstruction);
    index.maxLayer = data.maxLayer;
    index.entryPoint = data.entryPoint;

    // Restore nodes
    for (const nodeData of data.nodes) {
      const node: HNSWNode = {
        id: nodeData.id,
        vector: nodeData.vector,
        connections: new Map(
          nodeData.connections.map(([layer, ids]) => [layer, new Set(ids)])
        ),
      };
      index.nodes.set(node.id, node);
    }

    return index;
  }
}

// ============================================================================
// Vector Store
// ============================================================================

/**
 * Vector store with document management and persistent storage
 */
export class VectorStore {
  private documents: Map<string, VectorDocument>;
  private index: HNSWIndex;
  private dimensions: number;

  /**
   * Creates a new vector store
   * @param dimensions - Vector dimensionality (default: 1536 for OpenAI)
   * @param M - HNSW parameter for max connections (default: 16)
   * @param efConstruction - HNSW parameter for construction quality (default: 100)
   */
  constructor(dimensions = 1536, M = 16, efConstruction = 100) {
    this.dimensions = dimensions;
    this.documents = new Map();
    this.index = new HNSWIndex(dimensions, M, efConstruction);
  }

  /**
   * Adds a vector document to the store
   * @param id - Unique document identifier
   * @param vector - Embedding vector
   * @param metadata - Optional metadata
   * @returns The created document
   */
  async add(
    id: string,
    vector: number[],
    metadata: Record<string, unknown> = {}
  ): Promise<VectorDocument> {
    if (this.documents.has(id)) {
      throw new Error(`Document with id '${id}' already exists`);
    }

    const doc: VectorDocument = {
      id,
      vector,
      metadata,
      createdAt: new Date(),
    };

    this.documents.set(id, doc);
    this.index.insert(id, vector);

    return doc;
  }

  /**
   * Searches for similar vectors
   * @param query - Query vector
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of documents with similarity scores
   */
  async search(query: number[], limit = 10): Promise<VectorSearchResult[]> {
    const results = this.index.search(query, limit);

    return results.map(result => {
      const doc = this.documents.get(result.id)!;
      const similarity = 1 - result.distance; // Convert distance back to similarity

      return {
        doc,
        similarity,
      };
    });
  }

  /**
   * Retrieves a document by ID
   * @param id - Document identifier
   * @returns The document or null if not found
   */
  async get(id: string): Promise<VectorDocument | null> {
    return this.documents.get(id) || null;
  }

  /**
   * Deletes a document from the store
   * @param id - Document identifier
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    if (!this.documents.has(id)) {
      return false;
    }

    this.documents.delete(id);
    return this.index.remove(id);
  }

  /**
   * Persists the vector store to a file
   * @param filePath - Path to save the store
   */
  async persist(filePath: string): Promise<void> {
    const data: VectorStoreData = {
      documents: Array.from(this.documents.values()).map(doc => ({
        id: doc.id,
        vector: doc.vector,
        metadata: doc.metadata,
        createdAt: doc.createdAt.toISOString(),
      })),
      indexData: this.index.toJSON(),
    };

    // Create parent directories if they don't exist
    const dir = path.dirname(filePath);
    if (dir && dir !== '.') {
      await fs.mkdir(dir, { recursive: true });
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Loads the vector store from a file
   * @param filePath - Path to load the store from
   */
  async load(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data: VectorStoreData = JSON.parse(content);

    // Validate dimensions match
    if (data.indexData.dimensions !== this.dimensions) {
      throw new Error(
        `Dimension mismatch: store is ${this.dimensions}D but file is ${data.indexData.dimensions}D`
      );
    }

    // Restore documents
    this.documents.clear();
    for (const docData of data.documents) {
      const doc: VectorDocument = {
        id: docData.id,
        vector: docData.vector,
        metadata: docData.metadata,
        createdAt: new Date(docData.createdAt),
      };
      this.documents.set(doc.id, doc);
    }

    // Restore index
    this.index = HNSWIndex.fromJSON(data.indexData);
  }

  /**
   * Returns the number of documents in the store
   */
  size(): number {
    return this.documents.size;
  }

  /**
   * Clears all documents from the store
   */
  clear(): void {
    this.documents.clear();
    this.index = new HNSWIndex(this.dimensions, this.index['M'], this.index['efConstruction']);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a new vector store instance
 * @param dimensions - Vector dimensionality (default: 1536)
 * @param options - Optional HNSW parameters
 * @returns A new VectorStore instance
 */
export function createVectorStore(
  dimensions = 1536,
  options?: { M?: number; efConstruction?: number }
): VectorStore {
  return new VectorStore(
    dimensions,
    options?.M,
    options?.efConstruction
  );
}
