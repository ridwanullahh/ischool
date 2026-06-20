import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { timetableEntries, classes, courses, users, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
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
  const classId = url.searchParams.get('classId');
  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allEntries = db.select({
      day: timetableEntries.dayOfWeek, period: timetableEntries.periodNumber,
      startTime: timetableEntries.startTime, endTime: timetableEntries.endTime,
      className: classes.name, courseTitle: courses.title, teacherName: users.name,
    }).from(timetableEntries)
      .leftJoin(classes, eq(timetableEntries.classId, classes.id))
      .leftJoin(courses, eq(timetableEntries.courseId, courses.id))
      .leftJoin(users, eq(timetableEntries.teacherId, users.id))
      .where(eq(timetableEntries.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'day', label: 'Day' }, { key: 'period', label: 'Period' },
      { key: 'startTime', label: 'Start' }, { key: 'endTime', label: 'End' },
      { key: 'className', label: 'Class' }, { key: 'courseTitle', label: 'Course' },
      { key: 'teacherName', label: 'Teacher' },
    ];
    return csvResponse(toCsv(allEntries, columns), 'timetable.csv');
  }

  let query = db.select({
    id: timetableEntries.id,
    classId: timetableEntries.classId,
    courseId: timetableEntries.courseId,
    teacherId: timetableEntries.teacherId,
    dayOfWeek: timetableEntries.dayOfWeek,
    periodNumber: timetableEntries.periodNumber,
    startTime: timetableEntries.startTime,
    endTime: timetableEntries.endTime,
    room: timetableEntries.room,
    className: classes.name,
    courseTitle: courses.title,
    teacherName: users.name,
  }).from(timetableEntries)
    .leftJoin(classes, eq(timetableEntries.classId, classes.id))
    .leftJoin(courses, eq(timetableEntries.courseId, courses.id))
    .leftJoin(users, eq(timetableEntries.teacherId, users.id))
    .where(eq(timetableEntries.schoolId, schoolId));

  if (classId) {
    query = db.select({
      id: timetableEntries.id,
      classId: timetableEntries.classId,
      courseId: timetableEntries.courseId,
      teacherId: timetableEntries.teacherId,
      dayOfWeek: timetableEntries.dayOfWeek,
      periodNumber: timetableEntries.periodNumber,
      startTime: timetableEntries.startTime,
      endTime: timetableEntries.endTime,
      room: timetableEntries.room,
      className: classes.name,
      courseTitle: courses.title,
      teacherName: users.name,
    }).from(timetableEntries)
      .leftJoin(classes, eq(timetableEntries.classId, classes.id))
      .leftJoin(courses, eq(timetableEntries.courseId, courses.id))
      .leftJoin(users, eq(timetableEntries.teacherId, users.id))
      .where(and(eq(timetableEntries.schoolId, schoolId), eq(timetableEntries.classId, parseInt(classId))));
  }

  const records = query.all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (data.dayOfWeek === undefined || data.periodNumber === undefined || !data.startTime || !data.endTime) {
    return new Response(JSON.stringify({ error: 'dayOfWeek, periodNumber, startTime, and endTime are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(timetableEntries).values({
    schoolId,
    classId: data.classId || null,
    courseId: data.courseId || null,
    teacherId: data.teacherId || null,
    dayOfWeek: data.dayOfWeek,
    periodNumber: data.periodNumber,
    startTime: data.startTime,
    endTime: data.endTime,
    room: data.room || null,
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
  const existing = db.select().from(timetableEntries).where(and(eq(timetableEntries.id, data.id), eq(timetableEntries.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Entry not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(timetableEntries).set({ ...updateData, updatedAt: new Date() }).where(eq(timetableEntries.id, id)).run();
  const updated = db.select().from(timetableEntries).where(eq(timetableEntries.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(timetableEntries).where(and(eq(timetableEntries.id, id), eq(timetableEntries.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
