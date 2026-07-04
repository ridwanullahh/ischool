/**
 * School Helper — Safe DB queries for public school pages
 * All functions wrap DB queries in try/catch with raw SQL fallback.
 */
import { getDb } from './db/index.js';

export function getSchoolBySlug(slug: string): any {
  const db = getDb();
  try { return db.prepare('SELECT * FROM schools WHERE slug = ?').get(slug); } catch { return null; }
}

export function getSchoolNav(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM navigation_items WHERE school_id = ? ORDER BY sort_order').all(schoolId); } catch { return []; }
}

export function getSchoolContacts(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM contact_info WHERE school_id = ? ORDER BY sort_order').all(schoolId); } catch { return []; }
}

export function getSchoolAbout(schoolId: number): any {
  const db = getDb();
  try { return db.prepare('SELECT * FROM about_pages WHERE school_id = ?').get(schoolId); } catch { return null; }
}

export function getSchoolAnnouncements(schoolId: number, limit: number = 100): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM announcements WHERE school_id = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, limit); } catch { return []; }
}

export function getSchoolPosts(schoolId: number, limit: number = 100): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM blog_posts WHERE school_id = ? ORDER BY created_at DESC LIMIT ?').all(schoolId, limit); } catch { return []; }
}

export function getSchoolPrograms(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM programs WHERE school_id = ?').all(schoolId); } catch { return []; }
}

export function getSchoolClasses(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(schoolId); } catch { return []; }
}

export function getSchoolFaqs(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM faqs WHERE school_id = ?').all(schoolId); } catch { return []; }
}

export function getSchoolGallery(schoolId: number): any[] {
  const db = getDb();
  try { return db.prepare('SELECT * FROM gallery_items WHERE school_id = ?').all(schoolId); } catch { return []; }
}

export function getSchoolPalette(school: any): any {
  try {
    const { generateDefaultPalette, mergePalette } = require('./palette.js');
    const stored = school?.settings?.palette;
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
