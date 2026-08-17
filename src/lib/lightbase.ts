/**
 * Lightbase API Client
 * 
 * Provides a clean interface to the Lightbase BaaS REST API (/api/v1).
 * Handles authentication, collections, documents (CRUD), queries, 
 * transactions, and bulk operations.
 * 
 * Documentation: See Lightbase API Integration Guide
 * 
 * Configuration via environment variables:
 *   LIGHTBASE_API_KEY  — API key for authentication
 *   LIGHTBASE_PROJECT  — Project ID (e.g., "edulink")
 *   LIGHTBASE_BASE_URL — Base URL (e.g., "https://your-lightbase-instance.example.com")
 */

export interface LightbaseConfig {
  apiKey: string;
  project: string;
  baseUrl: string;
}

export interface LightbaseDocument {
  id?: string;
  _created_at?: string;
  _updated_at?: string;
  _revision?: number;
  _deleted?: boolean;
  [key: string]: any;
}

export interface LightbaseQueryResult {
  data: LightbaseDocument[];
  nextCursor: any;
  total: number;
  hasMore: boolean;
}

export interface LightbaseFilter {
  field?: string;
  op?: string;
  value?: any;
  and?: LightbaseFilter[];
  or?: LightbaseFilter[];
}

export class LightbaseClient {
  private config: LightbaseConfig;
  private headers: Record<string, string>;

