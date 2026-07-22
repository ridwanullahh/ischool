import type { APIRoute } from 'astro';
import { getDb } from '../lib/db/index.js';
import { schools, blogPosts, announcements, programs, classes } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const db = getDb();
  const baseUrl = url.origin;
  const now = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Platform pages
  xml += `  <url><loc>${baseUrl}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/about</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/pricing</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/contact</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/faq</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/blog</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
  xml += `  <url><loc>${baseUrl}/docs</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;

  // All schools — await the async Lightbase call, default to [] on error
  let allSchools: any[] = [];
  try {
    const result = await db.select().from(schools).all();
    allSchools = Array.isArray(result) ? result : [];
  } catch (e: any) {
    console.error('[sitemap] Failed to load schools:', e?.message || e);
  }

  for (const school of allSchools) {
    const slug = school.slug || school.slug_slug;
    if (!slug) continue;
    xml += `  <url><loc>${baseUrl}/${slug}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/about</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/admissions</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/programs</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/announcements</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/blog</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/gallery</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/faqs</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${slug}/contact</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;

    // Blog posts
    try {
      const posts = await db.select().from(blogPosts).where(eq(blogPosts.schoolId, school.id)).all();
      for (const post of (posts || [])) {
        const isPub = post.isPublished === true || post.is_published === 1 || post.is_published === true || post.status === 'published';
        if (isPub && post.slug) {
          const updated = post.updatedAt || post.updated_at || post.createdAt || post.created_at || now;
          xml += `  <url><loc>${baseUrl}/${slug}/blog/${post.slug}</loc><lastmod>${new Date(updated).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
        }
      }
    } catch { /* ignore per-school errors */ }

    // Announcements
    try {
      const anns = await db.select().from(announcements).where(eq(announcements.schoolId, school.id)).all();
      for (const ann of (anns || [])) {
        const isPub = ann.published === true || ann.published === 1;
        if (isPub && ann.slug) {
          const updated = ann.updatedAt || ann.updated_at || ann.createdAt || ann.created_at || now;
          xml += `  <url><loc>${baseUrl}/${slug}/announcements/${ann.slug}</loc><lastmod>${new Date(updated).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
        }
      }
    } catch { /* ignore */ }

    // Programs
    try {
      const progs = await db.select().from(programs).where(eq(programs.schoolId, school.id)).all();
      for (const prog of (progs || [])) {
        const ident = prog.slug || prog.id;
        if (ident) {
          xml += `  <url><loc>${baseUrl}/${slug}/programs/${ident}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
        }
      }
    } catch { /* ignore */ }

    // Classes
    try {
      const cls = await db.select().from(classes).where(eq(classes.schoolId, school.id)).all();
      for (const c of (cls || [])) {
        const ident = c.slug || c.id;
        if (ident) {
          xml += `  <url><loc>${baseUrl}/${slug}/classes/${ident}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
        }
      }
    } catch { /* ignore */ }
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
