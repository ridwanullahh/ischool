/**
 * Lightbase API Client
 *
 * Provides a clean interface to the Lightbase BaaS REST API (/api/v1).
 * Handles authentication, collections, documents (CRUD), queries,
 * transactions, batch coalescing, and bulk operations.
 *
 * Path A hardening (blueprint §B, BirrClass standard §2):
 *   - Every failure mode resolves to a typed `LightbaseError`. Raw fetch
 *     failures (DNS blip, connection reset, isolate recycle) used to
 *     propagate as unhandled TypeErrors → route returned an HTML 500 that
 *     JSON clients could not parse. They now surface as
 *     `503 LB_UNREACHABLE`-family JSON errors, never HTML.
 *   - Idempotent GET/HEAD requests get ONE fast retry (250 ms) on network
 *     errors and transient 502/503/504 upstream responses.
 *   - Default request timeout 12 s, overridable via LIGHTBASE_TIMEOUT_MS.
 *   - `batch(ops)` coalesces up to 25 mixed read/write operations into ONE
 *     `POST /api/v1/projects/:id/batch` call (one Worker invocation, one
 *     auth resolution — blueprint §A3).
 *
 * Documentation: See Lightbase API Integration Guide
 *
 * Configuration via environment variables:
 *   LIGHTBASE_API_KEY      — API key for authentication
 *   LIGHTBASE_PROJECT      — Project ID (e.g., "ischool-beta")
 *   LIGHTBASE_BASE_URL     — Base URL (e.g., "https://lightbase.pages.dev")
 *   LIGHTBASE_TIMEOUT_MS   — Request timeout in ms (default 12000)
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

// ═══════════════════════════════════════════════════════
// Typed errors (Path A)
// ═══════════════════════════════════════════════════════

/**
 * Typed error for every Lightbase failure mode. Callers can branch on
 * `status`/`code` (e.g. 503 LB_UNREACHABLE → show a retry notice) and API
 * routes serialize it straight to JSON — never an HTML 500.
 */
export class LightbaseError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'LightbaseError';
  }
}

// ═══════════════════════════════════════════════════════
// Batch operation types (engine schema: /api/v1/projects/:id/batch)
// ═══════════════════════════════════════════════════════

export type LightbaseBatchOpKind = 'get' | 'query' | 'insert' | 'update' | 'upsert' | 'delete';

export interface LightbaseBatchOp {
  kind: LightbaseBatchOpKind;
  collection: string;
  id?: string;
  /** Document for insert/upsert ops. */
  doc?: Record<string, any>;
  /** Patch for update ops (alias `doc` also accepted). */
  patch?: Record<string, any>;
  filter?: LightbaseFilter;
  /** Comma-separated field list — translated to an engine projection. */
  select?: string;
  /** `'-field'` / `'field'` string or engine sort array. */
  sort?: string | Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  tag?: string;
}

export interface LightbaseBatchOpResult {
  index: number;
  kind: LightbaseBatchOpKind;
  tag?: string;
  data?: any;
  total?: number;
  hasMore?: boolean;
  nextCursor?: any;
  deleted?: boolean;
  error?: string;
}

export interface LightbaseBatchResponse {
  results: LightbaseBatchOpResult[];
  allReads: boolean;
}

/** Max ops per batch call — enforced by the engine (blueprint §A3). */
export const LIGHTBASE_BATCH_MAX_OPS = 25;

// ═══════════════════════════════════════════════════════
// Fetch plumbing: timeout + typed errors + one idempotent retry
// ═══════════════════════════════════════════════════════

const LB_MAX_ATTEMPTS = 2;
const LB_RETRY_DELAY_MS = 250;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Internal: attempt counter across retries so callers see the final attempt. */
  _attempt?: number;
}

function normalizeSort(sort: LightbaseBatchOp['sort']): Array<{ field: string; direction: 'asc' | 'desc' }> | undefined {
  if (!sort) return undefined;
  if (Array.isArray(sort)) return sort;
  const s = sort.trim();
  if (!s) return undefined;
  if (s.startsWith('-')) return [{ field: s.slice(1), direction: 'desc' }];
  return [{ field: s, direction: 'asc' }];
}

function selectToProjection(select?: string): Record<string, 0 | 1> | undefined {
  if (!select) return undefined;
  const fields = select.split(',').map((f) => f.trim()).filter(Boolean);
  if (fields.length === 0) return undefined;
  return Object.fromEntries(fields.map((f) => [f, 1 as const]));
}

