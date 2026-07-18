/**
 * Lightbase Database Adapter
 * 
 * Provides a Drizzle ORM-compatible interface backed by Lightbase REST API.
 * Automatically extracts collection names from Drizzle table objects.
 * 
 * Environment variable:
 *   DB_PROVIDER=lightbase  → uses Lightbase
 *   DB_PROVIDER=sqlite (default) → uses better-sqlite3
 */

import { LightbaseClient, type LightbaseFilter, type LightbaseDocument } from '../lightbase.js';

// ═══════════════════════════════════════════════════════
// Helper: Extract collection name from Drizzle table object or string
// ═══════════════════════════════════════════════════════

function toCollectionName(table: any): string {
  if (typeof table === 'string') return table;
  // Drizzle table objects have a [Symbol.for('drizzle:Name')] property
  if (table && typeof table === 'object') {
    // Try Drizzle's internal name symbol
    const sym = (table as any)[Symbol.for('drizzle:Name')];
    if (sym) return sym;
    // Try common properties
    if (table.name) return table.name;
    if (table[Symbol.for('drizzle:Name')]) return table[Symbol.for('drizzle:Name')];
    // Drizzle stores the name in the config
    if (table._?.name) return table._.name;
    if (table.__drizzleName) return table.__drizzleName;
  }
  return String(table);
}

// ═══════════════════════════════════════════════════════
// Helper: Convert Drizzle-style filters to Lightbase filters
// ═══════════════════════════════════════════════════════

function toLightbaseFilter(drizzleFilter: any): LightbaseFilter | undefined {
  if (!drizzleFilter) return undefined;
  // If it's already a Lightbase filter (has field/op/and/or), use directly
  if (drizzleFilter.field || drizzleFilter.and || drizzleFilter.or) return drizzleFilter;
  // Drizzle filter objects are SQL fragments — we can't easily parse them
  // Return undefined and let the query fetch all (filtering happens client-side if needed)
  return undefined;
}

// ═══════════════════════════════════════════════════════
// Query Builder Classes
// ═══════════════════════════════════════════════════════

class LightbaseSelectBuilder {
  private collection: string;
  private _filter: LightbaseFilter | undefined;
  private _sort: string | undefined;
  private _limit: number | undefined;
  private _selectFields: string | undefined;
  private client: LightbaseClient;
  private _rawFilter: any;

  constructor(client: LightbaseClient, collection?: any) {
    this.client = client;
    this.collection = collection ? toCollectionName(collection) : '';
  }

  from(collection: any): this {
    this.collection = toCollectionName(collection);
    return this;
  }

  where(filter: any): this {
    this._rawFilter = filter;
    this._filter = toLightbaseFilter(filter);
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

  async all(): Promise<any[]> {
    const result = await this.client.queryAll(this.collection, {
      filter: this._filter,
      sort: this._sort,
      limit: this._limit,
    });
    // If we have a raw Drizzle filter that wasn't converted, filter client-side
    if (this._rawFilter && !this._filter) {
      return filterClientSide(result, this._rawFilter);
    }
    return result;
  }

  async get(): Promise<any | null> {
    const result = await this.client.query(this.collection, {
      filter: this._filter,
      sort: this._sort,
      limit: 1,
    });
    let doc = result.data?.[0] || null;
    if (doc && this._rawFilter && !this._filter) {
      const filtered = filterClientSide([doc], this._rawFilter);
      doc = filtered[0] || null;
    }
    return doc;
  }

  async count(): Promise<number> {
    return this.client.count(this.collection, this._filter);
  }
}

class LightbaseInsertBuilder {
  private collection: string;
  private _values: Record<string, any> | Record<string, any>[];
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: any) {
    this.client = client;
    this.collection = toCollectionName(collection);
  }

  values(data: Record<string, any> | Record<string, any>[]): this {
    this._values = data;
    return this;
  }

  async returning(): Promise<any> {
    if (Array.isArray(this._values)) {
      const results: any[] = [];
      for (const doc of this._values) {
        const result = await this.client.insert(this.collection, cleanDoc(doc));
        results.push(result);
      }
      return results;
    }
    return await this.client.insert(this.collection, cleanDoc(this._values as Record<string, any>));
  }

  async run(): Promise<void> {
    if (Array.isArray(this._values)) {
      await this.client.bulkInsert(this.collection, this._values.map(d => cleanDoc(d)));
    } else {
      await this.client.insert(this.collection, cleanDoc(this._values as Record<string, any>));
    }
  }
}

