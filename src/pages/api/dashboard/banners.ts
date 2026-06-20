import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { banners } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });
  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response('No school found', { status: 404 });
  const db = getDb();
  const form = await request.formData();
  const id = form.get('id') ? Number(form.get('id')) : null;
  const action = form.get('action')?.toString();

  if (action === 'delete' && id) {
    db.delete(banners).where(and(eq(banners.id, id), eq(banners.schoolId, schoolId))).run();
  } else if (action === 'toggle' && id) {
    const b = db.select().from(banners).where(and(eq(banners.id, id), eq(banners.schoolId, schoolId))).get();
    if (b) db.update(banners).set({ isActive: !b.isActive, updatedAt: new Date() }).where(eq(banners.id, id)).run();
  } else if (id) {
    db.update(banners).set({
      title: form.get('title')?.toString() || '',
      subtitle: form.get('subtitle')?.toString() || null,
      imageUrl: form.get('imageUrl')?.toString() || '',
      linkUrl: form.get('linkUrl')?.toString() || null,
      linkText: form.get('linkText')?.toString() || null,
      position: (form.get('position')?.toString() || 'hero') as any,
      displayPages: JSON.stringify((form.get('displayPages')?.toString() || 'all').split(',').map(s => s.trim())),
      startDate: form.get('startDate')?.toString() || null,
      endDate: form.get('endDate')?.toString() || null,
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      updatedAt: new Date(),
    }).where(and(eq(banners.id, id), eq(banners.schoolId, schoolId))).run();
  } else {
    db.insert(banners).values({
      schoolId,
      title: form.get('title')?.toString() || '',
      subtitle: form.get('subtitle')?.toString() || null,
      imageUrl: form.get('imageUrl')?.toString() || '',
      linkUrl: form.get('linkUrl')?.toString() || null,
      linkText: form.get('linkText')?.toString() || null,
      position: (form.get('position')?.toString() || 'hero') as any,
      displayPages: JSON.stringify((form.get('displayPages')?.toString() || 'all').split(',').map(s => s.trim())),
      startDate: form.get('startDate')?.toString() || null,
      endDate: form.get('endDate')?.toString() || null,
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
    }).run();
  }
  return new Response(null, { status: 303, headers: { Location: '/dashboard/banners?success=1' } });
};
