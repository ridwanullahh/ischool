/**
 * Lightbase PUBLIC browser client (Path A blueprint §B3).
 *
 * Browser-direct data access against the Lightbase engine so read traffic
 * never consumes app-side Workers quota. Implements the four §B3 rules:
 *
 *   1. COALESCING  — reads issued within the same 50 ms window join ONE
 *      `POST /api/v1/projects/:id/batch` call (get/query ops only).
 *   2. CACHE       — IndexedDB-backed response cache keyed by the ops
 *      signature, storing the aggregate ETag; revalidations send
 *      `If-None-Match` and a 304 costs zero data transfer.
 *   3. POLLING     — adaptive revalidation (15 s default, relaxed to 30 s
 *      after consecutive unchanged polls), PAUSED on `document.hidden`,
 *      immediate revalidate on visibility restore.
 *   4. UPLOADS     — presigned-url helper: `getPresignedUrl(bucket, path)`
 *      returns a direct download URL; `uploadFile()` attempts a presigned
 *      PUT and can fall back to a same-origin SSR endpoint.
 *
 * CREDENTIALS: never hardcoded. The API key (a scoped, read-mostly Lightbase
 * key created per blueprint §B4) is supplied either as a constructor param
 * or injected by the server into a `data-lb-config` JSON attribute. Without
 * a key the client stays DORMANT and callers fall back to SSR data.
 *
 * All failures resolve to typed LightbasePublicError — callers can catch and
 * degrade gracefully instead of parsing HTML error pages.
 */

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface LightbasePublicConfig {
  /** Lightbase engine origin, e.g. https://lightbase.pages.dev */
  baseUrl: string;
  /** Lightbase project id */
  project: string;
  /** Scoped read-mostly API key — injected, never hardcoded. */
  apiKey?: string;
  /** Base poll interval ms (default 15000). */
  pollMs?: number;
  /** Relaxed poll interval after consecutive unchanged polls (default 30000). */
  relaxedPollMs?: number;
  /** Request timeout ms (default 12000). */
  timeoutMs?: number;
  /** Disable IndexedDB caching if storage is unavailable (default false). */
  cache?: boolean;
}

export class LightbasePublicError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'LightbasePublicError';
  }
}

export type PublicReadOp = {
  kind: 'get' | 'query';
  collection: string;
  id?: string;
  filter?: unknown;
  sort?: string | Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  select?: string;
  tag?: string;
};

interface CacheEntry {
  key: string;
  etag: string | null;
  results: any[];
  cachedAt: number;
  ttl: number;
}

const COALESCE_MS = 50;
const CACHE_DB_NAME = 'ischool-lightbase-cache';
const CACHE_STORE = 'responses';
const CACHE_VERSION = 1;
const DEFAULT_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 200;

// ═══════════════════════════════════════════════════════
// IndexedDB helpers (promise-wrapped, no dependencies)
// ═══════════════════════════════════════════════════════

function openCacheDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const store = db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
          store.createIndex('cachedAt', 'cachedAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cacheGet(key: string): Promise<CacheEntry | null> {
  const db = await openCacheDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const req = tx.objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => resolve((req.result as CacheEntry) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cachePut(entry: CacheEntry): Promise<void> {
  const db = await openCacheDb();
  if (!db) return;
  try {
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    store.put(entry);
    // Size-bounded LRU eviction (blueprint §B5).
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_CACHE_ENTRIES) {
        const idx = store.index('cachedAt');
        const cursorReq = idx.openCursor();
        let toDelete = countReq.result - MAX_CACHE_ENTRIES;
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete--;
            cursor.continue();
          }
        };
      }
    };
  } catch { /* cache is best-effort */ }
}

// ═══════════════════════════════════════════════════════
// The client
// ═══════════════════════════════════════════════════════

interface QueuedRead {
  op: PublicReadOp;
  tag: string;
  resolve: (value: any) => void;
  reject: (err: unknown) => void;
}

