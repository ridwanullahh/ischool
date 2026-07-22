import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { users } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie } from '../../../lib/auth.js';
import { verifyTOTP } from '../../../lib/totp.js';
import { logAudit } from '../../../lib/security.js';
import { isPlatformAdmin, createPlatformAdminSession } from '../../../lib/platform-admin.js';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const form = await request.formData();
    const email = form.get('email')?.toString().trim().toLowerCase();
    const password = form.get('password')?.toString();
    const twoFactorCode = form.get('two_factor_code')?.toString();
    const redirectTo = form.get('redirect')?.toString() || '/dashboard';

    if (!email || !password) {
      return redirect('/auth/login?error=' + encodeURIComponent('Email and password are required'));
    }

    // Platform admin login (env-defined super admins)
    if (isPlatformAdmin(email, password)) {
      try {
        const { sessionId } = await createPlatformAdminSession(email);
        const headers = new Headers();
        setSessionCookie(headers, sessionId);
        headers.set('Location', '/admin');
        logAudit({ userId: 0, action: 'platform_admin_login', details: { email } });
        return new Response(null, { status: 302, headers });
      } catch (e: any) {
        console.error('[login] Platform admin session error:', e?.message || e);
        return redirect('/auth/login?error=' + encodeURIComponent('Unable to start admin session. Please try again.'));
      }
    }

    const db = getDb();
    let user: any = null;
    try {
      user = await db.select().from(users).where(eq(users.email, email)).get();
    } catch (e: any) {
      console.error('[login] User lookup error:', e?.message || e);
      return redirect('/auth/login?error=' + encodeURIComponent('Unable to sign in right now. Please try again in a moment.'));
    }

    if (!user) {
      return redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
    }

    // Normalize snake_case fields from Lightbase → camelCase
    const userPasswordHash = user.passwordHash ?? user.password_hash;
    const userRole = user.role;
    const userId = user.id;
    const userName = user.name || user.email;
    const twoFactorEnabled = user.twoFactorEnabled ?? user.two_factor_enabled ?? false;
    const twoFactorSecret = user.twoFactorSecret ?? user.two_factor_secret;

    const valid = await verifyPassword(password, userPasswordHash);
    if (!valid) {
      logAudit({ userId, action: 'login_failed', details: { reason: 'invalid_password' } });
      return redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password'));
    }

    if (twoFactorEnabled && twoFactorSecret) {
      if (!twoFactorCode) {
        const headers = new Headers();
        headers.append('Set-Cookie', `pending_2fa_user=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`);
        headers.set('Location', '/auth/2fa-challenge?redirect=' + encodeURIComponent(redirectTo));
        return new Response(null, { status: 302, headers });
      }

      const validTotp = verifyTOTP(twoFactorSecret, twoFactorCode);
      if (!validTotp) {
        return redirect('/auth/2fa-challenge?error=' + encodeURIComponent('Invalid 2FA code') + '&redirect=' + encodeURIComponent(redirectTo));
      }
    }

    const sessionId = await createSession(userId);
    const headers = new Headers();
    setSessionCookie(headers, sessionId);

    // Role-based redirect: students/teachers/parents go to /portal, admins to /dashboard
    let finalRedirect = redirectTo;
    if (redirectTo === '/dashboard' || redirectTo === '/portal') {
      if (userRole === 'student') finalRedirect = '/portal/student';
      else if (userRole === 'teacher') finalRedirect = '/portal/teacher';
      else if (userRole === 'parent') finalRedirect = '/portal/parent';
      else finalRedirect = '/dashboard'; // school_admin, super_admin, etc.
    }

    headers.set('Location', finalRedirect);
    logAudit({ userId, action: 'login_success' });
    return new Response(null, { status: 302, headers });
  } catch (e: any) {
    // Catch-all — never leak raw JSON error to user; redirect to login with friendly message
    console.error('[login] Unhandled error:', e?.message || e, e?.stack || '');
    return redirect('/auth/login?error=' + encodeURIComponent('An unexpected error occurred. Please try again.'));
  }
};
