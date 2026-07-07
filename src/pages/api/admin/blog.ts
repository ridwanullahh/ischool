import { getDb } from '../../../lib/db/index.js';
import { platformBlogPosts } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'super_admin') return redirect('/auth/login');

  const form = await request.formData();
  const action = form.get('action') as string;
  const db = getDb();

  if (action === 'create') {
    const title = form.get('title') as string;
    const slug = form.get('slug') as string;
    const content = form.get('content') as string;
    const excerpt = form.get('excerpt') as string || null;
    const category = form.get('category') as string || 'News';
    const coverImageUrl = form.get('coverImageUrl') as string || null;
    const isPublished = form.get('isPublished') === 'true';

    db.insert(platformBlogPosts).values({
      title, slug, content, excerpt, category, coverImageUrl,
      authorId: user.id,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    }).run();
  }

  if (action === 'publish' || action === 'unpublish') {
    const id = Number(form.get('id'));
    db.update(platformBlogPosts).set({
      isPublished: action === 'publish',
      publishedAt: action === 'publish' ? new Date() : null,
    }).where(eq(platformBlogPosts.id, id)).run();
  }

  if (action === 'delete') {
    const id = Number(form.get('id'));
    db.delete(platformBlogPosts).where(eq(platformBlogPosts.id, id)).run();
  }

  return redirect('/admin/blog');
};
