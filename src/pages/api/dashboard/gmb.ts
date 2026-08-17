import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { gmbConnections, gmbPosts, gmbReviews } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const type = new URL(request.url).searchParams.get('type');

  if (type === 'posts') {
    const posts = db.select().from(gmbPosts).where(eq(gmbPosts.schoolId, schoolId)).all();
    return new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json' } });
  }
  if (type === 'reviews') {
    const reviews = db.select().from(gmbReviews).where(eq(gmbReviews.schoolId, schoolId)).all();
    return new Response(JSON.stringify(reviews), { headers: { 'Content-Type': 'application/json' } });
  }
  if (type === 'connection') {
    const conn = db.select().from(gmbConnections).where(eq(gmbConnections.schoolId, schoolId)).get();
    return new Response(JSON.stringify(conn || { isConnected: false }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const data = await request.json();
  const action = data.action;

  if (action === 'create_post') {
    const [post] = db.insert(gmbPosts).values({
      schoolId, title: data.title || null, content: data.content || '',
      imageUrl: data.imageUrl || null, postType: data.postType || 'what_new',
      startDate: data.startDate || null, endDate: data.endDate || null,
      status: 'draft',
    } as any).returning().all();
    return new Response(JSON.stringify({ success: true, post }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'delete_post') {
    db.delete(gmbPosts).where(eq(gmbPosts.id, Number(data.postId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'respond_review') {
    db.update(gmbReviews).set({ response: data.response, responseAt: new Date().toISOString() }).where(eq(gmbReviews.id, Number(data.reviewId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'update_profile') {
    const existing = db.select().from(gmbConnections).where(eq(gmbConnections.schoolId, schoolId)).get();
    if (existing) {
      db.update(gmbConnections).set({ businessName: data.businessName, autoSync: data.autoSync ?? true, updatedAt: new Date() }).where(eq(gmbConnections.id, existing.id)).run();
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'connect') {
    // Simulate connection (real OAuth would go here)
    const existing = db.select().from(gmbConnections).where(eq(gmbConnections.schoolId, schoolId)).get();
    if (existing) {
      db.update(gmbConnections).set({ isConnected: true, verificationStatus: 'verified', updatedAt: new Date() }).where(eq(gmbConnections.id, existing.id)).run();
    } else {
      db.insert(gmbConnections).values({ schoolId, isConnected: true, verificationStatus: 'verified', autoSync: true } as any).run();
    }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'disconnect') {
    db.update(gmbConnections).set({ isConnected: false, updatedAt: new Date() }).where(eq(gmbConnections.schoolId, schoolId)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
