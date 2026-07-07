import { getDb } from './db/index.js';
import { schools, schoolMembers, navigationItems, contactInfo } from './db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { generateDefaultPalette, mergePalette, type Palette } from './palette.js';

/** Parses a JSON column value that may be a string, object, or null. */
function parseJsonCol(val: any, fallback: any): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    if (val === '') return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return fallback;
}

/** Normalizes a raw school row: parses JSON columns into objects and maps snake_case to camelCase. */
function normalizeSchool(row: any): any {
  if (!row) return row;
  return {
    ...row,
    primaryColor: row.primary_color || row.primaryColor || '#2563eb',
    logoUrl: row.logo_url || row.logoUrl || null,
    faviconUrl: row.favicon_url || row.faviconUrl || null,
    customDomain: row.custom_domain || row.customDomain || null,
    ownerId: row.owner_id || row.ownerId || null,
    socialHandles: parseJsonCol(row.socialHandles || row.social_handles, {}),
    activeModules: parseJsonCol(row.activeModules || row.active_modules, ['cms','sis','lms','finance','communication']),
    settings: parseJsonCol(row.settings, {}),
  };
}

/** Returns the raw better-sqlite3 instance from the Drizzle wrapper. */
function rawDb(): any {
  const db = getDb() as any;
  return db.$client || db.session?.client || db;
}

export function getUserSchool(userId: number) {
  const db = getDb();
  const membership = db.select().from(schoolMembers)
    .where(eq(schoolMembers.userId, userId))
    .all()
    .find(m => m.active !== false && m.active !== null);
  if (!membership) return null;
  const row = db.select().from(schools).where(eq(schools.id, membership.schoolId)).get() || null;
  return row ? normalizeSchool(row) : null;
}

export function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export function getSchoolBySlug(slug: string) {
  try {
    const db = getDb();
    const row = db.select().from(schools).where(eq(schools.slug, slug)).get() || null;
    return row ? normalizeSchool(row) : null;
  } catch {
    try {
      const row = rawDb().prepare('SELECT * FROM schools WHERE slug = ?').get(slug) || null;
      return row ? normalizeSchool(row) : null;
    } catch { return null; }
  }
}

export function getSchoolNav(schoolId: number) {
  try {
    const db = getDb();
    return db.select().from(navigationItems)
      .where(eq(navigationItems.schoolId, schoolId))
      .orderBy(asc(navigationItems.sortOrder))
      .all();
  } catch {
    try { return rawDb().prepare('SELECT * FROM navigation_items WHERE school_id = ? ORDER BY sort_order').all(schoolId); } catch { return []; }
  }
}

export function getSchoolInfo(schoolId: number) {
  try {
    const db = getDb();
    return db.select().from(contactInfo)
      .where(eq(contactInfo.schoolId, schoolId))
      .orderBy(asc(contactInfo.sortOrder))
      .get() || null;
  } catch {
    try { return rawDb().prepare('SELECT * FROM contact_info WHERE school_id = ? ORDER BY sort_order LIMIT 1').get(schoolId) || null; } catch { return null; }
  }
}

export function getSchoolContacts(schoolId: number) {
  try {
    const db = getDb();
    return db.select().from(contactInfo)
      .where(eq(contactInfo.schoolId, schoolId))
      .orderBy(asc(contactInfo.sortOrder))
      .all();
  } catch {
    try { return rawDb().prepare('SELECT * FROM contact_info WHERE school_id = ? ORDER BY sort_order').all(schoolId); } catch { return []; }
  }
}

export function getSchoolPalette(school: any): Palette {
  const settings = parseJsonCol(school?.settings, {});
  const stored = settings?.palette;
  return mergePalette(stored, school?.primaryColor || '#2563eb');
}

/**
 * Returns the font preset for a school, if one is configured.
 * Falls back to null (theme default fonts are used).
 */
export function getSchoolFontPreset(school: any): { headingFont: string; bodyFont: string; headingUrl: string; bodyUrl: string } | null {
  const settings = parseJsonCol(school?.settings, {});
  const fontPresetId = settings?.fontPresetId;
  if (!fontPresetId) return null;
  // Import here to avoid circular dependency
  const { getFontPreset } = require('./font-presets.js');
  const preset = getFontPreset(fontPresetId);
  if (!preset) return null;
  return {
    headingFont: preset.headingFont,
    bodyFont: preset.bodyFont,
    headingUrl: preset.headingUrl,
    bodyUrl: preset.bodyUrl,
  };
}
