import { getDb } from './db/index.js';
import { subscriptionPlans, schoolSubscriptions, platformInvoices, platformPayments, coupons, couponRedemptions } from './db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

export function getActivePlans() {
  const db = getDb();
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder).all();
}

export function getPlanBySlug(slug: string) {
  const db = getDb();
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, slug)).get();
}

export function getSchoolSubscription(schoolId: number) {
  const db = getDb();
  const sub = db.select().from(schoolSubscriptions).where(eq(schoolSubscriptions.schoolId, schoolId)).get();
  if (!sub) return null;
  const plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).get();
  return { ...sub, plan };
}

export function hasActiveSubscription(schoolId: number): boolean {
  const sub = getSchoolSubscription(schoolId);
  if (!sub) return false;
  if (sub.status === 'active' || sub.status === 'trial') {
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) return true;
    if (sub.status === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) return true;
  }
  return false;
}

export function createSubscription(schoolId: number, planId: number, billingCycle: 'monthly' | 'annual', couponCode?: string) {
  const db = getDb();
  const plan = db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).get();
  if (!plan) throw new Error('Plan not found');

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  let trialEndsAt: string | null = null;
  let status: 'active' | 'trial' = 'active';

  if (plan.isFree) {
    status = 'active';
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);
  } else if (plan.trialDays && plan.trialDays > 0) {
    status = 'trial';
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    trialEndsAt = trialEnd.toISOString();
  }

  let couponId: number | null = null;
  if (couponCode) {
    const coupon = validateCoupon(couponCode, planId);
    if (coupon) couponId = coupon.id;
  }

  const [sub] = db.insert(schoolSubscriptions).values({
    schoolId,
    planId,
    status,
    billingCycle,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    trialEndsAt,
    autoRenew: !plan.isFree,
    couponId,
  }).returning().all();

  if (!plan.isFree && status !== 'trial') {
    createInvoice(schoolId, sub.id, plan, billingCycle, couponCode);
  }

  return sub;
}

export function createInvoice(schoolId: number, subscriptionId: number, plan: typeof subscriptionPlans.$inferSelect, billingCycle: 'monthly' | 'annual', couponCode?: string) {
  const db = getDb();
  const amount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  let discount = 0;

  if (couponCode) {
    const coupon = validateCoupon(couponCode, plan.id);
    if (coupon) {
      if (coupon.type === 'percentage') {
        discount = Math.round(amount * coupon.value / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
      } else if (coupon.type === 'fixed') {
        discount = coupon.value;
      }
    }
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + 1);
  else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(schoolId).padStart(4, '0')}-${Date.now().toString(36).toUpperCase()}`;

  const [invoice] = db.insert(platformInvoices).values({
    schoolId,
    subscriptionId,
    invoiceNumber,
    amount,
    currency: plan.currency,
    discount,
    tax: 0,
    totalAmount: Math.max(0, amount - discount),
    status: 'pending',
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    periodStart: now.toISOString(),
    periodEnd: periodEnd.toISOString(),
    lineItems: JSON.stringify([{ description: `${plan.name} Plan - ${billingCycle}`, amount }]),
  }).returning().all();

  return invoice;
}

export function validateCoupon(code: string, planId: number) {
  const db = getDb();
  const coupon = db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).get();
  if (!coupon || !coupon.isActive) return null;
  if (coupon.endDate && new Date(coupon.endDate) < new Date()) return null;
  if (new Date(coupon.startDate) > new Date()) return null;
  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) return null;
  const applicablePlans = (coupon.applicablePlans as number[]) || [];
  if (applicablePlans.length > 0 && !applicablePlans.includes(planId)) return null;
  return coupon;
}

export function redeemCoupon(couponId: number, schoolId: number, invoiceId: number, discountAmount: number) {
  const db = getDb();
  db.insert(couponRedemptions).values({ couponId, schoolId, invoiceId, discountAmount }).run();
  db.update(coupons).set({ currentUses: sql`${coupons.currentUses} + 1` }).where(eq(coupons.id, couponId)).run();
}

export function processPayment(invoiceId: number, gateway: string, reference: string, gatewayResponse?: object) {
  const db = getDb();
  const invoice = db.select().from(platformInvoices).where(eq(platformInvoices.id, invoiceId)).get();
  if (!invoice) throw new Error('Invoice not found');

  db.insert(platformPayments).values({
    invoiceId,
    schoolId: invoice.schoolId,
    amount: invoice.totalAmount,
    currency: invoice.currency,
    gateway,
    gatewayReference: reference,
    gatewayResponse: gatewayResponse ? JSON.stringify(gatewayResponse) : undefined,
    status: 'completed',
    paidAt: new Date().toISOString(),
  }).run();

  db.update(platformInvoices).set({ status: 'paid', paidAt: new Date().toISOString() }).where(eq(platformInvoices.id, invoiceId)).run();

  if (invoice.subscriptionId) {
    db.update(schoolSubscriptions).set({ status: 'active', paymentMethod: gateway }).where(eq(schoolSubscriptions.id, invoice.subscriptionId)).run();
  }
}

export function getPaymentGateways() {
  return [
    { id: 'stripe', name: 'Stripe', description: 'Credit/Debit Cards, Apple Pay, Google Pay', icon: 'credit-card', supported: true },
    { id: 'paypal', name: 'PayPal', description: 'PayPal Balance, Cards via PayPal', icon: 'paypal', supported: true },
    { id: 'paystack', name: 'Paystack', description: 'Cards, Bank Transfer, USSD (Nigeria/Ghana)', icon: 'paystack', supported: true },
    { id: 'flutterwave', name: 'Flutterwave', description: 'Cards, Mobile Money, Bank Transfer (Africa)', icon: 'flutterwave', supported: true },
    { id: 'coupon', name: 'Coupon / Voucher', description: 'Apply a coupon code for full or partial discount', icon: 'tag', supported: true },
    { id: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank wire/transfer (manual verification)', icon: 'bank', supported: true },
  ];
}

export function cancelSubscription(subscriptionId: number, reason?: string) {
  const db = getDb();
  db.update(schoolSubscriptions).set({
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelReason: reason || null,
    autoRenew: false,
  }).where(eq(schoolSubscriptions.id, subscriptionId)).run();
}

export function getSchoolInvoices(schoolId: number) {
  const db = getDb();
  return db.select().from(platformInvoices).where(eq(platformInvoices.schoolId, schoolId)).orderBy(desc(platformInvoices.createdAt)).all();
}

export function getAllSubscriptions() {
  const db = getDb();
  return db.select({
    id: schoolSubscriptions.id,
    schoolId: schoolSubscriptions.schoolId,
    planId: schoolSubscriptions.planId,
    status: schoolSubscriptions.status,
    billingCycle: schoolSubscriptions.billingCycle,
    currentPeriodStart: schoolSubscriptions.currentPeriodStart,
    currentPeriodEnd: schoolSubscriptions.currentPeriodEnd,
    schoolName: sql`school_name`,
    planName: sql`plan_name`,
  }).from(schoolSubscriptions).all();
}
