import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { substituteTeachers, timetableEntries, classes, courses, users, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const subs = db.select({
    id: substituteTeachers.id,
    timetableEntryId: substituteTeachers.timetableEntryId,
    originalTeacherId: substituteTeachers.originalTeacherId,
    substituteTeacherId: substituteTeachers.substituteTeacherId,
    date: substituteTeachers.date,
    reason: substituteTeachers.reason,
    notes: substituteTeachers.notes,
    status: substituteTeachers.status,
    createdAt: substituteTeachers.createdAt,
    originalTeacherName: users.name,
    dayOfWeek: timetableEntries.dayOfWeek,
    periodNumber: timetableEntries.periodNumber,
    startTime: timetableEntries.startTime,
    endTime: timetableEntries.endTime,
    room: timetableEntries.room,
    className: classes.name,
    courseTitle: courses.title,
  }).from(substituteTeachers)
    .leftJoin(timetableEntries, eq(substituteTeachers.timetableEntryId, timetableEntries.id))
    .leftJoin(classes, eq(timetableEntries.classId, classes.id))
    .leftJoin(courses, eq(timetableEntries.courseId, courses.id))
    .leftJoin(users, eq(substituteTeachers.originalTeacherId, users.id))
    .where(eq(substituteTeachers.schoolId, schoolId))
    .orderBy(desc(substituteTeachers.date)).all();

  // Look up substitute teacher name separately (since join name conflict)
  const subTeacherIds = [...new Set(subs.map(s => s.substituteTeacherId).filter(Boolean))] as number[];
  const subTeacherMap = new Map<number, string>();
  for (const tid of subTeacherIds) {
    const u = db.select().from(users).where(eq(users.id, tid)).get();
    if (u) subTeacherMap.set(tid, u.name);
  }
  const enriched = subs.map(s => ({ ...s, substituteTeacherName: s.substituteTeacherId ? subTeacherMap.get(s.substituteTeacherId) || '—' : '—' }));

  return new Response(JSON.stringify(enriched), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'approve') {
    db.update(substituteTeachers).set({
      status: 'approved', approvedBy: user.id, updatedAt: new Date(),
    }).where(and(eq(substituteTeachers.id, data.id), eq(substituteTeachers.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (data.action === 'decline') {
    db.update(substituteTeachers).set({
      status: 'declined', approvedBy: user.id, updatedAt: new Date(),
    }).where(and(eq(substituteTeachers.id, data.id), eq(substituteTeachers.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.timetableEntryId || !data.substituteTeacherId || !data.date) {
    return new Response(JSON.stringify({ error: 'timetableEntryId, substituteTeacherId, and date are required' }), { status: 400 });
  }

  // Get the original teacher from the timetable entry
  const entry = db.select().from(timetableEntries).where(eq(timetableEntries.id, data.timetableEntryId)).get();
  if (!entry) return new Response(JSON.stringify({ error: 'Timetable entry not found' }), { status: 404 });

  const result = db.insert(substituteTeachers).values({
    schoolId,
    timetableEntryId: data.timetableEntryId,
    originalTeacherId: entry.teacherId || null,
    substituteTeacherId: data.substituteTeacherId,
    date: data.date,
    reason: data.reason || null,
    notes: data.notes || null,
    status: data.status || 'pending',
    createdAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.update(substituteTeachers).set({
    substituteTeacherId: data.substituteTeacherId,
    date: data.date, reason: data.reason, notes: data.notes,
    status: data.status, updatedAt: new Date(),
  }).where(and(eq(substituteTeachers.id, data.id), eq(substituteTeachers.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  db.delete(substituteTeachers).where(and(eq(substituteTeachers.id, id), eq(substituteTeachers.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
