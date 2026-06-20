import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { getDb } from './db/index.js';
import { users, sessions } from './db/schema.js';
import { eq } from 'drizzle-orm';

const SESSION_DURATION = 60 * 60 * 24 * 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const id = nanoid(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  db.insert(sessions).values({ id, userId, expiresAt }).run();
  return id;
}

export async function validateSession(sessionId: string) {
  const db = getDb();
  const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();

  if (!session) return null;

  if (new Date() > session.expiresAt) {
    db.delete(sessions).where(eq(sessions.id, sessionId)).run();
    return null;
  }

  const user = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    avatarUrl: users.avatarUrl,
  }).from(users).where(eq(users.id, session.userId)).get();

  if (!user) return null;

  const newExpiry = new Date(Date.now() + SESSION_DURATION * 1000);
  db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId)).run();

  return { session, user };
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, sessionId)).run();
}

export function setSessionCookie(headers: Headers, sessionId: string): void {
  headers.append('Set-Cookie', `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION}`);
}

export function clearSessionCookie(headers: Headers): void {
  headers.append('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

export function getSessionIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('session='));
  return match ? match.split('=')[1] : null;
}
