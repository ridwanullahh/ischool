import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../lib/db/index.js';
import { users, passwordResetTokens } from '../../../lib/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { hashPassword } from '../../../lib/auth.js';
import { validateRequired, validateLength, logAudit } from '../../../lib/security.js';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.token || !data.password) {
    return new Response(JSON.stringify({ error: 'Token and new password are required' }), { status: 400 });
  }

  const validationErr = validateLength(data.password, 8, 128, 'password');
  if (validationErr) return new Response(JSON.stringify({ error: validationErr }), { status: 400 });

  const db = getDb();
  const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
  const resetRecord = db.select().from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, tokenHash), gt(passwordResetTokens.expiresAt, new Date())))
    .get();

  if (!resetRecord || resetRecord.used) {
    return new Response(JSON.stringify({ error: 'Invalid or expired reset token' }), { status: 400 });
  }

  const passwordHash = await hashPassword(data.password);
  db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, resetRecord.userId)).run();
  db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, resetRecord.id)).run();

  logAudit({ userId: resetRecord.userId, action: 'password_reset' });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
