import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { venues, events, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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
  const allVenues = db.select().from(venues).where(eq(venues.schoolId, schoolId)).orderBy(desc(venues.createdAt)).all();
  // Get upcoming events per venue
  const allEvents = db.select().from(events).where(eq(events.schoolId, schoolId)).all();
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = allEvents.filter(e => e.startDate >= today);
  const enriched = allVenues.map(v => ({
    ...v,
    upcomingEvents: upcomingEvents.filter(e => e.venue === v.name).length,
  }));
  return new Response(JSON.stringify(enriched), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.name) return new Response(JSON.stringify({ error: 'name required' }), { status: 400 });
  const db = getDb();
  const result = db.insert(venues).values({
    schoolId, name: data.name,
    type: data.type || 'other',
    capacity: data.capacity || null,
    location: data.location || null,
    facilities: (data.facilities || []) as any,
    status: data.status || 'available',
    notes: data.notes || null,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
  const db = getDb();
  db.update(venues).set({
    name: data.name, type: data.type, capacity: data.capacity,
    location: data.location, facilities: data.facilities,
    status: data.status, notes: data.notes, updatedAt: new Date(),
  }).where(and(eq(venues.id, data.id), eq(venues.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(venues).where(and(eq(venues.id, id), eq(venues.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
