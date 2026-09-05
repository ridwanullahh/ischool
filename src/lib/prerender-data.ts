/**
 * Build-time data layer for the 100% static deployment (Task 4 migration).
 *
 * The public per-school pages (`src/pages/[slug]/**`) and the marketing
 * content routes are PRERENDERED at build time from lightbase data. Content
 * refresh = rebuild (snapshot-page philosophy, ZERO_WORKERS_AUDIT §3.2).
 *
 * This module loads lightbase documents into the synchronous caches in
 * `school-safe.ts` BEFORE Astro calls each page's `getStaticPaths`, so the
 * existing sync accessors (`getSchoolBySlug`, `getSchoolAnnouncements`, ...)
 * keep working unchanged during prerendering.
 *
 * Build-time credentials come from env (see .env.example):
 *   DB_PROVIDER=lightbase, LIGHTBASE_API_KEY, LIGHTBASE_PROJECT,
 *   LIGHTBASE_BASE_URL.
 */
import { getLightbaseClient } from './lightbase.js';
import { preloadSchoolData, setSchoolCache, setSchoolDataCache, normalizeSchool, peekSchoolData } from './school-safe.js';

let _schools: any[] | null = null;
let _preloaded = false;

/** All schools in the project (lightbase REST, build time). */
export async function allSchools(): Promise<any[]> {
  if (_schools) return _schools;
  try {
    const client = getLightbaseClient();
    const res = await client.query('schools', { limit: 1000 });
    _schools = (res.data || []).filter((s: any) => s && s.slug).map(normalizeSchool);
  } catch (e: any) {
    console.error('[prerender-data] Failed to load schools from lightbase:', e?.message || e);
    _schools = [];
  }
  return _schools;
}

/**
 * Loads every school AND its public content collections into the school-safe
 * caches. Idempotent per process — call it at the top of every getStaticPaths.
 */
export async function preloadAllSchools(): Promise<any[]> {
  const schools = await allSchools();
  if (_preloaded) return schools;
  for (const school of schools) {
    setSchoolCache(school.slug, school);
    try {
      await preloadSchoolData(school.slug);
    } catch (e: any) {
      console.error(`[prerender-data] preload failed for ${school.slug}:`, e?.message || e);
    }
    // Public form pages ([slug]/forms/[formSlug]) read the `forms` collection,
    // which the shared preloader does not cover — load it here.
    try {
      const client = getLightbaseClient();
      const forms = await client.query('forms', { filter: { field: 'school_id', op: 'eq', value: school.id }, limit: 1000 });
      setSchoolDataCache(school.slug, 'forms', forms.data || []);
    } catch (e: any) {
      console.error(`[prerender-data] forms preload failed for ${school.slug}:`, e?.message || e);
    }
  }
  _preloaded = true;
  return schools;
}

/** Convenience: one school's cached data list (after preloadAllSchools). */
export function cachedSchoolData(slug: string, dataType: string): any[] {
  return peekSchoolData(slug, dataType);
}

/** Platform (marketing) collections: blog posts, docs, faqs, plans. */
export async function platformList(collection: string, filter?: any): Promise<any[]> {
  try {
    const client = getLightbaseClient();
    const res = await client.query(collection, { filter, limit: 1000 });
    return res.data || [];
  } catch (e: any) {
    console.error(`[prerender-data] ${collection} load failed:`, e?.message || e);
    return [];
  }
}

/**
 * getStaticPaths generator for the public per-school pages.
 *
 * kind 'school'  → one path per school landing tree root ([slug])
 * kind 'announcements' | 'posts' | 'programs' | 'classes' | 'periods' | 'forms'
 *                → one path per published item ([slug]/x/[item])
 */
export async function schoolStaticPaths(
  kind: 'school' | 'announcements' | 'posts' | 'programs' | 'classes' | 'periods' | 'forms',
): Promise<Array<{ params: Record<string, string> }>> {
  const schools = await preloadAllSchools();
  const paths: Array<{ params: Record<string, string> }> = [];
  const dataTypeFor: Record<string, string> = {
    announcements: 'announcements',
    posts: 'posts',
    programs: 'programs',
    classes: 'classes',
    periods: 'admissionPeriods',
    forms: 'forms',
  };
  const paramFor: Record<string, string> = {
    announcements: 'announcement',
    posts: 'post',
    programs: 'program',
    classes: 'class',
    periods: 'period',
    forms: 'formSlug',
  };
  for (const school of schools) {
    if (!school?.slug) continue;
    if (kind === 'school') {
      paths.push({ params: { slug: school.slug } });
      continue;
    }
    const items = peekSchoolData(school.slug, dataTypeFor[kind]) || [];
    for (const item of items) {
      const ps = item?.slug || String(item?.id ?? '');
      if (!ps || ps === 'undefined') continue;
      // Blog posts: prerender published posts only (matching the SSR filter).
      if (kind === 'posts') {
        const published = item.status === 'published' || item.is_published === true || item.isPublished === true || item.published === true || item.published === 1;
        if (!published) continue;
      }
      paths.push({ params: { slug: school.slug, [paramFor[kind]]: ps } });
    }
  }
  return paths;
}
