import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db/index.js';
import { blogPosts, announcements, platformDocs, platformBlogPosts } from '../../lib/db/schema.js';
import { eq, and, or, like, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const type = url.searchParams.get('type');
  const schoolId = parseInt(url.searchParams.get('schoolId') || '0');

  if (!q || q.length < 2) return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const results: any[] = [];
  const pattern = `%${q}%`;

  if (!type || type === 'blog') {
    if (schoolId) {
      const posts = db.select().from(blogPosts)
        .where(and(eq(blogPosts.schoolId, schoolId), eq(blogPosts.isPublished, true), or(like(blogPosts.title, pattern), like(blogPosts.content, pattern))))
        .orderBy(desc(blogPosts.createdAt)).limit(10).all();
      posts.forEach(p => results.push({ type: 'blog', title: p.title, slug: p.slug, excerpt: p.excerpt || p.content.slice(0, 120) }));
    } else {
      const posts = db.select().from(platformBlogPosts)
        .where(and(eq(platformBlogPosts.isPublished, true), or(like(platformBlogPosts.title, pattern), like(platformBlogPosts.content, pattern))))
        .orderBy(desc(platformBlogPosts.createdAt)).limit(10).all();
      posts.forEach(p => results.push({ type: 'platform_blog', title: p.title, slug: p.slug, excerpt: p.excerpt || p.content.slice(0, 120) }));
    }
  }

  if ((!type || type === 'announcements') && schoolId) {
    const items = db.select().from(announcements)
      .where(and(eq(announcements.schoolId, schoolId), eq(announcements.published, true), or(like(announcements.title, pattern), like(announcements.content, pattern))))
      .orderBy(desc(announcements.createdAt)).limit(10).all();
    items.forEach(a => results.push({ type: 'announcement', title: a.title, slug: a.slug, excerpt: a.excerpt || a.content.slice(0, 120) }));
  }

  if (!type || type === 'docs') {
    const docs = db.select().from(platformDocs)
      .where(and(eq(platformDocs.isPublished, true), or(like(platformDocs.title, pattern), like(platformDocs.content, pattern))))
      .orderBy(desc(platformDocs.sortOrder)).limit(10).all();
    docs.forEach(d => results.push({ type: 'doc', title: d.title, slug: d.slug, excerpt: d.excerpt || d.content.slice(0, 120) }));
  }

  return new Response(JSON.stringify({ results: results.slice(0, 20) }), { headers: { 'Content-Type': 'application/json' } });
};
