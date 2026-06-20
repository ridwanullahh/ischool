import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { aboutPages } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, redirect }) => {
  const user = (request as any).__user;
  const form = await request.formData();
  const db = getDb();

  const sessionCookie = request.headers.get('Cookie');
  const { getSessionIdFromCookie, validateSession } = await import('../../../lib/auth.js');
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });

  const features: Array<{ title: string; description: string }> = [];
  for (let i = 0; i < 20; i++) {
    const title = form.get(`feature_title_${i}`)?.toString().trim();
    const desc = form.get(`feature_desc_${i}`)?.toString().trim();
    if (title && desc) features.push({ title, description: desc });
  }

  const stats: Array<{ label: string; value: string }> = [];
  for (let i = 0; i < 20; i++) {
    const label = form.get(`stat_label_${i}`)?.toString().trim();
    const value = form.get(`stat_value_${i}`)?.toString().trim();
    if (label && value) stats.push({ label, value });
  }

  const data = {
    mission: form.get('mission')?.toString() || null,
    vision: form.get('vision')?.toString() || null,
    valueProposition: form.get('valueProposition')?.toString() || null,
    features: JSON.stringify(features),
    stats: JSON.stringify(stats),
  };

  const existing = db.select().from(aboutPages).where(eq(aboutPages.schoolId, schoolId)).get();
  if (existing) {
    db.update(aboutPages).set({ ...data, updatedAt: new Date() }).where(eq(aboutPages.schoolId, schoolId)).run();
  } else {
    db.insert(aboutPages).values({ schoolId, ...data }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/about?success=1' } });
};