export class LightbasePublicClient {
  readonly config: LightbasePublicConfig & Required<Pick<LightbasePublicConfig, 'baseUrl' | 'project'>>;
  private apiKey: string;
  private pending: QueuedRead[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private tagCounter = 0;

  constructor(config: LightbasePublicConfig) {
    if (!config || !config.baseUrl || !config.project) {
      throw new LightbasePublicError(500, 'LB_CONFIG', 'LightbasePublicClient requires baseUrl and project.');
    }
    this.config = {
      pollMs: 15_000,
      relaxedPollMs: 30_000,
      timeoutMs: 12_000,
      cache: true,
      ...config,
    };
    this.apiKey = config.apiKey || '';
  }

  /** True when a scoped key was injected — dormant clients are no-ops. */
  get active(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Builds a client from a server-rendered `data-lb-config` JSON attribute
   * (the sanctioned credential-injection path — no keys in source). Returns
   * null when the attribute is absent or carries no key, so callers can
   * fall back to SSR data gracefully.
   */
  static fromDataAttribute(el: Element | null | undefined, attr = 'data-lb-config'): LightbasePublicClient | null {
    if (!el) return null;
    const raw = el.getAttribute(attr);
    if (!raw) return null;
    let cfg: LightbasePublicConfig;
    try {
      cfg = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!cfg?.baseUrl || !cfg?.project || !cfg?.apiKey) return null;
    return new LightbasePublicClient(cfg);
  }

  // ── Core fetch with typed errors ──

  private async fetchJson(path: string, init: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          'apikey': this.apiKey,
          'x-lightbase-project': this.config.project,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers as Record<string, string> | undefined),
        },
        signal: AbortSignal.timeout(this.config.timeoutMs!),
      });
    } catch (err) {
      throw new LightbasePublicError(
        503,
        'LB_UNREACHABLE',
        'Lightbase is temporarily unreachable.',
        { cause: err instanceof Error ? err.message : String(err) },
      );
    }

    // 304 must be checked FIRST: it is not an error — it means the cached
    // entry is still valid (zero data transfer, blueprint §B3.2). res.ok is
    // false for 304, so testing !res.ok before this would misroute every
    // successful revalidation into the typed-error path.
    if (res.status === 304) return { __notModified: true };
    if (!res.ok) {
      let body: any = null;
      try { body = await res.json(); } catch { try { body = await res.text(); } catch { body = null; } }
      const code = body?.error?.code ?? `HTTP_${res.status}`;
      const message = body?.error?.message ?? body?.message ?? res.statusText;
      throw new LightbasePublicError(res.status, code, message, body);
    }
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  }

  // ── §B3.1 + §B3.2: coalesced, cached reads ──

  private opsKey(ops: PublicReadOp[]): string {
    const payload = JSON.stringify(ops.map(({ tag, ...rest }) => rest));
    let h = 5381;
    for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
    return `${this.config.project}:${(h >>> 0).toString(16)}`;
  }

  private normalizeReadOp(op: PublicReadOp): Record<string, any> {
    const out: Record<string, any> = { kind: op.kind, collection: op.collection };
    if (op.id !== undefined) out.id = op.id;
    if (op.filter !== undefined) out.filter = op.filter;
    if (op.limit !== undefined) out.limit = op.limit;
    if (op.sort) {
      if (typeof op.sort === 'string') {
        const s = op.sort.trim();
        out.sort = s.startsWith('-') ? [{ field: s.slice(1), direction: 'desc' }] : [{ field: s, direction: 'asc' }];
      } else {
        out.sort = op.sort;
      }
    }
    if (op.select) {
      const fields = op.select.split(',').map((f) => f.trim()).filter(Boolean);
      if (fields.length) out.projection = Object.fromEntries(fields.map((f) => [f, 1]));
    }
    return out;
  }

  /**
   * Queues a read op; everything queued within 50 ms joins ONE /batch call.
   * Cache-first: a warm entry resolves immediately and revalidates in the
   * background with If-None-Match (304 = zero data transfer).
   */
  read<T = any>(op: PublicReadOp): Promise<T> {
    if (!this.active) {
      return Promise.reject(new LightbasePublicError(401, 'LB_NO_KEY', 'No scoped Lightbase key injected — SDK dormant.'));
    }
    const tag = op.tag ?? `r${this.tagCounter++}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.push({ op, tag, resolve, reject });
      if (this.flushTimer === null) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.flush();
        }, COALESCE_MS);
      }
    });
  }

  /** Convenience: query a collection through the coalescing layer. */
  query<T = any>(collection: string, params: { filter?: unknown; sort?: string; limit?: number; select?: string } = {}): Promise<T> {
    return this.read<T>({ kind: 'query', collection, ...params });
  }

  /** Convenience: get one document through the coalescing layer. */
  get<T = any>(collection: string, id: string): Promise<T> {
    return this.read<T>({ kind: 'get', collection, id });
  }

  private async flush(): Promise<void> {
    const batch = this.pending;
    this.pending = [];
    if (batch.length === 0) return;

    const cacheKey = this.opsKey(batch.map((q) => q.op));

    // Warm cache → serve immediately, revalidate in the background.
    if (this.cacheEnabled) {
      const entry = await cacheGet(cacheKey);
      if (entry && entry.etag) {
        const fresh = Date.now() - entry.cachedAt < entry.ttl;
        for (const q of batch) {
          // Resolve by the engine's tag echo (custom tags are NOT positional);
          // positional fallback only when the engine strips tags.
          q.resolve(this.resultFor(entry.results, q.tag));
        }
        if (fresh) return;
        this.revalidate(cacheKey, batch.map((q) => ({ ...this.normalizeReadOp(q.op), tag: q.tag })), entry.etag)
          .catch(() => { /* keep warm data */ });
        return;
      }
    }

    const ops = batch.map((q) => ({ ...this.normalizeReadOp(q.op), tag: q.tag }));
    this.executeBatch(cacheKey, ops).then(
      (results) => { for (const q of batch) q.resolve(this.resultFor(results, q.tag)); },
      (err) => { for (const q of batch) q.reject(err); },
    );
  }

  /**
   * Resolves one batch result by its `tag` echo (the engine echoes tags for
   * every op). Falls back to the first result only when the engine stripped
   * tags — positional resolution by auto-tag index is never used because
   * custom tags are not positional.
   */
  private resultFor(results: any[], tag: string): any {
    const r = results.find((x) => x?.tag === tag) ?? results[0];
    if (!r) throw new LightbasePublicError(502, 'LB_BATCH_OP_FAILED', `Missing batch result for tag ${tag}`);
    if (r.error) throw new LightbasePublicError(502, 'LB_BATCH_OP_FAILED', String(r.error));
    return r.data !== undefined ? r.data : r;
  }

  private async executeBatch(cacheKey: string, ops: Record<string, any>[]): Promise<any[]> {
    const res = await this.fetchJson(`/api/v1/projects/${this.config.project}/batch`, {
      method: 'POST',
      body: JSON.stringify({ ops }),
    });
    const results: any[] = res?.results ?? [];
    if (this.cacheEnabled) {
      // All-read batches carry an aggregate ETag (engine §A2/A3); it arrives
      // via the response header, so mirror it into the cache entry through
      // the etag the engine also echoes in the body when present.
      await cachePut({
        key: cacheKey,
        etag: res?.etag ?? null,
        results,
        cachedAt: Date.now(),
        ttl: DEFAULT_TTL_MS,
      });
    }
    return results;
  }

  private async revalidate(cacheKey: string, ops: Record<string, any>[], etag: string): Promise<void> {
    const entry = await cacheGet(cacheKey);
    if (!entry) return;
    try {
      const res = await this.fetchJson(`/api/v1/projects/${this.config.project}/batch`, {
        method: 'POST',
        headers: { 'If-None-Match': etag },
        body: JSON.stringify({ ops }),
      });
      if (res && res.__notModified) {
        entry.cachedAt = Date.now(); // still valid — refresh timestamp
        await cachePut(entry);
        return;
      }
      await cachePut({
        key: cacheKey,
        etag: res?.etag ?? null,
        results: res?.results ?? [],
        cachedAt: Date.now(),
        ttl: DEFAULT_TTL_MS,
      });
    } catch { /* keep warm data on revalidation failure */ }
  }

  // ── §B3.3: adaptive polling, paused on document.hidden ──

  /**
   * Revalidates a read on an adaptive interval (15 s → 30 s after
   * consecutive unchanged polls) and pauses while the tab is hidden.
   * Returns a stop() function. `onUpdate` fires with fresh data; failures
   * are swallowed after notifying `onError` (graceful degradation).
   */
  watch<T = any>(op: PublicReadOp, onUpdate: (data: T) => void, onError?: (err: unknown) => void): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unchangedStreak = 0;
    let lastPayload = '';

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) {
        // Paused while hidden — wake shortly; visibilitychange triggers the
        // immediate revalidate on restore.
        schedule(this.config.pollMs!);
        return;
      }
      try {
        const data = await this.read<T>(op);
        const payload = JSON.stringify(data ?? null);
        if (payload !== lastPayload) {
          lastPayload = payload;
          unchangedStreak = 0;
          onUpdate(data);
        } else {
          unchangedStreak++;
        }
      } catch (err) {
        onError?.(err);
      }
      schedule(unchangedStreak >= 2 ? this.config.relaxedPollMs! : this.config.pollMs!);
    };

    const schedule = (ms: number) => {
      if (stopped) return;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(tick, ms);
    };

    const onVisible = () => {
      if (!stopped && !document.hidden) tick();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    tick();

    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }

  // ── §B3.4: presigned transfers ──

  /**
   * Returns a presigned, time-limited direct URL for a stored object so
   * downloads never proxy through any Worker (blueprint §A7/§B3).
   */
  async getPresignedUrl(bucket: string, path: string, expiresIn?: number): Promise<{ url: string; expiresAt: string }> {
    const body: Record<string, unknown> = { path };
    if (expiresIn) body.expiresIn = expiresIn;
    const res = await this.fetchJson(`/api/v1/projects/${this.config.project}/storage/${bucket}/signed-url`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res?.url) {
      throw new LightbasePublicError(502, 'LB_PRESIGN_FAILED', 'Engine did not return a signed URL.');
    }
    return { url: res.url, expiresAt: res.expiresAt };
  }

  /**
   * Upload helper: attempts a presigned direct PUT (zero Worker bytes);
   * when the engine's presign is read-only it falls back to the provided
   * same-origin SSR endpoint (browser → app server route → engine), or
   * throws a typed error if no fallback is available.
   */
  async uploadFile(bucket: string, path: string, data: Blob | ArrayBuffer, contentType: string, opts?: { fallbackEndpoint?: string }): Promise<{ url: string | null }> {
    try {
      const presign = await this.fetchJson(`/api/v1/projects/${this.config.project}/storage/${bucket}/signed-url`, {
        method: 'POST',
        body: JSON.stringify({ path, method: 'PUT' }),
      });
      if (presign?.url) {
        const put = await fetch(presign.url, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: data as Blob,
          signal: AbortSignal.timeout(this.config.timeoutMs!),
        });
        if (put.ok) return { url: presign.url };
      }
    } catch (err) {
      if (!(err instanceof LightbasePublicError)) {
        throw new LightbasePublicError(503, 'LB_UNREACHABLE', 'Presigned upload failed.', { cause: String(err) });
      }
    }
    if (opts?.fallbackEndpoint) {
      const form = new FormData();
      form.append('path', path);
      form.append('bucket', bucket);
      form.append('file', data instanceof Blob ? data : new Blob([data], { type: contentType }));
      const res = await fetch(opts.fallbackEndpoint, { method: 'POST', body: form });
      if (!res.ok) {
        throw new LightbasePublicError(res.status, `HTTP_${res.status}`, 'Upload fallback failed.');
      }
      return { url: null };
    }
    throw new LightbasePublicError(501, 'LB_UPLOAD_PRESIGN_UNSUPPORTED', 'Engine presigns are read-only; no upload fallback configured.');
  }
}
