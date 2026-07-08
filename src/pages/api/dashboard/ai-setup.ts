import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId, getUserSchool } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import {
  schools, aboutPages, announcements, programs, faqs, classes, blogPosts,
  contactInfo, navigationItems, galleryItems, galleryAlbums,
  aiApiKeys, aiModels, aiProviders, aiSettings
} from '../../../lib/db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { decrypt } from '../../../lib/security.js';

function getAIConfig(db: any) {
  try {
    const keyRow = db.select().from(aiApiKeys).where(eq(aiApiKeys.isActive, true)).get();
    const modelRow = db.select().from(aiModels).where(eq(aiModels.isActive, true)).get();
    const providerRow = keyRow ? db.select().from(aiProviders).where(eq(aiProviders.id, keyRow.providerId)).get() : null;
    if (!keyRow || !providerRow) return null;
    return {
      apiKey: decrypt(keyRow.encryptedKey),
      baseUrl: providerRow.apiUrl || 'https://api.openai.com/v1',
      modelId: modelRow?.modelId || 'gpt-4o-mini',
    };
  } catch { return null; }
}

async function generateContent(prompt: string, systemPrompt: string, apiConfig: any): Promise<string> {
  try {
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.apiKey}` },
      body: JSON.stringify({
        model: apiConfig.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });
    if (!response.ok) return '';
    const result = await response.json();
    return result.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

export const POST: APIRoute = async ({ request }) => {
  const sid = getSessionIdFromCookie(request);
  const result = sid ? await validateSession(sid) : null;
  if (!result?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const schoolId = getUserSchoolId(result.user.id);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.id, schoolId)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  const { action, step, schoolName, schoolDescription, schoolType } = body;

  const apiConfig = getAIConfig(db);
  if (!apiConfig) {
    return new Response(JSON.stringify({ error: 'AI is not configured. Please contact platform admin.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const baseSystem = `You are a professional content writer for schools. Write engaging, professional, and SEO-friendly content. The school is "${school.name}". ${school.tagline ? `Tagline: ${school.tagline}` : ''} ${schoolDescription ? `Description: ${schoolDescription}` : ''} ${schoolType ? `Type: ${schoolType}` : 'Islamic school'}. Keep content realistic and specific. Do not use placeholders.`;

  // Step 1: Suggest content titles for all post types
  if (action === 'suggest') {
    const prompt = `Based on the school name "${school.name}" and description "${schoolDescription || school.tagline || ''}", suggest content for a school website. Return a JSON object with these keys:
- about: { mission: string, vision: string, valueProposition: string, features: [{title, description} x4], stats: [{label, value} x4] }
- announcements: [{ title, excerpt, content } x3]
- programs: [{ name, description, duration, level } x3]
- blogPosts: [{ title, excerpt, content } x3]
- faqs: [{ question, answer, category } x5]
Return ONLY valid JSON, no markdown.`;

    const content = await generateContent(prompt, baseSystem, apiConfig);
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify({ suggestions }), { headers: { 'Content-Type': 'application/json' } });
      }
    } catch {}
    return new Response(JSON.stringify({ error: 'Failed to generate suggestions' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Step 2: Generate and save content for a specific post type
  if (action === 'generate') {
    const suggestions = body.suggestions;
    if (!suggestions) return new Response(JSON.stringify({ error: 'No suggestions provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const results: string[] = [];

    // About page
    if (suggestions.about) {
      try {
        const existing = db.select().from(aboutPages).where(eq(aboutPages.schoolId, schoolId)).get();
        if (!existing) {
          db.insert(aboutPages).values({
            schoolId,
            mission: suggestions.about.mission || '',
            vision: suggestions.about.vision || '',
            valueProposition: suggestions.about.valueProposition || '',
            features: suggestions.about.features || [],
            stats: suggestions.about.stats || [],
          } as any).run();
          results.push('About page created');
        } else {
          results.push('About page already exists (skipped)');
        }
      } catch (e) { results.push('About page: error'); }
    }

    // Announcements
    if (suggestions.announcements && Array.isArray(suggestions.announcements)) {
      for (const a of suggestions.announcements) {
        try {
          const slug = (a.title || 'announcement').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          db.insert(announcements).values({
            schoolId,
            title: a.title,
            slug: slug + '-' + Date.now().toString(36),
            content: a.content || a.excerpt || '',
            excerpt: a.excerpt || '',
            isPinned: false,
            published: true,
            publishedAt: new Date(),
          } as any).run();
        } catch (e) {}
      }
      results.push(`${suggestions.announcements.length} announcements created`);
    }

    // Programs
    if (suggestions.programs && Array.isArray(suggestions.programs)) {
      for (const p of suggestions.programs) {
        try {
          const slug = (p.name || 'program').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          db.insert(programs).values({
            schoolId,
            name: p.name,
            slug: slug + '-' + Date.now().toString(36),
            description: p.description || '',
            duration: p.duration || null,
            level: p.level || null,
          } as any).run();
        } catch (e) {}
      }
      results.push(`${suggestions.programs.length} programs created`);
    }

    // Blog posts
    if (suggestions.blogPosts && Array.isArray(suggestions.blogPosts)) {
      for (const p of suggestions.blogPosts) {
        try {
          const slug = (p.title || 'post').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          db.insert(blogPosts).values({
            schoolId,
            title: p.title,
            slug: slug + '-' + Date.now().toString(36),
            content: p.content || p.excerpt || '',
            excerpt: p.excerpt || '',
            isPublished: true,
            publishedAt: new Date(),
          } as any).run();
        } catch (e) {}
      }
      results.push(`${suggestions.blogPosts.length} blog posts created`);
    }

    // FAQs
    if (suggestions.faqs && Array.isArray(suggestions.faqs)) {
      for (const f of suggestions.faqs) {
        try {
          db.insert(faqs).values({
            schoolId,
            question: f.question,
            answer: f.answer,
            category: f.category || 'General',
          } as any).run();
        } catch (e) {}
      }
      results.push(`${suggestions.faqs.length} FAQs created`);
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
