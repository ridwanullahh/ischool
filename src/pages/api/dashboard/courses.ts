import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { courses, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();
  const search = url.searchParams.get('search');
  if (search) {
    const results = db.select().from(courses).where(and(eq(courses.schoolId, schoolId), like(courses.title, `%${search}%`))).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }
  const allCourses = db.select().from(courses).where(eq(courses.schoolId, schoolId)).all();
  return new Response(JSON.stringify(allCourses), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.title || !data.slug) return new Response(JSON.stringify({ error: 'title and slug are required' }), { status: 400 });
  const db = getDb();
  const result = db.insert(courses).values({
    schoolId,
    title: data.title,
    slug: data.slug,
    description: data.description || null,
    subject: data.subject || null,
    gradeLevel: data.gradeLevel || null,
    teacherId: data.teacherId || null,
    coverImageUrl: data.coverImageUrl || null,
    status: data.status || 'draft',
    settings: data.settings ? JSON.stringify(data.settings) : '{}',
  }).returning().get();
  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  const db = getDb();
  const existing = db.select().from(courses).where(and(eq(courses.id, data.id), eq(courses.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });
  const { id, schoolId: _, ...updateData } = data;
  if (updateData.settings && typeof updateData.settings === 'object') updateData.settings = JSON.stringify(updateData.settings);
  db.update(courses).set({ ...updateData, updatedAt: new Date() }).where(eq(courses.id, id)).run();
  const updated = db.select().from(courses).where(eq(courses.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(courses).where(and(eq(courses.id, id), eq(courses.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404 });
  db.delete(courses).where(eq(courses.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
