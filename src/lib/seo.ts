/**
 * SEO Helper — Generates dynamic meta tags, structured data, and
 * SEO optimizations for both the platform and individual school sites.
 */

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: any;
  noindex?: boolean;
}

export function generateMetaTags(config: SEOConfig): string {
  const tags: string[] = [];

  // Title
  tags.push(`<title>${escapeHtml(config.title)}</title>`);

  // Description
  if (config.description) {
    tags.push(`<meta name="description" content="${escapeHtml(config.description)}" />`);
  }

  // Keywords
  if (config.keywords && config.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHtml(config.keywords.join(', '))}" />`);
  }

  // Canonical
  if (config.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(config.canonical)}" />`);
  }

  // Robots
  if (config.noindex) {
    tags.push('<meta name="robots" content="noindex, nofollow" />');
  } else {
    tags.push('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />');
  }

  // Open Graph
  tags.push(`<meta property="og:title" content="${escapeHtml(config.title)}" />`);
  if (config.description) {
    tags.push(`<meta property="og:description" content="${escapeHtml(config.description)}" />`);
  }
  tags.push(`<meta property="og:type" content="${config.ogType || 'website'}" />`);
  if (config.canonical) {
    tags.push(`<meta property="og:url" content="${escapeHtml(config.canonical)}" />`);
  }
  if (config.ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(config.ogImage)}" />`);
    tags.push(`<meta property="og:image:width" content="1200" />`);
    tags.push(`<meta property="og:image:height" content="630" />`);
  }
  tags.push('<meta property="og:site_name" content="iSchool" />');

  // Twitter Card
  tags.push(`<meta name="twitter:card" content="${config.twitterCard || 'summary_large_image'}" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(config.title)}" />`);
  if (config.description) {
    tags.push(`<meta name="twitter:description" content="${escapeHtml(config.description)}" />`);
  }
  if (config.ogImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(config.ogImage)}" />`);
  }

  // Additional SEO meta tags
  tags.push('<meta name="author" content="iSchool" />');
  tags.push('<meta name="generator" content="iSchool CMS" />');
  tags.push('<meta http-equiv="X-UA-Compatible" content="IE=edge" />');
  tags.push('<meta name="theme-color" content="#4f46e5" />');

  // JSON-LD Structured Data
  if (config.jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(config.jsonLd)}</script>`);
  }

  return tags.join('\n  ');
}

export function generateSchoolSchema(school: any, baseUrl: string): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: school.name,
    alternateName: school.tagline || undefined,
    url: `${baseUrl}/${school.slug}`,
    logo: school.logoUrl || undefined,
    description: school.tagline || school.name,
    address: {
      '@type': 'PostalAddress',
    },
    sameAs: Object.entries(school.socialHandles || {}).map(([, v]) => v).filter(Boolean),
  };
}

export function generateBlogPostSchema(post: any, school: any, baseUrl: string): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Organization',
      name: school.name,
    },
    publisher: {
      '@type': 'Organization',
      name: school.name,
      logo: school.logoUrl ? { '@type': 'ImageObject', url: school.logoUrl } : undefined,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      url: `${baseUrl}/${school.slug}/blog/${post.slug}`,
    },
  };
}

export function generateAnnouncementSchema(announcement: any, school: any, baseUrl: string): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: announcement.title,
    description: announcement.excerpt || undefined,
    datePublished: announcement.publishedAt || announcement.createdAt,
    dateModified: announcement.updatedAt || announcement.createdAt,
    author: {
      '@type': 'Organization',
      name: school.name,
    },
    publisher: {
      '@type': 'Organization',
      name: school.name,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      url: `${baseUrl}/${school.slug}/announcements/${announcement.slug}`,
    },
  };
}

export function generateFAQSchema(faqs: any[]): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
