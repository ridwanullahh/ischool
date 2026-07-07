import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { schools, blogPosts, announcements, programs, classes } from '../../../lib/db/schema.js';
import { eq, and, like, or } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, params, url }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const type = url.searchParams.get('type') || 'blog';
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const sort = url.searchParams.get('sort') || 'newest';

  let items: any[] = [];

  try {
    if (type === 'blog') {
      items = db.select().from(blogPosts).where(eq(blogPosts.schoolId, school.id)).all();
      if (q) {
        items = items.filter(p =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.excerpt || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q)
        );
      }
      if (sort === 'oldest') items = items.reverse();
      else if (sort === 'title') items = items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (type === 'announcements') {
      items = db.select().from(announcements).where(eq(announcements.schoolId, school.id)).all();
      const filter = url.searchParams.get('filter') || 'all';
      if (filter === 'pinned') items = items.filter(a => a.isPinned);
      if (q) {
        items = items.filter(a =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.excerpt || '').toLowerCase().includes(q) ||
          (a.content || '').toLowerCase().includes(q)
        );
      }
      if (sort === 'oldest') items = items.reverse();
      else if (sort === 'title') items = items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (type === 'programs') {
      items = db.select().from(programs).where(eq(programs.schoolId, school.id)).all();
      if (q) {
        items = items.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.level || '').toLowerCase().includes(q)
        );
      }
      if (sort === 'title') items = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      else if (sort === 'level') items = items.sort((a, b) => (a.level || '').localeCompare(b.level || ''));
    } else if (type === 'classes') {
      items = db.select().from(classes).where(eq(classes.schoolId, school.id)).all();
      if (q) {
        items = items.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.gradeLevel || '').toLowerCase().includes(q) ||
          (c.teacherName || '').toLowerCase().includes(q)
        );
      }
      if (sort === 'title') items = items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      else if (sort === 'grade') items = items.sort((a, b) => (a.gradeLevel || '').localeCompare(b.gradeLevel || ''));
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ items, total: items.length, q, sort }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
