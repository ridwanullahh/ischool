import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { socialAccounts, socialPosts, socialComments } from '../../../lib/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const type = new URL(request.url).searchParams.get('type');

  if (type === 'accounts') {
    const accounts = db.select().from(socialAccounts).where(eq(socialAccounts.schoolId, schoolId)).all();
    return new Response(JSON.stringify(accounts), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'posts') {
    const posts = db.select().from(socialPosts).where(eq(socialPosts.schoolId, schoolId)).orderBy(desc(socialPosts.createdAt)).all();
    return new Response(JSON.stringify(posts), { headers: { 'Content-Type': 'application/json' } });
  }

  // Overview
  const totalPosts = db.select({ c: sql<number>`count(*)` }).from(socialPosts).where(eq(socialPosts.schoolId, schoolId)).get()?.c || 0;
  const connectedAccounts = db.select({ c: sql<number>`count(*)` }).from(socialAccounts).where(eq(socialAccounts.schoolId, schoolId)).get()?.c || 0;
  return new Response(JSON.stringify({ totalPosts, connectedAccounts }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const data = await request.json();
  const action = data.action;

  if (action === 'create_post') {
    const [post] = db.insert(socialPosts).values({
      schoolId,
      platform: data.platform || 'manual',
      content: data.content || '',
      mediaUrls: data.mediaUrls || [],
      scheduledAt: data.scheduledAt || null,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      postType: data.postType || 'manual',
    } as any).returning().all();
    return new Response(JSON.stringify({ success: true, post }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'delete_post') {
    db.delete(socialPosts).where(eq(socialPosts.id, data.postId)).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'ai_generate') {
    try {
      const { aiApiKeys, aiModels, aiProviders } = await import('../../../lib/db/schema.js');
      const keyRow = db.select().from(aiApiKeys).where(eq(aiApiKeys.isActive, true)).get();
      const modelRow = db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
      const providerRow = keyRow ? db.select().from(aiProviders).where(eq(aiProviders.id, keyRow.providerId)).get() : null;
      if (!keyRow || !providerRow) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

      const { decrypt } = await import('../../../lib/security.js');
      const apiKey = decrypt(keyRow.encryptedKey);
      const baseUrl = providerRow.apiUrl || 'https://api.openai.com/v1';
      const modelId = modelRow?.modelId || 'gpt-4o-mini';
      const prompt = data.prompt || 'Write a social media post for a school';

      const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: 'You are a social media manager for schools. Write engaging social media posts with relevant hashtags. Return ONLY the post text.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500, temperature: 0.8,
        }),
      });

      if (!aiResponse.ok) return new Response(JSON.stringify({ error: 'AI error' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ success: true, content }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'AI failed: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'respond_comment') {
    db.update(socialComments).set({ response: data.response, responseAt: new Date().toISOString() }).where(eq(socialComments.id, Number(data.commentId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'resolve_comment') {
    db.update(socialComments).set({ isResolved: true, updatedAt: new Date() }).where(eq(socialComments.id, Number(data.commentId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'disconnect') {
    db.update(socialAccounts).set({ isConnected: false }).where(and(eq(socialAccounts.schoolId, schoolId), eq(socialAccounts.platform, data.platform))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
