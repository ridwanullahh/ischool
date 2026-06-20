import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getDb } from '../../../lib/db/index.js';
import { aboutPages } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const form = await request.formData();
  const db = getDb();

  const existing = db.select().from(aboutPages).where(eq(aboutPages.schoolId, schoolId)).get();
  const data = {
    mission: form.get('mission')?.toString() || null,
    vision: form.get('vision')?.toString() || null,
    valueProposition: form.get('valueProposition')?.toString() || null,
    updatedAt: new Date(),
  };

  if (existing) {
    db.update(aboutPages).set(data).where(eq(aboutPages.schoolId, schoolId)).run();
  } else {
    db.insert(aboutPages).values({ schoolId, ...data }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/onboarding/contacts' } });
};
