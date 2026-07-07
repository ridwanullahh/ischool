import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { users } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '../../../lib/utils.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const userId = Number(form.get('userId'));
  const action = form.get('action')?.toString();

  if (!userId || !action) return error('Invalid request');

  const db = getDb();

  if (action === 'toggleRole') {
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (user) {
      const newRole = user.role === 'super_admin' ? 'school_admin' : 'super_admin';
      db.update(users).set({ role: newRole }).where(eq(users.id, userId)).run();
    }
  } else if (action === 'delete') {
    db.delete(users).where(eq(users.id, userId)).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/admin/users' } });
};
