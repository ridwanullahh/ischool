import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { contactInfo } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const db = getDb();

  db.delete(contactInfo).where(eq(contactInfo.schoolId, schoolId)).run();

  const entries: Array<{ schoolId: number; type: 'general' | 'admissions' | 'head_office'; label: string; value: string; sortOrder: number }> = [];
  for (let i = 0; i < 30; i++) {
    const type = form.get(`contact_type_${i}`)?.toString();
    const label = form.get(`contact_label_${i}`)?.toString().trim();
    const value = form.get(`contact_value_${i}`)?.toString().trim();
    if (type && label && value) {
      entries.push({ schoolId, type: type as any, label, value, sortOrder: i });
    }
  }

  if (entries.length > 0) {
    db.insert(contactInfo).values(entries).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/contacts?success=1' } });
};