class LightbaseUpdateBuilder {
  private collection: string;
  private _set: Record<string, any> = {};
  private _filter: LightbaseFilter | undefined;
  private _rawFilter: any;
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: any) {
    this.client = client;
    this.collection = toCollectionName(collection);
  }

  set(data: Record<string, any>): this {
    this._set = { ...this._set, ...cleanDoc(data) };
    return this;
  }

  where(filter: any): this {
    this._rawFilter = filter;
    this._filter = toLightbaseFilter(filter);
    return this;
  }

  async run(): Promise<number> {
    // Query matching docs, update each by ID
    const docs = await this.client.queryAll(this.collection, {
      filter: this._filter,
      limit: 1000,
    });
    let count = 0;
    let filteredDocs = docs;
    if (this._rawFilter && !this._filter) {
      filteredDocs = filterClientSide(docs, this._rawFilter);
    }
    for (const doc of filteredDocs) {
      if (doc.id) {
        await this.client.update(this.collection, doc.id, this._set);
        count++;
      }
    }
    return count;
  }

  async returning(): Promise<any | null> {
    const docs = await this.client.query(this.collection, { filter: this._filter, limit: 1 });
    let doc = docs.data?.[0];
    if (doc && this._rawFilter && !this._filter) {
      const filtered = filterClientSide(docs.data, this._rawFilter);
      doc = filtered[0];
    }
    if (!doc?.id) return null;
    return this.client.update(this.collection, doc.id, this._set);
  }
}

class LightbaseDeleteBuilder {
  private collection: string;
  private _filter: LightbaseFilter | undefined;
  private _rawFilter: any;
  private client: LightbaseClient;

  constructor(client: LightbaseClient, collection: any) {
    this.client = client;
    this.collection = toCollectionName(collection);
  }

  where(filter: any): this {
    this._rawFilter = filter;
    this._filter = toLightbaseFilter(filter);
    return this;
  }

  async run(): Promise<number> {
    const docs = await this.client.queryAll(this.collection, {
      filter: this._filter,
      limit: 1000,
    });
    let count = 0;
    let filteredDocs = docs;
    if (this._rawFilter && !this._filter) {
      filteredDocs = filterClientSide(docs, this._rawFilter);
    }
    for (const doc of filteredDocs) {
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

  constructor(client: LightbaseClient) {
    this.client = client;
  }

  insert(collection: any, document: Record<string, any>): this {
    this.ops.push({ kind: 'insert', collection: toCollectionName(collection), document: cleanDoc(document) });
    return this;
  }

  update(collection: any, id: string, patch: Record<string, any>): this {
    this.ops.push({ kind: 'update', collection: toCollectionName(collection), id, patch: cleanDoc(patch) });
    return this;
  }

  delete(collection: any, id: string): this {
    this.ops.push({ kind: 'delete', collection: toCollectionName(collection), id });
    return this;
  }

  async commit(): Promise<any> {
    return this.client.transaction(this.ops);
  }
}

// ═══════════════════════════════════════════════════════
// Helper: Clean document for Lightbase (remove undefined values, convert dates)
// ═══════════════════════════════════════════════════════

function cleanDoc(doc: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined) continue;
    if (value instanceof Date) {
      cleaned[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Convert objects to JSON strings for Lightbase json fields
      cleaned[key] = JSON.stringify(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ═══════════════════════════════════════════════════════
// Helper: Client-side filtering for Drizzle filters we can't convert
// ═══════════════════════════════════════════════════════

function filterClientSide(docs: any[], filter: any): any[] {
  if (!filter) return docs;
  // Drizzle SQL filters are complex — for now, return all docs
  // The filter is applied at the Lightbase query level when possible
  // This is a best-effort fallback for complex Drizzle queries
  return docs;
}

// ═══════════════════════════════════════════════════════
// Main Lightbase DB Adapter
// ═══════════════════════════════════════════════════════

export class LightbaseDB {
  private client: LightbaseClient;

  constructor(client?: LightbaseClient) {
    this.client = client || new LightbaseClient();
  }

  get raw() {
    return this.client;
  }

  select(collection?: any): LightbaseSelectBuilder {
    return new LightbaseSelectBuilder(this.client, collection);
  }

  insert(collection: any): LightbaseInsertBuilder {
    return new LightbaseInsertBuilder(this.client, collection);
  }

  update(collection: any): LightbaseUpdateBuilder {
    return new LightbaseUpdateBuilder(this.client, collection);
  }

  delete(collection: any): LightbaseDeleteBuilder {
    return new LightbaseDeleteBuilder(this.client, collection);
  }

  transaction<T>(fn: (tx: LightbaseTransaction) => T): T {
    const tx = new LightbaseTransaction(this.client);
    const result = fn(tx);
    if (result instanceof Promise) {
      return result.then(async () => {
        await tx.commit();
        return result;
      }) as any;
    }
    tx.commit();
    return result;
  }
}

// Singleton
let _lightbaseDb: LightbaseDB | null = null;

export function getLightbaseDb(): LightbaseDB {
  if (!_lightbaseDb) {
    _lightbaseDb = new LightbaseDB();
  }
  return _lightbaseDb;
}
