import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { assignments, submissions, grades, schoolMembers, courses, students } from '../../../lib/db/schema.js';
import { eq, and, like, desc } from 'drizzle-orm';
import { notifyAssignmentCreated } from '../../../lib/notifications.js';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { guardPermission } from '../../../lib/rbac.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'assignments.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const courseId = url.searchParams.get('courseId');
  const search = url.searchParams.get('search');
  const action = url.searchParams.get('action');

  // Submissions for an assignment
  if (action === 'submissions' && url.searchParams.get('assignmentId')) {
    const subs = db.select({
      id: submissions.id, status: submissions.status, grade: submissions.grade, feedback: submissions.feedback,
      content: submissions.content, fileUrl: submissions.fileUrl, linkUrl: submissions.linkUrl,
      submittedAt: submissions.submittedAt, gradedAt: submissions.gradedAt,
      studentId: submissions.studentId,
      studentName: students.firstName,
      studentLastName: students.lastName,
      studentCode: students.studentId,
    }).from(submissions)
      .leftJoin(students, eq(submissions.studentId, students.id))
      .where(and(eq(submissions.schoolId, schoolId), eq(submissions.assignmentId, parseInt(url.searchParams.get('assignmentId')!)))).all();
    return new Response(JSON.stringify(subs), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'export') {
    const allAssignments = db.select().from(assignments).where(eq(assignments.schoolId, schoolId)).orderBy(desc(assignments.createdAt)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' },
      { key: 'dueDate', label: 'Due Date' }, { key: 'maxPoints', label: 'Max Points' },
    ];
    return csvResponse(toCsv(allAssignments, columns), 'assignments.csv');
  }

  if (courseId) {
    const results = db.select().from(assignments)
      .where(and(eq(assignments.schoolId, schoolId), eq(assignments.courseId, parseInt(courseId))))
      .orderBy(desc(assignments.dueDate)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (search) {
    const results = db.select().from(assignments)
      .where(and(eq(assignments.schoolId, schoolId), like(assignments.title, `%${search}%`)))
      .orderBy(desc(assignments.createdAt)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  const allAssignments = db.select().from(assignments)
    .where(eq(assignments.schoolId, schoolId))
    .orderBy(desc(assignments.createdAt)).all();
  return new Response(JSON.stringify(allAssignments), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'assignments.create');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  // Grade submission (transactional — Phase 2.2)
  if (data.action === 'grade_submission') {
    if (!data.submissionId) return new Response(JSON.stringify({ error: 'submissionId required' }), { status: 400 });
    db.transaction(() => {
      db.update(submissions).set({
        grade: data.grade, feedback: data.feedback || null,
        status: 'graded', gradedAt: new Date(), gradedBy: user.id, updatedAt: new Date(),
      }).where(and(eq(submissions.id, data.submissionId), eq(submissions.schoolId, schoolId))).run();
      const sub = db.select().from(submissions).where(eq(submissions.id, data.submissionId)).get();
      if (sub && sub.grade !== null) {
        const assignment = db.select().from(assignments).where(eq(assignments.id, sub.assignmentId)).get();
        if (assignment) {
          const existingGrade = db.select().from(grades).where(and(
            eq(grades.studentId, sub.studentId),
            eq(grades.assignmentId, assignment.id),
          )).get();
          if (existingGrade) {
            db.update(grades).set({
              score: sub.grade, maxScore: assignment.maxPoints,
              category: 'assignment', comments: data.feedback || null, updatedAt: new Date(),
            }).where(eq(grades.id, existingGrade.id)).run();
          } else {
            db.insert(grades).values({
              schoolId, studentId: sub.studentId, assignmentId: assignment.id,
              courseId: assignment.courseId, score: sub.grade, maxScore: assignment.maxPoints,
              category: 'assignment', comments: data.feedback || null, createdAt: new Date(),
            } as any).run();
          }
        }
      }
    });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.title || !data.courseId) {
    return new Response(JSON.stringify({ error: 'title and courseId are required' }), { status: 400 });
  }

  const result = db.insert(assignments).values({
    schoolId,
    courseId: data.courseId,
    title: data.title,
    instructions: data.instructions || null,
    type: data.type || 'file_upload',
    dueDate: data.dueDate || null,
    maxPoints: data.maxPoints || 100,
    allowLate: data.allowLate || false,
    allowResubmit: data.allowResubmit || false,
    isGroup: data.isGroup || false,
    attachments: (data.attachments || []) as any,
    rubric: (data.rubric || null) as any,
  }).returning().get();

  if (result) {
    const course = db.select().from(courses).where(eq(courses.id, data.courseId)).get();
    const studentEmails = db.select({ email: students.email })
      .from(students).where(and(eq(students.schoolId, schoolId), eq(students.status, 'active')))
      .all()
      .filter(s => s.email)
      .map(s => s.email as string);
    if (course && studentEmails.length > 0) {
      notifyAssignmentCreated(schoolId, course.title, data.title, data.dueDate || 'No due date', studentEmails.slice(0, 50)).catch((e: any) => console.error("Async op failed:", e));
    }
  }

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'assignments.edit');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  const existing = db.select().from(assignments).where(and(eq(assignments.id, data.id), eq(assignments.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Assignment not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.attachments && typeof updateData.attachments === 'object') updateData.attachments = updateData.attachments;
  if (updateData.rubric && typeof updateData.rubric === 'object') updateData.rubric = updateData.rubric;

  db.update(assignments).set({ ...updateData, updatedAt: new Date() }).where(eq(assignments.id, id)).run();
  const updated = db.select().from(assignments).where(eq(assignments.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'assignments.delete');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(assignments).where(and(eq(assignments.id, id), eq(assignments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
