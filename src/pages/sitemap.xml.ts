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

  // School sitemaps (link to individual school sitemaps)
  const allSchools = db.select().from(schools).all();
  for (const school of allSchools) {
    xml += `  <url><loc>${baseUrl}/${school.slug}</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/about</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/admissions</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/programs</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/announcements</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/blog</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/gallery</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/faqs</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/${school.slug}/contact</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;

    // Blog posts
    const posts = db.select().from(blogPosts).where(eq(blogPosts.schoolId, school.id)).all();
    for (const post of posts) {
      if (post.isPublished) {
        xml += `  <url><loc>${baseUrl}/${school.slug}/blog/${post.slug}</loc><lastmod>${new Date(post.updatedAt || post.createdAt).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    }

    // Announcements
    const anns = db.select().from(announcements).where(eq(announcements.schoolId, school.id)).all();
    for (const ann of anns) {
      if (ann.published) {
        xml += `  <url><loc>${baseUrl}/${school.slug}/announcements/${ann.slug}</loc><lastmod>${new Date(ann.updatedAt || ann.createdAt).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    }

    // Programs
    const progs = db.select().from(programs).where(eq(programs.schoolId, school.id)).all();
    for (const prog of progs) {
      xml += `  <url><loc>${baseUrl}/${school.slug}/programs/${prog.slug || prog.id}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    }

    // Classes
    const cls = db.select().from(classes).where(eq(classes.schoolId, school.id)).all();
    for (const c of cls) {
      xml += `  <url><loc>${baseUrl}/${school.slug}/classes/${c.slug || c.id}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
    }
  }

  xml += '</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
