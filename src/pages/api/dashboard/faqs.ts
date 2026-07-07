import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { faqs } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const db = getDb();
  const id = form.get('id') ? Number(form.get('id')) : null;
  const action = form.get('action')?.toString();

  if (action === 'delete' && id) {
    db.delete(faqs).where(and(eq(faqs.id, id), eq(faqs.schoolId, schoolId))).run();
  } else if (id) {
    db.update(faqs).set({
      question: form.get('question')?.toString() || '',
      answer: form.get('answer')?.toString() || '',
      category: form.get('category')?.toString() || 'General',
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      updatedAt: new Date(),
    }).where(and(eq(faqs.id, id), eq(faqs.schoolId, schoolId))).run();
  } else {
    db.insert(faqs).values({
      schoolId,
      question: form.get('question')?.toString() || '',
      answer: form.get('answer')?.toString() || '',
      category: form.get('category')?.toString() || 'General',
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/faqs?success=1' } });
};
