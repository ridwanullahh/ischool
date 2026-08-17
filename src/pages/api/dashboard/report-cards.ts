import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { reportCards, exams, examResults, students, schoolMembers } from '../../../lib/db/schema.js';
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
  const denied = guardPermission(user, 'exams.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();

  const studentId = url.searchParams.get('studentId');
  if (studentId) {
    const cards = db.select().from(reportCards)
      .where(and(eq(reportCards.schoolId, schoolId), eq(reportCards.studentId, parseInt(studentId)))).all();
    return new Response(JSON.stringify(cards), { headers: { 'Content-Type': 'application/json' } });
  }
  const cards = db.select().from(reportCards).where(eq(reportCards.schoolId, schoolId)).all();
  return new Response(JSON.stringify(cards), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (data.action === 'generate') {
    if (!data.studentId || !data.academicYear || !data.term) {
      return new Response(JSON.stringify({ error: 'studentId, academicYear, term required' }), { status: 400 });
    }
    const db = getDb();

    // Gather all exam results for this student
    const studentExams = db.select({
      examId: examResults.examId, marksObtained: examResults.marksObtained, grade: examResults.grade,
      remark: examResults.remark, status: examResults.status, totalMarks: exams.totalMarks,
      subject: exams.subject, title: exams.title, academicYear: exams.academicYear, term: exams.term,
    }).from(examResults)
      .leftJoin(exams, eq(examResults.examId, exams.id))
      .where(and(eq(examResults.schoolId, schoolId), eq(examResults.studentId, data.studentId))).all();

    const results = studentExams.filter(e => e.status === 'present').map(e => ({
      subject: e.subject, title: e.title,
      marksObtained: e.marksObtained, totalMarks: e.totalMarks,
      grade: e.grade, remark: e.remark,
    }));

    const totalMarks = results.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
    const maxTotal = results.reduce((sum, r) => sum + (r.totalMarks || 100), 0);
    const percentage = maxTotal > 0 ? Math.round((totalMarks / maxTotal) * 100) : null;

    // Class rank calculation (across all students with same exams)
    let classRank: number | null = null;
    if (percentage !== null) {
      // Get all students' total marks for the same exams
      const allStudentsTotals = new Map<number, number>();
      const allResults = db.select().from(examResults)
        .where(and(eq(examResults.schoolId, schoolId), eq(examResults.status, 'present'))).all();
      const examIds = new Set(studentExams.map(e => e.examId));
      for (const r of allResults) {
        if (examIds.has(r.examId)) {
          allStudentsTotals.set(r.studentId, (allStudentsTotals.get(r.studentId) || 0) + (r.marksObtained || 0));
        }
      }
      const sorted = Array.from(allStudentsTotals.entries()).sort((a, b) => b[1] - a[1]);
      classRank = sorted.findIndex(([sid]) => sid === data.studentId) + 1;
      if (classRank === 0) classRank = null;
    }

    const result = db.insert(reportCards).values({
      schoolId,
      studentId: data.studentId,
      academicYear: data.academicYear,
      term: data.term,
      results: results as any,
      classTeacherComment: data.classTeacherComment || null,
      principalRemark: data.principalRemark || null,
      totalMarks,
      percentage,
      classRank,
      promotionStatus: data.promotionStatus || 'pending',
      generatedAt: new Date(),
      createdAt: new Date(),
    }).returning().get();

    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(reportCards).set({
    classTeacherComment: data.classTeacherComment,
    principalRemark: data.principalRemark,
    promotionStatus: data.promotionStatus,
    updatedAt: new Date(),
  }).where(and(eq(reportCards.id, data.id), eq(reportCards.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'exams.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(reportCards).where(and(eq(reportCards.id, id), eq(reportCards.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
