import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { timetableEntries, classes, courses, users, schoolMembers, academicPeriods, prayerSchedules } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'timetable.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const classId = url.searchParams.get('classId');
  const action = url.searchParams.get('action');

  // Prayer schedule endpoints
  if (action === 'prayer_schedules') {
    const schedules = db.select().from(prayerSchedules).where(eq(prayerSchedules.schoolId, schoolId)).all();
    return new Response(JSON.stringify(schedules), { headers: { 'Content-Type': 'application/json' } });
  }

  // Academic periods endpoint
  if (action === 'academic_periods') {
    const periods = db.select().from(academicPeriods).where(eq(academicPeriods.schoolId, schoolId)).all();
    return new Response(JSON.stringify(periods), { headers: { 'Content-Type': 'application/json' } });
  }

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
  const denied = guardPermission(user, 'timetable.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const action = data.action;
  const db = getDb();

  // ─── Academic Periods ──────────────────────────────────
  if (action === 'create_period') {
    const result = db.insert(academicPeriods).values({
      schoolId, name: data.name, type: data.type || 'term',
      startDate: data.startDate, endDate: data.endDate,
      status: data.status || 'draft', parentPeriodId: data.parentPeriodId || null,
    } as any).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'update_period') {
    db.update(academicPeriods).set({
      name: data.name, type: data.type, startDate: data.startDate, endDate: data.endDate,
      status: data.status, updatedAt: new Date(),
    }).where(and(eq(academicPeriods.id, data.id), eq(academicPeriods.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'delete_period') {
    db.delete(academicPeriods).where(and(eq(academicPeriods.id, data.id), eq(academicPeriods.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ─── Islamic Prayer Schedules (Adhan-aware) ────────────
  if (action === 'create_prayer_schedule') {
    const result = db.insert(prayerSchedules).values({
      schoolId, name: data.name, appliesTo: data.appliesTo || 'weekday',
      periods: data.periods || [],
      fajrTime: data.fajrTime || null, dhuhrTime: data.dhuhrTime || null,
      asrTime: data.asrTime || null, maghribTime: data.maghribTime || null,
      ishaTime: data.ishaTime || null, jumuahTime: data.jumuahTime || null,
      playAdhan: data.playAdhan ?? false, adhanAudioUrl: data.adhanAudioUrl || null,
      notes: data.notes || null,
    } as any).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'update_prayer_schedule') {
    db.update(prayerSchedules).set({
      name: data.name, appliesTo: data.appliesTo, periods: data.periods,
      fajrTime: data.fajrTime, dhuhrTime: data.dhuhrTime, asrTime: data.asrTime,
      maghribTime: data.maghribTime, ishaTime: data.ishaTime, jumuahTime: data.jumuahTime,
      playAdhan: data.playAdhan, adhanAudioUrl: data.adhanAudioUrl, notes: data.notes,
      updatedAt: new Date(),
    }).where(and(eq(prayerSchedules.id, data.id), eq(prayerSchedules.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (action === 'delete_prayer_schedule') {
    db.delete(prayerSchedules).where(and(eq(prayerSchedules.id, data.id), eq(prayerSchedules.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ─── Timetable Entry CRUD ──────────────────────────────
  if (action === 'create_entry' || !action) {
    if (data.dayOfWeek === undefined || data.periodNumber === undefined || !data.startTime || !data.endTime) {
      return new Response(JSON.stringify({ error: 'dayOfWeek, periodNumber, startTime, and endTime are required' }), { status: 400 });
    }
    // Conflict detection
    const conflicts = db.select().from(timetableEntries).where(and(
      eq(timetableEntries.schoolId, schoolId),
      eq(timetableEntries.dayOfWeek, data.dayOfWeek),
      eq(timetableEntries.periodNumber, data.periodNumber),
      data.classId ? eq(timetableEntries.classId, data.classId) : eq(timetableEntries.id, 0),
    )).all();
    if (conflicts.length > 0) {
      return new Response(JSON.stringify({ error: 'Conflict: this class already has an entry for the same day and period.', conflict: conflicts[0] }), { status: 409 });
    }
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
  }

  if (action === 'delete_entry') {
    db.delete(timetableEntries).where(and(eq(timetableEntries.id, data.id), eq(timetableEntries.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'timetable.edit');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
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
  const denied = guardPermission(user, 'timetable.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(timetableEntries).where(and(eq(timetableEntries.id, id), eq(timetableEntries.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
