import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { cbtExams, cbtCandidates, cbtAttempts, cbtProctoringLogs, students, users, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


// === CANDIDATES API ===
export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'cbt.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const action = url.searchParams.get('action');

  if (action === 'attempts') {
    // All attempts across all exams in this school
    const schoolExams = db.select({ id: cbtExams.id }).from(cbtExams).where(eq(cbtExams.schoolId, schoolId)).all();
    const examIds = schoolExams.map(e => e.id);
    if (examIds.length === 0) return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });

    const attempts = db.select({
      id: cbtAttempts.id, examId: cbtAttempts.examId, candidateId: cbtAttempts.candidateId,
      score: cbtAttempts.score, totalMarks: cbtAttempts.totalMarks, timeTaken: cbtAttempts.timeTaken,
      ipAddress: cbtAttempts.ipAddress, deviceFingerprint: cbtAttempts.deviceFingerprint,
      startedAt: cbtAttempts.startedAt, submittedAt: cbtAttempts.submittedAt, status: cbtAttempts.status,
      flags: cbtAttempts.flags, proctorNotes: cbtAttempts.proctorNotes,
      candidateName: cbtCandidates.name, candidateEmail: cbtCandidates.email,
      examTitle: cbtExams.title,
    }).from(cbtAttempts)
      .leftJoin(cbtCandidates, eq(cbtAttempts.candidateId, cbtCandidates.id))
      .leftJoin(cbtExams, eq(cbtAttempts.examId, cbtExams.id))
      .orderBy(desc(cbtAttempts.startedAt)).all();
    return new Response(JSON.stringify(attempts), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'proctoring_logs') {
    const attemptId = url.searchParams.get('attemptId');
    if (!attemptId) return new Response(JSON.stringify({ error: 'attemptId required' }), { status: 400 });
    const logs = db.select().from(cbtProctoringLogs).where(eq(cbtProctoringLogs.attemptId, parseInt(attemptId))).orderBy(desc(cbtProctoringLogs.timestamp)).all();
    return new Response(JSON.stringify(logs), { headers: { 'Content-Type': 'application/json' } });
  }

  // Default: list candidates for this school's exams
  const examId = url.searchParams.get('examId');
  if (examId) {
    const candidates = db.select().from(cbtCandidates).where(eq(cbtCandidates.examId, parseInt(examId))).orderBy(desc(cbtCandidates.createdAt)).all();
    return new Response(JSON.stringify(candidates), { headers: { 'Content-Type': 'application/json' } });
  }
  // All candidates across school exams
  const schoolExams = db.select({ id: cbtExams.id }).from(cbtExams).where(eq(cbtExams.schoolId, schoolId)).all();
  const examIds = schoolExams.map(e => e.id);
  const allCandidates = examIds.length > 0
    ? db.select({
        id: cbtCandidates.id, examId: cbtCandidates.examId, userId: cbtCandidates.userId,
        name: cbtCandidates.name, email: cbtCandidates.email, accessPin: cbtCandidates.accessPin,
        status: cbtCandidates.status, createdAt: cbtCandidates.createdAt,
        examTitle: cbtExams.title,
      }).from(cbtCandidates)
        .leftJoin(cbtExams, eq(cbtCandidates.examId, cbtExams.id))
        .orderBy(desc(cbtCandidates.createdAt)).all()
    : [];
  return new Response(JSON.stringify(allCandidates), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'cbt.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  // Bulk register candidates from class students
  if (data.action === 'bulk_register_class') {
    if (!data.examId || !data.studentIds) return new Response(JSON.stringify({ error: 'examId and studentIds required' }), { status: 400 });
    const exam = db.select().from(cbtExams).where(and(eq(cbtExams.id, data.examId), eq(cbtExams.schoolId, schoolId))).get();
    if (!exam) return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404 });
    let created = 0;
    for (const sid of data.studentIds) {
      const student = db.select().from(students).where(eq(students.id, sid)).get();
      if (!student) continue;
      // Generate access PIN
      const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
      db.insert(cbtCandidates).values({
        examId: data.examId, userId: student.userId || null,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email || null, accessPin: pin,
        status: 'registered', createdAt: new Date(),
      }).run();
      created++;
    }
    return new Response(JSON.stringify({ success: true, created }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  // Add proctor note to attempt
  if (data.action === 'add_proctor_note') {
    if (!data.attemptId) return new Response(JSON.stringify({ error: 'attemptId required' }), { status: 400 });
    db.update(cbtAttempts).set({
      proctorNotes: data.notes, updatedAt: new Date(),
    }).where(eq(cbtAttempts.id, data.attemptId)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Disqualify attempt
  if (data.action === 'disqualify') {
    if (!data.attemptId) return new Response(JSON.stringify({ error: 'attemptId required' }), { status: 400 });
    db.update(cbtAttempts).set({
      status: 'disqualified', updatedAt: new Date(),
    }).where(eq(cbtAttempts.id, data.attemptId)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Update candidate status
  if (data.action === 'update_status') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.update(cbtCandidates).set({
      status: data.status, updatedAt: new Date(),
    }).where(eq(cbtCandidates.id, data.id)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  // Create single candidate
  if (!data.examId || !data.name) return new Response(JSON.stringify({ error: 'examId and name required' }), { status: 400 });
  const pin = data.accessPin || Math.random().toString(36).substring(2, 8).toUpperCase();
  const result = db.insert(cbtCandidates).values({
    examId: data.examId, userId: data.userId || null,
    name: data.name, email: data.email || null,
    accessPin: pin, status: 'registered', createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id, accessPin: pin }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'cbt.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id, type } = await request.json();
  const db = getDb();
  if (type === 'attempt') {
    db.delete(cbtAttempts).where(eq(cbtAttempts.id, id)).run();
  } else {
    db.delete(cbtCandidates).where(eq(cbtCandidates.id, id)).run();
  }
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
