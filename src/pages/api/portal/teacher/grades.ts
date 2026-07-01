/**
 * Teacher Portal - Grades API
 *
 * POST - grade a submission (enter score + feedback)
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { submissions, grades, assignments } from '../../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'assignments.grade');
  if (denied) return denied;

  const body = await request.json();
  const { submissionId, score, feedback, schoolId } = body;

  if (!submissionId) {
    return new Response(JSON.stringify({ error: 'Submission ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  // Verify submission exists and belongs to the same school
  const submission = db.select().from(submissions).where(eq(submissions.id, submissionId)).get();
  if (!submission || submission.schoolId !== schoolId) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Update the submission with score + feedback
  const now = new Date();
  db.update(submissions).set({
    score: score,
    feedback: feedback || null,
    gradedAt: now,
    gradedBy: user.id,
    status: 'graded',
  }).where(eq(submissions.id, submissionId)).run();

  // Also create/update a grade record in the grades table for the gradebook
  const assignment = db.select().from(assignments).where(eq(assignments.id, submission.assignmentId)).get();
  const existingGrade = db.select().from(grades).where(eq(grades.submissionId, submissionId)).get();

  if (existingGrade) {
    db.update(grades).set({
      score: score,
      feedback: feedback || null,
      updatedAt: now,
    }).where(eq(grades.id, existingGrade.id)).run();
  } else {
    db.insert(grades).values({
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      submissionId: submissionId,
      schoolId: schoolId,
      courseId: assignment?.courseId || null,
      assignmentTitle: assignment?.title || null,
      score: score,
      maxScore: assignment?.maxPoints || null,
      feedback: feedback || null,
      gradedBy: user.id,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
