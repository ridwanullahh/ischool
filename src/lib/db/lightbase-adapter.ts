/**
 * Lightbase Database Adapter
 *
 * Provides a Drizzle ORM-compatible interface backed by Lightbase REST API.
 * Automatically extracts collection names from Drizzle table objects.
 *
 * Key features:
 *   - Parses Drizzle eq/ne/gt/lt/gte/lte/like/inArray/and/or filters into
 *     Lightbase filter objects so that WHERE clauses are applied server-side.
 *   - Normalizes returned documents: snake_case column names are mirrored to
 *     camelCase JS property names (e.g. password_hash -> passwordHash) so
 *     that callers using Drizzle schema property names work unchanged.
 *   - Auto-creates collections on 404, gracefully returns [] on missing data.
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
  if (table && typeof table === 'object') {
    // Drizzle table objects carry their name on Symbol.for('drizzle:Name')
    const sym = (table as any)[Symbol.for('drizzle:Name')];
    if (sym) return sym;
    if (table.name) return table.name;
    if (table[Symbol.for('drizzle:Name')]) return table[Symbol.for('drizzle:Name')];
    if (table._?.name) return table._.name;
    if (table.__drizzleName) return table.__drizzleName;
  }
  return String(table);
}

// ═══════════════════════════════════════════════════════
// Drizzle filter parser — converts Drizzle SQL fragments into
// Lightbase filter objects so queries are filtered server-side.
// ═══════════════════════════════════════════════════════

const OP_MAP: Record<string, string> = {
  '=': 'eq',
  '<>': 'ne',
  '!=': 'ne',
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  'like': 'like',
};

function isColumn(obj: any): boolean {
  return obj && typeof obj === 'object' && typeof obj.name === 'string' &&
    (obj.constructor?.name?.includes('SQLite') || obj.constructor?.name?.includes('Column') || obj.config !== undefined);
}

function isParam(obj: any): boolean {
  return obj && typeof obj === 'object' && 'value' in obj && obj.constructor?.name === 'Param';
}

function isStringChunk(obj: any): boolean {
  return obj && typeof obj === 'object' && Array.isArray(obj.value) &&
    obj.constructor?.name === 'StringChunk';
}

function isSql(obj: any): boolean {
  return obj && typeof obj === 'object' && Array.isArray(obj.queryChunks) &&
    (obj.constructor?.name === 'SQL' || isStringChunk(obj) === false);
}

function extractParamValue(chunk: any): any {
  if (chunk === null || chunk === undefined) return chunk;
  if (typeof chunk !== 'object') return chunk; // raw string/number
  if (isParam(chunk)) return chunk.value;
  if (Array.isArray(chunk)) return chunk.map(extractParamValue);
  if (isStringChunk(chunk)) return chunk.value?.[0];
  return chunk;
}

/**
 * Parses a Drizzle SQL filter (eq/ne/gt/lt/gte/lte/like/inArray/and/or)
 * into a Lightbase filter object. Returns undefined if the filter cannot
 * be parsed (caller should fall back to client-side filtering).
 */
