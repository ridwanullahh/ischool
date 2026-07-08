import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const baseUrl = url.origin;
  const txt = `User-agent: *
Allow: /
Allow: /*/about
Allow: /*/admissions
Allow: /*/programs
Allow: /*/classes
Allow: /*/blog
Allow: /*/announcements
Allow: /*/gallery
Allow: /*/faqs
Allow: /*/contact
Disallow: /dashboard
Disallow: /admin
Disallow: /api
Disallow: /portal
Disallow: /auth
Disallow: /onboarding

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
