import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { platformFaqs } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async () => {
  const db = getDb();
  const faqs = db.select().from(platformFaqs).where(eq(platformFaqs.isPublished, true)).orderBy(platformFaqs.sortOrder).all();
  return new Response(JSON.stringify(faqs), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const db = getDb();
  const body = await request.json();
  const [faq] = db.insert(platformFaqs).values({
    question: body.question,
    answer: body.answer,
    category: body.category || 'General',
    sortOrder: body.sortOrder || 0,
    isPublished: body.isPublished !== false,
  }).returning().all();
  return new Response(JSON.stringify(faq), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ request, url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  const body = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = body.question;
  if (body.answer !== undefined) updates.answer = body.answer;
  if (body.category !== undefined) updates.category = body.category;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
  if (body.isPublished !== undefined) updates.isPublished = body.isPublished;
  updates.updatedAt = new Date();

  db.update(platformFaqs).set(updates).where(eq(platformFaqs.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ url }) => {
  const db = getDb();
  const id = Number(url.searchParams.get('id'));
  if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });
  db.delete(platformFaqs).where(eq(platformFaqs.id, id)).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
