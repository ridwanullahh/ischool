/**
 * School Helper — Backwards-compatible sync accessors.
 *
 * This module re-exports the cache-aware functions from school-safe.ts.
 * In SQLite mode, school-safe.ts falls through to synchronous raw SQL.
 * In Lightbase mode, school-safe.ts reads from the per-request cache
 * populated by middleware.preloadSchoolData().
 *
 * Themes and pages that import from './school.ts' keep working
 * without modification in both modes.
 */

import { getDb } from './db/index.js';
import { isLightbase } from './db/index.js';
import { schools, schoolMembers, navigationItems, contactInfo } from './db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { generateDefaultPalette, mergePalette, type Palette } from './palette.js';

// Re-export everything from school-safe so callers using either
// './school.ts' or './school-safe.ts' get the same implementations.
export {
  getSchoolBySlug,
  getSchoolNav,
  getSchoolContacts,
  getSchoolInfo,
  getSchoolAbout,
  getSchoolAnnouncements,
  getSchoolPosts,
  getSchoolPrograms,
  getSchoolClasses,
  getSchoolFaqs,
  getSchoolGallery,
  getSchoolGalleryAlbums,
  getSchoolVirtualTours,
  getSchoolAnnouncementBySlug,
  getSchoolPostBySlug,
  getSchoolProgramBySlug,
  getSchoolClassBySlug,
  getSchoolFormBySlug,
  getSchoolPalette,
  getSchoolFontPresetSafe,
  getSchoolAdmissionPeriods,
  getActiveAdmissionPeriod,
  getSchoolAdmissionApplications,
  getAdmissionPeriodBySlug,
  isModuleEnabled,
  getEnabledModules,
  normalizeSchool,
  setSchoolCache,
  setSchoolDataCache,
  preloadSchoolData,
  getSchoolBySlugAsync,
} from './school-safe.js';

import {
  getSchoolBySlug as _getSchoolBySlug,
  getSchoolNav as _getSchoolNav,
  getSchoolContacts as _getSchoolContacts,
  getSchoolInfo as _getSchoolInfo,
} from './school-safe.js';

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

/**
 * Returns the font preset for a school, if one is configured.
 * Delegates to font-presets.ts via synchronous require (SQLite mode)
 * or returns null (Lightbase mode — callers should use the async API).
 */
export function getSchoolFontPreset(school: any): { headingFont: string; bodyFont: string; headingUrl: string; bodyUrl: string } | null {
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

/** Returns the raw better-sqlite3 instance from the Drizzle wrapper. */
function rawDb(): any {
  const db = getDb() as any;
  return db.$client || db.session?.client || db;
}

/**
 * Returns the school a user belongs to. Accepts either a userId (number/string)
 * OR the full user object from Astro.locals.user (preferred — the middleware
 * pre-populates user.school in both Lightbase and SQLite modes).
 */
export function getUserSchool(userOrUserId: any): any {
  try {
    // If passed a user object with .school pre-populated by middleware, use it
    if (userOrUserId && typeof userOrUserId === 'object') {
      if (userOrUserId.school) return userOrUserId.school;
      if (userOrUserId.id) userOrUserId = userOrUserId.id;
      else return null;
    }
    const userId = userOrUserId;
    if (isLightbase()) {
      // Lightbase is async — caller should pass the user object instead
      return null;
    }
    const db = getDb();
    const membership = db.select().from(schoolMembers)
      .where(eq(schoolMembers.userId, userId))
      .all()
      .find(m => m.active !== false && m.active !== null);
    if (!membership) return null;
    const row = db.select().from(schools).where(eq(schools.id, membership.schoolId)).get() || null;
    return row ? _normalizeSchoolLocal(row) : null;
  } catch { return null; }
}

/**
 * Returns the schoolId for a user. Accepts either a userId (number/string)
 * OR the full user object from Astro.locals.user (preferred — the middleware
 * pre-populates user.schoolId in both Lightbase and SQLite modes).
 */
export function getUserSchoolId(userOrUserId: any): string | number | null {
  try {
    // If passed a user object with .schoolId pre-populated by middleware, use it
    if (userOrUserId && typeof userOrUserId === 'object') {
      if (userOrUserId.schoolId) return userOrUserId.schoolId;
      if (userOrUserId.school_id) return userOrUserId.school_id;
      if (userOrUserId.id) userOrUserId = userOrUserId.id;
      else return null;
    }
    const userId = userOrUserId;
    if (isLightbase()) {
      return null; // Caller should pass the user object instead
    }
    const db = getDb();
    const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
    return membership?.schoolId || null;
  } catch { return null; }
}

function _normalizeSchoolLocal(row: any): any {
  if (!row) return row;
  return {
    ...row,
    primaryColor: row.primary_color || row.primaryColor || '#05B34D',
    logoUrl: row.logo_url || row.logoUrl || null,
    faviconUrl: row.favicon_url || row.faviconUrl || null,
    customDomain: row.custom_domain || row.customDomain || null,
    ownerId: row.owner_id || row.ownerId || null,
    socialHandles: parseJsonCol(row.socialHandles || row.social_handles, {}),
    activeModules: parseJsonCol(row.activeModules || row.active_modules, ['cms','sis','lms','finance','communication']),
    settings: parseJsonCol(row.settings, {}),
  };
}

/**
 * Async helper for API endpoints that call validateSession() directly
 * (not going through the middleware RBAC enrichment). Queries
 * school_members by user.id to resolve the schoolId.
 *
 * Usage in API handlers:
 *   const schoolId = await getSchoolIdForApi(result.user);
 *   if (!schoolId) return new Response('No school found', { status: 404 });
 */
export async function getSchoolIdForApi(user: any): Promise<string | number | null> {
  if (!user) return null;
  // Check if middleware already set schoolId (page requests)
  if (user.schoolId) return user.schoolId;
  if (user.school_id) return user.school_id;
  // API requests: query school_members async
  try {
    const db = getDb();
    const membership = await db.select().from(schoolMembers).where(eq(schoolMembers.userId, user.id)).get();
    return membership?.schoolId ?? membership?.school_id ?? null;
  } catch { return null; }
}
