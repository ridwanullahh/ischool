import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { programs } from '../../../lib/db/schema.js';
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
    db.delete(programs).where(and(eq(programs.id, id), eq(programs.schoolId, schoolId))).run();
  } else if (id) {
    db.update(programs).set({
      name: form.get('name')?.toString() || '',
      slug: form.get('slug')?.toString() || '',
      description: form.get('description')?.toString() || null,
      content: form.get('content')?.toString() || null,
      duration: form.get('duration')?.toString() || null,
      level: form.get('level')?.toString() || null,
      icon: form.get('icon')?.toString() || null,
      imageUrl: form.get('imageUrl')?.toString() || null,
      hasDetailPage: form.has('hasDetailPage'),
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
      updatedAt: new Date(),
    }).where(and(eq(programs.id, id), eq(programs.schoolId, schoolId))).run();
  } else {
    db.insert(programs).values({
      schoolId,
      name: form.get('name')?.toString() || '',
      slug: form.get('slug')?.toString() || '',
      description: form.get('description')?.toString() || null,
      content: form.get('content')?.toString() || null,
      duration: form.get('duration')?.toString() || null,
      level: form.get('level')?.toString() || null,
      icon: form.get('icon')?.toString() || null,
      imageUrl: form.get('imageUrl')?.toString() || null,
      hasDetailPage: form.has('hasDetailPage'),
      sortOrder: form.get('sortOrder') ? Number(form.get('sortOrder')) : 0,
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/programs?success=1' } });
};
