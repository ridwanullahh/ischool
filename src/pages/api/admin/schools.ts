import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { schools, schoolMembers, aboutPages, navigationItems } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { error } from '../../../lib/utils.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const action = form.get('action')?.toString();

  if (!schoolId || !action) return error('Invalid request');

  const db = getDb();

  if (action === 'suspend') {
    db.update(schools).set({ status: 'suspended' }).where(eq(schools.id, schoolId)).run();
  } else if (action === 'activate') {
    db.update(schools).set({ status: 'active' }).where(eq(schools.id, schoolId)).run();
  } else if (action === 'delete') {
    db.delete(schools).where(eq(schools.id, schoolId)).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/admin/schools' } });
};
