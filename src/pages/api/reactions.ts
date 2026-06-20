import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db/index.js';
import { reactions } from '../../lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

function getFingerprint(request: Request): string {
  const ua = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  return `${ip}:${ua.slice(0, 50)}`;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const entityType = url.searchParams.get('entityType');
  const entityId = parseInt(url.searchParams.get('entityId') || '0');
  if (!entityType || !entityId) return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const all = db.select().from(reactions)
    .where(and(eq(reactions.entityType, entityType as any), eq(reactions.entityId, entityId)))
    .all();

  const counts: Record<string, number> = { like: 0, love: 0, helpful: 0, celebrate: 0 };
  for (const r of all) { counts[r.reactionType] = (counts[r.reactionType] || 0) + 1; }

  const fingerprint = getFingerprint(request);
  const userReaction = all.find(r => r.userFingerprint === fingerprint)?.reactionType || null;

  return new Response(JSON.stringify({ counts, userReaction }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { entityType, entityId, reactionType } = body;
  if (!entityType || !entityId || !reactionType) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDb();
  const fingerprint = getFingerprint(request);

  const existing = db.select().from(reactions)
    .where(and(
      eq(reactions.entityType, entityType),
      eq(reactions.entityId, entityId),
      eq(reactions.userFingerprint, fingerprint),
    )).get();

  if (existing) {
    if (existing.reactionType === reactionType) {
      db.delete(reactions).where(eq(reactions.id, existing.id)).run();
    } else {
      db.update(reactions).set({ reactionType }).where(eq(reactions.id, existing.id)).run();
    }
  } else {
    db.insert(reactions).values({ entityType, entityId, userFingerprint: fingerprint, reactionType }).run();
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};
