import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { subscriptionPlans } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ url }) => {
  const db = getDb();
  const plans = db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder).all();
  return new Response(JSON.stringify(plans), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  const body = await request.json();
  const features = typeof body.features === 'string' ? JSON.parse(body.features) : (body.features || []);
  const moduleAccess = typeof body.moduleAccess === 'string' ? JSON.parse(body.moduleAccess) : (body.moduleAccess || []);

  const [plan] = db.insert(subscriptionPlans).values({
    name: body.name,
    slug: body.slug,
    description: body.description || '',
    monthlyPrice: body.monthlyPrice || 0,
    annualPrice: body.annualPrice || 0,
    trialDays: body.trialDays || 14,
    maxSchools: body.maxSchools || 1,
    maxStudents: body.maxStudents || 100,
    maxStaff: body.maxStaff || 10,
    maxStorage: body.maxStorage || 500,
    isFree: body.isFree || false,
    isPopular: body.isPopular || false,
    customDomain: body.customDomain || false,
    apiAccess: body.apiAccess || false,
    prioritySupport: body.prioritySupport || false,
    whiteLabel: body.whiteLabel || false,
    features: JSON.stringify(features),
    moduleAccess: JSON.stringify(moduleAccess),
    isActive: true,
  }).returning().all();

  return new Response(JSON.stringify(plan), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  const body = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.monthlyPrice !== undefined) updates.monthlyPrice = body.monthlyPrice;
  if (body.annualPrice !== undefined) updates.annualPrice = body.annualPrice;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.isPopular !== undefined) updates.isPopular = body.isPopular;
  if (body.isFree !== undefined) updates.isFree = body.isFree;
  if (body.trialDays !== undefined) updates.trialDays = body.trialDays;
  if (body.maxSchools !== undefined) updates.maxSchools = body.maxSchools;
  if (body.maxStudents !== undefined) updates.maxStudents = body.maxStudents;
  if (body.maxStaff !== undefined) updates.maxStaff = body.maxStaff;
  if (body.maxStorage !== undefined) updates.maxStorage = body.maxStorage;
  if (body.customDomain !== undefined) updates.customDomain = body.customDomain;
  if (body.apiAccess !== undefined) updates.apiAccess = body.apiAccess;
  if (body.prioritySupport !== undefined) updates.prioritySupport = body.prioritySupport;
  if (body.whiteLabel !== undefined) updates.whiteLabel = body.whiteLabel;
  if (body.features !== undefined) updates.features = typeof body.features === 'string' ? body.features : JSON.stringify(body.features);
  if (body.moduleAccess !== undefined) updates.moduleAccess = typeof body.moduleAccess === 'string' ? body.moduleAccess : JSON.stringify(body.moduleAccess);
  updates.updatedAt = new Date();

  db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
  db.update(subscriptionPlans).set({ isActive: false }).where(eq(subscriptionPlans.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
