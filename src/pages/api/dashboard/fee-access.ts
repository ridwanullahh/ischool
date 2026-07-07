/**
 * Fee-Access Configuration API
 *
 * POST - save or update the fee-access rule for the school
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { feeAccessRules } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const denied = guardPermission(user, 'fees.manage');
  if (denied) return denied;

  const body = await request.json();
  const { schoolId, enabled, gracePeriodDays, thresholdAmount, blockedModules, blockMessage } = body;

  if (!schoolId || schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'Invalid school' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();

  // Check if a rule already exists for this school
  const existing = db.select().from(feeAccessRules).where(eq(feeAccessRules.schoolId, schoolId)).get();

  if (existing) {
    db.update(feeAccessRules).set({
      enabled: !!enabled,
      gracePeriodDays: gracePeriodDays || 0,
      thresholdAmount: thresholdAmount || 0,
      blockedModules: JSON.stringify(blockedModules || []),
      blockMessage: blockMessage || null,
      updatedAt: new Date(),
    }).where(eq(feeAccessRules.id, existing.id)).run();
  } else {
    db.insert(feeAccessRules).values({
      schoolId,
      enabled: !!enabled,
      gracePeriodDays: gracePeriodDays || 0,
      thresholdAmount: thresholdAmount || 0,
      blockedModules: JSON.stringify(blockedModules || []),
      blockMessage: blockMessage || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run();
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
