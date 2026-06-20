import { createSession, setSessionCookie } from './auth.js';

interface PlatformAdmin {
  email: string;
  password: string;
}

function getPlatformAdmins(): PlatformAdmin[] {
  const raw = import.meta.env.PLATFORM_ADMINS || '';
  if (!raw) return [];
  return raw.split(',').map(entry => {
    const [email, ...passwordParts] = entry.trim().split(':');
    return { email: email?.trim(), password: passwordParts.join(':').trim() };
  }).filter(a => a.email && a.password);
}

export function isPlatformAdmin(email: string, password: string): boolean {
  const admins = getPlatformAdmins();
  const admin = admins.find(a => a.email.toLowerCase() === email.toLowerCase());
  return admin ? admin.password === password : false;
}

export function getPlatformAdminEmails(): string[] {
  return getPlatformAdmins().map(a => a.email);
}

export async function createPlatformAdminSession(email: string): Promise<{ sessionId: string; user: { id: number; email: string; name: string; role: string } }> {
  const { getDb } = await import('./db/index.js');
  const { users } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  const db = getDb();

  let user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) {
    const bcrypt = await import('bcryptjs');
    [user] = db.insert(users).values({
      email,
      passwordHash: await bcrypt.default.hash(Math.random().toString(36), 12),
      name: 'Platform Admin',
      role: 'super_admin',
    }).returning().all();
  } else if (user.role !== 'super_admin') {
    db.update(users).set({ role: 'super_admin' }).where(eq(users.id, user.id)).run();
    user = { ...user, role: 'super_admin' };
  }

  const sessionId = await createSession(user.id);
  return {
    sessionId,
    user: { id: user.id, email: user.email, name: user.name, role: 'super_admin' },
  };
}
