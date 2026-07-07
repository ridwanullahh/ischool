/**
 * Fee-Access Linkage System
 *
 * Checks if a student should be blocked from accessing specific modules
 * due to outstanding fees. Configurable per school.
 *
 * Used by the student portal middleware to block access to LMS, exams,
 * CBT, etc. when fees are overdue beyond the grace period.
 */
import { getDb } from './db/index.js';
import { feeAccessRules, invoices, students } from './db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export interface FeeAccessCheckResult {
  blocked: boolean;
  modules: string[];
  message: string;
  outstandingAmount: number;
  overdueDays: number;
}

/**
 * Checks if a student should be blocked from accessing modules.
 *
 * @param studentId - The student record ID
 * @param schoolId - The school ID
 * @returns FeeAccessCheckResult with block status and details
 */
export function checkFeeAccess(studentId: number, schoolId: number): FeeAccessCheckResult {
  const db = getDb();

  // Get the fee access rule for this school
  const rule = db.select().from(feeAccessRules).where(eq(feeAccessRules.schoolId, schoolId)).get();

  // If no rule or disabled, no blocking
  if (!rule || !rule.enabled) {
    return { blocked: false, modules: [], message: '', outstandingAmount: 0, overdueDays: 0 };
  }

  // Get outstanding invoices for the student
  const outstandingInvoices = db.select().from(invoices)
    .where(and(eq(invoices.studentId, studentId), eq(invoices.schoolId, schoolId), sql`${invoices.status} != 'paid'`))
    .all();

  const outstandingAmount = outstandingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

  // Check threshold (0 means any amount triggers)
  if (rule.thresholdAmount && outstandingAmount < rule.thresholdAmount) {
    return { blocked: false, modules: [], message: '', outstandingAmount, overdueDays: 0 };
  }

  // Check grace period — find the oldest overdue invoice
  const now = new Date();
  let oldestOverdueDays = 0;
  for (const inv of outstandingInvoices) {
    if (inv.dueDate) {
      const dueDate = new Date(inv.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > oldestOverdueDays) oldestOverdueDays = diffDays;
    }
  }

  // If grace period not exceeded, no blocking
  if (oldestOverdueDays <= (rule.gracePeriodDays || 0)) {
    return { blocked: false, modules: [], message: '', outstandingAmount, overdueDays: oldestOverdueDays };
  }

  // Student is blocked
  const blockedModules = (rule.blockedModules as string[]) || [];
  const message = rule.blockMessage || `Your access is restricted due to outstanding fees of ${outstandingAmount.toLocaleString()}. Please contact the school administration to clear your balance.`;

  return {
    blocked: true,
    modules: blockedModules,
    message,
    outstandingAmount,
    overdueDays: oldestOverdueDays,
  };
}

/**
 * Checks if a student is blocked from a specific module.
 *
 * @param userId - The user ID of the student
 * @param module - The module key ('lms', 'exams', 'cbt', 'portal')
 * @returns true if blocked, false if allowed
 */
export function isStudentBlockedFromModule(userId: number, module: string): boolean {
  const db = getDb();
  const student = db.select().from(students).where(eq(students.userId, userId)).get();
  if (!student) return false;

  const result = checkFeeAccess(student.id, student.schoolId);
  if (!result.blocked) return false;

  return result.modules.includes(module);
}
