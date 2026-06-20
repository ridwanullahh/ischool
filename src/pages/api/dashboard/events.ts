import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { events, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, like } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const db = getDb();

  const action = url.searchParams.get('action');
  if (action === 'export') {
    const allEvents = db.select().from(events).where(eq(events.schoolId, schoolId)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'location', label: 'Location' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
    ];
    return csvResponse(toCsv(allEvents, columns), 'events.csv');
  }

  const allEvents = db.select().from(events).where(eq(events.schoolId, schoolId)).all();
  return new Response(JSON.stringify(allEvents), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.title || !data.startDate || !data.category) {
    return new Response(JSON.stringify({ error: 'title, startDate, and category are required' }), { status: 400 });
  }
  const db = getDb();
  const result = db.insert(events).values({
    schoolId,
    title: data.title,
    description: data.description || null,
    category: data.category,
    startDate: data.startDate,
    endDate: data.endDate || null,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    venue: data.venue || null,
    isRecurring: data.isRecurring || false,
    recurrenceRule: data.recurrenceRule || null,
    audience: data.audience ? JSON.stringify(data.audience) : '[]',
    rsvpRequired: data.rsvpRequired || false,
    imageUrl: data.imageUrl || null,
  }).returning().get();
  return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  const db = getDb();
  const existing = db.select().from(events).where(and(eq(events.id, data.id), eq(events.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404 });
  const { id, schoolId: _, ...updateData } = data;
  if (updateData.audience && typeof updateData.audience === 'object') updateData.audience = JSON.stringify(updateData.audience);
  db.update(events).set({ ...updateData, updatedAt: new Date() }).where(eq(events.id, id)).run();
  const updated = db.select().from(events).where(eq(events.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });
  const { id } = await request.json();
  const db = getDb();
  db.delete(events).where(and(eq(events.id, id), eq(events.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
