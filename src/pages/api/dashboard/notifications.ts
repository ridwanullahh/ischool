import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { notifications, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
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
  const userId = url.searchParams.get('userId');
  const unreadOnly = url.searchParams.get('unreadOnly');
  const action = url.searchParams.get('action');

  if (action === 'export') {
    const allNotifs = db.select().from(notifications).where(eq(notifications.schoolId, schoolId)).orderBy(desc(notifications.createdAt)).all();
    const columns: CsvColumn[] = [
      { key: 'title', label: 'Title' }, { key: 'body', label: 'Body' },
      { key: 'isRead', label: 'Read', format: (v: any) => v ? 'Yes' : 'No' },
      { key: 'createdAt', label: 'Date' },
    ];
    return csvResponse(toCsv(allNotifs, columns), 'notifications.csv');
  }

  let query = db.select().from(notifications).where(eq(notifications.schoolId, schoolId));

  if (userId) {
    query = db.select().from(notifications)
      .where(and(eq(notifications.schoolId, schoolId), eq(notifications.userId, parseInt(userId))));
  }

  if (unreadOnly === 'true') {
    query = db.select().from(notifications)
      .where(and(eq(notifications.schoolId, schoolId), eq(notifications.isRead, false)));
  }

  const records = query.orderBy(desc(notifications.createdAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.title) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400 });

  const db = getDb();
  const result = db.insert(notifications).values({
    schoolId,
    userId: data.userId || null,
    type: data.type || 'info',
    title: data.title,
    body: data.body || null,
    link: data.link || null,
    channel: data.channel || 'in_app',
    isRead: false,
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
  const existing = db.select().from(notifications).where(and(eq(notifications.id, data.id), eq(notifications.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(notifications).set({ ...updateData, updatedAt: new Date() }).where(eq(notifications.id, id)).run();
  const updated = db.select().from(notifications).where(eq(notifications.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
