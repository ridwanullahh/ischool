import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { interactiveLessons, classes, courses, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const id = url.searchParams.get('id');
  if (id) {
    const lesson = db.select().from(interactiveLessons).where(and(eq(interactiveLessons.id, parseInt(id)), eq(interactiveLessons.schoolId, schoolId))).get();
    return new Response(JSON.stringify(lesson), { headers: { 'Content-Type': 'application/json' } });
  }

  const lessons = db.select({
    id: interactiveLessons.id, title: interactiveLessons.title, description: interactiveLessons.description,
    mode: interactiveLessons.mode, status: interactiveLessons.status, createdAt: interactiveLessons.createdAt,
    classId: interactiveLessons.classId, courseId: interactiveLessons.courseId,
    className: classes.name, courseTitle: courses.title,
  }).from(interactiveLessons)
    .leftJoin(classes, eq(interactiveLessons.classId, classes.id))
    .leftJoin(courses, eq(interactiveLessons.courseId, courses.id))
    .where(eq(interactiveLessons.schoolId, schoolId))
    .orderBy(desc(interactiveLessons.createdAt)).all();
  return new Response(JSON.stringify(lessons), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.title || !data.slides) return new Response(JSON.stringify({ error: 'title and slides required' }), { status: 400 });
  const db = getDb();

  const result = db.insert(interactiveLessons).values({
    schoolId, teacherId: user.id,
    classId: data.classId || null,
    courseId: data.courseId || null,
    title: data.title,
    description: data.description || null,
    slides: data.slides,
    mode: data.mode || 'live',
    status: data.status || 'draft',
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(interactiveLessons).set({
    title: data.title, description: data.description, slides: data.slides,
    mode: data.mode, status: data.status, classId: data.classId, courseId: data.courseId,
    updatedAt: new Date(),
  }).where(and(eq(interactiveLessons.id, data.id), eq(interactiveLessons.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'classroom.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(interactiveLessons).where(and(eq(interactiveLessons.id, id), eq(interactiveLessons.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
