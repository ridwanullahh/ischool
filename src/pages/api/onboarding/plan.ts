import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getDb } from '../../../lib/db/index.js';
import { schools, schoolMembers, subscriptionPlans, schoolSubscriptions } from '../../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const planSlug = form.get('planSlug')?.toString() || 'free';
  const billingCycle = form.get('billingCycle')?.toString() || 'annual';

  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, result.user.id)).get();
  if (!membership) return new Response('No school found', { status: 404 });

  const plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, planSlug)).get();
  if (!plan) return new Response('Invalid plan', { status: 400 });

  const existing = db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, membership.schoolId)).get();
  if (!existing) {
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const status = plan.isFree ? 'active' : 'trial';
    const trialEnd = plan.isFree ? periodEnd : new Date(now.getTime() + plan.trialDays * 86400000);

    db.insert(schoolSubscriptions).values({
      schoolId: membership.schoolId,
      planId: plan.id,
      status,
      billingCycle: billingCycle as 'monthly' | 'annual',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: (plan.isFree ? periodEnd : trialEnd).toISOString(),
      autoRenew: !plan.isFree,
    }).run();
  }

  return new Response(null, { status: 302, headers: { Location: '/onboarding/about' } });
};
