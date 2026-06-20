import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { cbtExams, cbtCandidates, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

async function getUserSchoolId(userId: number) {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allExams = db.select().from(cbtExams).where(eq(cbtExams.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' },
      { key: 'duration', label: 'Duration (min)' }, { key: 'totalMarks', label: 'Total Marks' },
      { key: 'passingScore', label: 'Passing Score' }, { key: 'scheduledStart', label: 'Start Date' },
      { key: 'scheduledEnd', label: 'End Date' },
    ];
    return csvResponse(toCsv(allExams, columns), 'cbt-exams.csv');
  }

  const exams = db.select().from(cbtExams).where(eq(cbtExams.schoolId, schoolId)).all();
  const candidates = db.select().from(cbtCandidates).all().filter(c => {
    return exams.some(e => e.id === c.examId);
  });

  return new Response(JSON.stringify({ exams, candidates }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  if (!data.title || !data.type) {
    return new Response(JSON.stringify({ error: 'Title and type are required' }), { status: 400 });
  }

  const sections = typeof data.sections === 'string' ? data.sections : JSON.stringify(data.sections || null);

  const result = db.insert(cbtExams).values({
    ...data,
    schoolId,
    sections,
    negativeMarking: data.negativeMarking ? 1 : 0,
    lockdown: data.lockdown ? 1 : 0,
    proctoring: data.proctoring ? 1 : 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  const existing = db.select().from(cbtExams).where(eq(cbtExams.id, data.id)).get();
  if (!existing || existing.schoolId !== schoolId) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  const sections = typeof data.sections === 'string' ? data.sections : JSON.stringify(data.sections || null);

  const result = db.update(cbtExams).set({
    ...data,
    sections,
    negativeMarking: data.negativeMarking ? 1 : 0,
    lockdown: data.lockdown ? 1 : 0,
    proctoring: data.proctoring ? 1 : 0,
    schoolId: undefined,
    updatedAt: new Date(),
  }).where(eq(cbtExams.id, data.id)).returning().get();

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(cbtExams).where(eq(cbtExams.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  db.delete(cbtExams).where(eq(cbtExams.id, id)).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
