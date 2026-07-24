import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb, isLightbase } from './db/index.js';
import { getLightbaseDb } from './db/lightbase-adapter.js';
import { users, sessions } from './db/schema.js';
import { eq } from 'drizzle-orm';

const SESSION_DURATION = 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Defensive: hash must be a non-empty string. If a user row was created
  // without a password hash (e.g. legacy data), bcrypt.compare would throw
  // on undefined/null — return false instead.
  if (!hash || typeof hash !== 'string') return false;
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const id = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  if (isLightbase()) {
    // Lightbase: id is auto-generated; we store the session token in `session_id`
    await getLightbaseDb().raw.insert('sessions', {
      session_id: id,
      user_id: String(userId),
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });
  } else {
    // SQLite: id is the session token
    await db.insert(sessions).values({ id, userId, expiresAt } as any).run();
  }
  return id;
}

export async function validateSession(sessionId: string) {
  if (!sessionId) return null;

  let session: any = null;

  if (isLightbase()) {
    // Lightbase: query by session_id field
    try {
      const result = await getLightbaseDb().raw.query('sessions', {
        filter: { field: 'session_id', op: 'eq', value: sessionId },
        limit: 1,
      });
      session = result.data?.[0] || null;
    } catch (e: any) {
      console.error('[auth.validateSession] Lightbase lookup error:', e?.message || e);
      return null;
    }
  } else {
    const db = getDb();
    try {
      session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
    } catch (e: any) {
      console.error('[auth.validateSession] lookup error:', e?.message || e);
      return null;
    }
  }

  if (!session) return null;

  const sessionUserId = session.userId ?? session.user_id;
  const sessionExpiresAt = session.expiresAt ?? session.expires_at;

  if (new Date() > new Date(sessionExpiresAt)) {
    // Delete expired session
    if (isLightbase() && session.id) {
      try { await getLightbaseDb().raw.delete('sessions', session.id); } catch { /* ignore */ }
    } else {
      const db = getDb();
      try { await db.delete(sessions).where(eq(sessions.id, sessionId)).run(); } catch { /* ignore */ }
    }
    return null;
  }

  // Look up the user
  let user: any = null;
  if (isLightbase()) {
    try {
      user = await getLightbaseDb().raw.query('users', {
        filter: { field: 'id', op: 'eq', value: sessionUserId },
        limit: 1,
      });
      user = user.data?.[0] || null;
    } catch (e: any) {
      console.error('[auth.validateSession] user lookup error:', e?.message || e);
      return null;
    }
  } else {
    const db = getDb();
    try {
      user = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        avatarUrl: users.avatarUrl,
      }).from(users).where(eq(users.id, sessionUserId)).get();
    } catch (e: any) {
      console.error('[auth.validateSession] user lookup error:', e?.message || e);
      return null;
    }
  }

  if (!user) return null;

  const normalizedUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
  };

  // Refresh session expiry
  const newExpiry = new Date(Date.now() + SESSION_DURATION * 1000);
  if (isLightbase() && session.id) {
    try {
      await getLightbaseDb().raw.update('sessions', session.id, {
        expires_at: newExpiry.toISOString(),
      });
    } catch { /* ignore */ }
  } else {
    const db = getDb();
    try { await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId)).run(); } catch { /* ignore */ }
  }

  return { session, user: normalizedUser };
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isLightbase()) {
    try {
      const result = await getLightbaseDb().raw.query('sessions', {
        filter: { field: 'session_id', op: 'eq', value: sessionId },
        limit: 1,
      });
      const session = result.data?.[0];
      if (session?.id) {
        await getLightbaseDb().raw.delete('sessions', session.id);
      }
    } catch (e: any) {
      console.error('[auth.deleteSession] error:', e?.message || e);
    }
  } else {
    const db = getDb();
    try {
      await db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    } catch (e: any) {
      console.error('[auth.deleteSession] error:', e?.message || e);
    }
  }
}

export function setSessionCookie(headers: Headers, sessionId: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // SameSite=Strict prevents CSRF (Phase 1.3.3)
  headers.append('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=${SESSION_DURATION}`);
}

export function clearSessionCookie(headers: Headers): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  headers.append('Set-Cookie', `session=; Path=/; HttpOnly; SameSite=Strict${secure}; Max-Age=0`);
}

export function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('session='));
  return match ? match.split('=')[1] : null;
}
