import { defineMiddleware } from 'astro:middleware';
import { getSessionIdFromCookie, validateSession } from './auth.js';
import { getDb } from './db/index.js';
import { schools, schoolMembers, schoolSubscriptions, subscriptionPlans } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from './security.js';
import { getUserPermissions } from './rbac.js';
import { isStudentBlockedFromModule } from './fee-access.js';

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

  // RBAC enrichment: resolve the user's schoolId and effective permissions,
  // then attach them to locals.user so endpoints and pages can call
  // Astro.locals.user.permissions.has('students.view') directly.
  if (user) {
    const db2 = getDb();
    const membership = db2.select().from(schoolMembers).where(eq(schoolMembers.userId, user.id)).get();
    const schoolId = membership?.schoolId ?? null;
    const permissions = getUserPermissions(user.id, schoolId ?? undefined);
    (user as any).schoolId = schoolId;
    (user as any).permissions = permissions;
  }

  context.locals.user = user;

  if (user && user.role === 'school_admin' && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth') && !pathname.startsWith('/api/') && !pathname.startsWith('/portal')) {
    if (!user.schoolId) {
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

    // Fee-access linkage: block students with overdue fees from specific modules
    if (user.role === 'student') {
      // Determine which module the student is trying to access
      let module = '';
      if (pathname.startsWith('/portal/student/assignments') || pathname.startsWith('/portal/student/quizzes') || pathname.startsWith('/portal/student/grades')) {
        module = 'lms';
      } else if (pathname.startsWith('/portal/student/timetable')) {
        module = 'lms';
      } else if (pathname.startsWith('/api/portal/student/')) {
        module = 'lms';
      }

      if (module && isStudentBlockedFromModule(user.id, module)) {
        // For API calls, return JSON error; for pages, redirect to blocked page
        if (pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Fee access restricted', code: 'FEE_BLOCKED' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return context.redirect('/portal/student/fees?blocked=true');
      }
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
