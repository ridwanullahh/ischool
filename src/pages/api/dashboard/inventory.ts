import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { assets, inventoryItems, schoolMembers } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

async function getUserSchoolId(userId: number) {
  const db = getDb();
  const m = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return m?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const exportType = url.searchParams.get('exportType') || 'assets';
    if (exportType === 'items') {
      const rows = db.select().from(inventoryItems).where(eq(inventoryItems.schoolId, schoolId)).all();
      const columns: CsvColumn[] = [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'reorderLevel', label: 'Reorder Level' },
        { key: 'unit', label: 'Unit' },
        { key: 'supplier', label: 'Supplier' },
      ];
      return csvResponse(toCsv(rows, columns), 'inventory-items.csv');
    }
    const rows = db.select().from(assets).where(eq(assets.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'serialNumber', label: 'Serial Number' },
      { key: 'purchaseDate', label: 'Purchase Date' },
      { key: 'purchasePrice', label: 'Price' },
      { key: 'condition', label: 'Condition' },
      { key: 'location', label: 'Location' },
    ];
    return csvResponse(toCsv(rows, columns), 'assets.csv');
  }

  const allAssets = db.select().from(assets).where(eq(assets.schoolId, schoolId)).all();
  const allItems = db.select().from(inventoryItems).where(eq(inventoryItems.schoolId, schoolId)).all();

  return new Response(JSON.stringify({ assets: allAssets, items: allItems }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const data = await request.json();
  const itemType = data.type;
  delete data.type;

  if (itemType === 'asset') {
    if (!data.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    const result = db.insert(assets).values({
      ...data,
      schoolId,
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : null,
      currentValue: data.currentValue ? Number(data.currentValue) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } else {
    if (!data.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    const result = db.insert(inventoryItems).values({
      ...data,
      schoolId,
      quantity: data.quantity ? Number(data.quantity) : 0,
      reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id, type } = await request.json();

  if (type === 'item') {
    const existing = db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).get();
    if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    db.delete(inventoryItems).where(eq(inventoryItems.id, id)).run();
  } else {
    const existing = db.select().from(assets).where(eq(assets.id, id)).get();
    if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    db.delete(assets).where(eq(assets.id, id)).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
