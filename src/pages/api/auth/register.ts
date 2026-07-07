import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { users, schools, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, createSession, setSessionCookie } from '../../../lib/auth.js';
import { error, slugify } from '../../../lib/utils.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const name = form.get('name')?.toString().trim();
  const email = form.get('email')?.toString().trim();
  const password = form.get('password')?.toString();
  const schoolName = form.get('schoolName')?.toString().trim();

  if (!name || !email || !password) {
    return error('Name, email, and password are required');
  }

  if (password.length < 8) {
    return error('Password must be at least 8 characters');
  }

  const db = getDb();
  const existing = db.select().from(users).where(eq(users.email, email)).get();

  if (existing) {
    return error('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const [user] = db.insert(users).values({
    email,
    passwordHash,
    name,
    role: 'school_admin',
  }).returning().all();

  if (schoolName) {
    let slug = slugify(schoolName);
    const existingSlug = db.select().from(schools).where(eq(schools.slug, slug)).get();
    if (existingSlug) slug = `${slug}-${Date.now().toString(36)}`;

    const [school] = db.insert(schools).values({
      slug,
      name: schoolName,
      ownerId: user.id,
      status: 'trial',
    }).returning().all();

    db.insert(schoolMembers).values({
      schoolId: school.id,
      userId: user.id,
      role: 'admin',
    }).run();
  }

  const sessionId = await createSession(user.id);
  const headers = new Headers();
  setSessionCookie(headers, sessionId);
  headers.set('Location', '/dashboard');
  return new Response(null, { status: 302, headers });
};
