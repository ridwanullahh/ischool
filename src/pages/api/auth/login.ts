import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { users } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie } from '../../../lib/auth.js';
import { verifyTOTP } from '../../../lib/totp.js';
import { logAudit } from '../../../lib/security.js';
import { isPlatformAdmin, createPlatformAdminSession } from '../../../lib/platform-admin.js';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = form.get('email')?.toString().trim();
  const password = form.get('password')?.toString();
  const twoFactorCode = form.get('two_factor_code')?.toString();
  const redirectTo = form.get('redirect')?.toString() || '/dashboard';

  if (!email || !password) {
    return redirect('/auth/login?error=' + encodeURIComponent('Email and password are required'));
  }

  if (isPlatformAdmin(email, password)) {
    const { sessionId } = await createPlatformAdminSession(email);
    const headers = new Headers();
    setSessionCookie(headers, sessionId);
    headers.set('Location', '/admin');
    logAudit({ userId: 0, action: 'platform_admin_login', details: { email } });
    return new Response(null, { status: 302, headers });
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.email, email)).get();

  if (!user) {
    return redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    logAudit({ userId: user.id, action: 'login_failed', details: { reason: 'invalid_password' } });
    return redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorCode) {
      const headers = new Headers();
      headers.append('Set-Cookie', `pending_2fa_user=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`);
      headers.set('Location', '/auth/2fa-challenge?redirect=' + encodeURIComponent(redirectTo));
      return new Response(null, { status: 302, headers });
    }

    if (!verifyTOTP(user.twoFactorSecret, twoFactorCode)) {
      return redirect('/auth/2fa-challenge?error=' + encodeURIComponent('Invalid 2FA code') + '&redirect=' + encodeURIComponent(redirectTo));
    }
  }

  const sessionId = await createSession(user.id);
  const headers = new Headers();
  setSessionCookie(headers, sessionId);
  headers.set('Location', redirectTo);
  logAudit({ userId: user.id, action: 'login_success' });
  return new Response(null, { status: 302, headers });
};
