import { getDb } from './db/index.js';
import { schools, schoolMembers, navigationItems, contactInfo } from './db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { generateDefaultPalette, mergePalette, type Palette } from './palette.js';

export function getUserSchool(userId: number) {
  const db = getDb();
  const membership = db.select().from(schoolMembers)
    .where(eq(schoolMembers.userId, userId))
    .all()
    .find(m => m.active !== false && m.active !== null);
  if (!membership) return null;
  return db.select().from(schools).where(eq(schools.id, membership.schoolId)).get() || null;
}

export function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export function getSchoolBySlug(slug: string) {
  const db = getDb();
  return db.select().from(schools).where(eq(schools.slug, slug)).get() || null;
}

export function getSchoolNav(schoolId: number) {
  const db = getDb();
  return db.select().from(navigationItems)
    .where(eq(navigationItems.schoolId, schoolId))
    .orderBy(asc(navigationItems.sortOrder))
    .all();
}

export function getSchoolInfo(schoolId: number) {
  const db = getDb();
  return db.select().from(contactInfo)
    .where(eq(contactInfo.schoolId, schoolId))
    .orderBy(asc(contactInfo.sortOrder))
    .get() || null;
}

export function getSchoolContacts(schoolId: number) {
  const db = getDb();
  return db.select().from(contactInfo)
    .where(eq(contactInfo.schoolId, schoolId))
    .orderBy(asc(contactInfo.sortOrder))
    .all();
}

export function getSchoolPalette(school: any): Palette {
  const stored = school?.settings?.palette;
  return mergePalette(stored, school?.primaryColor || '#2563eb');
}
