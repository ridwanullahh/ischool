/**
 * Portal helpers — resolve student/teacher/parent records for the current user.
 *
 * These are shared across all portal pages to avoid repeated DB lookup code.
 */
import { getDb } from './db/index.js';
import { students, schoolMembers, staff, classes, enrollments } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Resolves the schoolId for a user from their school_members entry.
 * Returns null if the user has no school membership.
 */
export function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId ?? null;
}

/**
 * Resolves the student record for a user.
 * A user with role 'student' has a linked student record via students.userId.
 * Returns null if not found.
 */
export function getStudentForUser(userId: number) {
  const db = getDb();
  return db.select().from(students).where(eq(students.userId, userId)).get() ?? null;
}

/**
 * Resolves the staff record for a user (teachers, accountants, librarians, etc.).
 * Returns null if not found.
 */
export function getStaffForUser(userId: number) {
  const db = getDb();
  return db.select().from(staff).where(eq(staff.userId, userId)).get() ?? null;
}

/**
 * Resolves children (student records) linked to a parent user.
 * A parent is linked via students.parentId.
 */
export function getChildrenForParent(userId: number) {
  const db = getDb();
  return db.select().from(students).where(eq(students.parentId, userId)).all();
}

/**
 * Returns the class/section name for a student via their active enrollment.
 */
export function getStudentClassName(studentId: number): string | null {
  const db = getDb();
  const enrollment = db.select().from(enrollments).where(eq(enrollments.studentId, studentId)).get();
  if (!enrollment?.classId) return null;
  const cls = db.select().from(classes).where(eq(classes.id, enrollment.classId)).get();
  return cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : null;
}

/**
 * Returns the active enrollment for a student.
 */
export function getStudentEnrollment(studentId: number) {
  const db = getDb();
  return db.select().from(enrollments).where(eq(enrollments.studentId, studentId)).get() ?? null;
}
