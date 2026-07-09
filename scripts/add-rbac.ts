#!/usr/bin/env node
/**
 * RBAC Migration Script — adds guardPermission() to all dashboard APIs.
 * Maps each API file to appropriate permissions based on its module.
 */
import fs from 'fs';
import path from 'path';

const API_DIR = 'src/pages/api/dashboard';

// Permission mapping per API file
const PERM_MAP: Record<string, { get?: string; post?: string; put?: string; delete?: string }> = {
  'about.ts': { get: 'platform.settings', post: 'platform.settings', put: 'platform.settings', delete: 'platform.settings' },
  'admissions.ts': { get: 'students.view', post: 'students.create', put: 'students.edit', delete: 'students.delete' },
  'announcements.ts': { get: 'announcements.view', post: 'announcements.create', put: 'announcements.edit', delete: 'announcements.delete' },
  'assignments.ts': { get: 'assignments.view', post: 'assignments.create', put: 'assignments.edit', delete: 'assignments.delete' },
  'attendance.ts': { get: 'attendance.view', post: 'attendance.create', put: 'attendance.edit', delete: 'attendance.delete' },
  'banners.ts': { get: 'banners.view', post: 'banners.create', put: 'banners.edit', delete: 'banners.delete' },
  'blog.ts': { get: 'blog.view', post: 'blog.create', put: 'blog.edit', delete: 'blog.delete' },
  'cbt-candidates.ts': { get: 'cbt.view', post: 'cbt.create', put: 'cbt.edit', delete: 'cbt.delete' },
  'cbt.ts': { get: 'cbt.view', post: 'cbt.create', put: 'cbt.edit', delete: 'cbt.delete' },
  'class-subjects.ts': { get: 'courses.view', post: 'courses.create', put: 'courses.edit', delete: 'courses.delete' },
  'classes.ts': { get: 'students.view', post: 'students.create', put: 'students.edit', delete: 'students.delete' },
  'classroom.ts': { get: 'classroom.view', post: 'classroom.create', put: 'classroom.edit', delete: 'classroom.delete' },
  'cms-modules.ts': { get: 'platform.settings', post: 'platform.settings' },
  'comms-announcements.ts': { get: 'announcements.view', post: 'announcements.create', put: 'announcements.edit', delete: 'announcements.delete' },
  'contacts.ts': { get: 'contacts.view', post: 'contacts.create', put: 'contacts.edit', delete: 'contacts.delete' },
  'courses.ts': { get: 'courses.view', post: 'courses.create', put: 'courses.edit', delete: 'courses.delete' },
  'discussions.ts': { get: 'discussions.view', post: 'discussions.create', put: 'discussions.edit', delete: 'discussions.delete' },
  'email.ts': { get: 'email.view', post: 'email.create', put: 'email.edit', delete: 'email.delete' },
  'enrollments.ts': { get: 'enrollments.view', post: 'enrollments.create', put: 'enrollments.edit', delete: 'enrollments.delete' },
  'events.ts': { get: 'events.view', post: 'events.create', put: 'events.edit', delete: 'events.delete' },
  'exam-series.ts': { get: 'exams.view', post: 'exams.create', put: 'exams.edit', delete: 'exams.delete' },
  'exams.ts': { get: 'exams.view', post: 'exams.create', put: 'exams.edit', delete: 'exams.delete' },
  'faqs.ts': { get: 'faqs.view', post: 'faqs.create', put: 'faqs.edit', delete: 'faqs.delete' },
  'fee-access.ts': { get: 'fees.view', post: 'fees.manage', put: 'fees.manage', delete: 'fees.manage' },
  'gmb.ts': { get: 'gmb.view', post: 'gmb.create', put: 'gmb.edit', delete: 'gmb.delete' },
  'grades.ts': { get: 'grades.view', post: 'grades.create', put: 'grades.edit', delete: 'grades.delete' },
  'hostel-allocations.ts': { get: 'hostel.view', post: 'hostel.create', put: 'hostel.edit', delete: 'hostel.delete' },
  'hostel-checkin.ts': { get: 'hostel.view', post: 'hostel.create', put: 'hostel.edit', delete: 'hostel.delete' },
  'hostel-maintenance.ts': { get: 'hostel.view', post: 'hostel.create', put: 'hostel.edit', delete: 'hostel.delete' },
  'hostel.ts': { get: 'hostel.view', post: 'hostel.create', put: 'hostel.edit', delete: 'hostel.delete' },
  'interactive.ts': { get: 'classroom.view', post: 'classroom.create', put: 'classroom.edit', delete: 'classroom.delete' },
  'inventory-audit.ts': { get: 'inventory.view', post: 'inventory.create', put: 'inventory.edit', delete: 'inventory.delete' },
  'inventory.ts': { get: 'inventory.view', post: 'inventory.create', put: 'inventory.edit', delete: 'inventory.delete' },
  'invoices.ts': { get: 'invoices.view', post: 'invoices.create', put: 'invoices.manage', delete: 'invoices.manage' },
  'leave.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'lessons.ts': { get: 'courses.view', post: 'courses.create', put: 'courses.edit', delete: 'courses.delete' },
  'library.ts': { get: 'library.view', post: 'library.create', put: 'library.edit', delete: 'library.delete' },
  'live-classes.ts': { get: 'courses.view', post: 'courses.create', put: 'courses.edit', delete: 'courses.delete' },
  'messages.ts': { get: 'messages.view', post: 'messages.create', put: 'messages.edit', delete: 'messages.delete' },
  'notifications.ts': { get: 'notifications.view', post: 'notifications.create', put: 'notifications.edit', delete: 'notifications.delete' },
  'payroll.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'performance.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'payments.ts': { get: 'payments.view' }, // payments.ts has its own RBAC inside
  'programs.ts': { get: 'programs.view', post: 'programs.create', put: 'programs.edit', delete: 'programs.delete' },
  'question-bank/import.ts': { get: 'cbt.view', post: 'cbt.create' },
  'question-bank/index.ts': { get: 'cbt.view', post: 'cbt.create', put: 'cbt.edit', delete: 'cbt.delete' },
  'recruitment.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'report-cards.ts': { get: 'exams.view', post: 'exams.create', put: 'exams.edit', delete: 'exams.delete' },
  'reports.ts': { get: 'platform.reports' },
  'roles.ts': { get: 'platform.settings', post: 'platform.settings', put: 'platform.settings', delete: 'platform.settings' },
  'seating.ts': { get: 'classroom.view', post: 'classroom.create', put: 'classroom.edit', delete: 'classroom.delete' },
  'social.ts': { get: 'social.view', post: 'social.create', put: 'social.edit', delete: 'social.delete' },
  'staff-attendance.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'staff.ts': { get: 'hr.view', post: 'hr.create', put: 'hr.edit', delete: 'hr.delete' },
  'stock.ts': { get: 'inventory.view', post: 'inventory.create', put: 'inventory.edit', delete: 'inventory.delete' },
  'student-documents.ts': { get: 'students.documents.view', post: 'students.documents.view', put: 'students.documents.view', delete: 'students.documents.view' },
  'student-medical.ts': { get: 'students.medical.view', post: 'students.medical.view', put: 'students.medical.view', delete: 'students.medical.view' },
  'substitutes.ts': { get: 'timetable.view', post: 'timetable.create', put: 'timetable.edit', delete: 'timetable.delete' },
  'suppliers.ts': { get: 'inventory.view', post: 'inventory.create', put: 'inventory.edit', delete: 'inventory.delete' },
  'tickets.ts': { get: 'tickets.view', post: 'tickets.create', put: 'tickets.edit', delete: 'tickets.delete' },
  'timetable.ts': { get: 'timetable.view', post: 'timetable.create', put: 'timetable.edit', delete: 'timetable.delete' },
  'transport-assignments.ts': { get: 'transport.view', post: 'transport.create', put: 'transport.edit', delete: 'transport.delete' },
  'transport-maintenance.ts': { get: 'transport.view', post: 'transport.create', put: 'transport.edit', delete: 'transport.delete' },
  'transport-routes.ts': { get: 'transport.view', post: 'transport.create', put: 'transport.edit', delete: 'transport.delete' },
  'transport.ts': { get: 'transport.view', post: 'transport.create', put: 'transport.edit', delete: 'transport.delete' },
  'venues.ts': { get: 'events.view', post: 'events.create', put: 'events.edit', delete: 'events.delete' },
  'webhooks.ts': { get: 'platform.settings', post: 'platform.settings', put: 'platform.settings', delete: 'platform.settings' },
};

