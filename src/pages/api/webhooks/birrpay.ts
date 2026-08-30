// Bismillah — POST /api/webhooks/birrpay
// BirrPay webhook receiver for ischool. Verifies the X-BirrPay-Signature
// (t=…,v1=… HMAC-SHA256 over "{t}.{rawBody}" with BIRRPAY_WEBHOOK_SECRET),
// then completes the pending payment row (by reference) and updates the
// invoice balance — mirroring the verify-payment flow in
// src/pages/api/dashboard/payments.ts so webhooks and polling converge on
// the same state machine.
import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { payments, invoices } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const prerender = false;

async function verifySignature(rawBody: string, sigHeader: string | null): Promise<boolean> {
  const secret = process.env.BIRRPAY_WEBHOOK_SECRET;
  if (!secret || !sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;
  // Replay guard: reject signatures older than 10 minutes.
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const ok = await verifySignature(rawBody, request.headers.get('x-birrpay-signature'));
  if (!ok) {
    return new Response(JSON.stringify({ ok: false, error: { code: 'invalid_signature' } }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { event?: string; data?: { reference?: string; amount?: number; currency?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: { code: 'invalid_json' } }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const reference = body.data?.reference ?? '';
  if (body.event === 'payment.succeeded' && reference) {
    const db = getDb();
    const payment = db.select().from(payments).where(eq(payments.reference, reference)).get();
    if (payment && payment.status !== 'completed') {
      db.update(payments).set({ status: 'completed', paidAt: new Date() }).where(eq(payments.id, payment.id)).run();

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
    // Unknown/completed reference: ACK 200 so BirrPay does not retry forever.
  }

  return new Response(JSON.stringify({ ok: true, received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
