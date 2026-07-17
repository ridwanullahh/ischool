/**
 * Lightbase Database Adapter
 * 
 * Provides a Drizzle ORM-compatible interface backed by Lightbase REST API.
 * This allows the existing codebase to use Lightbase without rewriting
 * every query — the adapter translates method calls to Lightbase API calls.
 * 
 * Key differences from Drizzle/SQLite:
 * - All operations are ASYNC (returns Promises, not synchronous results)
 * - Table objects are just string names (no schema objects needed)
 * - Query building is simpler (filter objects instead of Drizzle builders)
 * 
 * Usage (same pattern as Drizzle, but with await):
 *   const db = getDb();
 *   const students = await db.select().from('students').where({ field: 'school_id', op: 'eq', value: 1 }).all();
 *   const result = await db.insert('students').values({ name: 'Ahmad' }).returning();
 * 
 * Environment variable:
 *   DB_PROVIDER=lightbase  → uses Lightbase
 *   DB_PROVIDER=sqlite (default) → uses better-sqlite3
 */

import { LightbaseClient, LightbaseFilter, type LightbaseDocument } from '../lightbase.js';

// ═══════════════════════════════════════════════════════
// Query Builder Classes (mimic Drizzle's chainable API)
// ═══════════════════════════════════════════════════════

class LightbaseSelectBuilder {
  private collection: string;
  private _filter: LightbaseFilter | undefined;
  private _sort: string | undefined;
  private _limit: number | undefined;
  private _select: string | undefined;
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: string) {
    this.client = client;
    this.collection = collection;
  }

  from(collection: string): this {
    this.collection = collection;
    return this;
  }

  where(filter: LightbaseFilter): this {
    this._filter = filter;
    return this;
  }

  orderBy(sort: string): this {
    this._sort = sort;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /** Returns all matching documents */
  async all(): Promise<any[]> {
    const result = await this.client.queryAll(this.collection, {
      filter: this._filter,
      sort: this._sort,
      limit: this._limit,
    });
    return result;
  }

  /** Returns first matching document or null */
  async get(): Promise<any | null> {
    const result = await this.client.query(this.collection, {
      filter: this._filter,
      sort: this._sort,
      limit: 1,
    });
    return result.data?.[0] || null;
  }

  /** Count matching documents */
  async count(): Promise<number> {
    return this.client.count(this.collection, this._filter);
  }
}

class LightbaseInsertBuilder {
  private collection: string;
  private _values: Record<string, any> | Record<string, any>[];
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: string) {
    this.client = client;
    this.collection = collection;
  }

  values(data: Record<string, any> | Record<string, any>[]): this {
    this._values = data;
    return this;
  }

  /** Insert and return the created document(s) */
  async returning(): Promise<any> {
    if (Array.isArray(this._values)) {
      // Bulk insert
      const result = await this.client.bulkInsert(this.collection, this._values);
      // Fetch back the inserted docs — Lightbase bulk doesn't return them
      // For now, return the input with generated IDs
      return this._values.map((v, i) => ({ ...v, id: `bulk_${i}`, _created_at: new Date().toISOString() }));
    }
    const doc = await this.client.insert(this.collection, this._values as Record<string, any>);
    return doc;
  }

  /** Insert without returning (faster) */
  async run(): Promise<void> {
    if (Array.isArray(this._values)) {
      await this.client.bulkInsert(this.collection, this._values);
    } else {
      await this.client.insert(this.collection, this._values as Record<string, any>);
    }
  }
}

class LightbaseUpdateBuilder {
  private collection: string;
  private _set: Record<string, any> = {};
  private _filter: LightbaseFilter | undefined;
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: string) {
    this.client = client;
    this.collection = collection;
  }

  set(data: Record<string, any>): this {
    this._set = { ...this._set, ...data };
    return this;
  }

  where(filter: LightbaseFilter): this {
    this._filter = filter;
    return this;
  }

  /** Update all matching documents and return count */
  async run(): Promise<number> {
    // Lightbase doesn't have a direct "update by filter" endpoint
    // We need to: 1) query matching docs, 2) update each by ID
    const docs = await this.client.queryAll(this.collection, { filter: this._filter, limit: 1000 });
    let count = 0;
    for (const doc of docs) {
      if (doc.id) {
        await this.client.update(this.collection, doc.id, this._set);
        count++;
      }
    }
    return count;
  }

  /** Update and return the first matching document */
  async returning(): Promise<any | null> {
    const docs = await this.client.query(this.collection, { filter: this._filter, limit: 1 });
    if (!docs.data?.[0]?.id) return null;
    return this.client.update(this.collection, docs.data[0].id, this._set);
  }
}

class LightbaseDeleteBuilder {
  private collection: string;
  private _filter: LightbaseFilter | undefined;
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: string) {
    this.client = client;
    this.collection = collection;
  }

  where(filter: LightbaseFilter): this {
    this._filter = filter;
    return this;
  }

  /** Delete all matching documents */
  async run(): Promise<number> {
    const docs = await this.client.queryAll(this.collection, { filter: this._filter, limit: 1000 });
    let count = 0;
    for (const doc of docs) {
      if (doc.id) {
        await this.client.delete(this.collection, doc.id);
        count++;
      }
    }
    return count;
  }
}

