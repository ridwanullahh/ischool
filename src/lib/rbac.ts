/**
 * RBAC (Role-Based Access Control) System
 *
 * Provides granular permission checking for all platform roles.
 * Built on top of the existing `users.role` and `schoolMembers.role` fields.
 *
 * Usage:
 *   import { hasPermission, requirePermission } from '../lib/rbac';
 *   requirePermission(Astro.locals.user, 'students.create');
 *   if (hasPermission(user, 'fees.view')) { ... }
 */

import { getDb } from './db/index.js';
import { users, schoolMembers, roleOverrides } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'staff'
  | 'accountant'
  | 'librarian'
  | 'it_admin';

export const ALL_ROLES: Role[] = [
  'super_admin',
  'school_admin',
  'teacher',
  'student',
  'parent',
  'staff',
  'accountant',
  'librarian',
  'it_admin',
];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  staff: 'Staff',
  accountant: 'Accountant',
  librarian: 'Librarian',
  it_admin: 'IT Admin',
};

// ═══════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════

/**
 * All platform permissions, organized by module.
 * Format: module.action[.scope]
 */
export const PERMISSIONS = {
  // Platform-wide
  'platform.admin': ['super_admin'],
  'platform.settings': ['super_admin', 'school_admin', 'it_admin'],
  'platform.analytics': ['super_admin', 'school_admin'],
  'platform.reports': ['super_admin', 'school_admin', 'teacher', 'accountant'],
  'platform.audit_log': ['super_admin', 'school_admin', 'it_admin'],

  // SIS (Module 1)
  'students.view': ['super_admin', 'school_admin', 'teacher', 'staff', 'librarian'],
  'students.create': ['super_admin', 'school_admin', 'staff'],
  'students.edit': ['super_admin', 'school_admin', 'staff'],
  'students.delete': ['super_admin', 'school_admin'],
  'students.export': ['super_admin', 'school_admin', 'staff'],
  'students.import': ['super_admin', 'school_admin', 'staff'],
  'students.medical.view': ['super_admin', 'school_admin', 'staff'],
  'students.documents.view': ['super_admin', 'school_admin', 'teacher', 'staff'],
  'students.own.view': ['student', 'parent'], // students/parents view own/child records

  // Enrollment
  'enrollments.view': ['super_admin', 'school_admin', 'teacher', 'staff'],
  'enrollments.manage': ['super_admin', 'school_admin', 'staff'],
  'enrollments.apply': ['parent', 'student'], // public application

  // Attendance
  'attendance.view': ['super_admin', 'school_admin', 'teacher', 'staff', 'parent', 'student'],
  'attendance.mark': ['super_admin', 'school_admin', 'teacher', 'staff'],
  'attendance.edit': ['super_admin', 'school_admin', 'teacher'],
  'attendance.reports': ['super_admin', 'school_admin', 'teacher'],

  // LMS (Module 2)
  'courses.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'courses.create': ['super_admin', 'school_admin', 'teacher'],
  'courses.edit': ['super_admin', 'school_admin', 'teacher'],
  'courses.delete': ['super_admin', 'school_admin'],
  'assignments.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'assignments.create': ['super_admin', 'school_admin', 'teacher'],
  'assignments.grade': ['super_admin', 'school_admin', 'teacher'],
  'assignments.submit': ['student'],
  'quizzes.view': ['super_admin', 'school_admin', 'teacher', 'student'],
  'quizzes.create': ['super_admin', 'school_admin', 'teacher'],
  'quizzes.take': ['student'],
  'grades.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'grades.enter': ['super_admin', 'school_admin', 'teacher'],
  'grades.export': ['super_admin', 'school_admin', 'teacher'],

  // Timetable (Module 3)
  'timetable.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'timetable.manage': ['super_admin', 'school_admin'],
  'timetable.export': ['super_admin', 'school_admin', 'teacher', 'student'],

  // Examinations (Module 4)
  'exams.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'exams.manage': ['super_admin', 'school_admin', 'teacher'],
  'exams.enter_results': ['super_admin', 'school_admin', 'teacher'],
  'exams.publish_results': ['super_admin', 'school_admin'],

  // Finance (Module 5)
  'fees.view': ['super_admin', 'school_admin', 'accountant', 'parent', 'student'],
  'fees.manage': ['super_admin', 'school_admin', 'accountant'],
  'fees.own.view': ['student', 'parent'],
  'invoices.view': ['super_admin', 'school_admin', 'accountant', 'parent'],
  'invoices.create': ['super_admin', 'school_admin', 'accountant'],
  'invoices.manage': ['super_admin', 'school_admin', 'accountant'],
  'payments.view': ['super_admin', 'school_admin', 'accountant', 'parent'],
  'payments.record': ['super_admin', 'school_admin', 'accountant'],
  'payments.make': ['parent', 'student'],
  'payments.refund': ['super_admin', 'school_admin', 'accountant'],
  'fees.reports': ['super_admin', 'school_admin', 'accountant'],

  // HR (Module 6)
  'staff.view': ['super_admin', 'school_admin', 'it_admin'],
  'staff.manage': ['super_admin', 'school_admin', 'it_admin'],
  'staff.own.view': ['teacher', 'student', 'parent', 'staff', 'accountant', 'librarian'],
  'leave.view': ['super_admin', 'school_admin', 'staff', 'teacher'],
  'leave.apply': ['staff', 'teacher'],
  'leave.approve': ['super_admin', 'school_admin'],
  'payroll.view': ['super_admin', 'school_admin', 'accountant'],
  'payroll.manage': ['super_admin', 'school_admin', 'accountant'],
  'payroll.own.view': ['teacher', 'staff', 'accountant', 'librarian'],
  'recruitment.manage': ['super_admin', 'school_admin'],
  'performance.view': ['super_admin', 'school_admin'],
  'performance.own.view': ['teacher', 'staff', 'accountant', 'librarian'],

  // Communication (Module 7)
  'messages.send': ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'staff', 'accountant', 'librarian'],
  'messages.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'staff', 'accountant', 'librarian'],
  'announcements.create': ['super_admin', 'school_admin', 'teacher'],
  'announcements.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'staff', 'accountant', 'librarian'],
  'notifications.manage': ['super_admin', 'school_admin'],

  // Library (Module 8)
  'library.view': ['super_admin', 'school_admin', 'teacher', 'student', 'staff', 'librarian'],
  'library.manage': ['super_admin', 'school_admin', 'librarian'],
  'library.issue': ['super_admin', 'school_admin', 'librarian'],
  'library.returns': ['super_admin', 'school_admin', 'librarian'],
  'library.fines.manage': ['super_admin', 'school_admin', 'librarian', 'accountant'],

  // Hostel (Module 9)
  'hostel.view': ['super_admin', 'school_admin', 'staff', 'parent', 'student'],
  'hostel.manage': ['super_admin', 'school_admin', 'staff'],
  'hostel.allocate': ['super_admin', 'school_admin', 'staff'],

  // Transport (Module 10)
  'transport.view': ['super_admin', 'school_admin', 'staff', 'parent', 'student'],
  'transport.manage': ['super_admin', 'school_admin', 'staff'],
  'transport.assign': ['super_admin', 'school_admin', 'staff'],

  // Inventory (Module 11)
  'inventory.view': ['super_admin', 'school_admin', 'staff', 'it_admin'],
  'inventory.manage': ['super_admin', 'school_admin', 'staff'],
  'inventory.procure': ['super_admin', 'school_admin', 'staff'],

  // Events (Module 12)
  'events.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'staff'],
  'events.manage': ['super_admin', 'school_admin', 'teacher', 'staff'],
  'events.rsvp': ['teacher', 'student', 'parent', 'staff'],

  // Classroom Tools (Module 13)
  'classroom.view': ['super_admin', 'school_admin', 'teacher', 'student'],
  'classroom.manage': ['super_admin', 'school_admin', 'teacher'],
  'behavior.view': ['super_admin', 'school_admin', 'teacher', 'parent'],
  'behavior.manage': ['super_admin', 'school_admin', 'teacher'],
  'lesson_plans.view': ['super_admin', 'school_admin', 'teacher'],
  'lesson_plans.manage': ['super_admin', 'school_admin', 'teacher'],

  // Reporting (Module 14)
  'reports.view': ['super_admin', 'school_admin', 'teacher', 'accountant'],
  'reports.create': ['super_admin', 'school_admin'],
  'reports.export': ['super_admin', 'school_admin', 'teacher', 'accountant'],
  'reports.schedule': ['super_admin', 'school_admin'],

  // IT Admin (Module 15)
  'it.users.manage': ['super_admin', 'school_admin', 'it_admin'],
  'it.roles.manage': ['super_admin', 'it_admin'],
  'it.modules.manage': ['super_admin', 'school_admin', 'it_admin'],
  'it.sso.manage': ['super_admin', 'it_admin'],
  'it.backup.manage': ['super_admin', 'school_admin', 'it_admin'],
  'it.maintenance': ['super_admin', 'it_admin'],

  // CBT (Module 16)
  'cbt.view': ['super_admin', 'school_admin', 'teacher', 'student'],
  'cbt.manage': ['super_admin', 'school_admin', 'teacher'],
  'cbt.take': ['student'],
  'cbt.proctor': ['super_admin', 'school_admin', 'teacher'],
  'cbt.results.view': ['super_admin', 'school_admin', 'teacher', 'student', 'parent'],
  'cbt.question_bank.manage': ['super_admin', 'school_admin', 'teacher'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ═══════════════════════════════════════════════════════
// DEFAULT ROLE → PERMISSION MAPPING
// ═══════════════════════════════════════════════════════

/**
 * Returns the default set of permissions for a role.
 * Super Admin gets all permissions.
 */
export function getDefaultPermissions(role: Role): Set<Permission> {
  if (role === 'super_admin') {
    return new Set(Object.keys(PERMISSIONS) as Permission[]);
  }
  const perms = new Set<Permission>();
  for (const [perm, roles] of Object.entries(PERMISSIONS)) {
    if ((roles as Role[]).includes(role)) {
      perms.add(perm as Permission);
    }
  }
  return perms;
}

// ═══════════════════════════════════════════════════════
// PERMISSION CHECKING
// ═══════════════════════════════════════════════════════

/**
 * Cache for user permissions within a request lifecycle.
 * Avoids repeated DB lookups for the same user.
 */
const permissionCache = new Map<number, { perms: Set<Permission>; schoolId: number | null; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Gets the effective permissions for a user, considering:
 * 1. The user's platform role (from users.role)
 * 2. The user's school membership role (from schoolMembers.role)
 * 3. Any per-school role overrides (from role_overrides table)
 *
 * The user gets the UNION of permissions from their platform role
 * and their school membership role (whichever grants more).
 */
export function getUserPermissions(userId: number, schoolId?: number): Set<Permission> {
  const cacheKey = userId;
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    if (schoolId === undefined || cached.schoolId === schoolId) {
      return cached.perms;
    }
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    return new Set();
  }

  // Start with platform role permissions
  const platformRole = user.role as Role;
  let perms = getDefaultPermissions(platformRole);

  // If user is super_admin, they have everything
  if (platformRole === 'super_admin') {
    permissionCache.set(cacheKey, { perms, schoolId: null, ts: Date.now() });
    return perms;
  }

  // Merge in school membership role permissions
  const membershipQuery = schoolId
    ? db.select().from(schoolMembers).where(and(eq(schoolMembers.userId, userId), eq(schoolMembers.schoolId, schoolId))).get()
    : db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();

  if (membershipQuery) {
    const memberRole = membershipQuery.role as Role;
    // Map member role to platform role equivalent for permission lookup
    const equivalentRole = memberRole === 'admin' ? 'school_admin' : memberRole;
    const memberPerms = getDefaultPermissions(equivalentRole as Role);
    // Union: user gets the broader of the two role sets
    memberPerms.forEach(p => perms.add(p));

    // Apply per-school role overrides (grant or revoke)
    const overrides = db.select().from(roleOverrides)
      .where(and(eq(roleOverrides.schoolId, membershipQuery.schoolId), eq(roleOverrides.role, equivalentRole)))
      .all();
    for (const ov of overrides) {
      if (ov.action === 'grant') {
        perms.add(ov.permission as Permission);
      } else {
        perms.delete(ov.permission as Permission);
      }
    }
  }

  permissionCache.set(cacheKey, { perms, schoolId: schoolId ?? null, ts: Date.now() });
  return perms;
}

/**
 * Checks if a user has a specific permission.
 */
export function hasPermission(userId: number, permission: Permission, schoolId?: number): boolean {
  const perms = getUserPermissions(userId, schoolId);
  return perms.has(permission);
}

/**
 * Checks if a user object (from Astro.locals) has a permission.
 * Throws a 403 error if not, suitable for use in API endpoints and pages.
 */
export function requirePermission(user: any, permission: Permission, schoolId?: number): void {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!hasPermission(user.id, permission, schoolId)) {
    throw new Error(`Permission denied: ${permission} required`);
  }
}

