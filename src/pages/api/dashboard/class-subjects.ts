/**
 * Class Subjects API
 * GET - list class subjects (for a class or teacher)
 * POST - assign a teacher to a subject in a class
 * PUT - update assignment
 * DELETE - remove assignment
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { classSubjects, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'courses.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const classId = url.searchParams.get('classId');
  const teacherId = url.searchParams.get('teacherId');

  if (classId) {
    const rows = db.select().from(classSubjects)
      .where(and(eq(classSubjects.schoolId, schoolId), eq(classSubjects.classId, parseInt(classId)))).all();
    return new Response(JSON.stringify({ subjects: rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  let rows = db.select().from(classSubjects).where(eq(classSubjects.schoolId, schoolId)).all();
  if (teacherId) rows = rows.filter(r => r.teacherId === parseInt(teacherId));
  return new Response(JSON.stringify({ subjects: rows }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'courses.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { classId, subjectName, teacherId, courseId, description } = body;
  if (!classId || !subjectName) {
    return new Response(JSON.stringify({ error: 'classId and subjectName are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(classSubjects).values({
    schoolId, classId: parseInt(classId), subjectName,
    teacherId: teacherId || null, courseId: courseId || null,
    description: description || null, createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'courses.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id, subjectName, teacherId, courseId, description } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.update(classSubjects).set({
    subjectName, teacherId: teacherId ?? null, courseId: courseId ?? null,
    description: description ?? null, updatedAt: new Date(),
  }).where(and(eq(classSubjects.id, id), eq(classSubjects.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'courses.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.delete(classSubjects).where(and(eq(classSubjects.id, id), eq(classSubjects.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
