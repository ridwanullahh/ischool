import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtml, escapeHtml } from '../lib/sanitize.js';

describe('HTML Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('<p>Hello</p>');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x.jpg" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
    expect(result).toContain('src="x.jpg"');
  });

  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('should remove style tags', () => {
    const input = '<style>body{display:none}</style><p>Hi</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<style>');
    expect(result).toContain('<p>Hi</p>');
  });

  it('should allow safe formatting', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<strong>');
    expect(result).toContain('<p>');
  });

  it('should allow YouTube iframes', () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).toContain('youtube.com');
    expect(result).toContain('<iframe');
  });

  it('should block non-whitelisted iframes', () => {
    const input = '<iframe src="https://evil.com/hack"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('evil.com');
    expect(result).not.toContain('<iframe');
  });

  it('should remove HTML comments', () => {
    const input = '<!-- comment --><p>Text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<!--');
    expect(result).toContain('<p>Text</p>');
  });

  it('should remove dangerous tags', () => {
    const input = '<form><input name="x"><p>Text</p></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<form>');
    expect(result).not.toContain('<input');
    expect(result).toContain('<p>Text</p>');
  });

  it('should handle empty input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as any)).toBe('');
  });
});

describe('stripHtml', () => {
  it('should remove all tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('should decode entities', () => {
    expect(stripHtml('&lt;script&gt;')).toBe('<script>');
  });

  it('should handle empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('should escape special characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('should escape quotes', () => {
    expect(escapeHtml('"hello" \'world\'')).toBe('&quot;hello&quot; &#39;world&#39;');
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should handle empty input', () => {
    expect(escapeHtml('')).toBe('');
  });
});
