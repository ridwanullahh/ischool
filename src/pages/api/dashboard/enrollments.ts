import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { enrollments, students, classes, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

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
  const status = url.searchParams.get('status');
  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allEnrollments = db.select({
      id: enrollments.id, academicYear: enrollments.academicYear, status: enrollments.status,
      studentName: sql`${students.firstName} || ' ' || ${students.lastName}`,
      className: classes.name,
    }).from(enrollments)
      .leftJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(eq(enrollments.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'studentName', label: 'Student' }, { key: 'className', label: 'Class' },
      { key: 'academicYear', label: 'Academic Year' }, { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(allEnrollments, columns), 'enrollments.csv');
  }

  let query = db.select({
    id: enrollments.id,
    studentId: enrollments.studentId,
    classId: enrollments.classId,
    academicYear: enrollments.academicYear,
    term: enrollments.term,
    status: enrollments.status,
    notes: enrollments.notes,
    createdAt: enrollments.createdAt,
    updatedAt: enrollments.updatedAt,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    studentIdentifier: students.studentId,
    className: classes.name,
  }).from(enrollments)
    .leftJoin(students, eq(enrollments.studentId, students.id))
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .where(eq(enrollments.schoolId, schoolId));

  if (status) {
    query = db.select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      classId: enrollments.classId,
      academicYear: enrollments.academicYear,
      term: enrollments.term,
      status: enrollments.status,
      notes: enrollments.notes,
      createdAt: enrollments.createdAt,
      updatedAt: enrollments.updatedAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
      className: classes.name,
    }).from(enrollments)
      .leftJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .where(and(eq(enrollments.schoolId, schoolId), eq(enrollments.status, status as any)));
  }

  const records = query.orderBy(desc(enrollments.createdAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.studentId || !data.academicYear) {
    return new Response(JSON.stringify({ error: 'studentId and academicYear are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(enrollments).values({
    schoolId,
    studentId: data.studentId,
    classId: data.classId || null,
    academicYear: data.academicYear,
    term: data.term || null,
    status: data.status || 'submitted',
    notes: data.notes || null,
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
  const existing = db.select().from(enrollments).where(and(eq(enrollments.id, data.id), eq(enrollments.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Enrollment not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(enrollments).set({ ...updateData, updatedAt: new Date() }).where(eq(enrollments.id, id)).run();
  const updated = db.select().from(enrollments).where(eq(enrollments.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(enrollments).where(and(eq(enrollments.id, id), eq(enrollments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
