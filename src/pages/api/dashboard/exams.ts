import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { exams, examSeries, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

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
  const allSeries = db.select().from(examSeries).where(eq(examSeries.schoolId, schoolId)).all();
  const allExams = db.select().from(exams).all();
  const seriesIds = new Set(allSeries.map(s => s.id));
  const scopedExams = allExams.filter(e => seriesIds.has(e.seriesId));
  return new Response(JSON.stringify({ exams: scopedExams, series: allSeries }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.subject || !data.seriesId || !data.totalMarks) {
    return new Response(JSON.stringify({ error: 'subject, seriesId, and totalMarks are required' }), { status: 400 });
  }
  const db = getDb();
  const result = db.insert(exams).values({
    seriesId: data.seriesId,
    subject: data.subject,
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
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  const db = getDb();
  const existingExam = db.select().from(exams).where(eq(exams.id, data.id)).get();
  if (!existingExam) return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404 });
  const examSeries = db.select().from(examSeries).where(and(eq(examSeries.id, existingExam.seriesId), eq(examSeries.schoolId, schoolId))).get();
  if (!examSeries) return new Response(JSON.stringify({ error: 'Exam not found in your school' }), { status: 404 });
  const { id, ...updateData } = data;
  db.update(exams).set({ ...updateData, updatedAt: new Date() }).where(eq(exams.id, id)).run();
  const updated = db.select().from(exams).where(eq(exams.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  const existingExam = db.select().from(exams).where(eq(exams.id, id)).get();
  if (!existingExam) return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404 });
  const examSeries = db.select().from(examSeries).where(and(eq(examSeries.id, existingExam.seriesId), eq(examSeries.schoolId, schoolId))).get();
  if (!examSeries) return new Response(JSON.stringify({ error: 'Exam not found in your school' }), { status: 404 });
  db.delete(exams).where(eq(exams.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
