import type { APIRoute } from 'astro';
import { guardPermission } from '../../../lib/rbac.js';
import { getDb } from '../../../lib/db/index.js';
import { feeStructures, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function getUserSchoolId(userId: number) {
  const db = getDb();
  const m = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return m?.schoolId || null;
}

export const GET: APIRoute = async ({ locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'fees.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = await getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const allFees = db.select().from(feeStructures).where(eq(feeStructures.schoolId, schoolId)).all();
  return new Response(JSON.stringify(allFees), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'fees.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = await getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  if (!data.name || !data.totalAmount) return new Response(JSON.stringify({ error: 'Name and total amount are required' }), { status: 400 });

  const items = (typeof data.items === 'object' ? data.items : (typeof data.items === 'string' ? (() => { try { return JSON.parse(data.items); } catch { return []; } })() : [])) as any;

  const result = db.insert(feeStructures).values({
    ...data,
    schoolId,
    items,
    totalAmount: Number(data.totalAmount),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'fees.view');
  if (denied) return denied;
  const db = getDb();
  const schoolId = await getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(feeStructures).where(eq(feeStructures.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  db.delete(feeStructures).where(eq(feeStructures.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
