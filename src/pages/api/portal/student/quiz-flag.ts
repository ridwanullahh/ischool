/**
 * Quiz Flag API
 * POST - log a proctoring flag (tab switch, fullscreen exit, etc.)
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { quizAttempts } from '../../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { attemptId, type, count } = body;

  if (!attemptId) return new Response(JSON.stringify({ error: 'Attempt ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const attempt = db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).get();
  if (!attempt || attempt.studentId !== (user as any).id) {
    return new Response(JSON.stringify({ error: 'Attempt not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Store flags in the attempt's answers JSON as a _flags array
  const currentAnswers = (attempt.answers as Record<string, any>) || {};
  const flags = currentAnswers._flags || [];
  flags.push({ type, timestamp: new Date().toISOString(), count });
  currentAnswers._flags = flags;

  db.update(quizAttempts).set({
    answers: JSON.stringify(currentAnswers),
  }).where(eq(quizAttempts.id, attemptId)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
