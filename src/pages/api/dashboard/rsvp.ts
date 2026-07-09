import type { APIRoute } from 'astro';
import { guardPermission } from '../../../lib/rbac.js';
import { getDb } from '../../../lib/db/index.js';
import { eventRsvps, events, users, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'events.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const eventId = url.searchParams.get('eventId');

  if (eventId) {
    // All RSVPs for an event
    const rsvps = db.select({
      id: eventRsvps.id, response: eventRsvps.response, numberOfGuests: eventRsvps.numberOfGuests,
      notes: eventRsvps.notes, createdAt: eventRsvps.createdAt,
      userId: eventRsvps.userId, userName: users.name, userEmail: users.email,
    }).from(eventRsvps)
      .leftJoin(users, eq(eventRsvps.userId, users.id))
      .where(eq(eventRsvps.eventId, parseInt(eventId)))
      .orderBy(desc(eventRsvps.createdAt)).all();
    return new Response(JSON.stringify(rsvps), { headers: { 'Content-Type': 'application/json' } });
  }

  // Aggregate by event for RSVP-required events only
  const rsvpEvents = db.select({
    id: events.id, title: events.title, startDate: events.startDate, venue: events.venue,
    rsvpRequired: events.rsvpRequired,
  }).from(events).where(and(eq(events.schoolId, schoolId), eq(events.rsvpRequired, 1))).all();

  const enriched = rsvpEvents.map(e => {
    const rsvps = db.select().from(eventRsvps).where(eq(eventRsvps.eventId, e.id)).all();
    return {
      ...e,
      yesCount: rsvps.filter(r => r.response === 'yes').length,
      noCount: rsvps.filter(r => r.response === 'no').length,
      maybeCount: rsvps.filter(r => r.response === 'maybe').length,
      totalGuests: rsvps.filter(r => r.response === 'yes').reduce((s, r) => s + (r.numberOfGuests || 0), 0),
      totalResponses: rsvps.length,
    };
  });
  return new Response(JSON.stringify(enriched), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'events.view');
  if (denied) return denied;
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.eventId || !data.response) return new Response(JSON.stringify({ error: 'eventId and response required' }), { status: 400 });
  const db = getDb();

  // Check if user already RSVP'd
  const existing = db.select().from(eventRsvps).where(and(eq(eventRsvps.eventId, data.eventId), eq(eventRsvps.userId, user.id))).get();
  if (existing) {
    db.update(eventRsvps).set({
      response: data.response, numberOfGuests: data.numberOfGuests || 0,
      notes: data.notes || null, updatedAt: new Date(),
    }).where(eq(eventRsvps.id, existing.id)).run();
    return new Response(JSON.stringify({ success: true, updated: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const result = db.insert(eventRsvps).values({
    eventId: data.eventId, userId: user.id,
    response: data.response,
    numberOfGuests: data.numberOfGuests || 0,
    notes: data.notes || null,
    createdAt: new Date(),
  }).returning().get();
  return new Response(JSON.stringify({ success: true, id: result.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const denied = guardPermission(user, 'events.view');
  if (denied) return denied;

  const { id } = await request.json();
  const db = getDb();
  db.delete(eventRsvps).where(eq(eventRsvps.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
