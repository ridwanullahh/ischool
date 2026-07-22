/**
 * School Helper — Safe DB queries for public school pages.
 *
 * In SQLite mode: uses synchronous raw SQL via better-sqlite3 (db.$client).
 * In Lightbase mode: uses an in-memory cache populated by middleware
 * (preloadSchoolData). If the cache is cold, falls back to a synchronous
 * default (empty array / null / default nav) rather than blocking the
 * render — the async preloader will populate the cache for the next render.
 *
 * All functions are SYNCHRONOUS and SAFE to call from .astro frontmatter.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { isLightbase } from './db/index.js';
import { getLightbaseDb } from './db/lightbase-adapter.js';

// ═══════════════════════════════════════════════════════
// Per-request cache (populated by middleware.preloadSchoolData)
// ═══════════════════════════════════════════════════════

const _schoolCache = new Map<string, any>();
const _schoolDataCache = new Map<string, any>(); // key: `${slug}:dataType`

export function setSchoolCache(slug: string, school: any): void {
  _schoolCache.set(slug, school);
}

export function setSchoolDataCache(slug: string, dataType: string, data: any): void {
  _schoolDataCache.set(`${slug}:${dataType}`, data);
}

// ═══════════════════════════════════════════════════════
// Async preloader — called from middleware for [slug] pages
// ═══════════════════════════════════════════════════════

export async function preloadSchoolData(slug: string): Promise<void> {
  if (!isLightbase()) return;

  const db = getLightbaseDb();

  // Load school first
  const school = await db.select('schools').where({ field: 'slug', op: 'eq', value: slug }).get();
  if (!school) return;
  const normalized = normalizeSchool(school);
  setSchoolCache(slug, normalized);

  const schoolId = school.id;

  // Load all school data in parallel
  const [nav, contacts, about, announcements, posts, programs, faqs, gallery, classes, admissionPeriods, galleryAlbums, virtualTours, moduleSettings] = await Promise.all([
    db.select('navigation_items').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('contact_info').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('about_pages').where({ field: 'school_id', op: 'eq', value: schoolId }).get().catch(() => null),
    db.select('announcements').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('blog_posts').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('programs').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('faqs').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('gallery_items').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('classes').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('admission_periods').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('gallery_albums').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('virtual_tours').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
    db.select('module_settings').where({ field: 'school_id', op: 'eq', value: schoolId }).all().catch(() => []),
  ]);

  setSchoolDataCache(slug, 'nav', Array.isArray(nav) ? nav : []);
  setSchoolDataCache(slug, 'contacts', Array.isArray(contacts) ? dedupeContacts(contacts) : []);
  setSchoolDataCache(slug, 'about', about || null);
  setSchoolDataCache(slug, 'announcements', Array.isArray(announcements) ? announcements : []);
  setSchoolDataCache(slug, 'posts', Array.isArray(posts) ? posts : []);
  setSchoolDataCache(slug, 'programs', Array.isArray(programs) ? programs : []);
  setSchoolDataCache(slug, 'faqs', Array.isArray(faqs) ? faqs : []);
  setSchoolDataCache(slug, 'gallery', Array.isArray(gallery) ? gallery : []);
  setSchoolDataCache(slug, 'classes', Array.isArray(classes) ? classes : []);
  setSchoolDataCache(slug, 'admissionPeriods', Array.isArray(admissionPeriods) ? admissionPeriods : []);
  setSchoolDataCache(slug, 'galleryAlbums', Array.isArray(galleryAlbums) ? galleryAlbums : []);
  setSchoolDataCache(slug, 'virtualTours', Array.isArray(virtualTours) ? virtualTours : []);
  setSchoolDataCache(slug, 'moduleSettings', Array.isArray(moduleSettings) ? moduleSettings : []);
}

// ═══════════════════════════════════════════════════════
// Sync accessors
// ═══════════════════════════════════════════════════════

function rawDb(): any {
  const { getDb } = require('./db/index.js');
  return getDb();
}

function parseJsonCol(val: any, fallback: any): any {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    if (val === '') return fallback;
    try { return JSON.parse(val); } catch { return fallback; }
  }
  return fallback;
}

function dedupeContacts(rows: any[]): any[] {
  const seen = new Set<string>();
  return rows.filter((c: any) => {
    const key = (c.label || '') + '|' + (c.value || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCachedForSlug(slug: string | undefined, dataType: string, fallback: any): any {
  if (!slug) return fallback;
  const data = _schoolDataCache.get(`${slug}:${dataType}`);
  if (data === undefined) return fallback;
  return data;
}

function slugFromSchoolId(schoolId: any): string | undefined {
  if (!schoolId) return undefined;
  for (const [slug, school] of _schoolCache) {
    if (school && (school.id === schoolId || String(school.id) === String(schoolId))) {
      return slug;
    }
  }
  return undefined;
}

export function getSchoolBySlug(slug: string): any {
  try {
    if (isLightbase()) {
      return _schoolCache.get(slug) || null;
    }
    const db = rawDb();
    const row = db.prepare('SELECT * FROM schools WHERE slug = ?').get(slug);
    if (!row) return null;
    return normalizeSchool(row);
  } catch { return null; }
}

export async function getSchoolBySlugAsync(slug: string): Promise<any> {
  try {
    if (!isLightbase()) return getSchoolBySlug(slug);
    if (_schoolCache.has(slug)) return _schoolCache.get(slug);
    const db = getLightbaseDb();
    const school = await db.select('schools').where({ field: 'slug', op: 'eq', value: slug }).get();
    if (!school) return null;
    const normalized = normalizeSchool(school);
    setSchoolCache(slug, normalized);
    return normalized;
  } catch (e: any) {
    console.error('[getSchoolBySlugAsync] Error:', e.message);
    return null;
  }
}

export function normalizeSchool(row: any): any {
  if (!row) return row;
  return {
    ...row,
    primaryColor: row.primary_color || row.primaryColor || '#05B34D',
    secondaryColor: row.secondary_color || row.secondaryColor || '#F2B91C',
    logoUrl: row.logo_url || row.logoUrl || null,
    faviconUrl: row.favicon_url || row.faviconUrl || null,
    customDomain: row.custom_domain || row.customDomain || null,
    ownerId: row.owner_id || row.ownerId || null,
    socialHandles: parseJsonCol(row.socialHandles || row.social_handles, {}),
    activeModules: parseJsonCol(row.activeModules || row.active_modules, ['cms','sis','lms','finance','communication']),
    settings: parseJsonCol(row.settings, {}),
    moduleSettings: parseJsonCol(row.module_settings || row.moduleSettings, {}),
  };
}

// --- Navigation & Contacts ---

export function getSchoolNav(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'nav', undefined);
      if (cached !== undefined) return Array.isArray(cached) ? cached : [];
      // Fallback to default nav if cache miss
      return getDefaultNav();
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM navigation_items WHERE school_id = ? ORDER BY sort_order').all(schoolId);
  } catch { return getDefaultNav(); }
}

function getDefaultNav(): any[] {
  return [
    { label: 'Home', url: '/', sort_order: 0, is_external: false },
    { label: 'About', url: '/about', sort_order: 1, is_external: false },
    { label: 'Programs', url: '/programs', sort_order: 2, is_external: false },
    { label: 'Classes', url: '/classes', sort_order: 3, is_external: false },
    { label: 'Announcements', url: '/announcements', sort_order: 4, is_external: false },
    { label: 'Gallery', url: '/gallery', sort_order: 5, is_external: false },
    { label: 'Admissions', url: '/admissions', sort_order: 6, is_external: false },
    { label: 'FAQs', url: '/faqs', sort_order: 7, is_external: false },
    { label: 'Contact', url: '/contact', sort_order: 8, is_external: false },
  ];
}

export function getSchoolContacts(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'contacts', undefined);
      if (cached !== undefined) return Array.isArray(cached) ? cached : [];
      return [];
    }
    const db = rawDb();
    const rows = db.prepare('SELECT * FROM contact_info WHERE school_id = ? ORDER BY sort_order').all(schoolId);
    return dedupeContacts(rows);
  } catch { return []; }
}

export function getSchoolInfo(schoolId: any): any {
  const all = getSchoolContacts(schoolId);
  return all[0] || null;
}

export function getSchoolAbout(schoolId: any): any {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'about', undefined);
      if (cached === undefined) return null;
      if (!cached) return null;
      return {
        ...cached,
        features: parseJsonCol(cached.features, []),
        stats: parseJsonCol(cached.stats, []),
        values: parseJsonCol(cached.values, []),
      };
    }
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

// --- Content lists ---

export function getSchoolAnnouncements(schoolId: any, limit: number = 100): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'announcements', []);
      const arr = Array.isArray(cached) ? cached : [];
      return arr.slice(0, limit);
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM announcements WHERE school_id = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, limit);
  } catch { return []; }
}

export function getSchoolPosts(schoolId: any, limit: number = 100): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'posts', []);
      const arr = Array.isArray(cached) ? cached : [];
      // Only published posts
      const published = arr.filter((p: any) => p.status === 'published' || p.is_published === true || p.isPublished === true || p.published === true || p.published === 1);
      return published.slice(0, limit);
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? AND status = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, 'published', limit);
  } catch { return []; }
}

export function getSchoolPrograms(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'programs', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM programs WHERE school_id = ? ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolClasses(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'classes', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM classes WHERE school_id = ? ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolFaqs(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'faqs', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM faqs WHERE school_id = ? ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolGallery(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'gallery', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM gallery_items WHERE school_id = ? ORDER BY sort_order, created_at DESC').all(schoolId);
  } catch { return []; }
}

export function getSchoolGalleryAlbums(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'galleryAlbums', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM gallery_albums WHERE school_id = ? AND is_published = 1 ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

export function getSchoolVirtualTours(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'virtualTours', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM virtual_tours WHERE school_id = ? AND is_published = 1 ORDER BY sort_order').all(schoolId);
  } catch { return []; }
}

// --- Single-item lookups by slug ---

export function getSchoolAnnouncementBySlug(schoolId: any, slug: string): any {
  try {
    if (isLightbase()) {
      const s = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(s, 'announcements', []);
      const arr = Array.isArray(cached) ? cached : [];
      return arr.find((a: any) => a.slug === slug) ||
             (/^\d+$/.test(slug) ? arr.find((a: any) => String(a.id) === slug) : null) ||
             null;
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM announcements WHERE school_id = ? AND slug = ?').get(schoolId, slug) ||
           (/^\d+$/.test(slug) ? db.prepare('SELECT * FROM announcements WHERE school_id = ? AND id = ?').get(schoolId, Number(slug)) : null);
  } catch { return null; }
}

export function getSchoolPostBySlug(schoolId: any, slug: string): any {
  try {
    if (isLightbase()) {
      const s = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(s, 'posts', []);
      const arr = Array.isArray(cached) ? cached : [];
      return arr.find((p: any) => p.slug === slug) ||
             (/^\d+$/.test(slug) ? arr.find((p: any) => String(p.id) === slug) : null) ||
             null;
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? AND slug = ?').get(schoolId, slug) ||
           (/^\d+$/.test(slug) ? db.prepare('SELECT * FROM blog_posts WHERE school_id = ? AND id = ?').get(schoolId, Number(slug)) : null);
  } catch { return null; }
}

export function getSchoolProgramBySlug(schoolId: any, slug: string): any {
  try {
    if (isLightbase()) {
      const s = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(s, 'programs', []);
      const arr = Array.isArray(cached) ? cached : [];
      return arr.find((p: any) => p.slug === slug) ||
             (/^\d+$/.test(slug) ? arr.find((p: any) => String(p.id) === slug) : null) ||
             null;
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM programs WHERE school_id = ? AND slug = ?').get(schoolId, slug) ||
           (/^\d+$/.test(slug) ? db.prepare('SELECT * FROM programs WHERE school_id = ? AND id = ?').get(schoolId, Number(slug)) : null);
  } catch { return null; }
}

export function getSchoolClassBySlug(schoolId: any, slug: string): any {
  try {
    if (isLightbase()) {
      const s = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(s, 'classes', []);
      const arr = Array.isArray(cached) ? cached : [];
      return arr.find((c: any) => c.slug === slug) ||
             (/^\d+$/.test(slug) ? arr.find((c: any) => String(c.id) === slug) : null) ||
             null;
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM classes WHERE school_id = ? AND slug = ?').get(schoolId, slug) ||
           (/^\d+$/.test(slug) ? db.prepare('SELECT * FROM classes WHERE school_id = ? AND id = ?').get(schoolId, Number(slug)) : null);
  } catch { return null; }
}

export function getSchoolFormBySlug(schoolId: any, slug: string): any {
  try {
    if (isLightbase()) {
      // Forms are not preloaded — fetch synchronously is not possible in Lightbase mode.
      // The caller (form page) should use the async API directly. Return null as fallback.
      return null;
    }
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

// --- Palette & Fonts ---

export function getSchoolPalette(school: any): any {
  try {
    const { generateDefaultPalette, mergePalette } = require('./palette.js');
    const settings = parseJsonCol(school?.settings, {});
    const stored = settings?.palette;
    return mergePalette(stored, school?.primaryColor || '#05B34D');
  } catch {
    return {
      primary: school?.primaryColor || '#05B34D',
      accent: school?.secondaryColor || '#F2B91C',
      backgroundLight: '#f8fafc', backgroundDark: '#0f172a',
      surfaceLight: '#ffffff', surfaceDark: '#1e293b',
      textLight: '#0f172a', textDark: '#f1f5f9',
      mutedLight: '#64748b', mutedDark: '#94a3b8',
      borderLight: '#e2e8f0', borderDark: '#334155',
    };
  }
}

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

// --- Admissions ---

export function getSchoolAdmissionPeriods(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'admissionPeriods', []);
      return Array.isArray(cached) ? cached : [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM admission_periods WHERE school_id = ? ORDER BY open_date DESC').all(schoolId);
  } catch { return []; }
}

export function getActiveAdmissionPeriod(schoolId: any): any | null {
  try {
    const periods = getSchoolAdmissionPeriods(schoolId);
    const today = new Date().toISOString().split('T')[0];
    return periods.find((p: any) =>
      p.is_active === true && p.open_date <= today && p.close_date >= today
    ) || null;
  } catch { return null; }
}

export function getSchoolAdmissionApplications(schoolId: any): any[] {
  try {
    if (isLightbase()) {
      // Not preloaded — return empty (dashboard uses async APIs)
      return [];
    }
    const db = rawDb();
    return db.prepare('SELECT * FROM admission_applications WHERE school_id = ? ORDER BY created_at DESC').all(schoolId);
  } catch { return []; }
}

export function getAdmissionPeriodBySlug(schoolId: any, slug: string): any | null {
  try {
    const periods = getSchoolAdmissionPeriods(schoolId);
    return periods.find((p: any) => p.slug === slug) ||
           (/^\d+$/.test(slug) ? periods.find((p: any) => String(p.id) === slug) : null) ||
           null;
  } catch { return null; }
}

// --- CMS Module Control ---

export function isModuleEnabled(schoolId: any, module: string): boolean {
  try {
    const modules = getEnabledModules(schoolId);
    return modules[module] !== false;
  } catch { return module !== 'banners'; }
}

export function getEnabledModules(schoolId: any): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    about: true, announcements: true, programs: true, classes: true,
    blog: true, gallery: true, faqs: true, contact: true, admissions: true,
    banners: false, popups: true, forms: true,
  };
  try {
    if (isLightbase()) {
      const slug = slugFromSchoolId(schoolId);
      const cached = getCachedForSlug(slug, 'moduleSettings', []);
      if (Array.isArray(cached)) {
        for (const r of cached) {
          if (r && r.module) {
            defaults[r.module] = r.enabled === 1 || r.enabled === true;
          }
        }
      }
      return defaults;
    }
    const db = rawDb();
    const rows = db.prepare('SELECT module, enabled FROM module_settings WHERE school_id = ?').all(schoolId) as any[];
    for (const r of rows) {
      defaults[r.module] = r.enabled === 1 || r.enabled === true;
    }
  } catch {}
  return defaults;
}
