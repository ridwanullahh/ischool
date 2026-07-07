import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getDb } from '../../../lib/db/index.js';
import { schoolMembers } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const newSchoolId = parseInt(form.get('schoolId')?.toString() || '0');
  if (!newSchoolId) return new Response('Invalid school ID', { status: 400 });

  const db = getDb();

  const newMembership = db.select().from(schoolMembers)
    .where(and(eq(schoolMembers.userId, result.user.id), eq(schoolMembers.schoolId, newSchoolId)))
    .get();
  if (!newMembership) return new Response('Not a member of this school', { status: 403 });

  db.update(schoolMembers).set({ active: false }).where(eq(schoolMembers.userId, result.user.id)).run();
  db.update(schoolMembers).set({ active: true })
    .where(and(eq(schoolMembers.userId, result.user.id), eq(schoolMembers.schoolId, newSchoolId)))
    .run();

  return new Response(null, { status: 302, headers: { Location: '/dashboard/schools' } });
};