// ═══════════════════════════════════════════════════════
// Transaction Support
// ═══════════════════════════════════════════════════════

class LightbaseTransaction {
  private client: LightbaseClient;
  private ops: Array<any> = [];
  private isCommitted = false;

  constructor(client: LightbaseClient) {
    this.client = client;
  }

  insert(collection: string, document: Record<string, any>): this {
    this.ops.push({ kind: 'insert', collection, document });
    return this;
  }

  update(collection: string, id: string, patch: Record<string, any>): this {
    this.ops.push({ kind: 'update', collection, id, patch });
    return this;
  }

  delete(collection: string, id: string): this {
    this.ops.push({ kind: 'delete', collection, id });
    return this;
  }

  async commit(): Promise<any> {
    if (this.isCommitted) throw new Error('Transaction already committed');
    this.isCommitted = true;
    return this.client.transaction(this.ops);
  }
}

// ═══════════════════════════════════════════════════════
// Main Lightbase DB Adapter
// ═══════════════════════════════════════════════════════

export class LightbaseDB {
  private client: LightbaseClient;

  constructor(client?: LightbaseClient) {
    this.client = client || new LightbaseClient();
  }

  /** Get the underlying Lightbase client */
  get raw() {
    return this.client;
  }

  /** Start a SELECT query */
  select(collection?: string): LightbaseSelectBuilder {
    return new LightbaseSelectBuilder(this.client, collection || '');
  }

  /** Start an INSERT query */
  insert(collection: string): LightbaseInsertBuilder {
    return new LightbaseInsertBuilder(this.client, collection);
  }

  /** Start an UPDATE query */
  update(collection: string): LightbaseUpdateBuilder {
    return new LightbaseUpdateBuilder(this.client, collection);
  }

  /** Start a DELETE query */
  delete(collection: string): LightbaseDeleteBuilder {
    return new LightbaseDeleteBuilder(this.client, collection);
  }

  /** Execute a transaction */
  transaction<T>(fn: (tx: LightbaseTransaction) => T): T {
    const tx = new LightbaseTransaction(this.client);
    const result = fn(tx);
    // If the function returns a promise, await it then commit
    if (result instanceof Promise) {
      return result.then(async () => {
        await tx.commit();
        return result;
      }) as any;
    }
    // Synchronous — commit immediately
    tx.commit();
    return result;
  }

  /** Execute raw SQL (via Lightbase SQLite compat endpoint) */
  async run(sql: string, params?: any[]): Promise<any> {
    const res = await fetch(`${this.client['config'].baseUrl}/api/v1/projects/${this.client['config'].project}/sql`, {
      method: 'POST',
      headers: this.client['headers'],
      body: JSON.stringify({ query: sql, params: params || [] }),
    });
    if (!res.ok) throw new Error(`Lightbase SQL failed: ${res.status}`);
    return res.json();
  }
}

// ═══════════════════════════════════════════════════════
// Filter Helper Functions (mimic Drizzle's eq, and, etc.)
// ═══════════════════════════════════════════════════════

/** Equal filter */
export function lbEq(field: string, value: any): LightbaseFilter {
  return { field, op: 'eq', value };
}

/** Not equal filter */
export function lbNeq(field: string, value: any): LightbaseFilter {
  return { field, op: 'neq', value };
}

/** Greater than */
export function lbGt(field: string, value: any): LightbaseFilter {
  return { field, op: 'gt', value };
}

/** Greater than or equal */
export function lbGte(field: string, value: any): LightbaseFilter {
  return { field, op: 'gte', value };
}

/** Less than */
export function lbLt(field: string, value: any): LightbaseFilter {
  return { field, op: 'lt', value };
}

/** Less than or equal */
export function lbLte(field: string, value: any): LightbaseFilter {
  return { field, op: 'lte', value };
}

/** LIKE filter */
export function lbLike(field: string, value: any): LightbaseFilter {
  return { field, op: 'like', value };
}

/** Case-insensitive LIKE */
export function lbIlike(field: string, value: any): LightbaseFilter {
  return { field, op: 'ilike', value };
}

/** IN filter */
export function lbIn(field: string, value: any[]): LightbaseFilter {
  return { field, op: 'in', value };
}

/** IS NULL / IS NOT NULL */
export function lbIsNull(field: string): LightbaseFilter {
  return { field, op: 'is', value: null };
}
export function lbIsNotNull(field: string): LightbaseFilter {
  return { field, op: 'isnot', value: null };
}

/** AND composition */
export function lbAnd(...filters: LightbaseFilter[]): LightbaseFilter {
  return { and: filters };
}

/** OR composition */
export function lbOr(...filters: LightbaseFilter[]): LightbaseFilter {
  return { or: filters };
}

// Singleton
let _lightbaseDb: LightbaseDB | null = null;

export function getLightbaseDb(): LightbaseDB {
  if (!_lightbaseDb) {
    _lightbaseDb = new LightbaseDB();
  }
  return _lightbaseDb;
}
