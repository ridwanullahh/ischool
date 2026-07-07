import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { grades, students, courses, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { notifyGradePosted } from '../../../lib/notifications.js';

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
  const courseId = url.searchParams.get('courseId');
  const term = url.searchParams.get('term');

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const rows = db.select({
      studentName: students.firstName,
      studentLastName: students.lastName,
      courseTitle: courses.title,
      term: grades.term,
      academicYear: grades.academicYear,
      category: grades.category,
      score: grades.score,
      maxScore: grades.maxScore,
      grade: grades.grade,
      comment: grades.comment,
    }).from(grades)
      .leftJoin(students, eq(grades.studentId, students.id))
      .leftJoin(courses, eq(grades.courseId, courses.id))
      .where(eq(grades.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'studentName', label: 'First Name' },
      { key: 'studentLastName', label: 'Last Name' },
      { key: 'courseTitle', label: 'Course' },
      { key: 'term', label: 'Term' },
      { key: 'academicYear', label: 'Academic Year' },
      { key: 'category', label: 'Category' },
      { key: 'score', label: 'Score' },
      { key: 'maxScore', label: 'Max Score' },
      { key: 'grade', label: 'Grade' },
      { key: 'comment', label: 'Comment' },
    ];
    return csvResponse(toCsv(rows, columns), 'grades.csv');
  }

  let baseQuery = db.select({
    id: grades.id,
    studentId: grades.studentId,
    courseId: grades.courseId,
    term: grades.term,
    academicYear: grades.academicYear,
    category: grades.category,
    score: grades.score,
    maxScore: grades.maxScore,
    grade: grades.grade,
    comment: grades.comment,
    createdAt: grades.createdAt,
    updatedAt: grades.updatedAt,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    studentIdentifier: students.studentId,
    courseTitle: courses.title,
  }).from(grades)
    .leftJoin(students, eq(grades.studentId, students.id))
    .leftJoin(courses, eq(grades.courseId, courses.id))
    .where(eq(grades.schoolId, schoolId));

  if (studentId) {
    baseQuery = db.select({
      id: grades.id,
      studentId: grades.studentId,
      courseId: grades.courseId,
      term: grades.term,
      academicYear: grades.academicYear,
      category: grades.category,
      score: grades.score,
      maxScore: grades.maxScore,
      grade: grades.grade,
      comment: grades.comment,
      createdAt: grades.createdAt,
      updatedAt: grades.updatedAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
      courseTitle: courses.title,
    }).from(grades)
      .leftJoin(students, eq(grades.studentId, students.id))
      .leftJoin(courses, eq(grades.courseId, courses.id))
      .where(and(eq(grades.schoolId, schoolId), eq(grades.studentId, parseInt(studentId))));
  }

  if (courseId) {
    baseQuery = db.select({
      id: grades.id,
      studentId: grades.studentId,
      courseId: grades.courseId,
      term: grades.term,
      academicYear: grades.academicYear,
      category: grades.category,
      score: grades.score,
      maxScore: grades.maxScore,
      grade: grades.grade,
      comment: grades.comment,
      createdAt: grades.createdAt,
      updatedAt: grades.updatedAt,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      studentIdentifier: students.studentId,
      courseTitle: courses.title,
    }).from(grades)
      .leftJoin(students, eq(grades.studentId, students.id))
      .leftJoin(courses, eq(grades.courseId, courses.id))
      .where(and(eq(grades.schoolId, schoolId), eq(grades.courseId, parseInt(courseId))));
  }

  const records = baseQuery.orderBy(desc(grades.createdAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.studentId) return new Response(JSON.stringify({ error: 'studentId is required' }), { status: 400 });

  const db = getDb();
  const result = db.insert(grades).values({
    schoolId,
    studentId: data.studentId,
    courseId: data.courseId || null,
    term: data.term || null,
    academicYear: data.academicYear || null,
    category: data.category || null,
    score: data.score || null,
    maxScore: data.maxScore || null,
    grade: data.grade || null,
    comment: data.comment || null,
  }).returning().get();

  if (result) {
    const student = db.select().from(students).where(eq(students.id, data.studentId)).get();
    const course = data.courseId ? db.select().from(courses).where(eq(courses.id, data.courseId)).get() : null;
    if (student) {
      notifyGradePosted(schoolId, `${student.firstName} ${student.lastName}`, course?.title || 'General', data.grade || data.score || 'N/A').catch(() => {});
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
  const existing = db.select().from(grades).where(and(eq(grades.id, data.id), eq(grades.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Grade not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(grades).set({ ...updateData, updatedAt: new Date() }).where(eq(grades.id, id)).run();
  const updated = db.select().from(grades).where(eq(grades.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(grades).where(and(eq(grades.id, id), eq(grades.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
