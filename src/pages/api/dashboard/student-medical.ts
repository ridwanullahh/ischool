/**
 * Student Medical Records API
 * Full CRUD: GET (list by student or school), POST (create), PUT (update), DELETE
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { studentMedicalRecords, schoolMembers } from '../../../lib/db/schema.js';
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
  const denied = guardPermission(user, 'students.medical.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const studentId = url.searchParams.get('studentId');
  const type = url.searchParams.get('type');

  let query = db.select().from(studentMedicalRecords).where(eq(studentMedicalRecords.schoolId, schoolId));
  if (studentId) {
    const rows = db.select().from(studentMedicalRecords)
      .where(and(eq(studentMedicalRecords.schoolId, schoolId), eq(studentMedicalRecords.studentId, parseInt(studentId)))).all();
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  }
  if (type) {
    const rows = db.select().from(studentMedicalRecords)
      .where(and(eq(studentMedicalRecords.schoolId, schoolId), eq(studentMedicalRecords.type, type as any))).all();
    return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
  }
  const rows = query.all();
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'students.medical.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { studentId, type, title, description, severity, date } = body;

  if (!studentId || !type || !title) {
    return new Response(JSON.stringify({ error: 'studentId, type, title are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(studentMedicalRecords).values({
    studentId: parseInt(studentId),
    schoolId,
    type,
    title,
    description: description || null,
    severity: severity || null,
    date: date || null,
    recordedBy: user.id,
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'students.medical.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id, type, title, description, severity, date } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.update(studentMedicalRecords).set({
    type, title, description, severity, date, updatedAt: new Date(),
  }).where(and(eq(studentMedicalRecords.id, id), eq(studentMedicalRecords.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'students.medical.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const body = await request.json();
  const { id } = body;
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.delete(studentMedicalRecords).where(and(eq(studentMedicalRecords.id, id), eq(studentMedicalRecords.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
