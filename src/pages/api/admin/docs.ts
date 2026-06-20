import { getDb } from '../../../lib/db/index.js';
import { platformDocs } from '../../../lib/db/schema.js';
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
    const category = form.get('category') as string || 'Getting Started';
    const sortOrder = Number(form.get('sortOrder')) || 0;
    const isPublished = form.get('isPublished') === 'true';

    db.insert(platformDocs).values({
      title, slug, content, excerpt, category, sortOrder, isPublished,
    }).run();
  }

  if (action === 'delete') {
    const id = Number(form.get('id'));
    db.delete(platformDocs).where(eq(platformDocs.id, id)).run();
  }

  return redirect('/admin/docs');
};
