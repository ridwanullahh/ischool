import { defineMiddleware } from 'astro:middleware';
import { getSessionIdFromCookie, validateSession } from './auth.js';
import { getDb } from './db/index.js';
import { schools, schoolMembers, schoolSubscriptions, subscriptionPlans } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from './security.js';

const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/password-reset'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (authPaths.some(p => pathname.startsWith(p))) {
    const ip = context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || context.clientAddress?.address || 'unknown';
    const { allowed, remaining, resetAt } = checkRateLimit(`auth:${ip}`, 10, 60000);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      });
    }
  }

  if (pathname.startsWith('/api/')) {
    const ip = context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || context.clientAddress?.address || 'unknown';
    const { allowed } = checkRateLimit(`api:${ip}`, 120, 60000);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const sessionId = getSessionIdFromCookie(context.request);
  let user = null;

  if (sessionId) {
    const result = await validateSession(sessionId);
    if (result) user = result.user;
  }

  context.locals.user = user;

  if (user && user.role === 'school_admin' && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth') && !pathname.startsWith('/api/') && !pathname.startsWith('/portal')) {
    const db2 = getDb();
    const hasMembership = db2.select().from(schoolMembers).where(eq(schoolMembers.userId, user.id)).get();
    if (!hasMembership) {
      return context.redirect('/onboarding');
    }
  }

  if (pathname.startsWith('/admin') && (!user || user.role !== 'super_admin')) {
    return context.redirect('/auth/login?redirect=/admin');
  }

  if (pathname.startsWith('/portal') && !user) {
    return context.redirect('/auth/login?redirect=/portal');
  }

  if (pathname.startsWith('/portal') && user) {
    const portalRoles = ['student', 'parent', 'teacher', 'school_admin'];
    if (!portalRoles.includes(user.role)) {
      return context.redirect('/dashboard');
    }
  }

  if (pathname.startsWith('/dashboard') && !user) {
    return context.redirect('/auth/login?redirect=/dashboard');
  }

  if (pathname.startsWith('/api/admin') && (!user || user.role !== 'super_admin')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname.startsWith('/api/dashboard') && !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  if (pathname.startsWith('/api/portal') && !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
});

export function getSchoolForUser(userId: string) {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  if (!membership) return null;
  const school = db.select().from(schools).where(eq(schools.id, membership.schoolId)).get();
  return school || null;
}

export function checkSubscription(schoolId: number): { active: boolean; plan: typeof subscriptionPlans.$inferSelect | null; status: string } {
  const db = getDb();
  const sub = db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, schoolId)).get();
  if (!sub) return { active: false, plan: null, status: 'none' };

  const plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).get();

  if (sub.status === 'active' || sub.status === 'trial') {
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
      return { active: true, plan: plan || null, status: sub.status };
    }
    if (sub.status === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) {
      return { active: true, plan: plan || null, status: 'trial' };
    }
  }

  return { active: false, plan: plan || null, status: sub.status };
}
