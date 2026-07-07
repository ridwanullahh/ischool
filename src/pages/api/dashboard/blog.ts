import type { APIRoute } from 'astro';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { blogPosts } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { slugify } from '../../../lib/utils.js';

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
  const title = form.get('title')?.toString() || '';
  const slug = form.get('slug')?.toString() || slugify(title);

  if (action === 'delete' && id) {
    db.delete(blogPosts).where(and(eq(blogPosts.id, id), eq(blogPosts.schoolId, schoolId))).run();
  } else if (id) {
    db.update(blogPosts).set({
      title,
      slug,
      content: form.get('content')?.toString() || '',
      excerpt: form.get('excerpt')?.toString() || null,
      coverImageUrl: form.get('coverImageUrl')?.toString() || null,
      isPublished: form.has('isPublished'),
      publishedAt: form.has('isPublished') ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(eq(blogPosts.id, id), eq(blogPosts.schoolId, schoolId))).run();
  } else {
    const isPublished = form.has('isPublished');
    db.insert(blogPosts).values({
      schoolId,
      title,
      slug,
      content: form.get('content')?.toString() || '',
      excerpt: form.get('excerpt')?.toString() || null,
      coverImageUrl: form.get('coverImageUrl')?.toString() || null,
      authorId: result.user.id,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/dashboard/blog?success=1' } });
};
