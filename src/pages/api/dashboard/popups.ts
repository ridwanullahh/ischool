import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { popups } from '../../../lib/db/schema.js';
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
    db.delete(popups).where(and(eq(popups.id, id), eq(popups.schoolId, schoolId))).run();
  } else if (action === 'toggle' && id) {
    const p = db.select().from(popups).where(and(eq(popups.id, id), eq(popups.schoolId, schoolId))).get();
    if (p) db.update(popups).set({ isActive: !p.isActive, updatedAt: new Date() }).where(eq(popups.id, id)).run();
  } else if (id) {
    db.update(popups).set({
      title: form.get('title')?.toString() || '',
      content: form.get('content')?.toString() || '',
      imageUrl: form.get('imageUrl')?.toString() || null,
      linkUrl: form.get('linkUrl')?.toString() || null,
      linkText: form.get('linkText')?.toString() || null,
      triggerType: (form.get('triggerType')?.toString() || 'on_load') as any,
      triggerDelay: form.get('triggerDelay') ? Number(form.get('triggerDelay')) : 0,
      displayFrequency: (form.get('displayFrequency')?.toString() || 'once_per_session') as any,
      displayPages: JSON.stringify((form.get('displayPages')?.toString() || 'all').split(',').map(s => s.trim())),
      startDate: form.get('startDate')?.toString() || null,
      endDate: form.get('endDate')?.toString() || null,
      updatedAt: new Date(),
    }).where(and(eq(popups.id, id), eq(popups.schoolId, schoolId))).run();
  } else {
    db.insert(popups).values({
      schoolId,
      title: form.get('title')?.toString() || '',
      content: form.get('content')?.toString() || '',
      imageUrl: form.get('imageUrl')?.toString() || null,
      linkUrl: form.get('linkUrl')?.toString() || null,
      linkText: form.get('linkText')?.toString() || null,
      triggerType: (form.get('triggerType')?.toString() || 'on_load') as any,
      triggerDelay: form.get('triggerDelay') ? Number(form.get('triggerDelay')) : 0,
      displayFrequency: (form.get('displayFrequency')?.toString() || 'once_per_session') as any,
      displayPages: JSON.stringify((form.get('displayPages')?.toString() || 'all').split(',').map(s => s.trim())),
      startDate: form.get('startDate')?.toString() || null,
      endDate: form.get('endDate')?.toString() || null,
    }).run();
  }
  return new Response(null, { status: 303, headers: { Location: '/dashboard/popups?success=1' } });
};
