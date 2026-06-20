import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { hostels, hostelRooms, schoolMembers } from '../../../lib/db/schema.js';
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
    const allHostels = db.select().from(hostels).where(eq(hostels.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'name', label: 'Hostel Name' },
      { key: 'type', label: 'Type' },
      { key: 'totalRooms', label: 'Total Rooms' },
      { key: 'totalBeds', label: 'Total Beds' },
    ];
    return csvResponse(toCsv(allHostels, columns), 'hostels.csv');
  }

  const allHostels = db.select().from(hostels).where(eq(hostels.schoolId, schoolId)).all();
  const hostelIds = allHostels.map(h => h.id);
  const rooms = hostelIds.length > 0 ? db.select().from(hostelRooms).all().filter(r => hostelIds.includes(r.hostelId)) : [];

  return new Response(JSON.stringify({ hostels: allHostels, rooms }), {
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
  if (!data.name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });

  const result = db.insert(hostels).values({
    ...data,
    schoolId,
    totalRooms: data.totalRooms ? Number(data.totalRooms) : 0,
    totalBeds: data.totalBeds ? Number(data.totalBeds) : 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const schoolId = await getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 403 });

  const { id } = await request.json();
  const existing = db.select().from(hostels).where(eq(hostels.id, id)).get();
  if (!existing || existing.schoolId !== schoolId) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  db.delete(hostels).where(eq(hostels.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
