import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { users } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { generateSecret, verifyTOTP, getTOTPUri } from '../../../lib/totp.js';
import { logAudit } from '../../../lib/security.js';

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const u = db.select({ twoFactorEnabled: users.twoFactorEnabled }).from(users).where(eq(users.id, user.id)).get();
  return new Response(JSON.stringify({ enabled: u?.twoFactorEnabled || false }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const data = await request.json();

  if (data.action === 'setup') {
    const secret = generateSecret();
    db.update(users).set({ twoFactorSecret: secret, twoFactorEnabled: false, updatedAt: new Date() }).where(eq(users.id, user.id)).run();
    const uri = getTOTPUri(secret, user.email);
    return new Response(JSON.stringify({ secret, uri }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'verify_setup') {
    if (!data.token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400 });
    const u = db.select({ twoFactorSecret: users.twoFactorSecret }).from(users).where(eq(users.id, user.id)).get();
    if (!u?.twoFactorSecret) return new Response(JSON.stringify({ error: 'Setup not started' }), { status: 400 });
    if (!verifyTOTP(u.twoFactorSecret, data.token)) return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400 });
    db.update(users).set({ twoFactorEnabled: true, updatedAt: new Date() }).where(eq(users.id, user.id)).run();
    logAudit({ userId: user.id, action: '2fa_enabled' });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'disable') {
    if (!data.token) return new Response(JSON.stringify({ error: 'token required' }), { status: 400 });
    const u = db.select({ twoFactorSecret: users.twoFactorSecret }).from(users).where(eq(users.id, user.id)).get();
    if (!u?.twoFactorSecret || !verifyTOTP(u.twoFactorSecret, data.token)) return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400 });
    db.update(users).set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() }).where(eq(users.id, user.id)).run();
    logAudit({ userId: user.id, action: '2fa_disabled' });
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'verify_login') {
    if (!data.token || !data.userId) return new Response(JSON.stringify({ error: 'token and userId required' }), { status: 400 });
    const u = db.select({ twoFactorSecret: users.twoFactorSecret, twoFactorEnabled: users.twoFactorEnabled }).from(users).where(eq(users.id, data.userId)).get();
    if (!u?.twoFactorEnabled) return new Response(JSON.stringify({ success: true, verified: true }), { headers: { 'Content-Type': 'application/json' } });
    if (!u.twoFactorSecret || !verifyTOTP(u.twoFactorSecret, data.token)) return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), { status: 400 });
    return new Response(JSON.stringify({ success: true, verified: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
};
