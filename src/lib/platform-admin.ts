import { createSession, setSessionCookie } from './auth.js';

interface PlatformAdmin {
  email: string;
  password: string;
}

function getPlatformAdmins(): PlatformAdmin[] {
  const raw = process.env.PLATFORM_ADMINS || '';
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

export async function createPlatformAdminSession(email: string): Promise<{ sessionId: string; user: { id: any; email: string; name: string; role: string } }> {
  const { getDb, isLightbase } = await import('./db/index.js');
  const { getLightbaseDb } = await import('./db/lightbase-adapter.js');
  const { users } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  const db = getDb();

  let user: any = null;
  try {
    if (isLightbase()) {
      // Lightbase: query by email directly via raw client
      const result = await getLightbaseDb().raw.query('users', {
        filter: { field: 'email', op: 'eq', value: email.toLowerCase() },
        limit: 1,
      });
      user = result.data?.[0] || null;
    } else {
      user = await db.select().from(users).where(eq(users.email, email)).get();
    }
  } catch (e: any) {
    console.error('[platform-admin] lookup error:', e?.message || e);
    throw new Error('Failed to look up platform admin');
  }

  if (!user) {
    const bcrypt = await import('bcryptjs');
    if (isLightbase()) {
      user = await getLightbaseDb().raw.insert('users', {
        email: email.toLowerCase(),
        password_hash: await bcrypt.default.hash(Math.random().toString(36), 12),
        name: 'Platform Admin',
        role: 'super_admin',
        is_active: true,
      });
    } else {
      user = await db.insert(users).values({
        email,
        passwordHash: await bcrypt.default.hash(Math.random().toString(36), 12),
        name: 'Platform Admin',
        role: 'super_admin',
      }).returning();
    }
  } else if (user.role !== 'super_admin') {
    if (isLightbase() && user.id) {
      await getLightbaseDb().raw.update('users', user.id, { role: 'super_admin' });
    } else {
      await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, user.id)).run();
    }
    user = { ...user, role: 'super_admin' };
  }

  const sessionId = await createSession(user.id);
  return {
    sessionId,
    user: { id: user.id, email: user.email, name: user.name, role: 'super_admin' },
  };
}
