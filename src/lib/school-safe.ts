/**
 * School Helper — Safe DB queries for public school pages
 * All functions wrap DB queries in try/catch with raw SQL fallback.
 *
 * CRITICAL: getDb() returns a Drizzle ORM instance. To run raw SQL,
 * we access the underlying better-sqlite3 instance via db.$client.
 * Raw SQL returns JSON columns as STRINGS, not parsed objects.
 * We parse them here so downstream code can use school.settings.palette etc.
 */
import { getDb } from './db/index.js';

/** Returns the raw better-sqlite3 database instance from the Drizzle wrapper. */
function rawDb(): any {
  const db = getDb() as any;
  return db.$client || db.session?.client || db;
}

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

/** Returns a school row with settings/socialHandles/activeModules parsed as objects. */
export function getSchoolBySlug(slug: string): any {
  try {
    const db = rawDb();
    const row = db.prepare('SELECT * FROM schools WHERE slug = ?').get(slug);
    if (!row) return null;
    return normalizeSchool(row);
  } catch { return null; }
}

/** Normalizes a raw school row: parses JSON columns into objects and maps snake_case to camelCase. */
export function normalizeSchool(row: any): any {
  if (!row) return row;
  return {
    ...row,
    // Map snake_case columns to camelCase (for compatibility with Drizzle ORM schema)
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

export function getSchoolNav(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM navigation_items WHERE school_id = ? ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolContacts(schoolId: number): any[] {
  try {
    const db = rawDb();
    const rows = db.prepare('SELECT * FROM contact_info WHERE school_id = ? ORDER BY sort_order').all(schoolId);
    // Deduplicate by (label + value) to prevent doubled contacts from repeated seeds
    const seen = new Set();
    return rows.filter((c: any) => {
      const key = (c.label || '') + '|' + (c.value || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch { return []; }
}

export function getSchoolAbout(schoolId: number): any {
  try {
    const db = rawDb();
    const row = db.prepare('SELECT * FROM about_pages WHERE school_id = ?').get(schoolId);
    if (!row) return null;
    return {
      ...row,
      features: parseJsonCol(row.features, []),
      stats: parseJsonCol(row.stats, []),
      values: parseJsonCol(row.values, []),
    };
  } catch { return null; }
}

export function getSchoolAnnouncements(schoolId: number, limit: number = 100): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM announcements WHERE school_id = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, limit);
  } catch { return []; }
}

export function getSchoolPosts(schoolId: number, limit: number = 100): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, limit);
  } catch { return []; }
}

export function getSchoolPrograms(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM programs WHERE school_id = ?').all(schoolId);
  } catch { return []; }
}

export function getSchoolClasses(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(schoolId);
  } catch { return []; }
}

export function getSchoolFaqs(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM faqs WHERE school_id = ?').all(schoolId);
  } catch { return []; }
}

export function getSchoolGallery(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM gallery_items WHERE school_id = ? ORDER BY sort_order, created_at DESC').all(schoolId);
  } catch { return []; }
}

