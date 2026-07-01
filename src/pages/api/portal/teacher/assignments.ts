/**
 * Teacher Portal - Assignments API
 *
 * POST - create a new assignment
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { assignments } from '../../../../lib/db/schema.js';
import { guardPermission } from '../../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'assignments.create');
  if (denied) return denied;

  const body = await request.json();
  const { title, description, courseId, classId, dueDate, maxPoints, schoolId } = body;

  if (!title || !schoolId) {
    return new Response(JSON.stringify({ error: 'Title and school ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const result = db.insert(assignments).values({
    title,
    description: description || null,
    courseId: courseId || null,
    classId: classId || null,
    schoolId,
    dueDate: dueDate || null,
    maxPoints: maxPoints || null,
    createdBy: user.id,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, assignmentId: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
