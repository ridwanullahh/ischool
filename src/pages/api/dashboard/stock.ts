import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { inventoryItems, suppliers, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';


export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'inventory.view');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const items = db.select().from(inventoryItems).where(eq(inventoryItems.schoolId, schoolId)).orderBy(desc(inventoryItems.createdAt)).all();
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'inventory.create');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.name) return new Response(JSON.stringify({ error: 'name required' }), { status: 400 });
  const db = getDb();

  if (data.action === 'adjust_stock') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    const item = db.select().from(inventoryItems).where(and(eq(inventoryItems.id, data.id), eq(inventoryItems.schoolId, schoolId))).get();
    if (!item) return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404 });
    const newQty = (item.quantity || 0) + (data.adjustment || 0);
    db.update(inventoryItems).set({ quantity: Math.max(0, newQty), updatedAt: new Date() }).where(eq(inventoryItems.id, data.id)).run();
    return new Response(JSON.stringify({ success: true, newQuantity: Math.max(0, newQty) }), { headers: { 'Content-Type': 'application/json' } });
  }

  const result = db.insert(inventoryItems).values({
    schoolId, name: data.name,
    category: data.category || null,
    quantity: data.quantity || 0,
    reorderLevel: data.reorderLevel || 5,
    unit: data.unit || null,
    supplier: data.supplier || null,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'inventory.edit');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(inventoryItems).set({
    name: data.name, category: data.category, quantity: data.quantity,
    reorderLevel: data.reorderLevel, unit: data.unit, supplier: data.supplier,
    updatedAt: new Date(),
  }).where(and(eq(inventoryItems.id, data.id), eq(inventoryItems.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'inventory.delete');
  if (denied) return denied;
  const schoolId = await getSchoolIdForApi(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
