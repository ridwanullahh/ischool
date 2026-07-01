/**
 * Quiz Submit API
 * POST - submit a quiz attempt, auto-grade objective questions
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../../lib/db/index.js';
import { quizAttempts, quizzes, questions } from '../../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { attemptId, answers, flags, tabSwitchCount } = body;

  if (!attemptId) return new Response(JSON.stringify({ error: 'Attempt ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const attempt = db.select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).get();
  if (!attempt || attempt.studentId !== (user as any).id) {
    return new Response(JSON.stringify({ error: 'Attempt not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Get quiz and questions
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).get();
  if (!quiz) return new Response(JSON.stringify({ error: 'Quiz not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const quizQuestions = db.select().from(questions).where(eq(questions.quizId, quiz.id)).all();

  // Auto-grade objective questions
  let score = 0;
  let maxScore = 0;
  let autoGradable = 0;
  let manuallyGraded = 0;

  for (const q of quizQuestions) {
    maxScore += q.points || 1;
    const studentAnswer = answers[q.id];
    if (studentAnswer === undefined || studentAnswer === '') continue;

    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      autoGradable++;
      // Compare answer
      const correct = q.correctAnswer;
      let isCorrect = false;
      if (q.type === 'multiple_choice' && q.options) {
        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        // studentAnswer is the index
        const studentText = opts[studentAnswer];
        isCorrect = studentText === correct;
      } else if (q.type === 'true_false') {
        isCorrect = String(studentAnswer).toLowerCase() === String(correct).toLowerCase();
      }
      if (isCorrect) score += q.points || 1;
    } else {
      manuallyGraded++;
    }
  }

  // Store flags in answers
  const finalAnswers = { ...answers };
  if (flags) finalAnswers._flags = Object.keys(flags).map(k => ({ questionId: k, type: 'review_flag' }));
  if (tabSwitchCount > 0) finalAnswers._tabSwitchCount = tabSwitchCount;

  // Update attempt
  const now = new Date();
  db.update(quizAttempts).set({
    answers: JSON.stringify(finalAnswers),
    score: manuallyGraded > 0 ? null : score, // null if needs manual grading
    maxScore: maxScore,
    completedAt: now,
    status: manuallyGraded > 0 ? 'pending_grading' : 'completed',
  }).where(eq(quizAttempts.id, attemptId)).run();

  return new Response(JSON.stringify({
    ok: true,
    score: manuallyGraded > 0 ? null : score,
    maxScore,
    needsManualGrading: manuallyGraded > 0,
    autoGraded: autoGradable,
    manualGraded: manuallyGraded,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
