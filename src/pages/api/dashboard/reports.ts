import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { savedReports, schoolMembers } from '../../../lib/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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
  const module = url.searchParams.get('module');

  if (module) {
    const results = db.select().from(savedReports)
      .where(and(eq(savedReports.schoolId, schoolId), eq(savedReports.module, module)))
      .orderBy(desc(savedReports.createdAt)).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  const allReports = db.select().from(savedReports)
    .where(eq(savedReports.schoolId, schoolId))
    .orderBy(desc(savedReports.createdAt)).all();
  return new Response(JSON.stringify(allReports), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const data = await request.json();
  if (!data.name || !data.module) {
    return new Response(JSON.stringify({ error: 'name and module are required' }), { status: 400 });
  }

  const db = getDb();
  const result = db.insert(savedReports).values({
    schoolId,
    name: data.name,
    module: data.module,
    config: data.config ? JSON.stringify(data.config) : '{}',
    createdBy: user.id,
  }).returning().get();

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
  const existing = db.select().from(savedReports).where(and(eq(savedReports.id, data.id), eq(savedReports.schoolId, schoolId))).get();
  if (!existing) return new Response(JSON.stringify({ error: 'Report not found' }), { status: 404 });

  const { id, schoolId: _, ...updateData } = data;
  if (updateData.config && typeof updateData.config === 'object') updateData.config = JSON.stringify(updateData.config);

  db.update(savedReports).set({ ...updateData, updatedAt: new Date() }).where(eq(savedReports.id, id)).run();
  const updated = db.select().from(savedReports).where(eq(savedReports.id, id)).get();
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404 });

  const { id } = await request.json();
  const db = getDb();
  db.delete(savedReports).where(and(eq(savedReports.id, id), eq(savedReports.schoolId, schoolId))).run();
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
