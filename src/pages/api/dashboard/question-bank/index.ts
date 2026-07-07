/**
 * Question Bank API
 *
 * POST   - create a question
 * DELETE - delete a question
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { questions } from '../../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'cbt.question_bank.manage');
  if (denied) return denied;

  const body = await request.json();
  const { schoolId, type, question, options, correctAnswer, difficulty, points, tags, explanation } = body;

  if (!schoolId || !type || !question) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const result = db.insert(questions).values({
    schoolId,
    type,
    question,
    options: options || null,
    correctAnswer: correctAnswer || null,
    difficulty: difficulty || 'medium',
    points: points || 1,
    tags: JSON.stringify(tags || []),
    explanation: explanation || null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({ ok: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'cbt.question_bank.manage');
  if (denied) return denied;

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  db.delete(questions).where(eq(questions.id, id)).run();

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
