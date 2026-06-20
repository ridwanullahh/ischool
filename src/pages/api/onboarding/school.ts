import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getDb } from '../../../lib/db/index.js';
import { schools, schoolMembers, navigationItems } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const name = form.get('name')?.toString()?.trim();
  const slug = form.get('slug')?.toString()?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const tagline = form.get('tagline')?.toString()?.trim() || null;
  const primaryColor = form.get('primaryColor')?.toString() || '#2563eb';

  if (!name || !slug) return new Response('Name and slug are required', { status: 400 });

  const db = getDb();
  const existing = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (existing) return new Response('Slug already taken', { status: 400 });

  const [school] = db.insert(schools).values({
    slug, name, tagline, primaryColor, theme: 'harmony',
    ownerId: result.user.id, status: 'active',
  }).returning().all();

  db.insert(schoolMembers).values({ schoolId: school.id, userId: result.user.id, role: 'admin', active: true }).run();

  const defaultNav = [
    { label: 'Home', url: '/', sortOrder: 0 },
    { label: 'About', url: '/about', sortOrder: 1 },
    { label: 'Announcements', url: '/announcements', sortOrder: 2 },
    { label: 'Programs', url: '/programs', sortOrder: 3 },
    { label: 'Blog', url: '/blog', sortOrder: 4 },
    { label: 'Contact', url: '/contact', sortOrder: 5 },
    { label: 'Admissions', url: '/admissions', sortOrder: 6 },
  ];
  db.insert(navigationItems).values(defaultNav.map(n => ({ ...n, schoolId: school.id }))).run();

  return new Response(null, { status: 302, headers: { Location: '/onboarding/plan' } });
};
