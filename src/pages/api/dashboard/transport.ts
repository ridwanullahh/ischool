import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { vehicles, transportRoutes, schoolMembers } from '../../../lib/db/schema.js';
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
    const exportType = url.searchParams.get('exportType') || 'vehicles';
    if (exportType === 'routes') {
      const rows = db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, schoolId)).all();
      const columns: CsvColumn[] = [
        { key: 'name', label: 'Route Name' },
        { key: 'schedule', label: 'Schedule' },
      ];
      return csvResponse(toCsv(rows, columns), 'transport-routes.csv');
    }
    const rows = db.select().from(vehicles).where(eq(vehicles.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'type', label: 'Type' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(rows, columns), 'vehicles.csv');
  }

  const allVehicles = db.select().from(vehicles).where(eq(vehicles.schoolId, schoolId)).all();
  const allRoutes = db.select().from(transportRoutes).where(eq(transportRoutes.schoolId, schoolId)).all();

  return new Response(JSON.stringify({ vehicles: allVehicles, routes: allRoutes }), {
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

  if (itemType === 'vehicle') {
    if (!data.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    const result = db.insert(vehicles).values({
      ...data,
      schoolId,
      capacity: data.capacity ? Number(data.capacity) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } else {
    if (!data.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });
    const stops = typeof data.stops === 'string' ? data.stops : JSON.stringify(data.stops || []);
    const schedule = typeof data.schedule === 'string' ? data.schedule : JSON.stringify(data.schedule || null);
    const result = db.insert(transportRoutes).values({
      ...data,
      schoolId,
      vehicleId: data.vehicleId ? Number(data.vehicleId) : null,
      stops,
      schedule,
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

  if (type === 'route') {
    const existing = db.select().from(transportRoutes).where(eq(transportRoutes.id, id)).get();
    if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    db.delete(transportRoutes).where(eq(transportRoutes.id, id)).run();
  } else {
    const existing = db.select().from(vehicles).where(eq(vehicles.id, id)).get();
    if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    db.delete(vehicles).where(eq(vehicles.id, id)).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
