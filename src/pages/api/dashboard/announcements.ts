import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { announcements } from '../../../lib/db/schema.js';
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
    db.delete(announcements).where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId))).run();
  } else if (id) {
    db.update(announcements).set({
      title: form.get('title')?.toString() || '',
      slug: form.get('slug')?.toString() || '',
      content: form.get('content')?.toString() || '',
      excerpt: form.get('excerpt')?.toString() || null,
      bannerImageUrl: form.get('bannerImageUrl')?.toString() || null,
      ctaText: form.get('ctaText')?.toString() || null,
      ctaUrl: form.get('ctaUrl')?.toString() || null,
      isPinned: form.has('isPinned'),
      published: form.has('published'),
      updatedAt: new Date(),
    }).where(and(eq(announcements.id, id), eq(announcements.schoolId, schoolId))).run();
  } else {
    db.insert(announcements).values({
      schoolId,
      title: form.get('title')?.toString() || '',
      slug: form.get('slug')?.toString() || '',
      content: form.get('content')?.toString() || '',
      excerpt: form.get('excerpt')?.toString() || null,
      bannerImageUrl: form.get('bannerImageUrl')?.toString() || null,
      ctaText: form.get('ctaText')?.toString() || null,
      ctaUrl: form.get('ctaUrl')?.toString() || null,
      isPinned: form.has('isPinned'),
      published: form.has('published'),
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/announcements?success=1' } });
};