function parseDrizzleFilter(filter: any): LightbaseFilter | undefined {
  if (!filter) return undefined;

  // Already a Lightbase filter?
  if (filter.field || filter.and || filter.or) return filter as LightbaseFilter;

  const chunks = filter.queryChunks;
  if (!Array.isArray(chunks)) return undefined;

  // Pattern: and() / or()
  // chunks = [StringChunk('('), SQL_inner, StringChunk(')')]
  if (chunks.length === 3 &&
      isStringChunk(chunks[0]) && chunks[0].value[0] === '(' &&
      isStringChunk(chunks[2]) && chunks[2].value[0] === ')') {
    const innerSql = chunks[1];
    if (!isSql(innerSql)) return undefined;
    const innerChunks = innerSql.queryChunks;
    const subFilters: LightbaseFilter[] = [];
    const connectors: string[] = [];
    for (const c of innerChunks) {
      if (isSql(c)) {
        const f = parseDrizzleFilter(c);
        if (f) subFilters.push(f);
      } else if (isStringChunk(c)) {
        const txt = (c.value[0] || '').trim().toLowerCase();
        if (txt) connectors.push(txt);
      }
    }
    if (subFilters.length === 0) return undefined;
    if (subFilters.length === 1) return subFilters[0];
    const allAnd = connectors.every(c => c === 'and');
    const allOr = connectors.every(c => c === 'or');
    if (allAnd) return { and: subFilters };
    if (allOr) return { or: subFilters };
    // Mixed and/or without explicit precedence — fall back to and
    return { and: subFilters };
  }

  // Pattern: simple comparison
  // chunks = [StringChunk(""), Column, StringChunk(" op "), value, StringChunk("")]
  if (chunks.length === 5 && isColumn(chunks[1]) && isStringChunk(chunks[2])) {
    const field = chunks[1].name;
    const opStr = (chunks[2].value[0] || '').trim().toLowerCase();
    const rawValue = extractParamValue(chunks[3]);
    const op = OP_MAP[opStr];

    if (!op) return undefined;

    if (op === 'like' && typeof rawValue === 'string') {
      // SQL LIKE patterns: %foo% → contains, foo% → startsWith, %foo → endsWith
      if (rawValue.startsWith('%') && rawValue.endsWith('%')) {
        return { field, op: 'contains', value: rawValue.slice(1, -1) };
      }
      if (rawValue.endsWith('%')) {
        return { field, op: 'startsWith', value: rawValue.slice(0, -1) };
      }
      if (rawValue.startsWith('%')) {
        return { field, op: 'endsWith', value: rawValue.slice(1) };
      }
      return { field, op: 'eq', value: rawValue };
    }

    // inArray: rawValue is an array
    if (Array.isArray(rawValue)) {
      return { field, op: 'in', value: rawValue };
    }

    return { field, op, value: rawValue };
  }

  // Pattern: inArray (chunks[3] is a raw Array of Params)
  // chunks = [StringChunk(""), Column, StringChunk(" in "), Array, StringChunk("")]
  if (chunks.length === 5 && isColumn(chunks[1]) && isStringChunk(chunks[2]) &&
      (chunks[2].value[0] || '').includes('in') && Array.isArray(chunks[3])) {
    const field = chunks[1].name;
    const values = chunks[3].map((p: any) => p?.value ?? p);
    return { field, op: 'in', value: values };
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════
// Document normalization — mirrors snake_case columns to camelCase
// so callers using Drizzle property names (e.g. user.passwordHash)
// work whether the document came from SQLite or Lightbase.
// ═══════════════════════════════════════════════════════

const CACHED_NORMALIZED = new WeakMap<object, any>();

function snakeToCamel(s: string): string {
  if (!s.includes('_')) return s;
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function normalizeDoc(doc: any): any {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  if (CACHED_NORMALIZED.has(doc)) return CACHED_NORMALIZED.get(doc);

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    // Preserve Lightbase internals as-is
    if (key === '_created_at' || key === '_updated_at' || key === '_revision' || key === '_deleted') {
      out[key] = value;
      // Also expose camelCase aliases for convenience
      if (key === '_created_at') out.createdAt = value;
      else if (key === '_updated_at') out.updatedAt = value;
      continue;
    }
    // Mirror snake_case → camelCase (do NOT overwrite if camelCase already present)
    const camel = snakeToCamel(key);
    out[key] = value;
    if (camel !== key && !(camel in doc)) {
      out[camel] = value;
    }
  }
  CACHED_NORMALIZED.set(doc, out);
  return out;
}

function normalizeDocs(docs: any[]): any[] {
  if (!Array.isArray(docs)) return [];
  return docs.map(normalizeDoc);
}

// ═══════════════════════════════════════════════════════
// Order-by parser — accepts Drizzle asc()/desc() objects or strings
// ═══════════════════════════════════════════════════════

function toLightbaseSort(orderBy: any): string | undefined {
  if (!orderBy) return undefined;
  if (typeof orderBy === 'string') return orderBy;
  // Drizzle asc()/desc() return SQL fragments with queryChunks
  if (orderBy.queryChunks && Array.isArray(orderBy.queryChunks)) {
    const chunks = orderBy.queryChunks;
    // Pattern: [StringChunk(""), Column, StringChunk(" asc"/" desc"), StringChunk("")]
    if (chunks.length >= 3 && chunks[1]?.name) {
      const col = chunks[1].name;
      const dir = (chunks[2]?.value?.[0] || '').trim().toLowerCase();
      if (dir === 'desc') return `-${col}`;
      return col;
    }
  }
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
  private _selectFields: any;
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

  // Drizzle's db.select({fields}) call — we accept the fields object
  // but ignore it (Lightbase always returns full documents). The fields
  // are picked client-side if needed.
  select(fields?: any): this {
    this._selectFields = fields;
    return this;
  }

  where(filter: any): this {
    this._rawFilter = filter;
    this._filter = parseDrizzleFilter(filter);
    return this;
  }

  orderBy(sort: any): this {
    this._sort = toLightbaseSort(sort);
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
    let docs = normalizeDocs(result);
    // Client-side fallback for Drizzle filters we couldn't parse
    if (this._rawFilter && !this._filter) {
      docs = filterClientSide(docs, this._rawFilter);
    }
    return docs;
  }

  async get(): Promise<any | null> {
    const result = await this.client.query(this.collection, {
      filter: this._filter,
      sort: this._sort,
      limit: 1,
    });
    let doc = result.data?.[0] || null;
    if (doc) doc = normalizeDoc(doc);
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
        results.push(normalizeDoc(result));
      }
      return results;
    }
    const result = await this.client.insert(this.collection, cleanDoc(this._values as Record<string, any>));
    return normalizeDoc(result);
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
    this._filter = parseDrizzleFilter(filter);
    return this;
  }

  async run(): Promise<number> {
    const docs = await this.client.queryAll(this.collection, {
      filter: this._filter,
      limit: 1000,
    });
    let count = 0;
    let filteredDocs = normalizeDocs(docs);
    if (this._rawFilter && !this._filter) {
      filteredDocs = filterClientSide(filteredDocs, this._rawFilter);
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
    if (doc) doc = normalizeDoc(doc);
    if (doc && this._rawFilter && !this._filter) {
      const filtered = filterClientSide(docs.data.map(normalizeDoc), this._rawFilter);
      doc = filtered[0];
    }
    if (!doc?.id) return null;
    const updated = await this.client.update(this.collection, doc.id, this._set);
    return normalizeDoc(updated);
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
    this._filter = parseDrizzleFilter(filter);
    return this;
  }

  async run(): Promise<number> {
    const docs = await this.client.queryAll(this.collection, {
      filter: this._filter,
      limit: 1000,
    });
    let count = 0;
    let filteredDocs = normalizeDocs(docs);
    if (this._rawFilter && !this._filter) {
      filteredDocs = filterClientSide(filteredDocs, this._rawFilter);
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
// Helper: Clean document for Lightbase (remove undefined, stringify nested objects)
// ═══════════════════════════════════════════════════════

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

function cleanDoc(doc: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value === undefined) continue;
    // Convert camelCase keys to snake_case for Lightbase storage
    // (Drizzle JS property names -> SQL column names)
    const snakeKey = camelToSnake(key);
    if (value === null) {
      cleaned[snakeKey] = null;
      continue;
    }
    if (value instanceof Date) {
      cleaned[snakeKey] = value.toISOString();
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Store nested objects as JSON strings (Lightbase json fields)
      cleaned[snakeKey] = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      cleaned[snakeKey] = JSON.stringify(value);
    } else {
      cleaned[snakeKey] = value;
    }
  }
  return cleaned;
}

// ═══════════════════════════════════════════════════════
// Helper: Client-side filtering fallback for Drizzle filters
// we couldn't parse. Re-parses the Drizzle filter using the
// same logic but applies the predicate in-memory.
// ═══════════════════════════════════════════════════════

function filterClientSide(docs: any[], filter: any): any[] {
  if (!filter || !docs.length) return docs;
  const lf = parseDrizzleFilter(filter);
  if (!lf) return docs; // can't filter — return all
  return docs.filter(d => matchesFilter(d, lf));
}

function matchesFilter(doc: any, f: LightbaseFilter): boolean {
  if (!f) return true;
  if (f.and) return f.and.every(sub => matchesFilter(doc, sub));
  if (f.or) return f.or.some(sub => matchesFilter(doc, sub));
  if (!f.field) return true;
  const field = f.field;
  // Read either snake_case or camelCase variant
  const value = doc[field] !== undefined ? doc[field] :
                (doc[camelToSnake(field)] !== undefined ? doc[camelToSnake(field)] : undefined);
  switch (f.op) {
    case 'eq': return value === f.value;
    case 'ne': return value !== f.value;
    case 'gt': return value > f.value;
    case 'lt': return value < f.value;
    case 'gte': return value >= f.value;
    case 'lte': return value <= f.value;
    case 'in': return Array.isArray(f.value) && f.value.includes(value);
    case 'contains': return typeof value === 'string' && value.toLowerCase().includes(String(f.value).toLowerCase());
    case 'startsWith': return typeof value === 'string' && value.startsWith(String(f.value));
    case 'endsWith': return typeof value === 'string' && value.endsWith(String(f.value));
    case 'like': {
      if (typeof value !== 'string' || typeof f.value !== 'string') return false;
      const re = new RegExp('^' + f.value.replace(/%/g, '.*').replace(/_/g, '.') + '$');
      return re.test(value);
    }
    default: return true;
  }
}

// (camelToSnake is already defined above in cleanDoc section)

// ═══════════════════════════════════════════════════════
// Main Lightbase DB Adapter
// ═══════════════════════════════════════════════════════

export class LightbaseDB {
  private client: LightbaseClient;

  constructor(client?: LightbaseClient) {
    this.client = client || new LightbaseClient();
  }

  get raw(): LightbaseClient {
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