export class LightbaseClient {
  private config: LightbaseConfig;
  private headers: Record<string, string>;
  private timeoutMs: number;

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
    const parsed = Number(process.env.LIGHTBASE_TIMEOUT_MS);
    this.timeoutMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 12_000;
  }

  private get baseCollectionUrl() {
    return `${this.config.baseUrl}/api/v1/projects/${this.config.project}/collections`;
  }

  /**
   * Single fetch path for every call: applies the timeout, converts raw
   * network failures to typed `503 LB_UNREACHABLE` errors, parses upstream
   * error bodies into typed errors, and retries idempotent requests once
   * on network errors / 502 / 503 / 504.
   */
  private async request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;
    const method = opts.method ?? 'GET';
    const attempt = opts._attempt ?? 1;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { ...this.headers, ...opts.headers },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      // Network-level failure (DNS, connect, reset, abort/timeout).
      const retriable = attempt < LB_MAX_ATTEMPTS && (method === 'GET' || method === 'HEAD');
      if (retriable) {
        await sleep(LB_RETRY_DELAY_MS);
        return this.request<T>(path, { ...opts, _attempt: attempt + 1 });
      }
      throw new LightbaseError(
        503,
        'LB_UNREACHABLE',
        'Lightbase is temporarily unreachable. Please try again in a moment.',
        { cause: err instanceof Error ? err.message : String(err), url },
      );
    }

    if (!res.ok) {
      // Transient upstream failure: one fast retry for idempotent methods.
      if (RETRYABLE_STATUS.has(res.status) && attempt < LB_MAX_ATTEMPTS && (method === 'GET' || method === 'HEAD')) {
        await sleep(LB_RETRY_DELAY_MS);
        return this.request<T>(path, { ...opts, _attempt: attempt + 1 });
      }
      let body: any = null;
      try { body = await res.json(); } catch { try { body = await res.text(); } catch { body = null; } }
      const code = body?.error?.code ?? `HTTP_${res.status}`;
      const message = body?.error?.message ?? body?.message ?? res.statusText;
      throw new LightbaseError(res.status, code, message, body);
    }

    if (res.status === 204) return undefined as T;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return res.json() as Promise<T>;
    return res.text() as unknown as T;
  }

  /** True when the caught error is a typed not-found (404 family). */
  private static isNotFound(err: unknown): boolean {
    return err instanceof LightbaseError && (err.status === 404 || err.code === 'not_found' || err.code === 'HTTP_404');
  }

  // ═══════════════════════════════════════════════════════
  // COLLECTIONS (Schema Management)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a collection (table) with field definitions.
   */
  async createCollection(name: string, fields: any[], indexes?: any[]): Promise<any> {
    try {
      return await this.request(this.baseCollectionUrl, {
        method: 'POST',
        body: { name, fields, indexes },
      });
    } catch (err) {
      // If collection already exists, that's fine
      if (err instanceof LightbaseError && err.code === 'validation.failed' &&
          String((err.details as any)?.error?.message ?? err.message).includes('already exists')) {
        return null;
      }
      throw err;
    }
  }

  /**
   * List all collections.
   */
  async listCollections(): Promise<any[]> {
    const data = await this.request<any>(this.baseCollectionUrl);
    return Array.isArray(data) ? data : (data.collections || []);
  }

  /**
   * Get collection schema.
   */
  async getCollection(name: string): Promise<any> {
    try {
      return await this.request(`${this.baseCollectionUrl}/${name}`);
    } catch {
      return null;
    }
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
    try {
      const data = await this.request<any>(`${this.baseCollectionUrl}/${collection}/docs`, {
        method: 'POST',
        body: document,
      });
      return data.document || data;
    } catch (err) {
      if (LightbaseClient.isNotFound(err)) {
        // Collection doesn't exist — try to create it, then retry once
        console.warn(`[Lightbase] Collection '${collection}' not found, creating...`);
        await this.createCollection(collection, [{ name: 'data', type: 'json' }]).catch(() => {});
        const data = await this.request<any>(`${this.baseCollectionUrl}/${collection}/docs`, {
          method: 'POST',
          body: document,
        });
        return data.document || data;
      }
      throw err;
    }
  }

  /**
   * Get a document by ID.
   */
  async getById(collection: string, id: string): Promise<LightbaseDocument | null> {
    try {
      const data = await this.request<any>(`${this.baseCollectionUrl}/${collection}/docs/${id}`);
      return data.document || data;
    } catch (err) {
      if (LightbaseClient.isNotFound(err)) return null;
      throw err;
    }
  }

  /**
   * Update a document by ID (partial patch).
   * Tries the direct PATCH endpoint first; falls back to the bulk endpoint
   * when the instance does not expose PATCH on /docs/{id}.
   */
  async update(collection: string, id: string, patch: Record<string, any>): Promise<LightbaseDocument> {
    try {
      const data = await this.request<any>(`${this.baseCollectionUrl}/${collection}/docs/${id}`, {
        method: 'PATCH',
        body: patch,
      });
      return data.document || data;
    } catch (err) {
      if (!LightbaseClient.isNotFound(err)) throw err;
    }

    // Fallback: use the bulk endpoint
    const result = await this.request<any>(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/bulk`, {
      method: 'POST',
      body: { updates: [{ collection, id, patch }] },
    });
    if (result.updated > 0) {
      // Return a merged document (best effort)
      return { id, ...patch } as LightbaseDocument;
    }
    throw new LightbaseError(404, 'not_found', `Lightbase update(${collection}, ${id}) did not update any document`);
  }

  /**
   * Delete a document by ID.
   */
  async delete(collection: string, id: string): Promise<boolean> {
    try {
      await this.request(`${this.baseCollectionUrl}/${collection}/docs/${id}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      if (LightbaseClient.isNotFound(err)) return false;
      throw err;
    }
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
    try {
      return await this.request<LightbaseQueryResult>(`${this.baseCollectionUrl}/${collection}/docs?${params.toString()}`);
    } catch (err) {
      // Gracefully handle 404 (collection not found) — return empty result
      if (LightbaseClient.isNotFound(err)) {
        return { data: [], nextCursor: null, total: 0, hasMore: false };
      }
      throw err;
    }
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
  // BATCH (Path A blueprint §A3 — request coalescing)
  // ═══════════════════════════════════════════════════════

  /**
   * Execute up to 25 mixed read/write operations in ONE engine call.
   *
   * Ops follow the engine /batch schema: { kind, collection, id?, doc?,
   * filter?, sort?, limit?, tag? }. Client-side conveniences: `select`
   * (comma-separated fields) is translated to an engine projection and a
   * string `sort` ('-field' = desc) to the engine sort array.
   *
   * Non-atomic by default: a failed op records `{ error }` and siblings
   * continue. `atomic: true` aborts on the first failed op.
   */
  async batch(ops: LightbaseBatchOp[], atomic = false): Promise<LightbaseBatchResponse> {
    if (!Array.isArray(ops) || ops.length === 0) {
      throw new LightbaseError(400, 'LB_BATCH_EMPTY', 'batch() requires at least one operation.');
    }
    if (ops.length > LIGHTBASE_BATCH_MAX_OPS) {
      throw new LightbaseError(
        400,
        'LB_BATCH_LIMIT',
        `batch() accepts at most ${LIGHTBASE_BATCH_MAX_OPS} ops per call (got ${ops.length}).`,
      );
    }

    const normalized = ops.map((op) => {
      const out: Record<string, any> = { kind: op.kind, collection: op.collection };
      if (op.id !== undefined) out.id = op.id;
      if (op.tag !== undefined) out.tag = op.tag;
      if (op.filter !== undefined) out.filter = op.filter;
      const projection = selectToProjection(op.select);
      if (projection) out.projection = projection;
      const sort = normalizeSort(op.sort);
      if (sort) out.sort = sort;
      if (op.limit !== undefined) out.limit = op.limit;
      if (op.kind === 'insert' || op.kind === 'upsert') {
        if (op.doc) out.doc = op.doc;
      } else if (op.kind === 'update') {
        const patch = op.patch ?? op.doc;
        if (patch) out.patch = patch;
      }
      return out;
    });

    return this.request<LightbaseBatchResponse>(
      `${this.config.baseUrl}/api/v1/projects/${this.config.project}/batch`,
      { method: 'POST', body: { ops: normalized, atomic } },
    );
  }

  // ═══════════════════════════════════════════════════════
  // UPSERT
  // ═══════════════════════════════════════════════════════

  /**
   * Upsert: insert if not exists, update if exists.
   * Uses Lightbase's PUT endpoint with a filter.
   */
  async upsert(collection: string, filter: LightbaseFilter, document: Record<string, any>): Promise<{ document: LightbaseDocument; created: boolean }> {
    return this.request(`${this.baseCollectionUrl}/${collection}/docs`, {
      method: 'PUT',
      body: { filter, document },
    });
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
    return this.request(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/bulk`, {
      method: 'POST',
      body: operations,
    });
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
    return this.request(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/transactions`, {
      method: 'POST',
      body: { ops },
    });
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
    return this.request(`${this.baseCollectionUrl}/${collection}/aggregate`, {
      method: 'POST',
      body,
    });
  }

  // ═══════════════════════════════════════════════════════
  // FULL-TEXT SEARCH
  // ═══════════════════════════════════════════════════════

  /**
   * Full-text search on searchable fields.
   */
  async search(collection: string, query: string, limit?: number): Promise<LightbaseDocument[]> {
    const data = await this.request<any>(`${this.baseCollectionUrl}/${collection}/search`, {
      method: 'POST',
      body: { query, limit: limit || 10 },
    });
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
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new LightbaseError(res.status, err?.error?.code ?? `HTTP_${res.status}`, `Lightbase uploadFile failed: ${res.status}`, err);
    }
    return res.json();
  }

  /**
   * Download a file from a storage bucket.
   */
  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const res = await fetch(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/storage/${bucket}/download?path=${encodeURIComponent(path)}`, {
      headers: this.headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new LightbaseError(res.status, err?.error?.code ?? `HTTP_${res.status}`, `Lightbase downloadFile failed: ${res.status}`, err);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  // ═══════════════════════════════════════════════════════
  // SEED
  // ═══════════════════════════════════════════════════════

  /**
   * Seed a collection with documents (dedup on specified fields).
   */
  async seed(collection: string, documents: Record<string, any>[], dedupOn?: string[]): Promise<{ inserted: number; skipped: number; errors: any[] }> {
    return this.request(`${this.config.baseUrl}/api/v1/projects/${this.config.project}/seed`, {
      method: 'POST',
      body: { collection, documents, dedupOn },
    });
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
        signal: AbortSignal.timeout(this.timeoutMs),
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
