/**
 * Payment Gateway Integration Library
 *
 * Provides a unified interface for multiple payment gateways:
 * - Stripe (international cards)
 * - Paystack (Africa-focused)
 * - Bank transfer / cash (manual recording)
 *
 * Each gateway implements the same interface so the frontend can
 * work with any gateway transparently.
 */

export type GatewayType = 'stripe' | 'paystack' | 'bank_transfer' | 'cash';

export interface PaymentInitResult {
  ok: boolean;
  gateway: GatewayType;
  reference: string;
  authorizationUrl?: string;
  clientSecret?: string;
  message?: string;
}

export interface PaymentVerifyResult {
  ok: boolean;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
  amount: number;
  message?: string;
}

/**
 * Initializes a payment with the specified gateway.
 * For Stripe: returns a client secret for the frontend Payment Element.
 * For Paystack: returns an authorization URL for redirect.
 * For bank_transfer/cash: returns a reference for manual recording.
 */
export async function initializePayment(
  gateway: GatewayType,
  amount: number,
  reference: string,
  metadata: Record<string, any> = {}
): Promise<PaymentInitResult> {
  switch (gateway) {
    case 'stripe':
      return initStripePayment(amount, reference, metadata);
    case 'paystack':
      return initPaystackPayment(amount, reference, metadata);
    case 'bank_transfer':
      return { ok: true, gateway, reference, message: 'Use the reference to make a bank transfer.' };
    case 'cash':
      return { ok: true, gateway, reference, message: 'Cash payment to be recorded by admin.' };
    default:
      return { ok: false, gateway, reference, message: 'Unsupported gateway' };
  }
}

/**
 * Verifies a payment with the specified gateway.
 * For Stripe: verifies the payment intent status.
 * For Paystack: verifies the transaction reference.
 * For bank_transfer/cash: always returns pending (admin confirms manually).
 */
export async function verifyPayment(
  gateway: GatewayType,
  reference: string
): Promise<PaymentVerifyResult> {
  switch (gateway) {
    case 'stripe':
      return verifyStripePayment(reference);
    case 'paystack':
      return verifyPaystackPayment(reference);
    case 'bank_transfer':
    case 'cash':
      return { ok: true, status: 'pending', reference, message: 'Awaiting admin confirmation' };
    default:
      return { ok: false, status: 'failed', reference, message: 'Unsupported gateway' };
  }
}

// ═══════════════════════════════════════════════════════
// Stripe Integration
// ═══════════════════════════════════════════════════════

async function initStripePayment(amount: number, reference: string, metadata: Record<string, any>): Promise<PaymentInitResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, gateway: 'stripe', reference, message: 'Stripe not configured' };
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amount * 100)),
        currency: 'usd',
        automatic_payment_methods: JSON.stringify({ enabled: true }),
        metadata: JSON.stringify({ ...metadata, reference }),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, gateway: 'stripe', reference, message: err.error?.message || 'Stripe init failed' };
    }

    const data = await res.json();
    return { ok: true, gateway: 'stripe', reference, clientSecret: data.client_secret };
  } catch (e) {
    return { ok: false, gateway: 'stripe', reference, message: 'Network error' };
  }
}

async function verifyStripePayment(reference: string): Promise<PaymentVerifyResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, status: 'failed', reference, message: 'Stripe not configured' };
  }

  try {
    // Search for the payment intent by metadata reference
    const res = await fetch('https://api.stripe.com/v1/payment_intents/search?query=metadata.reference:' + encodeURIComponent(reference), {
      headers: { 'Authorization': 'Bearer ' + secretKey },
    });

    if (!res.ok) {
      return { ok: false, status: 'failed', reference, message: 'Verification failed' };
    }

    const data = await res.json();
    const intent = data.data?.[0];
    if (!intent) {
      return { ok: false, status: 'pending', reference, message: 'Payment not found' };
    }

    const status = intent.status === 'succeeded' ? 'completed' : intent.status === 'processing' ? 'pending' : 'failed';
    return { ok: true, status, reference, amount: intent.amount / 100 };
  } catch {
    return { ok: false, status: 'failed', reference, message: 'Network error' };
  }
}

// ═══════════════════════════════════════════════════════
// Paystack Integration
// ═══════════════════════════════════════════════════════

async function initPaystackPayment(amount: number, reference: string, metadata: Record<string, any>): Promise<PaymentInitResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, gateway: 'paystack', reference, message: 'Paystack not configured' };
  }

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        reference,
        metadata,
        callback_url: metadata.callback_url || '',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, gateway: 'paystack', reference, message: err.message || 'Paystack init failed' };
    }

    const data = await res.json();
    return { ok: true, gateway: 'paystack', reference, authorizationUrl: data.data?.authorization_url };
  } catch {
    return { ok: false, gateway: 'paystack', reference, message: 'Network error' };
  }
}

async function verifyPaystackPayment(reference: string): Promise<PaymentVerifyResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, status: 'failed', reference, message: 'Paystack not configured' };
  }

  try {
    const res = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference), {
      headers: { 'Authorization': 'Bearer ' + secretKey },
    });

    if (!res.ok) {
      return { ok: false, status: 'failed', reference, message: 'Verification failed' };
    }

    const data = await res.json();
    const status = data.data?.status === 'success' ? 'completed' : data.data?.status === 'pending' ? 'pending' : 'failed';
    return { ok: true, status, reference, amount: (data.data?.amount || 0) / 100 };
  } catch {
    return { ok: false, status: 'failed', reference, message: 'Network error' };
  }
}

/**
 * Generates a unique payment reference.
 */
export function generatePaymentReference(prefix: string = 'PAY'): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return prefix + '-' + ts + '-' + rand;
}
