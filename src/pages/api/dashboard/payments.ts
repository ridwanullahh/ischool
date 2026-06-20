import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { payments, invoices, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toCsv, csvResponse, type CsvColumn } from '../../../lib/export.js';
import { notifyPaymentReceived } from '../../../lib/notifications.js';

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
    const allPayments = db.select({
      id: payments.id, invoiceId: payments.invoiceId, amount: payments.amount,
      method: payments.method, reference: payments.reference, status: payments.status,
      paidBy: payments.paidBy, notes: payments.notes, paidAt: payments.paidAt,
    }).from(payments).innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(eq(invoices.schoolId, schoolId)).orderBy(desc(payments.paidAt)).all();
    const columns: CsvColumn[] = [
      { key: 'id', label: 'Payment ID' },
      { key: 'invoiceId', label: 'Invoice ID' },
      { key: 'amount', label: 'Amount' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
      { key: 'status', label: 'Status' },
      { key: 'paidBy', label: 'Paid By' },
      { key: 'paidAt', label: 'Paid At' },
    ];
    return csvResponse(toCsv(allPayments, columns), 'payments.csv');
  }

  const status = url.searchParams.get('status');
  const invoiceId = url.searchParams.get('invoiceId');

  let query = db.select({
    id: payments.id,
    invoiceId: payments.invoiceId,
    amount: payments.amount,
    method: payments.method,
    reference: payments.reference,
    status: payments.status,
    paidBy: payments.paidBy,
    notes: payments.notes,
    paidAt: payments.paidAt,
    createdAt: payments.createdAt,
    invoiceNumber: invoices.invoiceNumber,
    invoiceAmount: invoices.amount,
  }).from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(eq(payments.schoolId, schoolId));

  if (status) {
    query = db.select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      method: payments.method,
      reference: payments.reference,
      status: payments.status,
      paidBy: payments.paidBy,
      notes: payments.notes,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      invoiceNumber: invoices.invoiceNumber,
      invoiceAmount: invoices.amount,
    }).from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(and(eq(payments.schoolId, schoolId), eq(payments.status, status as any)));
  }

  if (invoiceId) {
    query = db.select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      method: payments.method,
      reference: payments.reference,
      status: payments.status,
      paidBy: payments.paidBy,
      notes: payments.notes,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      invoiceNumber: invoices.invoiceNumber,
      invoiceAmount: invoices.amount,
    }).from(payments)
      .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(and(eq(payments.schoolId, schoolId), eq(payments.invoiceId, parseInt(invoiceId))));
  }

  const records = query.orderBy(desc(payments.paidAt)).all();
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.invoiceId || !data.amount || !data.method) {
    return new Response(JSON.stringify({ error: 'invoiceId, amount, and method are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(payments).values({
    invoiceId: data.invoiceId,
    schoolId,
    amount: data.amount,
    method: data.method,
    reference: data.reference || null,
    status: data.status || 'completed',
    paidBy: user.id,
    notes: data.notes || null,
    paidAt: new Date(),
  }).returning().get();

  const invoice = db.select().from(invoices).where(eq(invoices.id, data.invoiceId)).get();
  if (invoice) {
    const newPaidAmount = invoice.paidAmount + data.amount;
    const newBalance = invoice.amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    db.update(invoices).set({ paidAmount: newPaidAmount, balance: newBalance > 0 ? newBalance : 0, status: newStatus as any, updatedAt: new Date() }).where(eq(invoices.id, data.invoiceId)).run();
  }

  notifyPaymentReceived(schoolId, data.amount, data.method).catch(() => {});

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
  const existing = db.select().from(payments).where(and(eq(payments.id, data.id), eq(payments.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  db.update(payments).set({ ...updateData, updatedAt: new Date() }).where(eq(payments.id, id)).run();
  const updated = db.select().from(payments).where(eq(payments.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(payments).where(and(eq(payments.id, id), eq(payments.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
