import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { messages, schoolMembers, users } from '../../../lib/db/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';
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
    const allMsgs = db.select({ subject: messages.subject, content: messages.content, isRead: messages.isRead, createdAt: messages.createdAt, senderName: users.name })
      .from(messages).leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.schoolId, schoolId)).orderBy(desc(messages.createdAt)).all();
    const columns: CsvColumn[] = [
      { key: 'senderName', label: 'From' }, { key: 'subject', label: 'Subject' },
      { key: 'content', label: 'Content' }, { key: 'isRead', label: 'Read', format: (v: any) => v ? 'Yes' : 'No' },
      { key: 'createdAt', label: 'Date' },
    ];
    return csvResponse(toCsv(allMsgs, columns), 'messages.csv');
  }

  const allMessages = db.select({
    id: messages.id,
    schoolId: messages.schoolId,
    senderId: messages.senderId,
    recipientId: messages.recipientId,
    groupId: messages.groupId,
    subject: messages.subject,
    content: messages.content,
    attachments: messages.attachments,
    parentMessageId: messages.parentMessageId,
    isRead: messages.isRead,
    createdAt: messages.createdAt,
    updatedAt: messages.updatedAt,
    senderName: users.name,
  }).from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.schoolId, schoolId))
    .orderBy(desc(messages.createdAt))
    .all();

  return new Response(JSON.stringify(allMessages), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.content) return new Response(JSON.stringify({ error: 'content is required' }), { status: 400 });

  const db = getDb();
  const result = db.insert(messages).values({
    schoolId,
    senderId: user.id,
    recipientId: data.recipientId || null,
    groupId: data.groupId || null,
    subject: data.subject || null,
    content: data.content,
    attachments: data.attachments ? JSON.stringify(data.attachments) : '[]',
    parentMessageId: data.parentMessageId || null,
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
  const existing = db.select().from(messages).where(and(eq(messages.id, data.id), eq(messages.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.attachments && typeof updateData.attachments === 'object') updateData.attachments = JSON.stringify(updateData.attachments);

  db.update(messages).set({ ...updateData, updatedAt: new Date() }).where(eq(messages.id, id)).run();
  const updated = db.select().from(messages).where(eq(messages.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(messages).where(and(eq(messages.id, id), eq(messages.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Message not found' }), { status: 404 });

  db.delete(messages).where(and(eq(messages.id, id), eq(messages.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
