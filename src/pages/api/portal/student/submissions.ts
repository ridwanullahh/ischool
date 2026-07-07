/**
 * Student Portal - Submission API
 *
 * POST   /api/portal/student/submissions  - submit an assignment
 * GET    /api/portal/student/submissions  - list own submissions
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { submissions, assignments } from '../../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getStudentForUser } from '../../../../lib/portal.js';
import { guardPermission } from '../../../../lib/rbac.js';

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'assignments.submit');
  if (denied) return denied;

  const student = getStudentForUser(user.id);
  if (!student) return new Response(JSON.stringify({ error: 'Student profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const mySubmissions = db.select().from(submissions).where(eq(submissions.studentId, student.id)).all();
  return new Response(JSON.stringify({ submissions: mySubmissions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'assignments.submit');
  if (denied) return denied;

  const student = getStudentForUser(user.id);
  if (!student) return new Response(JSON.stringify({ error: 'Student profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { assignmentId, content, fileUrl } = body;

  if (!assignmentId) {
    return new Response(JSON.stringify({ error: 'Assignment ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  // Verify the assignment exists and belongs to the same school
  const assignment = db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
  if (!assignment || assignment.schoolId !== student.schoolId) {
    return new Response(JSON.stringify({ error: 'Assignment not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Check if already submitted (update existing, or create new)
  const existing = db.select().from(submissions).where(
    and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, student.id))
  ).get();

  if (existing) {
    // Update existing submission
    db.update(submissions).set({
      content: content || existing.content,
      fileUrl: fileUrl || existing.fileUrl,
      submittedAt: new Date(),
      status: 'submitted',
    }).where(eq(submissions.id, existing.id)).run();
    return new Response(JSON.stringify({ ok: true, submissionId: existing.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Create new submission
  const result = db.insert(submissions).values({
    assignmentId,
    studentId: student.id,
    schoolId: student.schoolId,
    content: content || null,
    fileUrl: fileUrl || null,
    status: 'submitted',
    submittedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, submissionId: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
