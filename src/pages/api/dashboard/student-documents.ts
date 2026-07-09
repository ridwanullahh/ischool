/**
 * Student Documents API
 * Full CRUD: GET (list by student or school), POST (create), PUT (update), DELETE
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { studentDocuments, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

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
  const studentId = url.searchParams.get('studentId');
  const category = url.searchParams.get('category');

  if (studentId) {
    const rows = db.select().from(studentDocuments)
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.studentId, parseInt(studentId)))).all();
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  }
  if (category) {
    const rows = db.select().from(studentDocuments)
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.category, category as any))).all();
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  }
  const rows = db.select().from(studentDocuments).where(eq(studentDocuments.schoolId, schoolId)).all();
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { studentId, category, title, fileUrl, fileName, fileType } = body;
  if (!studentId || !category || !title || !fileUrl) {
    return new Response(JSON.stringify({ error: 'studentId, category, title, fileUrl are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(studentDocuments).values({
    studentId: parseInt(studentId),
    schoolId,
    category,
    title,
    fileUrl,
    fileName: fileName || null,
    fileType: fileType || null,
    uploadedBy: user.id,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id, category, title, fileUrl, fileName, fileType } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.update(studentDocuments).set({
    category, title, fileUrl, fileName, fileType, updatedAt: new Date(),
  }).where(and(eq(studentDocuments.id, id), eq(studentDocuments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.delete(studentDocuments).where(and(eq(studentDocuments.id, id), eq(studentDocuments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
