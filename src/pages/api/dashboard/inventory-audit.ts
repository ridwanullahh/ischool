import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { purchaseRequests, suppliers, assets, inventoryItems, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const requests = db.select({
    id: purchaseRequests.id, items: purchaseRequests.items, totalAmount: purchaseRequests.totalAmount,
    reason: purchaseRequests.reason, status: purchaseRequests.status, approvedAt: purchaseRequests.approvedAt,
    createdAt: purchaseRequests.createdAt,
    supplierId: purchaseRequests.supplierId, supplierName: suppliers.name,
  }).from(purchaseRequests)
    .leftJoin(suppliers, eq(purchaseRequests.supplierId, suppliers.id))
    .where(eq(purchaseRequests.schoolId, schoolId))
    .orderBy(desc(purchaseRequests.createdAt)).all();

  // Summary stats for audit
  const assetsCount = db.select({ count: sql<number>`count(*)`, totalValue: sql<number>`coalesce(sum(${assets.currentValue}), 0)` })
    .from(assets).where(eq(assets.schoolId, schoolId)).all()[0];
  const inventoryCount = db.select({ count: sql<number>`count(*)`, totalQty: sql<number>`coalesce(sum(${inventoryItems.quantity}), 0)`, lowStock: sql<number>`sum(case when ${inventoryItems.quantity} <= ${inventoryItems.reorderLevel} then 1 else 0 end)` })
    .from(inventoryItems).where(eq(inventoryItems.schoolId, schoolId)).all()[0];
  const conditionBreakdown = db.select({
    condition: assets.condition, count: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${assets.currentValue}), 0)`,
  }).from(assets).where(eq(assets.schoolId, schoolId)).groupBy(assets.condition).all();

  return new Response(JSON.stringify({
    requests, assetsCount, inventoryCount, conditionBreakdown,
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  const db = getDb();

  if (data.action === 'approve' || data.action === 'reject') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    const status = data.action === 'approve' ? 'approved' : 'rejected';
    db.update(purchaseRequests).set({
      status, approvedBy: user.id, approvedAt: new Date().toISOString(), updatedAt: new Date(),
    }).where(and(eq(purchaseRequests.id, data.id), eq(purchaseRequests.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.items) return new Response(JSON.stringify({ error: 'items required' }), { status: 400 });
  const totalAmount = (data.items as any[]).reduce((s, i) => s + (i.quantity * i.unitPrice || 0), 0);
  const result = db.insert(purchaseRequests).values({
    schoolId, requestedBy: user.id,
    supplierId: data.supplierId || null,
    items: data.items,
    totalAmount,
    reason: data.reason || null,
    status: 'pending',
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(purchaseRequests).where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
