import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { lessons, courseUnits, courses, schoolMembers } from '../../../lib/db/schema.js';
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
  const courseId = url.searchParams.get('courseId');
  const unitId = url.searchParams.get('unitId');

  // Return lessons joined with units and course for school
  if (courseId) {
    const units = db.select().from(courseUnits).where(eq(courseUnits.courseId, parseInt(courseId))).all();
    const unitIds = units.map(u => u.id);
    const allLessons = unitIds.length > 0
      ? db.select({
          id: lessons.id, title: lessons.title, content: lessons.content, type: lessons.type,
          fileUrl: lessons.fileUrl, externalUrl: lessons.externalUrl, duration: lessons.duration,
          sortOrder: lessons.sortOrder, unitId: lessons.unitId, createdAt: lessons.createdAt,
          unitTitle: courseUnits.title,
        }).from(lessons)
          .leftJoin(courseUnits, eq(lessons.unitId, courseUnits.id))
          .where(unitIds.length === 1 ? eq(lessons.unitId, unitIds[0]) : eq(lessons.id, 0))
          .all()
        // Fallback: query each unit's lessons
        : [];
    if (unitIds.length > 1) {
      // Use simpler approach: filter in JS
      const allForCourse: any[] = [];
      for (const uid of unitIds) {
        const ls = db.select({
          id: lessons.id, title: lessons.title, content: lessons.content, type: lessons.type,
          fileUrl: lessons.fileUrl, externalUrl: lessons.externalUrl, duration: lessons.duration,
          sortOrder: lessons.sortOrder, unitId: lessons.unitId, createdAt: lessons.createdAt,
          unitTitle: courseUnits.title,
        }).from(lessons)
          .leftJoin(courseUnits, eq(lessons.unitId, courseUnits.id))
          .where(eq(lessons.unitId, uid)).all();
        allForCourse.push(...ls);
      }
      return new Response(JSON.stringify({ units, lessons: allForCourse }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ units, lessons: allLessons }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (unitId) {
    const ls = db.select().from(lessons).where(eq(lessons.unitId, parseInt(unitId))).all();
    return new Response(JSON.stringify(ls), { headers: { 'Content-Type': 'application/json' } });
  }

  // Return all courses with their units for the school
  const allCourses = db.select().from(courses).where(eq(courses.schoolId, schoolId)).all();
  const allUnits = db.select({
    id: courseUnits.id, title: courseUnits.title, description: courseUnits.description,
    sortOrder: courseUnits.sortOrder, courseId: courseUnits.courseId,
  }).from(courseUnits).all();
  const unitsByCourse = allUnits.reduce((acc, u) => {
    if (!acc[u.courseId]) acc[u.courseId] = [];
    acc[u.courseId].push(u);
    return acc;
  }, {} as Record<number, typeof allUnits>);

  return new Response(JSON.stringify({ courses: allCourses.map(c => ({ ...c, units: unitsByCourse[c.id] || [] })) }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  // Create unit
  if (data.action === 'create_unit') {
    if (!data.courseId || !data.title) return new Response(JSON.stringify({ error: 'courseId and title required' }), { status: 400 });
    const result = db.insert(courseUnits).values({
      courseId: parseInt(data.courseId),
      title: data.title,
      description: data.description || null,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  // Update unit
  if (data.action === 'update_unit') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.update(courseUnits).set({
      title: data.title, description: data.description, sortOrder: data.sortOrder, updatedAt: new Date(),
    }).where(eq(courseUnits.id, data.id)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }
  // Delete unit
  if (data.action === 'delete_unit') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.delete(courseUnits).where(eq(courseUnits.id, data.id)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Create lesson
  if (!data.unitId || !data.title) {
    return new Response(JSON.stringify({ error: 'unitId and title are required' }), { status: 400 });
  }
  const result = db.insert(lessons).values({
    unitId: parseInt(data.unitId),
    title: data.title,
    content: data.content || null,
    type: data.type || 'text',
    fileUrl: data.fileUrl || null,
    externalUrl: data.externalUrl || null,
    duration: data.duration || null,
    sortOrder: data.sortOrder || 0,
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
  db.update(lessons).set({
    title: data.title, content: data.content, type: data.type,
    fileUrl: data.fileUrl, externalUrl: data.externalUrl,
    duration: data.duration, sortOrder: data.sortOrder, updatedAt: new Date(),
  }).where(eq(lessons.id, data.id)).run();
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
  db.delete(lessons).where(eq(lessons.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
