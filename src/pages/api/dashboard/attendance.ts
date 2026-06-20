import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { attendance, students, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { notifyAttendanceAlert } from '../../../lib/notifications.js';

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
  const action = url.searchParams.get('action');

  if (action === 'export') {
    const records = db.select({
      studentId: attendance.studentId,
      date: attendance.date,
      status: attendance.status,
      firstName: students.firstName,
      lastName: students.lastName,
    }).from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(eq(students.schoolId, schoolId))
      .orderBy(desc(attendance.date)).all();
    const columns: CsvColumn[] = [
      { key: 'studentId', label: 'Student ID' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(records, columns), 'attendance.csv');
  }

  const date = url.searchParams.get('date');
  const studentId = url.searchParams.get('studentId');

  let query = db.select({
    id: attendance.id,
    studentId: attendance.studentId,
    date: attendance.date,
    period: attendance.period,
    status: attendance.status,
    notes: attendance.notes,
    markedBy: attendance.markedBy,
    createdAt: attendance.createdAt,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    studentIdentifier: students.studentId,
  }).from(attendance)
    .leftJoin(students, eq(attendance.studentId, students.id))
    .where(eq(attendance.schoolId, schoolId));

  if (date) {
    query = db.select({
      id: attendance.id,
      studentId: attendance.studentId,
      date: attendance.date,
      period: attendance.period,
      status: attendance.status,
      notes: attendance.notes,
      markedBy: attendance.markedBy,
      createdAt: attendance.createdAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
    }).from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .where(and(eq(attendance.schoolId, schoolId), eq(attendance.date, date)));
  }

  if (studentId) {
    query = db.select({
      id: attendance.id,
      studentId: attendance.studentId,
      date: attendance.date,
      period: attendance.period,
      status: attendance.status,
      notes: attendance.notes,
      markedBy: attendance.markedBy,
      createdAt: attendance.createdAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
    }).from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .where(and(eq(attendance.schoolId, schoolId), eq(attendance.studentId, parseInt(studentId))));
  }

  const records = query.orderBy(desc(attendance.date)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.studentId || !data.date || !data.status) {
    return new Response(JSON.stringify({ error: 'studentId, date, and status are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(attendance).values({
    schoolId,
    studentId: data.studentId,
    date: data.date,
    period: data.period || null,
    status: data.status,
    markedBy: user.id,
    notes: data.notes || null,
  }).returning().get();

  if (data.status === 'absent' && result) {
    const student = db.select().from(students).where(eq(students.id, data.studentId)).get();
    if (student) {
      notifyAttendanceAlert(schoolId, `${student.firstName} ${student.lastName}`, data.date).catch(() => {});
    }
  }

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
  const existing = db.select().from(attendance).where(and(eq(attendance.id, data.id), eq(attendance.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(attendance).set(updateData).where(eq(attendance.id, id)).run();
  const updated = db.select().from(attendance).where(eq(attendance.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(attendance).where(and(eq(attendance.id, id), eq(attendance.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
