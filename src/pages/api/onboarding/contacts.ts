import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getDb } from '../../../lib/db/index.js';
import { contactInfo } from '../../../lib/db/schema.js';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const form = await request.formData();
  const db = getDb();

  const entries = [
    { label: 'Email', value: form.get('email')?.toString() },
    { label: 'Phone', value: form.get('phone')?.toString() },
    { label: 'Address', value: form.get('address')?.toString() },
  ].filter(e => e.value?.trim());

  if (entries.length > 0) {
    db.insert(contactInfo).values(entries.map((e, i) => ({
      schoolId, type: 'general' as const, label: e.label, value: e.value!, sortOrder: i,
    }))).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/onboarding/done' } });
};
