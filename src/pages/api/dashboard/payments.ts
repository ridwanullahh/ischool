/**
 * Payment Processing API
 *
 * POST /api/dashboard/payments/initiate - initiate a payment
 * POST /api/dashboard/payments/verify - verify a payment
 * POST /api/dashboard/payments/manual - record manual payment (cash/transfer)
 */
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { payments, invoices } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';
import { initializePayment, verifyPayment, generatePaymentReference, type GatewayType } from '../../../lib/payments.js';

// Initiate payment
export const POST: APIRoute = async ({ request, locals, url }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { action } = body;

  if (action === 'initiate') {
    return initiatePayment(body, user);
  } else if (action === 'verify') {
    return verifyPaymentHandler(body, user);
  } else if (action === 'manual') {
    return recordManualPayment(body, user);
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};

async function initiatePayment(body: any, user: any) {
  const { invoiceId, gateway, schoolId } = body;

  if (!invoiceId || !gateway) {
    return new Response(JSON.stringify({ error: 'Missing invoice ID or gateway' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // For payments, students/parents can initiate, or admins can do it
  const allowedPerms = ['payments.make', 'payments.record'];
  const userPerms = (user as any).permissions;
  const hasPermission = userPerms && allowedPerms.some((p: string) => userPerms.has(p));
  if (!hasPermission) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const invoice = db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice || invoice.schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  if (invoice.balance <= 0) {
    return new Response(JSON.stringify({ error: 'Invoice already paid' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const reference = generatePaymentReference();
  const result = await initializePayment(gateway as GatewayType, invoice.balance, reference, {
    invoiceId,
    schoolId: invoice.schoolId,
    studentId: invoice.studentId,
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Create a pending payment record
  const payment = db.insert(payments).values({
    invoiceId,
    schoolId: invoice.schoolId,
    amount: invoice.balance,
    method: gateway,
    reference,
    status: 'pending',
    paidBy: user.id,
    paidAt: new Date(),
  }).returning().get();

  return new Response(JSON.stringify({
    ok: true,
    paymentId: payment.id,
    reference,
    authorizationUrl: result.authorizationUrl,
    clientSecret: result.clientSecret,
    gateway,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function verifyPaymentHandler(body: any, user: any) {
  const { reference, gateway } = body;

  if (!reference || !gateway) {
    return new Response(JSON.stringify({ error: 'Missing reference or gateway' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const result = await verifyPayment(gateway as GatewayType, reference);
  if (!result.ok) {
    return new Response(JSON.stringify({ error: result.message, status: result.status }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // If payment completed, update the payment and invoice records
  if (result.status === 'completed') {
    const db = getDb();
    const payment = db.select().from(payments).where(eq(payments.reference, reference)).get();
    if (payment) {
      db.update(payments).set({
        status: 'completed',
        paidAt: new Date(),
      }).where(eq(payments.id, payment.id)).run();

      // Update invoice
      const invoice = db.select().from(invoices).where(eq(invoices.id, payment.invoiceId)).get();
      if (invoice) {
        const newPaid = (invoice.amountPaid || 0) + payment.amount;
        const newBalance = invoice.amount - newPaid;
        db.update(invoices).set({
          amountPaid: newPaid,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : 'partial',
          updatedAt: new Date(),
        }).where(eq(invoices.id, invoice.id)).run();
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, status: result.status, reference }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function recordManualPayment(body: any, user: any) {
  const denied = guardPermission(user, 'payments.record');
  if (denied) return denied;

  const { invoiceId, amount, method, reference, notes, schoolId } = body;

  if (!invoiceId || !amount || !method) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (schoolId !== (user as any).schoolId) {
    return new Response(JSON.stringify({ error: 'School mismatch' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const invoice = db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
  if (!invoice || invoice.schoolId !== schoolId) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Create completed payment record
  const payment = db.insert(payments).values({
    invoiceId,
    schoolId,
    amount,
    method,
    reference: reference || generatePaymentReference('MAN'),
    status: 'completed',
    paidBy: user.id,
    notes: notes || null,
    paidAt: new Date(),
  }).returning().get();

  // Update invoice
  const newPaid = (invoice.amountPaid || 0) + amount;
  const newBalance = invoice.amount - newPaid;
  db.update(invoices).set({
    amountPaid: newPaid,
    balance: newBalance,
    status: newBalance <= 0 ? 'paid' : 'partial',
    updatedAt: new Date(),
  }).where(eq(invoices.id, invoice.id)).run();

  return new Response(JSON.stringify({ ok: true, paymentId: payment.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}
