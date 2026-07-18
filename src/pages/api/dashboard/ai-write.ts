import type { APIRoute } from 'astro';
import { guardPermission } from '../../../lib/rbac.js';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { aiApiKeys, aiModels, aiProviders } from '../../../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../../../lib/security.js';

function getAIConfig(db: any) {
  // First try database
  try {
    const keyRow = db.select().from(aiApiKeys).where(eq(aiApiKeys.isActive, true)).get();
    const modelRow = db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
    const providerRow = keyRow ? db.select().from(aiProviders).where(eq(aiProviders.id, keyRow.providerId)).get() : null;
    if (keyRow && providerRow) {
      return {
        apiKey: decrypt(keyRow.apiKey),
        baseUrl: providerRow.baseUrl || 'https://api.openai.com/v1',
        modelId: modelRow?.modelId || 'gpt-4o-mini',
      };
    }
  } catch {}

  // Fallback to env
  const envKey = process.env.AI_API_KEY;
  const envBaseUrl = process.env.AI_BASE_URL;
  const envModel = process.env.AI_MODEL;
  if (envKey && envBaseUrl) {
    return { apiKey: envKey, baseUrl: envBaseUrl, modelId: envModel || 'gpt-4o-mini' };
  }
  return null;
}

const ACTION_PROMPTS: Record<string, string> = {
  improve: 'Improve the following text for clarity, flow, and professionalism. Keep the same meaning but make it more engaging and well-written. Return ONLY the improved text, no explanations:',
  expand: 'Expand the following text with more detail, examples, and depth. Keep the same topic and tone but add substantial content. Return ONLY the expanded text:',
  summarize: 'Summarize the following text into a concise version that captures the key points. Return ONLY the summary:',
  grammar: 'Fix any grammar, spelling, or punctuation errors in the following text. Return ONLY the corrected text:',
  seo: 'Rewrite the following text to be SEO-optimized. Include relevant keywords naturally, use clear structure with headings, and make it engaging. Return ONLY the optimized HTML content:',
  generate: 'Write engaging content based on the following prompt. Write in a professional, educational tone suitable for a school website. Return ONLY the content as HTML:',
};

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const apiConfig = getAIConfig(db);
  if (!apiConfig) {
    return new Response(JSON.stringify({ error: 'AI is not configured. Contact platform admin.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const body = await request.json();
  const { action, text, context } = body;

  if (!action || !text) {
    return new Response(JSON.stringify({ error: 'action and text required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.improve;
  const userPrompt = context ? `${systemPrompt}\n\nContext (full page):\n${context}\n\nText to process:\n${text}` : `${systemPrompt}\n\n${text}`;

  try {
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
      body: JSON.stringify({
        model: apiConfig.modelId,
        messages: [
          { role: 'system', content: 'You are a professional content editor for school websites. You write in HTML when needed. Be concise and return only the requested content without preamble.' },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return new Response(JSON.stringify({ error: 'AI error' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    const result2 = await response.json();
    const content = result2.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ result: content }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'AI request failed: ' + err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