export function getSchoolGalleryAlbums(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM gallery_albums WHERE school_id = ? AND is_published = 1 ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolVirtualTours(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM virtual_tours WHERE school_id = ? AND is_published = 1 ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

// --- Single-item lookups by slug (used by dynamic [param].astro pages) ---

export function getSchoolAnnouncementBySlug(schoolId: number, slug: string): any {
  try {
    const db = rawDb();
    try {
      return db.prepare('SELECT * FROM announcements WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    } catch {
      if (/^\d+$/.test(slug)) {
        return db.prepare('SELECT * FROM announcements WHERE school_id = ? AND id = ?').get(schoolId, Number(slug));
      }
      return null;
    }
  } catch { return null; }
}

export function getSchoolPostBySlug(schoolId: number, slug: string): any {
  try {
    const db = rawDb();
    try {
      return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    } catch {
      if (/^\d+$/.test(slug)) {
        return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? AND id = ?').get(schoolId, Number(slug));
      }
      return null;
    }
  } catch { return null; }
}

export function getSchoolProgramBySlug(schoolId: number, slug: string): any {
  try {
    const db = rawDb();
    try {
      return db.prepare('SELECT * FROM programs WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    } catch {
      if (/^\d+$/.test(slug)) {
        return db.prepare('SELECT * FROM programs WHERE school_id = ? AND id = ?').get(schoolId, Number(slug));
      }
      return null;
    }
  } catch { return null; }
}

export function getSchoolClassBySlug(schoolId: number, slug: string): any {
  try {
    const db = rawDb();
    try {
      return db.prepare('SELECT * FROM classes WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    } catch {
      if (/^\d+$/.test(slug)) {
        return db.prepare('SELECT * FROM classes WHERE school_id = ? AND id = ?').get(schoolId, Number(slug));
      }
      return null;
    }
  } catch { return null; }
}

export function getSchoolFormBySlug(schoolId: number, slug: string): any {
  try {
    const db = rawDb();
    const row = db.prepare('SELECT * FROM forms WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    if (!row) return null;
    return {
      ...row,
      fields: parseJsonCol(row.fields, []),
      settings: parseJsonCol(row.settings, {}),
    };
  } catch { return null; }
}

/**
 * Returns the merged palette for a school.
 * Handles both string and object `settings` (raw SQL returns string).
 */
export function getSchoolPalette(school: any): any {
  try {
    const { generateDefaultPalette, mergePalette } = require('./palette.js');
    const settings = parseJsonCol(school?.settings, {});
    const stored = settings?.palette;
    return mergePalette(stored, school?.primaryColor || '#2563eb');
  } catch {
    return {
      primary: school?.primaryColor || '#2563eb',
      accent: '#0ea5e9',
      backgroundLight: '#f8fafc', backgroundDark: '#0f172a',
      surfaceLight: '#ffffff', surfaceDark: '#1e293b',
      textLight: '#0f172a', textDark: '#f1f5f9',
      mutedLight: '#64748b', mutedDark: '#94a3b8',
      borderLight: '#e2e8f0', borderDark: '#334155',
    };
  }
}

/**
 * Returns the font preset for a school, if one is configured.
 * Handles both string and object `settings`.
 */
export function getSchoolFontPresetSafe(school: any): any {
  try {
    const settings = parseJsonCol(school?.settings, {});
    const fontPresetId = settings?.fontPresetId;
    if (!fontPresetId) return null;
    const { getFontPreset } = require('./font-presets.js');
    const preset = getFontPreset(fontPresetId);
    if (!preset) return null;
    return {
      headingFont: preset.headingFont,
      bodyFont: preset.bodyFont,
      headingUrl: preset.headingUrl,
      bodyUrl: preset.bodyUrl,
    };
  } catch { return null; }
}

// --- Admissions helpers ---

export function getSchoolAdmissionPeriods(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM admission_periods WHERE school_id = ? ORDER BY open_date DESC').all(schoolId);
  } catch { return []; }
}

export function getActiveAdmissionPeriod(schoolId: number): any | null {
  try {
    const db = rawDb();
    const today = new Date().toISOString().split('T')[0];
    return db.prepare('SELECT * FROM admission_periods WHERE school_id = ? AND is_active = 1 AND open_date <= ? AND close_date >= ? ORDER BY close_date ASC LIMIT 1').get(schoolId, today, today) || null;
  } catch { return null; }
}

export function getSchoolAdmissionApplications(schoolId: number): any[] {
  try {
    const db = rawDb();
    return db.prepare('SELECT * FROM admission_applications WHERE school_id = ? ORDER BY created_at DESC').all(schoolId);
  } catch { return []; }
}

export function getAdmissionPeriodBySlug(schoolId: number, slug: string): any | null {
  try {
    const db = rawDb();
    // Try slug first, then id if numeric
    try {
      return db.prepare('SELECT * FROM admission_periods WHERE school_id = ? AND slug = ?').get(schoolId, slug);
    } catch {
      if (/^\d+$/.test(slug)) {
        return db.prepare('SELECT * FROM admission_periods WHERE school_id = ? AND id = ?').get(schoolId, Number(slug));
      }
      return null;
    }
  } catch { return null; }
}

// --- CMS Module Control ---

export function isModuleEnabled(schoolId: number, module: string): boolean {
  try {
    const db = rawDb();
    const row = db.prepare('SELECT enabled FROM module_settings WHERE school_id = ? AND module = ?').get(schoolId, module) as any;
    if (row) return row.enabled === 1 || row.enabled === true;
    // Banners are disabled by default
    if (module === 'banners') return false;
    return true; // All other modules enabled by default
  } catch { return module !== 'banners'; }
}

export function getEnabledModules(schoolId: number): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    about: true, announcements: true, programs: true, classes: true,
    blog: true, gallery: true, faqs: true, contact: true, admissions: true,
    banners: false, popups: true, forms: true,
  };
  try {
    const db = rawDb();
    const rows = db.prepare('SELECT module, enabled FROM module_settings WHERE school_id = ?').all(schoolId) as any[];
    for (const r of rows) {
      defaults[r.module] = r.enabled === 1 || r.enabled === true;
    }
  } catch {}
  return defaults;
}

// --- Platform Module Control ---

export function getPlatformModuleStatus(module: string): string {
  try {
    const db = rawDb();
    const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get('module_status_' + module) as any;
    return row?.value || 'active';
  } catch { return 'active'; }
}

export function isPlatformModuleActive(module: string): boolean {
  return getPlatformModuleStatus(module) === 'active';
}
