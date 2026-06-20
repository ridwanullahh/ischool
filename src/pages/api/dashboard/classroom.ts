import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { lessonPlans, behaviorLogs, courses, students, schoolMembers, users } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
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
  const type = url.searchParams.get('type') || 'lesson_plans';
  const studentId = url.searchParams.get('studentId');
  const action = url.searchParams.get('action');

  if (action === 'export') {
    if (type === 'behavior_logs') {
      const allLogs = db.select({ type: behaviorLogs.type, category: behaviorLogs.category, description: behaviorLogs.description, points: behaviorLogs.points, date: behaviorLogs.date })
        .from(behaviorLogs).where(eq(behaviorLogs.schoolId, schoolId)).all();
      const columns: CsvColumn[] = [
        { key: 'type', label: 'Type' }, { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' }, { key: 'points', label: 'Points' }, { key: 'date', label: 'Date' },
      ];
      return csvResponse(toCsv(allLogs, columns), 'behavior-logs.csv');
    }
    const allPlans = db.select({ title: lessonPlans.title, subject: lessonPlans.subject, topic: lessonPlans.topic, status: lessonPlans.status, date: lessonPlans.date })
      .from(lessonPlans).where(eq(lessonPlans.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'subject', label: 'Subject' },
      { key: 'topic', label: 'Topic' }, { key: 'status', label: 'Status' }, { key: 'date', label: 'Date' },
    ];
    return csvResponse(toCsv(allPlans, columns), 'lesson-plans.csv');
  }

  if (type === 'behavior_logs') {
    let query = db.select({
      id: behaviorLogs.id,
      studentId: behaviorLogs.studentId,
      type: behaviorLogs.type,
      category: behaviorLogs.category,
      description: behaviorLogs.description,
      points: behaviorLogs.points,
      recordedBy: behaviorLogs.recordedBy,
      createdAt: behaviorLogs.createdAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
    }).from(behaviorLogs)
      .leftJoin(students, eq(behaviorLogs.studentId, students.id))
      .where(eq(behaviorLogs.schoolId, schoolId));

    if (studentId) {
      query = db.select({
        id: behaviorLogs.id,
        studentId: behaviorLogs.studentId,
        type: behaviorLogs.type,
        category: behaviorLogs.category,
        description: behaviorLogs.description,
        points: behaviorLogs.points,
        recordedBy: behaviorLogs.recordedBy,
        createdAt: behaviorLogs.createdAt,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        studentIdentifier: students.studentId,
      }).from(behaviorLogs)
        .leftJoin(students, eq(behaviorLogs.studentId, students.id))
        .where(and(eq(behaviorLogs.schoolId, schoolId), eq(behaviorLogs.studentId, parseInt(studentId))));
    }

    const records = query.orderBy(desc(behaviorLogs.createdAt)).all();
    return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
  }

  const allPlans = db.select({
    id: lessonPlans.id,
    teacherId: lessonPlans.teacherId,
    courseId: lessonPlans.courseId,
    title: lessonPlans.title,
    week: lessonPlans.week,
    objectives: lessonPlans.objectives,
    materials: lessonPlans.materials,
    activities: lessonPlans.activities,
    assessment: lessonPlans.assessment,
    status: lessonPlans.status,
    createdAt: lessonPlans.createdAt,
    updatedAt: lessonPlans.updatedAt,
    courseTitle: courses.title,
    teacherName: users.name,
  }).from(lessonPlans)
    .leftJoin(courses, eq(lessonPlans.courseId, courses.id))
    .leftJoin(users, eq(lessonPlans.teacherId, users.id))
    .where(eq(lessonPlans.schoolId, schoolId))
    .orderBy(desc(lessonPlans.createdAt))
    .all();

  return new Response(JSON.stringify(allPlans), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const type = data.type || 'lesson_plan';
  const db = getDb();

  if (type === 'behavior_log') {
    if (!data.studentId || !data.behaviorType) {
      return new Response(JSON.stringify({ error: 'studentId and behaviorType are required' }), { status: 400 });
    }
    const result = db.insert(behaviorLogs).values({
      schoolId,
      studentId: data.studentId,
      type: data.behaviorType,
      category: data.category || null,
      description: data.description || null,
      points: data.points || 0,
      recordedBy: user.id,
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 });
  const result = db.insert(lessonPlans).values({
    schoolId,
    teacherId: user.id,
    courseId: data.courseId || null,
    title: data.title,
    week: data.week || null,
    objectives: data.objectives || null,
    materials: data.materials || null,
    activities: data.activities || null,
    assessment: data.assessment || null,
    status: data.status || 'draft',
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
  const tableType = data.tableType || 'lesson_plan';

  if (tableType === 'behavior_log') {
    const existing = db.select().from(behaviorLogs).where(and(eq(behaviorLogs.id, data.id), eq(behaviorLogs.schoolId, schoolId))).get();
    if (!existing) return new Response(JSON.stringify({ error: 'Behavior log not found' }), { status: 404 });
    const { id, tableType: _, schoolId: __, ...updateData } = data;
    db.update(behaviorLogs).set({ ...updateData, updatedAt: new Date() }).where(eq(behaviorLogs.id, id)).run();
    const updated = db.select().from(behaviorLogs).where(eq(behaviorLogs.id, id)).get();
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  const existing = db.select().from(lessonPlans).where(and(eq(lessonPlans.id, data.id), eq(lessonPlans.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Lesson plan not found' }), { status: 404 });
  const { id, tableType: _, schoolId: __, ...updateData } = data;
  db.update(lessonPlans).set({ ...updateData, updatedAt: new Date() }).where(eq(lessonPlans.id, id)).run();
  const updated = db.select().from(lessonPlans).where(eq(lessonPlans.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id, tableType } = await request.json();
  const db = getDb();

  if (tableType === 'behavior_log') {
    db.delete(behaviorLogs).where(and(eq(behaviorLogs.id, id), eq(behaviorLogs.schoolId, schoolId))).run();
  } else {
    db.delete(lessonPlans).where(and(eq(lessonPlans.id, id), eq(lessonPlans.schoolId, schoolId))).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
