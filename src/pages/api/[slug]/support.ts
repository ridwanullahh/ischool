import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { schools, schoolSupportTickets, schoolTicketReplies, schoolTicketCategories, subscriberAccounts } from '../../../lib/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { checkRateLimit, sanitizeHtml } from '../../../lib/security.js';
import { createHash, randomBytes } from 'crypto';

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw + '_ischool_salt').digest('hex');
}

export const POST: APIRoute = async ({ request, params }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400 });

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404 });

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(`support_${slug}_${ip}`, 10, 60000)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), { status: 429 });
  }

  const data = await request.json();
  const action = data.action || 'create_ticket';

  if (action === 'create_ticket') {
    if (!data.title || !data.description || !data.name || !data.email) {
      return new Response(JSON.stringify({ error: 'name, email, title, and description are required' }), { status: 400 });
    }

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ticket = db.insert(schoolSupportTickets).values({
      schoolId: school.id,
      ticketNumber,
      title: sanitizeHtml(data.title),
      description: sanitizeHtml(data.description),
      category: data.category || 'general',
      priority: 'medium',
      status: 'open',
      channel: 'web',
      source: 'external',
      createdByName: sanitizeHtml(data.name),
      createdByEmail: data.email,
      metadata: JSON.stringify({ ip, userAgent: request.headers.get('user-agent'), page: data.page || null }),
    }).returning().get();

    return new Response(JSON.stringify({ success: true, ticketNumber: ticket.ticketNumber }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'register') {
    if (!data.email || !data.name || !data.password) {
      return new Response(JSON.stringify({ error: 'email, name, and password are required' }), { status: 400 });
    }
    const existing = db.select().from(subscriberAccounts).where(eq(subscriberAccounts.email, data.email)).get();
    if (existing) return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 });

    const account = db.insert(subscriberAccounts).values({
      email: data.email,
      name: sanitizeHtml(data.name),
      passwordHash: hashPassword(data.password),
      schoolId: school.id,
      verified: 1,
    }).returning().get();

    return new Response(JSON.stringify({ success: true, id: account.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'login') {
    if (!data.email || !data.password) {
      return new Response(JSON.stringify({ error: 'email and password required' }), { status: 400 });
    }
    const account = db.select().from(subscriberAccounts).where(and(eq(subscriberAccounts.email, data.email), eq(subscriberAccounts.schoolId, school.id))).get();
    if (!account || account.passwordHash !== hashPassword(data.password)) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }
    const token = randomBytes(32).toString('hex');
    return new Response(JSON.stringify({ success: true, token, name: account.name, email: account.email }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'my_tickets') {
    if (!data.email) return new Response(JSON.stringify({ error: 'email required' }), { status: 400 });
    const tickets = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.schoolId, school.id), eq(schoolSupportTickets.createdByEmail, data.email), eq(schoolSupportTickets.source, 'external')))
      .orderBy(desc(schoolSupportTickets.createdAt)).all();
    return new Response(JSON.stringify(tickets), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'ticket_detail') {
    if (!data.ticketId || !data.email) return new Response(JSON.stringify({ error: 'ticketId and email required' }), { status: 400 });
    const ticket = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, school.id), eq(schoolSupportTickets.createdByEmail, data.email))).get();
    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });
    const replies = db.select().from(schoolTicketReplies)
      .where(and(eq(schoolTicketReplies.ticketId, ticket.id), eq(schoolTicketReplies.isInternal, 0)))
      .orderBy(schoolTicketReplies.createdAt).all();
    return new Response(JSON.stringify({ ticket, replies }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'reply') {
    if (!data.ticketId || !data.content || !data.email) {
      return new Response(JSON.stringify({ error: 'ticketId, content, and email required' }), { status: 400 });
    }
    const ticket = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, school.id), eq(schoolSupportTickets.createdByEmail, data.email))).get();
    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });

    const reply = db.insert(schoolTicketReplies).values({
      ticketId: data.ticketId,
      userName: ticket.createdByName,
      userRole: 'customer',
      content: sanitizeHtml(data.content),
      isInternal: 0,
    }).returning().get();

    if (ticket.status === 'waiting_customer') {
      db.update(schoolSupportTickets).set({ status: 'waiting_agent', updatedAt: new Date() }).where(eq(schoolSupportTickets.id, data.ticketId)).run();
    }

    return new Response(JSON.stringify({ success: true, replyId: reply.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'rate') {
    if (!data.ticketId || !data.email || !data.rating) {
      return new Response(JSON.stringify({ error: 'ticketId, email, and rating required' }), { status: 400 });
    }
    const ticket = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, school.id), eq(schoolSupportTickets.createdByEmail, data.email))).get();
    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });

    db.update(schoolSupportTickets).set({
      satisfactionRating: data.rating,
      satisfactionComment: data.comment || null,
      updatedAt: new Date(),
    }).where(eq(schoolSupportTickets.id, data.ticketId)).run();

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 });
};

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400 });

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404 });

  const categories = db.select().from(schoolTicketCategories)
    .where(and(eq(schoolTicketCategories.schoolId, school.id), eq(schoolTicketCategories.isPublic, 1)))
    .all();

  return new Response(JSON.stringify({ categories, schoolName: school.name }), { headers: { 'Content-Type': 'application/json' } });
};
