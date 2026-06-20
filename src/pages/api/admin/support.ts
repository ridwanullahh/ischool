import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { supportTickets, supportTicketReplies } from '../../../lib/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const db = getDb();
  const id = url.searchParams.get('id');
  if (id) {
    const ticket = db.select().from(supportTickets).where(eq(supportTickets.id, Number(id))).get();
    const replies = db.select().from(supportTicketReplies).where(eq(supportTicketReplies.ticketId, Number(id))).orderBy(supportTicketReplies.createdAt).all();
    return new Response(JSON.stringify({ ticket, replies }), { headers: { 'Content-Type': 'application/json' } });
  }
  const tickets = db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(50).all();
  return new Response(JSON.stringify(tickets), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  const body = await request.json();
  const user = (request as any).locals?.user;

  const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
  const [ticket] = db.insert(supportTickets).values({
    ticketNumber,
    schoolId: body.schoolId || null,
    userId: body.userId || user?.id,
    subject: body.subject,
    description: body.description,
    category: body.category || 'general',
    priority: body.priority || 'medium',
    status: 'open',
  }).returning().all();

  return new Response(JSON.stringify(ticket), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  const body = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
  if (body.resolutionNotes !== undefined) updates.resolutionNotes = body.resolutionNotes;
  if (body.status === 'resolved') updates.resolvedAt = new Date().toISOString();
  updates.updatedAt = new Date();

  db.update(supportTickets).set(updates).where(eq(supportTickets.id, id)).run();

  if (body.reply) {
    db.insert(supportTicketReplies).values({
      ticketId: id,
      userId: body.replyUserId || 1,
      content: body.reply,
      isInternal: body.isInternal || false,
    }).run();
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
