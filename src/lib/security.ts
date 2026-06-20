import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (key && key.length === 64) return Buffer.from(key, 'hex');
  if (key) return crypto.scryptSync(key, 'ischool-salt', KEY_LENGTH);
  return crypto.scryptSync('ischool-default-key-change-me', 'ischool-salt', KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts[0].length === IV_LENGTH * 2 && parts[1].length === TAG_LENGTH * 2;
}

// PII detection and stripping
const PII_PATTERNS: { name: string; regex: RegExp; replacement: string }[] = [
  { name: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
  { name: 'phone', regex: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g, replacement: '[PHONE_REDACTED]' },
  { name: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
  { name: 'credit_card', regex: /\b(?:\d{4}[- ]?){3}\d{4}\b/g, replacement: '[CARD_REDACTED]' },
  { name: 'ip_address', regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[IP_REDACTED]' },
];

export function stripPII(text: string): { cleaned: string; detected: string[] } {
  let cleaned = text;
  const detected: string[] = [];
  for (const p of PII_PATTERNS) {
    if (p.regex.test(cleaned)) {
      detected.push(p.name);
      cleaned = cleaned.replace(p.regex, p.replacement);
    }
    p.regex.lastIndex = 0;
  }
  return { cleaned, detected };
}

// Input sanitization
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[sanitizeHtml(key)] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[sanitizeHtml(key)] = sanitizeObject(value);
    } else {
      result[sanitizeHtml(key)] = value;
    }
  }
  return result;
}

// Input validation helpers
export function validateRequired(data: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLength(value: string, min: number, max: number, field: string): string | null {
  if (value.length < min) return `${field} must be at least ${min} characters`;
  if (value.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

export function validateEnum(value: string, allowed: string[], field: string): string | null {
  if (!allowed.includes(value)) return `${field} must be one of: ${allowed.join(', ')}`;
  return null;
}

export function validateNumber(value: any, min: number, max: number, field: string): string | null {
  const num = Number(value);
  if (isNaN(num)) return `${field} must be a number`;
  if (num < min) return `${field} must be at least ${min}`;
  if (num > max) return `${field} must be at most ${max}`;
  return null;
}

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  entry.count++;
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  if (!allowed && rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }
  return { allowed, remaining, resetAt: entry.resetAt };
}

// CSRF protection
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const csrfStore = new Map<string, { token: string; expiresAt: number }>();

export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken();
  csrfStore.set(sessionId, { token, expiresAt: Date.now() + 3600000 });
  return token;
}

export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfStore.get(sessionId);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    csrfStore.delete(sessionId);
    return false;
  }
  const valid = crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token));
  return valid;
}

// Audit logging
import { getDb } from './db/index.js';
import { auditLogs } from './db/schema.js';

export function logAudit(opts: { schoolId?: number; userId?: number; action: string; entity?: string; entityId?: number; details?: any; ipAddress?: string }) {
  try {
    const db = getDb();
    db.insert(auditLogs).values({
      schoolId: opts.schoolId || null,
      userId: opts.userId || null,
      action: opts.action,
      entity: opts.entity || null,
      entityId: opts.entityId || null,
      details: opts.details ? JSON.stringify(opts.details) : null,
      ipAddress: opts.ipAddress || null,
    }).run();
  } catch (e) {
    console.error('[AUDIT] Failed to log:', e);
  }
}
