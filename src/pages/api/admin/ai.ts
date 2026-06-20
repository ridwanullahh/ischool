import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import { aiProviders, aiApiKeys, aiModels } from '../../../lib/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { encrypt, decrypt, isEncrypted } from '../../../lib/security.js';
import { logAudit } from '../../../lib/security.js';

export const GET: APIRoute = async ({ locals, url }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const action = url.searchParams.get('action');

  if (action === 'models') {
    const models = db.select({
      id: aiModels.id, providerId: aiModels.providerId, modelId: aiModels.modelId,
      displayName: aiModels.displayName, maxTokens: aiModels.maxTokens,
      supportsTools: aiModels.supportsTools, isActive: aiModels.isActive,
      providerName: aiProviders.name,
    }).from(aiModels).leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id)).all();
    return new Response(JSON.stringify(models), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'keys') {
    const keys = db.select({
      id: aiApiKeys.id, providerId: aiApiKeys.providerId, keyName: aiApiKeys.keyName,
      isActive: aiApiKeys.isActive, usageCount: aiApiKeys.usageCount,
      rateLimitPerMinute: aiApiKeys.rateLimitPerMinute,
      providerName: aiProviders.name,
    }).from(aiApiKeys).leftJoin(aiProviders, eq(aiApiKeys.providerId, aiProviders.id)).all();
    return new Response(JSON.stringify(keys), { headers: { 'Content-Type': 'application/json' } });
  }

  const providers = db.select().from(aiProviders).orderBy(aiProviders.sortOrder).all();
  return new Response(JSON.stringify(providers), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const data = await request.json();

  if (data.type === 'provider') {
    if (!data.name || !data.baseUrl) return new Response(JSON.stringify({ error: 'name and baseUrl required' }), { status: 400 });
    const result = db.insert(aiProviders).values({
      name: data.name, baseUrl: data.baseUrl,
      isActive: data.isActive !== false, sortOrder: data.sortOrder || 0,
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.type === 'key') {
    if (!data.providerId || !data.keyName || !data.apiKey) return new Response(JSON.stringify({ error: 'providerId, keyName, apiKey required' }), { status: 400 });
    const encryptedKey = encrypt(data.apiKey);
    const result = db.insert(aiApiKeys).values({
      providerId: data.providerId, keyName: data.keyName, apiKey: encryptedKey,
      isActive: data.isActive !== false, rateLimitPerMinute: data.rateLimitPerMinute || 60,
    }).returning().get();
    logAudit({ userId: (user as any).id, action: 'ai_key_created', entity: 'ai_api_keys', entityId: result?.id, details: { providerId: data.providerId, keyName: data.keyName } });
    return new Response(JSON.stringify({ ...result, apiKey: '••••••••' + data.apiKey.slice(-4) }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  if (data.type === 'model') {
    if (!data.providerId || !data.modelId || !data.displayName) return new Response(JSON.stringify({ error: 'providerId, modelId, displayName required' }), { status: 400 });
    const result = db.insert(aiModels).values({
      providerId: data.providerId, modelId: data.modelId, displayName: data.displayName,
      maxTokens: data.maxTokens || 4096, supportsTools: data.supportsTools !== false,
      isActive: data.isActive !== false,
    }).returning().get();
    return new Response(JSON.stringify(result), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const data = await request.json();

  if (data.type === 'provider' && data.id) {
    const { id, type, ...update } = data;
    db.update(aiProviders).set({ ...update, updatedAt: new Date() }).where(eq(aiProviders.id, id)).run();
    const updated = db.select().from(aiProviders).where(eq(aiProviders.id, id)).get();
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.type === 'key' && data.id) {
    const { id, type, ...update } = data;
    if (update.apiKey) {
      update.apiKey = isEncrypted(update.apiKey) ? update.apiKey : encrypt(update.apiKey);
    }
    db.update(aiApiKeys).set({ ...update, updatedAt: new Date() }).where(eq(aiApiKeys.id, id)).run();
    const updated = db.select().from(aiApiKeys).where(eq(aiApiKeys.id, id)).get();
    logAudit({ userId: (user as any).id, action: 'ai_key_updated', entity: 'ai_api_keys', entityId: id });
    if (updated) (updated as any).apiKey = '••••••••';
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  if (data.type === 'model' && data.id) {
    const { id, type, ...update } = data;
    db.update(aiModels).set({ ...update, updatedAt: new Date() }).where(eq(aiModels.id, id)).run();
    const updated = db.select().from(aiModels).where(eq(aiModels.id, id)).get();
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = (locals as any).user;
  if (!user || user.role !== 'super_admin') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const db = getDb();
  const { type, id } = await request.json();
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  if (type === 'provider') db.delete(aiProviders).where(eq(aiProviders.id, id)).run();
  else if (type === 'key') db.delete(aiApiKeys).where(eq(aiApiKeys.id, id)).run();
  else if (type === 'model') db.delete(aiModels).where(eq(aiModels.id, id)).run();
  else return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
};
