import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { coupons } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  const body = await request.json();
  const user = (request as any).locals?.user;

  const [coupon] = db.insert(coupons).values({
    code: body.code.toUpperCase(),
    name: body.name,
    description: body.description || '',
    type: body.type,
    value: body.value,
    minAmount: body.minAmount || 0,
    maxDiscount: body.maxDiscount || null,
    applicablePlans: JSON.stringify(body.applicablePlans || []),
    maxUses: body.maxUses || null,
    startDate: body.startDate,
    endDate: body.endDate || null,
    isActive: true,
    createdBy: user?.id || null,
  }).returning().all();

  return new Response(JSON.stringify(coupon), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  const body = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.name !== undefined) updates.name = body.name;
  if (body.value !== undefined) updates.value = body.value;
  if (body.maxUses !== undefined) updates.maxUses = body.maxUses;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  updates.updatedAt = new Date();

  db.update(coupons).set(updates).where(eq(coupons.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
  db.update(coupons).set({ isActive: false }).where(eq(coupons.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