// RBAC permissions that exist in the system — use 'platform.settings' as fallback
const VALID_PERMS = new Set([
  'students.view', 'students.create', 'students.edit', 'students.delete', 'students.export',
  'students.medical.view', 'students.documents.view',
  'staff.view', 'staff.create', 'staff.edit', 'staff.delete',
  'hr.view', 'hr.create', 'hr.edit', 'hr.delete',
  'courses.view', 'courses.create', 'courses.edit', 'courses.delete',
  'assignments.view', 'assignments.create', 'assignments.edit', 'assignments.delete',
  'grades.view', 'grades.create', 'grades.edit', 'grades.delete',
  'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
  'enrollments.view', 'enrollments.create', 'enrollments.edit', 'enrollments.delete',
  'exams.view', 'exams.create', 'exams.edit', 'exams.delete',
  'fees.view', 'fees.manage',
  'invoices.view', 'invoices.create', 'invoices.manage',
  'payments.view', 'payments.record', 'payments.make', 'payments.refund',
  'library.view', 'library.create', 'library.edit', 'library.delete',
  'hostel.view', 'hostel.create', 'hostel.edit', 'hostel.delete',
  'transport.view', 'transport.create', 'transport.edit', 'transport.delete',
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
  'events.view', 'events.create', 'events.edit', 'events.delete',
  'classroom.view', 'classroom.create', 'classroom.edit', 'classroom.delete',
  'timetable.view', 'timetable.create', 'timetable.edit', 'timetable.delete',
  'messages.view', 'messages.create', 'messages.edit', 'messages.delete',
  'announcements.view', 'announcements.create', 'announcements.edit', 'announcements.delete',
  'notifications.view', 'notifications.create', 'notifications.edit', 'notifications.delete',
  'tickets.view', 'tickets.create', 'tickets.edit', 'tickets.delete',
  'cbt.view', 'cbt.create', 'cbt.edit', 'cbt.delete',
  'discussions.view', 'discussions.create', 'discussions.edit', 'discussions.delete',
  'platform.admin', 'platform.settings', 'platform.analytics', 'platform.reports', 'platform.audit_log',
  'banners.view', 'banners.create', 'banners.edit', 'banners.delete',
  'blog.view', 'blog.create', 'blog.edit', 'blog.delete',
  'faqs.view', 'faqs.create', 'faqs.edit', 'faqs.delete',
  'programs.view', 'programs.create', 'programs.edit', 'programs.delete',
  'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete',
  'email.view', 'email.create', 'email.edit', 'email.delete',
  'social.view', 'social.create', 'social.edit', 'social.delete',
  'gmb.view', 'gmb.create', 'gmb.edit', 'gmb.delete',
]);

