import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { exams, examSeries, examResults, schoolMembers, students, classes } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();

  const action = url.searchParams.get('action');
  // Get results for an exam
  if (action === 'results' && url.searchParams.get('examId')) {
    const examId = parseInt(url.searchParams.get('examId')!);
    const results = db.select({
      id: examResults.id, marksObtained: examResults.marksObtained, grade: examResults.grade,
      rank: examResults.rank, remark: examResults.remark, status: examResults.status,
      studentId: examResults.studentId,
      studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentId,
    }).from(examResults)
      .leftJoin(students, eq(examResults.studentId, students.id))
      .where(and(eq(examResults.schoolId, schoolId), eq(examResults.examId, examId))).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  const allSeries = db.select().from(examSeries).where(eq(examSeries.schoolId, schoolId)).all();
  const allExams = db.select({
    id: exams.id, seriesId: exams.seriesId, subject: exams.subject, title: exams.title,
    classId: exams.classId, totalMarks: exams.totalMarks, passingMarks: exams.passingMarks,
    duration: exams.duration, date: exams.date, venue: exams.venue, invigilator: exams.invigilator,
    instructions: exams.instructions, createdAt: exams.createdAt,
    seriesName: examSeries.name, seriesType: examSeries.type, academicYear: examSeries.academicYear, term: examSeries.term,
    className: classes.name,
  }).from(exams)
    .leftJoin(examSeries, eq(exams.seriesId, examSeries.id))
    .leftJoin(classes, eq(exams.classId, classes.id))
    .where(eq(examSeries.schoolId, schoolId)).all();
  return new Response(JSON.stringify({ exams: allExams, series: allSeries }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  const db = getDb();

  // Save mark entry (single)
  if (data.action === 'save_result') {
    if (!data.examId || !data.studentId) return new Response(JSON.stringify({ error: 'examId and studentId required' }), { status: 400 });
    const existing = db.select().from(examResults).where(and(
      eq(examResults.schoolId, schoolId),
      eq(examResults.examId, data.examId),
      eq(examResults.studentId, data.studentId),
    )).get();
    if (existing) {
      db.update(examResults).set({
        marksObtained: data.marksObtained ?? null,
        grade: data.grade || null, rank: data.rank || null,
        remark: data.remark || null, status: data.status || 'present',
        updatedAt: new Date(),
      }).where(eq(examResults.id, existing.id)).run();
      return new Response(JSON.stringify({ success: true, id: existing.id, updated: true }), { headers: { 'Content-Type': 'application/json' } });
    }
    const result = db.insert(examResults).values({
      schoolId, examId: data.examId, studentId: data.studentId,
      marksObtained: data.marksObtained ?? null,
      grade: data.grade || null, rank: data.rank || null,
      remark: data.remark || null, status: data.status || 'present',
      createdAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // Bulk mark entry
  if (data.action === 'bulk_results') {
    if (!data.examId || !Array.isArray(data.results)) {
      return new Response(JSON.stringify({ error: 'examId and results array required' }), { status: 400 });
    }
    let inserted = 0, updated = 0;
    for (const r of data.results) {
      if (!r.studentId) continue;
      const existing = db.select().from(examResults).where(and(
        eq(examResults.schoolId, schoolId),
        eq(examResults.examId, data.examId),
        eq(examResults.studentId, r.studentId),
      )).get();
      if (existing) {
        db.update(examResults).set({
          marksObtained: r.marksObtained ?? null,
          grade: r.grade || null, status: r.status || 'present',
          remark: r.remark || null, updatedAt: new Date(),
        }).where(eq(examResults.id, existing.id)).run();
        updated++;
      } else {
        db.insert(examResults).values({
          schoolId, examId: data.examId, studentId: r.studentId,
          marksObtained: r.marksObtained ?? null, grade: r.grade || null,
          status: r.status || 'present', remark: r.remark || null,
          createdAt: new Date(),
        }).run();
        inserted++;
      }
    }
    return new Response(JSON.stringify({ success: true, inserted, updated }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.subject || !data.seriesId || !data.totalMarks || !data.title) {
    return new Response(JSON.stringify({ error: 'title, subject, seriesId, and totalMarks are required' }), { status: 400 });
  }
  const result = db.insert(exams).values({
    schoolId,
    seriesId: data.seriesId,
    subject: data.subject,
    title: data.title,
    classId: data.classId || null,
    totalMarks: data.totalMarks,
    passingMarks: data.passingMarks || null,
    duration: data.duration || null,
    date: data.date || null,
    venue: data.venue || null,
    invigilator: data.invigilator || null,
    instructions: data.instructions || null,
  }).returning().get();
  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.edit');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  const db = getDb();
  const existingExam = db.select().from(exams).where(eq(exams.id, data.id)).get();
  if (!existingExam) return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404 });
  const s = db.select().from(examSeries).where(and(eq(examSeries.id, existingExam.seriesId), eq(examSeries.schoolId, schoolId))).get();
  if (!s) return new Response(JSON.stringify({ error: 'Exam not found in your school' }), { status: 404 });
  const { id, ...updateData } = data;
  db.update(exams).set({ ...updateData, updatedAt: new Date() }).where(eq(exams.id, id)).run();
  const updated = db.select().from(exams).where(eq(exams.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  const existingExam = db.select().from(exams).where(eq(exams.id, id)).get();
  if (!existingExam) return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404 });
  const s = db.select().from(examSeries).where(and(eq(examSeries.id, existingExam.seriesId), eq(examSeries.schoolId, schoolId))).get();
  if (!s) return new Response(JSON.stringify({ error: 'Exam not found in your school' }), { status: 404 });
  db.delete(exams).where(eq(exams.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
