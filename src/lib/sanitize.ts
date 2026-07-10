/**
 * HTML Sanitizer — prevents XSS in user-submitted rich text content.
 * (Phase 1.4.4)
 * 
 * Strips dangerous tags and attributes while preserving safe formatting.
 * Used for: blog posts, announcements, lesson content, descriptions.
 */

// Allowed HTML tags for rich text content
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
  'iframe', // Only for YouTube/Vimeo embeds
]);

// Allowed attributes per tag
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'class']),
  iframe: new Set(['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow']),
  '*': new Set(['class', 'id', 'style']),
};

// Allowed URL schemes
const ALLOWED_SCHEMES = new Set(['http', 'https', 'mailto', 'tel', 'data']);

// Allowed iframe domains (for video embeds)
const ALLOWED_IFRAME_DOMAINS = new Set([
  'youtube.com', 'www.youtube.com', 'youtu.be',
  'vimeo.com', 'player.vimeo.com',
  'drive.google.com',
]);

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Removes: script tags, event handlers, javascript: URLs, dangerous tags.
 * Preserves: safe formatting, links, images, tables, video embeds.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Remove script tags and their content
  let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments (may contain IE conditional comments with scripts)
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Remove event handler attributes (onclick, onload, onerror, etc.)
  result = result.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');

  // Remove javascript: URLs
  result = result.replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"');
  result = result.replace(/(href|src)\s*=\s*'javascript:[^']*'/gi, "$1='#'");
  result = result.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1="#"');

  // Remove data: URLs except for images
  result = result.replace(/(<img[^>]*src\s*=\s*)"data:(?!image\/)[^"]*"/gi, '$1"#"');

  // Process iframe tags — only allow whitelisted domains
  result = result.replace(/<iframe\b[^>]*src\s*=\s*"([^"]*)"[^>]*>/gi, (match, src) => {
    try {
      const url = new URL(src);
      if (ALLOWED_IFRAME_DOMAINS.has(url.hostname)) {
        return match; // Keep whitelisted embed
      }
    } catch {}
    return ''; // Remove non-whitelisted iframe
  });

  // Remove any remaining dangerous tags (object, embed, applet, base, form, input, etc.)
  const dangerousTags = /<\/?(object|embed|applet|base|form|input|button|textarea|select|option|link|meta|base)\b[^>]*>/gi;
  result = result.replace(dangerousTags, '');

  return result;
}

/**
 * Strips ALL HTML tags — for use in plain text contexts (titles, names, etc.)
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove all tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Escapes HTML special characters for safe display.
 * Use when outputting user input in HTML context.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
