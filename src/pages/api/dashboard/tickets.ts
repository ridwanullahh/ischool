import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import {
  schoolSupportTickets, schoolTicketReplies, schoolTicketCategories,
  schoolMembers, users, staff, students, aiSettings,
} from '../../../lib/db/schema.js';
import { eq, and, like, or, desc, sql } from 'drizzle-orm';
import { notifyTicketUpdate, sendNotification } from '../../../lib/notifications.js';

function getUserSchoolId(userId: number): number | null {
  const db = getDb();
  const membership = db.select().from(schoolMembers).where(eq(schoolMembers.userId, userId)).get();
  return membership?.schoolId || null;
}

function generateTicketNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const action = url.searchParams.get('action');
  const search = url.searchParams.get('search');
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');

  if (action === 'categories') {
    const cats = db.select().from(schoolTicketCategories).where(eq(schoolTicketCategories.schoolId, schoolId)).all();
    return new Response(JSON.stringify(cats), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'stats') {
    const open = db.select({ count: sql<number>`count(*)` }).from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'open'))).get();
    const inProgress = db.select({ count: sql<number>`count(*)` }).from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'in_progress'))).get();
    const waiting = db.select({ count: sql<number>`count(*)` }).from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.schoolId, schoolId), or(eq(schoolSupportTickets.status, 'waiting_customer'), eq(schoolSupportTickets.status, 'waiting_agent')))).get();
    const resolved = db.select({ count: sql<number>`count(*)` }).from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.schoolId, schoolId), eq(schoolSupportTickets.status, 'resolved'))).get();
    const total = db.select({ count: sql<number>`count(*)` }).from(schoolSupportTickets)
      .where(eq(schoolSupportTickets.schoolId, schoolId)).get();
    return new Response(JSON.stringify({
      open: open?.count || 0, inProgress: inProgress?.count || 0,
      waiting: waiting?.count || 0, resolved: resolved?.count || 0,
      total: total?.count || 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'detail') {
    const ticketId = url.searchParams.get('id');
    if (!ticketId) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    const ticket = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, parseInt(ticketId)), eq(schoolSupportTickets.schoolId, schoolId))).get();
    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });
    const replies = db.select().from(schoolTicketReplies)
      .where(eq(schoolTicketReplies.ticketId, ticket.id))
      .orderBy(schoolTicketReplies.createdAt).all();
    return new Response(JSON.stringify({ ticket, replies }), { headers: { 'Content-Type': 'application/json' } });
  }

  let conditions = [eq(schoolSupportTickets.schoolId, schoolId)];
  if (status) conditions.push(eq(schoolSupportTickets.status, status as any));
  if (priority) conditions.push(eq(schoolSupportTickets.priority, priority as any));
  if (category) conditions.push(eq(schoolSupportTickets.category, category));

  let tickets;
  if (search) {
    tickets = db.select().from(schoolSupportTickets)
      .where(and(
        ...conditions,
        or(
          like(schoolSupportTickets.title, `%${search}%`),
          like(schoolSupportTickets.ticketNumber, `%${search}%`),
        )
      )).orderBy(desc(schoolSupportTickets.createdAt)).all();
  } else {
    tickets = db.select().from(schoolSupportTickets)
      .where(and(...conditions)).orderBy(desc(schoolSupportTickets.createdAt)).all();
  }

  return new Response(JSON.stringify(tickets), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const db = getDb();
  const data = await request.json();

  if (data.action === 'reply') {
    if (!data.ticketId || !data.content) return new Response(JSON.stringify({ error: 'ticketId and content required' }), { status: 400 });
    const ticket = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
    if (!ticket) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });

    const reply = db.insert(schoolTicketReplies).values({
      ticketId: data.ticketId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      content: data.content,
      attachments: data.attachments ? JSON.stringify(data.attachments) : undefined,
      isInternal: data.isInternal ? 1 : 0,
    }).returning().get();

    if (data.status) {
      db.update(schoolSupportTickets).set({ status: data.status, updatedAt: new Date() }).where(eq(schoolSupportTickets.id, data.ticketId)).run();
    }

    if (!data.isInternal && ticket.createdByEmail) {
      sendNotification({
        schoolId, type: 'info',
        title: `New Reply on Ticket ${ticket.ticketNumber}`,
        body: `${user.name} replied to your ticket: "${ticket.title}".`,
        link: '/dashboard/tickets',
        channel: 'email',
        email: ticket.createdByEmail,
      }).catch(() => {});
    }

    return new Response(JSON.stringify(reply), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'assign') {
    if (!data.ticketId || !data.assignedTo) return new Response(JSON.stringify({ error: 'ticketId and assignedTo required' }), { status: 400 });
    const ticketToAssign = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
    db.update(schoolSupportTickets).set({
      assignedTo: data.assignedTo,
      status: 'in_progress',
      updatedAt: new Date(),
    }).where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).run();
    if (ticketToAssign) {
      const assignedUser = db.select().from(users).where(eq(users.id, data.assignedTo)).get();
      sendNotification({
        schoolId, userId: data.assignedTo, type: 'info',
        title: 'Ticket Assigned to You',
        body: `Ticket ${ticketToAssign.ticketNumber}: "${ticketToAssign.title}" has been assigned to you.`,
        link: '/dashboard/tickets',
        channel: assignedUser?.email ? 'email' : 'in_app',
        email: assignedUser?.email,
      }).catch(() => {});
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'resolve') {
    if (!data.ticketId) return new Response(JSON.stringify({ error: 'ticketId required' }), { status: 400 });
    const ticketToResolve = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
    const update: any = { status: 'resolved', resolvedAt: new Date().toISOString(), updatedAt: new Date() };
    if (data.satisfactionRating) update.satisfactionRating = data.satisfactionRating;
    if (data.satisfactionComment) update.satisfactionComment = data.satisfactionComment;
    db.update(schoolSupportTickets).set(update)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).run();
    if (ticketToResolve) {
      notifyTicketUpdate(schoolId, ticketToResolve.ticketNumber, 'resolved', ticketToResolve.createdByEmail || undefined, ticketToResolve.createdBy || undefined).catch(() => {});
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'close') {
    if (!data.ticketId) return new Response(JSON.stringify({ error: 'ticketId required' }), { status: 400 });
    const ticketToClose = db.select().from(schoolSupportTickets)
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).get();
    db.update(schoolSupportTickets).set({ status: 'closed', closedAt: new Date().toISOString(), updatedAt: new Date() })
      .where(and(eq(schoolSupportTickets.id, data.ticketId), eq(schoolSupportTickets.schoolId, schoolId))).run();
    if (ticketToClose) {
      notifyTicketUpdate(schoolId, ticketToClose.ticketNumber, 'closed', ticketToClose.createdByEmail || undefined, ticketToClose.createdBy || undefined).catch(() => {});
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'add_category') {
    if (!data.name) return new Response(JSON.stringify({ error: 'name required' }), { status: 400 });
    const cat = db.insert(schoolTicketCategories).values({
      schoolId,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      isPublic: data.isPublic !== false ? 1 : 0,
      sortOrder: data.sortOrder || 0,
    }).returning().get();
    return new Response(JSON.stringify(cat), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'save_settings') {
    if (data.slaHours !== undefined) {
      const existing = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, 'ticket_sla_hours'))).get();
      if (existing) {
        db.update(aiSettings).set({ value: String(data.slaHours) }).where(eq(aiSettings.id, existing.id)).run();
      } else {
        db.insert(aiSettings).values({ schoolId, key: 'ticket_sla_hours', value: String(data.slaHours) }).run();
      }
    }
    if (data.retentionDays !== undefined) {
      const existing = db.select().from(aiSettings).where(and(eq(aiSettings.schoolId, schoolId), eq(aiSettings.key, 'conversation_retention_days'))).get();
      if (existing) {
        db.update(aiSettings).set({ value: String(data.retentionDays) }).where(eq(aiSettings.id, existing.id)).run();
      } else {
        db.insert(aiSettings).values({ schoolId, key: 'conversation_retention_days', value: String(data.retentionDays) }).run();
      }
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.action === 'delete_category') {
    if (!data.id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });
    db.delete(schoolTicketCategories).where(and(eq(schoolTicketCategories.id, data.id), eq(schoolTicketCategories.schoolId, schoolId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (!data.title || !data.description) {
    return new Response(JSON.stringify({ error: 'title and description required' }), { status: 400 });
  }

  const ticket = db.insert(schoolSupportTickets).values({
    schoolId,
    ticketNumber: generateTicketNumber(),
    title: data.title,
    description: data.description,
    category: data.category || 'general',
    priority: data.priority || 'medium',
    status: 'open',
    channel: data.channel || 'web',
    source: data.source || 'internal',
    createdBy: user.id,
    createdByName: user.name,
    createdByEmail: user.email,
    assignedTo: data.assignedTo || null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
  }).returning().get();

  sendNotification({
    schoolId, type: 'info',
    title: 'New Support Ticket',
    body: `Ticket ${ticket.ticketNumber}: "${ticket.title}" has been created by ${user.name}.`,
    link: '/dashboard/tickets',
  }).catch(() => {});

  return new Response(JSON.stringify(ticket), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

  const db = getDb();
  const existing = db.select().from(schoolSupportTickets)
    .where(and(eq(schoolSupportTickets.id, data.id), eq(schoolSupportTickets.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.metadata && typeof updateData.metadata === 'object') updateData.metadata = JSON.stringify(updateData.metadata);

  db.update(schoolSupportTickets).set({ ...updateData, updatedAt: new Date() }).where(eq(schoolSupportTickets.id, id)).run();
  const updated = db.select().from(schoolSupportTickets).where(eq(schoolSupportTickets.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  const existing = db.select().from(schoolSupportTickets)
    .where(and(eq(schoolSupportTickets.id, id), eq(schoolSupportTickets.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });

  db.delete(schoolSupportTickets).where(eq(schoolSupportTickets.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
