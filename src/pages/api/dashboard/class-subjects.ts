/**
 * Class Subjects API
 *
 * GET - list class subjects (for a class or teacher)
 * POST - assign a teacher to a subject in a class
 * PUT - update assignment
 * DELETE - remove assignment
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { classSubjects } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const GET: APIRoute = async ({ locals, url }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const classId = url.searchParams.get('classId');
  const teacherId = url.searchParams.get('teacherId');
  const schoolId = (user as any).schoolId;

  let query = db.select().from(classSubjects).where(eq(classSubjects.schoolId, schoolId));
  if (classId) query = query.where(eq(classSubjects.classId, parseInt(classId))) as any;
  const results = query.all();
  const filtered = teacherId ? results.filter(r => r.teacherId === parseInt(teacherId)) : results;
  return new Response(JSON.stringify({ subjects: filtered }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'courses.create');
  if (denied) return denied;

  const body = await request.json();
  const { schoolId, classId, subjectName, teacherId, courseId, description } = body;

  if (!schoolId || !classId || !subjectName) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const result = db.insert(classSubjects).values({
    schoolId, classId, subjectName, teacherId: teacherId || null,
    courseId: courseId || null, description: description || null,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'courses.create');
  if (denied) return denied;

  const body = await request.json();
  const { id, teacherId, courseId, description } = body;
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  db.update(classSubjects).set({
    teacherId: teacherId ?? null, courseId: courseId ?? null,
    description: description ?? null, updatedAt: new Date(),
  }).where(eq(classSubjects.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const denied = guardPermission(user, 'courses.create');
  if (denied) return denied;

  const body = await request.json();
  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  db.delete(classSubjects).where(eq(classSubjects.id, id)).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