/**
 * Returns a 403 Astro redirect target if the user lacks a permission.
 * Use in .astro pages: if (!checkRedirect(Astro.locals.user, 'students.view', schoolId)) return Astro.redirect('/dashboard');
 */
export function checkPermission(user: any, permission: Permission, schoolId?: number): boolean {
  if (!user) return false;
  return hasPermission(user.id, permission, schoolId);
}

/**
 * Clears the permission cache for a user (call after role/permission changes).
 */
export function clearPermissionCache(userId?: number): void {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
}

/**
 * API endpoint guard: checks if the authenticated user has a permission.
 * Returns a 403 Response if not, or null if allowed.
 *
 * Usage in API routes:
 *   import { guardPermission } from '../../../lib/rbac';
 *   const denied = guardPermission(Astro.locals.user, 'students.create');
 *   if (denied) return denied;
 */
export function guardPermission(user: any, permission: Permission, schoolId?: number): Response | null {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Use the permissions already attached by middleware if available
  const perms = (user as any).permissions;
  const has = perms ? perms.has(permission) : hasPermission(user.id, permission, schoolId);
  if (!has) {
    return new Response(JSON.stringify({ error: `Permission denied: ${permission} required` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

/**
 * Page guard: checks if the user has a permission, returns true if allowed.
 * Use in .astro frontmatter:
 *   import { checkPermission } from '../../lib/rbac';
 *   if (!checkPermission(Astro.locals.user, 'students.view')) return Astro.redirect('/dashboard');
 */
export function pageGuard(user: any, permission: Permission): boolean {
  if (!user) return false;
  const perms = (user as any).permissions;
  return perms ? perms.has(permission) : hasPermission(user.id, permission);
}

/**
 * Returns all permissions for a role, formatted for display.
 */
export function getPermissionsForRole(role: Role): { permission: Permission; module: string; action: string }[] {
  const perms = getDefaultPermissions(role);
  return Array.from(perms).map(p => {
    const [module, ...actionParts] = p.split('.');
    return { permission: p, module, action: actionParts.join('.') };
  }).sort((a, b) => a.module.localeCompare(b.module) || a.action.localeCompare(b.action));
}

/**
 * Returns all permissions grouped by module, for the role management UI.
 */
export function getPermissionsByModule(): Record<string, Permission[]> {
  const grouped: Record<string, Permission[]> = {};
  for (const perm of Object.keys(PERMISSIONS) as Permission[]) {
    const [mod] = perm.split('.');
    if (!grouped[mod]) grouped[mod] = [];
    grouped[mod].push(perm);
  }
  return grouped;
}
