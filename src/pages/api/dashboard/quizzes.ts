import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { quizzes, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like, desc } from 'drizzle-orm';
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
  const courseId = url.searchParams.get('courseId');
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allQuizzes = db.select().from(quizzes).where(eq(quizzes.schoolId, schoolId)).orderBy(desc(quizzes.createdAt)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' }, { key: 'timeLimit', label: 'Time Limit' },
      { key: 'attempts', label: 'Attempts' }, { key: 'passingScore', label: 'Passing Score' },
    ];
    return csvResponse(toCsv(allQuizzes, columns), 'quizzes.csv');
  }

  if (courseId) {
    const results = db.select().from(quizzes)
      .where(and(eq(quizzes.schoolId, schoolId), eq(quizzes.courseId, parseInt(courseId))))
      .orderBy(desc(quizzes.createdAt)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (search) {
    const results = db.select().from(quizzes)
      .where(and(eq(quizzes.schoolId, schoolId), like(quizzes.title, `%${search}%`)))
      .orderBy(desc(quizzes.createdAt)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (status) {
    const results = db.select().from(quizzes)
      .where(and(eq(quizzes.schoolId, schoolId), eq(quizzes.status, status as any)))
      .orderBy(desc(quizzes.createdAt)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  const allQuizzes = db.select().from(quizzes)
    .where(eq(quizzes.schoolId, schoolId))
    .orderBy(desc(quizzes.createdAt)).all();
  return new Response(JSON.stringify(allQuizzes), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 });

  const db = getDb();
  const result = db.insert(quizzes).values({
    schoolId,
    courseId: data.courseId || null,
    title: data.title,
    description: data.description || null,
    timeLimit: data.timeLimit || null,
    attempts: data.attempts || 1,
    passingScore: data.passingScore || 50,
    randomize: data.randomize || false,
    showResults: data.showResults !== undefined ? data.showResults : true,
    scheduledStart: data.scheduledStart || null,
    scheduledEnd: data.scheduledEnd || null,
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
  const existing = db.select().from(quizzes).where(and(eq(quizzes.id, data.id), eq(quizzes.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Quiz not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(quizzes).set({ ...updateData, updatedAt: new Date() }).where(eq(quizzes.id, id)).run();
  const updated = db.select().from(quizzes).where(eq(quizzes.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(quizzes).where(and(eq(quizzes.id, id), eq(quizzes.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