  constructor(config?: Partial<LightbaseConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.LIGHTBASE_API_KEY || '',
      project: config?.project || process.env.LIGHTBASE_PROJECT || 'edulink',
      baseUrl: config?.baseUrl || process.env.LIGHTBASE_BASE_URL || '',
    };
    this.headers = {
      'apikey': this.config.apiKey,
      'x-lightbase-project': this.config.project,
      'Content-Type': 'application/json',
    };
  }

  private get baseCollectionUrl() {
    return `${this.config.baseUrl}/api/v1/projects/${this.config.project}/collections`;
  }

  // ═══════════════════════════════════════════════════════
  // COLLECTIONS (Schema Management)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a collection (table) with field definitions.
   */
  async createCollection(name: string, fields: any[], indexes?: any[]): Promise<any> {
    const res = await fetch(this.baseCollectionUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name, fields, indexes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // If collection already exists, that's fine
      if (err.error?.code === 'validation.failed' && err.error?.message?.includes('already exists')) return null;
      throw new Error(`Lightbase createCollection(${name}) failed: ${res.status} ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  /**
   * List all collections.
   */
  async listCollections(): Promise<any[]> {
    const res = await fetch(this.baseCollectionUrl, { headers: this.headers });
    if (!res.ok) throw new Error(`Lightbase listCollections failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.collections || []);
  }

  /**
   * Get collection schema.
   */
  async getCollection(name: string): Promise<any> {
    const res = await fetch(`${this.baseCollectionUrl}/${name}`, { headers: this.headers });
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Check if a collection exists, create if not.
   */
  async ensureCollection(name: string, fields: any[]): Promise<void> {
    const existing = await this.getCollection(name).catch(() => null);
    if (!existing) {
      await this.createCollection(name, fields);
    }
  }

  // ═══════════════════════════════════════════════════════
  // DOCUMENTS (CRUD)
  // ═══════════════════════════════════════════════════════

  /**
   * Insert a document into a collection.
   * Returns the created document (with auto-generated id, _created_at, etc.)
   */
  async insert(collection: string, document: Record<string, any>): Promise<LightbaseDocument> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/docs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(document),
    });
    if (!res.ok) {
      if (res.status === 404) {
        // Collection doesn't exist — try to create it, then retry
        console.warn(`[Lightbase] Collection '${collection}' not found, creating...`);
        await this.createCollection(collection, [{ name: 'data', type: 'json' }]).catch(() => {});
        const retryRes = await fetch(`${this.baseCollectionUrl}/${collection}/docs`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(document),
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          return data.document || data;
        }
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`Lightbase insert(${collection}) failed: ${res.status} ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return data.document || data;
  }

  /**
   * Get a document by ID.
   */
  async getById(collection: string, id: string): Promise<LightbaseDocument | null> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/docs/${id}`, { headers: this.headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Lightbase getById(${collection}, ${id}) failed: ${res.status}`);
    const data = await res.json();
    return data.document || data;
  }

  /**
   * Update a document by ID (partial patch).
   * Uses the bulk endpoint with a single update operation since the
   * /docs/{id} PATCH endpoint is not available on all Lightbase instances.
   */
  async update(collection: string, id: string, patch: Record<string, any>): Promise<LightbaseDocument> {
    // Try direct PATCH first (works on some Lightbase instances)
    try {
      const res = await fetch(`${this.baseCollectionUrl}/${collection}/docs/${id}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        return data.document || data;
      }
      // If 404, fall through to bulk update
      if (res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Lightbase update(${collection}, ${id}) failed: ${res.status} ${JSON.stringify(err)}`);
      }
    } catch (e: any) {
      // If it's a 404/not-found, fall through to bulk
      if (!e.message?.includes('404') && !e.message?.includes('not_found')) {
        // Network error — try bulk as fallback
      }
    }

    // Fallback: use the bulk endpoint
    const bulkRes = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/bulk`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        updates: [{ collection, id, patch }],
      }),
    });
    if (!bulkRes.ok) {
      const err = await bulkRes.json().catch(() => ({}));
      throw new Error(`Lightbase update via bulk(${collection}, ${id}) failed: ${bulkRes.status} ${JSON.stringify(err)}`);
    }
    const result = await bulkRes.json();
    if (result.updated > 0) {
      // Return a merged document (best effort)
      return { id, ...patch } as LightbaseDocument;
    }
    throw new Error(`Lightbase update(${collection}, ${id}) did not update any document`);
  }

  /**
   * Delete a document by ID.
   */
  async delete(collection: string, id: string): Promise<boolean> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/docs/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    return res.ok;
  }

  // ═══════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════

  /**
   * Query documents from a collection.
   * 
   * @param collection Collection name
   * @param options Query options (filter, sort, limit, cursor, select)
   */
  /**
   * Query documents from a collection.
   * 
   * @param collection Collection name
   * @param options Query options (filter, sort, limit, cursor, select)
   */
  async query(collection: string, options?: {
    filter?: LightbaseFilter;
    sort?: string;
    limit?: number;
    cursor?: any;
    select?: string;
  }): Promise<LightbaseQueryResult> {
    const params = new URLSearchParams();
    if (options?.filter) params.set('filter', JSON.stringify(options.filter));
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', JSON.stringify(options.cursor));
    if (options?.select) params.set('select', options.select);

    // Use /docs subpath for querying documents (not collection schema)
    const url = `${this.baseCollectionUrl}/${collection}/docs?${params.toString()}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      // Gracefully handle 404 (collection not found) — return empty result
      if (res.status === 404) {
        return { data: [], nextCursor: null, total: 0, hasMore: false };
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(`Lightbase query(${collection}) failed: ${res.status} ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  /**
   * Query all documents (handles pagination automatically).
   */
  async queryAll(collection: string, options?: {
    filter?: LightbaseFilter;
    sort?: string;
    limit?: number;
  }): Promise<LightbaseDocument[]> {
    const limit = options?.limit || 1000;
    let allData: LightbaseDocument[] = [];
    let cursor: any = undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.query(collection, {
        ...options,
        limit,
        cursor,
      });
      allData = allData.concat(result.data || []);
      hasMore = result.hasMore;
      cursor = result.nextCursor;
      if (!cursor) break;
    }

    return allData;
  }

  /**
   * Count documents matching a filter.
   */
  async count(collection: string, filter?: LightbaseFilter): Promise<number> {
    const result = await this.query(collection, { filter, limit: 1 });
    return result.total || 0;
  }

  // ═══════════════════════════════════════════════════════
  // UPSERT
  // ═══════════════════════════════════════════════════════

  /**
   * Upsert: insert if not exists, update if exists.
   * Uses Lightbase's PUT endpoint with a filter.
   */
  async upsert(collection: string, filter: LightbaseFilter, document: Record<string, any>): Promise<{ document: LightbaseDocument; created: boolean }> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/docs`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({ filter, document }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Lightbase upsert(${collection}) failed: ${res.status} ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  // ═══════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Bulk insert, update, and delete in a single request.
   */
  async bulk(operations: {
    inserts?: Array<{ collection: string; document: Record<string, any> }>;
    updates?: Array<{ collection: string; id: string; patch: Record<string, any> }>;
    deletes?: Array<{ collection: string; id: string }>;
  }): Promise<{ inserted: number; updated: number; deleted: number; errors: any[] }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/bulk`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(operations),
    });
    if (!res.ok) throw new Error(`Lightbase bulk failed: ${res.status}`);
    return res.json();
  }

  /**
   * Bulk insert documents into a collection.
   */
  async bulkInsert(collection: string, documents: Record<string, any>[]): Promise<{ inserted: number; errors: any[] }> {
    const inserts = documents.map(doc => ({ collection, document: doc }));
    const result = await this.bulk({ inserts });
    return { inserted: result.inserted, errors: result.errors };
  }

  // ═══════════════════════════════════════════════════════
  // TRANSACTIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Execute a transaction with multiple operations.
   * If any operation fails, all are rolled back.
   */
  async transaction(ops: Array<{
    kind: 'insert' | 'update' | 'delete';
    collection: string;
    document?: Record<string, any>;
    id?: string;
    patch?: Record<string, any>;
  }>): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/transactions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ ops }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Lightbase transaction failed: ${res.status} ${JSON.stringify(err)}`);
    }
    return res.json();
  }

  // ═══════════════════════════════════════════════════════
  // AGGREGATIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Run aggregations on a collection.
   */
  async aggregate(collection: string, body: {
    groupBy?: string[];
    aggregations: Array<{ op: string; field?: string; as: string }>;
    filter?: LightbaseFilter;
  }): Promise<any> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/aggregate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Lightbase aggregate(${collection}) failed: ${res.status}`);
    return res.json();
  }

  // ═══════════════════════════════════════════════════════
  // FULL-TEXT SEARCH
  // ═══════════════════════════════════════════════════════

  /**
   * Full-text search on searchable fields.
   */
  async search(collection: string, query: string, limit?: number): Promise<LightbaseDocument[]> {
    const res = await fetch(`${this.baseCollectionUrl}/${collection}/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, limit: limit || 10 }),
    });
    if (!res.ok) throw new Error(`Lightbase search(${collection}) failed: ${res.status}`);
    const data = await res.json();
    return data.results || data.data || [];
  }

  // ═══════════════════════════════════════════════════════
  // FILE STORAGE
  // ═══════════════════════════════════════════════════════

  /**
   * Upload a file to a storage bucket.
   */
  async uploadFile(bucket: string, path: string, data: Buffer | string, contentType: string): Promise<any> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/storage/${bucket}/upload?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': contentType },
      body: data,
    });
    if (!res.ok) throw new Error(`Lightbase uploadFile failed: ${res.status}`);
    return res.json();
  }

  /**
   * Download a file from a storage bucket.
   */
  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/storage/${bucket}/download?path=${encodeURIComponent(path)}`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Lightbase downloadFile failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // ═══════════════════════════════════════════════════════
  // SEED
  // ═══════════════════════════════════════════════════════

  /**
   * Seed a collection with documents (dedup on specified fields).
   */
  async seed(collection: string, documents: Record<string, any>[], dedupOn?: string[]): Promise<{ inserted: number; skipped: number; errors: any[] }> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/seed`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ collection, documents, dedupOn }),
    });
    if (!res.ok) throw new Error(`Lightbase seed(${collection}) failed: ${res.status}`);
    return res.json();
  }

  // ═══════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════

  /**
   * Check if the Lightbase API is reachable.
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}`, {
        headers: this.headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let _client: LightbaseClient | null = null;

export function getLightbaseClient(): LightbaseClient {
  if (!_client) {
    _client = new LightbaseClient();
  }
  return _client;
}
