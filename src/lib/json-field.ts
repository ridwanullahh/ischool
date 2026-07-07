/**
 * JSON Field Helper — Handles the discrepancy between Drizzle ORM json-mode
 * columns and raw SQL queries.
 *
 * PROBLEM:
 *   Drizzle text({mode:'json'}) columns auto-serialize objects on write and
 *   auto-deserialize on read. But many APIs in this codebase call
 *   JSON.stringify() BEFORE passing to Drizzle, causing double-encoding:
 *     - API does: db.insert(values({ features: JSON.stringify(arr) }))
 *     - Drizzle sees a string, stores it as-is (no extra serialization)
 *     - On read, Drizzle deserializes → returns the STRING, not the array
 *     - Array.isArray(features) → false → UI shows empty
 *
 * SOLUTION:
 *   1. WRITE: Always pass raw objects/arrays to Drizzle json-mode columns.
 *      Never call JSON.stringify() before Drizzle insert/update.
 *   2. READ: Use parseJsonField() to handle both correct (object) and
 *      legacy (string) data gracefully.
 *
 * This helper is used by dashboard pages and APIs to ensure consistent
 * data binding regardless of whether the data was written correctly.
 */

/**
 * Parses a JSON column value that may be:
 *   - An object/array (correct — Drizzle json-mode deserialized it)
 *   - A string (legacy double-encoded — needs JSON.parse)
 *   - null/undefined (returns fallback)
 *
 * @example
 *   const features = parseJsonField(about.features, []);
 *   const settings = parseJsonField(school.settings, {});
 */
export function parseJsonField<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val as T;
  if (typeof val === 'string') {
    if (val === '') return fallback;
    try {
      const parsed = JSON.parse(val);
      return parsed as T;
    } catch {
      // Double-encoded? Try parsing once more
      try {
        const parsed2 = JSON.parse(JSON.parse(val));
        return parsed2 as T;
      } catch {
        return fallback;
      }
    }
  }
  return fallback;
}

/**
 * Normalizes a value for writing to a Drizzle json-mode column.
 *
 * - If the value is already an object/array, return as-is (Drizzle will serialize).
 * - If the value is a string, try to parse it first (so we don't double-encode).
 * - If null/undefined, return the fallback.
 *
 * @example
 *   db.insert(values({ features: forJsonWrite(featuresArr, []) }))
 */
export function forJsonWrite(val: any, fallback: any = null): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    if (val === '') return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return val;
}

/**
 * Parses a JSON column that may contain a comma-separated string, a JSON
 * array string, or an actual array. Useful for fields like `displayPages`
 * that may be stored in different formats.
 */
export function parseJsonArray(val: any): any[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val === '') return [];
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      // Maybe comma-separated
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}