let modified = 0;
let skipped = 0;

for (const [filename, perms] of Object.entries(PERM_MAP)) {
  const filepath = path.join(API_DIR, filename);
  if (!fs.existsSync(filepath)) { skipped++; continue; }

  let content = fs.readFileSync(filepath, 'utf-8');

  // Skip if already has guardPermission
  if (content.includes('guardPermission')) { skipped++; continue; }

  // Add import
  const importLine = "import { guardPermission } from '../../../lib/rbac.js';";
  // Find the last import line
  const lastImportIdx = content.lastIndexOf("import ");
  if (lastImportIdx >= 0) {
    const lineEnd = content.indexOf('\n', lastImportIdx);
    content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);
  }

  // For each HTTP method, add RBAC after the auth check
  for (const [method, perm] of Object.entries(perms)) {
    if (!perm) continue;
    const actualPerm = VALID_PERMS.has(perm) ? perm : 'platform.settings';

    // Pattern: find "export const METHOD: APIRoute = async ... {\n  const user = ...\n  if (!user) return ... Unauthorized ..."
    const methodPattern = new RegExp(
      `(export const ${method.toUpperCase()}: APIRoute = async \\([^)]*\\) => \\{\\s*\\n\\s*const user = \\(locals as any\\)\\.user;\\s*\\n\\s*if \\(!user\\) return new Response\\(JSON\\.stringify\\(\\{ error: 'Unauthorized' \\}\\), \\{ status: 401 \\}\\);)`,
      'g'
    );

    const replacement = `$1\n  const denied = guardPermission(user, '${actualPerm}');\n  if (denied) return denied;`;

    const newContent = content.replace(methodPattern, replacement);
    if (newContent !== content) {
      content = newContent;
    }
  }

  fs.writeFileSync(filepath, content);
  modified++;
  console.log(`  ✓ ${filename}`);
}

console.log(`\nModified: ${modified}, Skipped: ${skipped}`);
