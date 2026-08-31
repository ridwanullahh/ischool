/**
 * Path A hardening tests for the Lightbase server client:
 *   - raw fetch failures resolve to typed 503 LB_UNREACHABLE errors
 *   - idempotent GET/HEAD get one 250 ms retry on network errors + 502/503/504
 *   - non-idempotent methods never retry
 *   - timeout comes from LIGHTBASE_TIMEOUT_MS (default 12 s)
 *   - batch(): ≤ 25 ops, select→projection + string-sort→array normalization
 *   - 404 semantics preserved (getById → null, query → empty result)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LightbaseClient, LightbaseError, LIGHTBASE_BATCH_MAX_OPS } from '../lib/lightbase.js';

const jsonRes = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('LightbaseClient typed errors and retry (Path A)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('converts a raw network failure into a typed 503 LB_UNREACHABLE error (no retry for POST)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed: connection reset'));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    const err = await client.insert('things', { a: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(LightbaseError);
    expect(err.status).toBe(503);
    expect(err.code).toBe('LB_UNREACHABLE');
    expect(fetchMock).toHaveBeenCalledTimes(1); // POST is not retried
  });

  it('retries an idempotent GET once on a network error, then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonRes({ data: [{ id: '1' }], nextCursor: null, total: 1, hasMore: false }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    const res = await client.query('things', { limit: 5 });
    expect(res.data).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a GET once on a transient 503 and surfaces the typed error if it persists', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ error: { code: 'overloaded', message: 'try later' } }, 503));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    const err = await client.getById('things', 'x').catch((e) => e);
    expect(err).toBeInstanceOf(LightbaseError);
    expect(err.status).toBe(503);
    expect(err.code).toBe('overloaded');
    expect(fetchMock).toHaveBeenCalledTimes(2); // exactly one retry
  });

  it('maps non-ok error bodies into typed errors with the upstream code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ error: { code: 'forbidden', message: 'nope' } }, 403));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    const err = await client.listCollections().catch((e) => e);
    expect(err).toBeInstanceOf(LightbaseError);
    expect(err.status).toBe(403);
    expect(err.code).toBe('forbidden');
    expect(err.message).toBe('nope');
  });

  it('preserves 404 semantics: getById returns null and query returns an empty result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ error: { code: 'not_found', message: 'missing' } }, 404));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    expect(await client.getById('things', 'nope')).toBeNull();
    const res = await client.query('missing_collection');
    expect(res.data).toEqual([]);
    expect(res.total).toBe(0);
  });

  it('honours the LIGHTBASE_TIMEOUT_MS env override', () => {
    vi.stubEnv('LIGHTBASE_TIMEOUT_MS', '4500');
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });
    // @ts-expect-error accessing private member for verification
    expect(client.timeoutMs).toBe(4500);
    vi.stubEnv('LIGHTBASE_TIMEOUT_MS', 'bogus');
    const fallback = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });
    // @ts-expect-error accessing private member for verification
    expect(fallback.timeoutMs).toBe(12000);
  });
});

describe('LightbaseClient.batch (Path A request coalescing)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects more than 25 ops with a typed 400 before any network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    const ops = Array.from({ length: LIGHTBASE_BATCH_MAX_OPS + 1 }, (_, i) => ({
      kind: 'query' as const,
      collection: `c${i}`,
    }));
    const err = await client.batch(ops).catch((e) => e);
    expect(err).toBeInstanceOf(LightbaseError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('LB_BATCH_LIMIT');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts normalized ops to /api/v1/projects/:id/batch (select→projection, string sort→array)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ results: [{ index: 0, tag: 'q0', data: [] }], allReads: true }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'proj', apiKey: 'k' });

    const res = await client.batch([
      { kind: 'query', collection: 'courses', filter: { field: 'school_id', op: 'eq', value: 7 }, sort: '-title', select: 'id,title', limit: 10, tag: 'q0' },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://lb.test/api/v1/projects/proj/batch');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.atomic).toBe(false);
    expect(body.ops[0].sort).toEqual([{ field: 'title', direction: 'desc' }]);
    expect(body.ops[0].projection).toEqual({ id: 1, title: 1 });
    expect(body.ops[0].tag).toBe('q0');
    expect(res.allReads).toBe(true);
    expect(res.results[0].data).toEqual([]);
  });

  it('normalizes update ops (doc alias → patch) and passes atomic through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ results: [], allReads: false }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });

    await client.batch([{ kind: 'update', collection: 'things', id: 'a1', doc: { status: 'x' } }], true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.atomic).toBe(true);
    expect(body.ops[0].patch).toEqual({ status: 'x' });
    expect(body.ops[0].doc).toBeUndefined();
  });

  it('rejects an empty ops list without touching the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const client = new LightbaseClient({ baseUrl: 'https://lb.test', project: 'p1', apiKey: 'k' });
    const err = await client.batch([]).catch((e) => e);
    expect(err).toBeInstanceOf(LightbaseError);
    expect(err.code).toBe('LB_BATCH_EMPTY');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
