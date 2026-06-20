import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getDb } from '../../../lib/db/index.js';
import { users, passwordResetTokens } from '../../../lib/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { notifyPasswordReset } from '../../../lib/notifications.js';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();

  if (!data.email || typeof data.email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.email, data.email.trim())).get();

  if (!user) {
    return new Response(JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent.' }), { headers: { 'Content-Type': 'application/json' } });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000);

  db.insert(passwordResetTokens).values({
    userId: user.id,
    token: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt,
  }).run();

  const resetUrl = `${request.headers.get('origin') || 'http://localhost:4321'}/auth/reset-password?token=${token}`;
  await notifyPasswordReset(user.email, user.name, resetUrl);

  return new Response(JSON.stringify({ success: true, message: 'If the email exists, a reset link has been sent.' }), { headers: { 'Content-Type': 'application/json' } });
};
