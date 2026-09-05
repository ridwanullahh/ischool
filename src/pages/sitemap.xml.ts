import type { APIRoute } from 'astro';
import { allSchools, preloadAllSchools, cachedSchoolData } from '../lib/prerender-data.ts';

// Prerendered endpoint (static output): the sitemap is generated at BUILD
// time from lightbase data. Refresh = rebuild, matching the snapshot-page
// philosophy of the zero-workers deployment.
export const GET: APIRoute = async () => {
  const baseUrl = (process.env.PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:4321').replace(/\/$/, '');
  const now = new Date().toISOString();

  await preloadAllSchools();
  const schools = await allSchools();

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

  for (const school of schools) {
    const slug = school.slug;
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

    for (const post of cachedSchoolData(slug, 'posts')) {
      const isPub = post.status === 'published' || post.is_published === true || post.published === true || post.published === 1;
      if (isPub && post.slug) {
        xml += `  <url><loc>${baseUrl}/${slug}/blog/${post.slug}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    }
    for (const ann of cachedSchoolData(slug, 'announcements')) {
      if ((ann.published === true || ann.published === 1) && ann.slug) {
        xml += `  <url><loc>${baseUrl}/${slug}/announcements/${ann.slug}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
      }
    }
    for (const prog of cachedSchoolData(slug, 'programs')) {
      const ident = prog.slug || prog.id;
      if (ident) xml += `  <url><loc>${baseUrl}/${slug}/programs/${ident}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    }
    for (const cls of cachedSchoolData(slug, 'classes')) {
      const ident = cls.slug || cls.id;
      if (ident) xml += `  <url><loc>${baseUrl}/${slug}/classes/${ident}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
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
