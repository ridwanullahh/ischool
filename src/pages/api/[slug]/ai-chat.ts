import type { APIRoute } from 'astro';
import { getDb } from '../../../lib/db/index.js';
import {
  aiApiKeys, aiModels, aiProviders, aiConversations, aiMessages, aiSettings,
  schools, announcements, blogPosts, classes, programs, faqs, contactInfo,
  events, galleryItems, aboutPages, contactSubmissions,
} from '../../../lib/db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { decrypt, checkRateLimit } from '../../../lib/security.js';

function buildSchoolContext(schoolId: number): string {
  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.id, schoolId)).get();
  if (!school) return 'No school data available.';

  const about = db.select().from(aboutPages).where(eq(aboutPages.schoolId, schoolId)).get();
  const anns = db.select({ title: announcements.title, excerpt: announcements.excerpt })
    .from(announcements).where(and(eq(announcements.schoolId, schoolId), eq(announcements.published, true)))
    .orderBy(desc(announcements.createdAt)).limit(5).all();
  const progs = db.select({ name: programs.name, description: programs.description, duration: programs.duration })
    .from(programs).where(eq(programs.schoolId, schoolId)).limit(10).all();
  const cls = db.select({ name: classes.name, description: classes.description, gradeLevel: classes.gradeLevel })
    .from(classes).where(eq(classes.schoolId, schoolId)).limit(10).all();
  const faqList = db.select({ question: faqs.question, answer: faqs.answer })
    .from(faqs).where(eq(faqs.schoolId, schoolId)).limit(15).all();
  const contacts = db.select({ type: contactInfo.type, label: contactInfo.label, value: contactInfo.value })
    .from(contactInfo).where(eq(contactInfo.schoolId, schoolId)).all();
  const upcomingEvents = db.select({ title: events.title, startDate: events.startDate, venue: events.venue })
    .from(events).where(and(eq(events.schoolId, schoolId), sql`${events.startDate} >= ${new Date().toISOString().split('T')[0]}`))
    .orderBy(events.startDate).limit(5).all();

  let context = `School: ${school.name}\n`;
  if (school.tagline) context += `Tagline: ${school.tagline}\n`;
  if (about) {
    if (about.mission) context += `Mission: ${about.mission}\n`;
    if (about.vision) context += `Vision: ${about.vision}\n`;
  }
  if (anns.length) context += `\nRecent Announcements:\n${anns.map(a => `- ${a.title}: ${a.excerpt || ''}`).join('\n')}\n`;
  if (progs.length) context += `\nPrograms:\n${progs.map(p => `- ${p.name}${p.duration ? ` (${p.duration})` : ''}: ${p.description || ''}`).join('\n')}\n`;
  if (cls.length) context += `\nClasses:\n${cls.map(c => `- ${c.name}${c.gradeLevel ? ` (Grade ${c.gradeLevel})` : ''}`).join('\n')}\n`;
  if (faqList.length) context += `\nFAQs:\n${faqList.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}\n`;
  if (contacts.length) context += `\nContact Info:\n${contacts.map(c => `- ${c.label}: ${c.value}`).join('\n')}\n`;
  if (upcomingEvents.length) context += `\nUpcoming Events:\n${upcomingEvents.map(e => `- ${e.title} on ${e.startDate}${e.venue ? ` at ${e.venue}` : ''}`).join('\n')}\n`;

  return context;
}

export const POST: APIRoute = async ({ request, params, clientAddress }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400 });

  const ip = clientAddress?.address || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed } = checkRateLimit(`public-chat:${slug}:${ip}`, 15, 60000);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again in a minute.' }), { status: 429 });
  }

  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404 });

  const chatEnabled = db.select().from(aiSettings)
    .where(and(eq(aiSettings.schoolId, school.id), eq(aiSettings.key, 'public_chatbot_enabled'))).get();
  if (chatEnabled && chatEnabled.value === false) return new Response(JSON.stringify({ error: 'Chatbot is disabled' }), { status: 403 });

  const apiConfig = db.select({
    key: aiApiKeys.apiKey, baseUrl: aiProviders.baseUrl, modelId: aiModels.modelId,
  }).from(aiApiKeys)
    .innerJoin(aiProviders, eq(aiApiKeys.providerId, aiProviders.id))
    .leftJoin(aiModels, eq(aiModels.providerId, aiProviders.id))
    .where(and(eq(aiApiKeys.isActive, true), eq(aiProviders.isActive, true)))
    .orderBy(aiApiKeys.usageCount).get();

  if (!apiConfig) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 503 });

  let apiKey: string;
  try { apiKey = decrypt(apiConfig.key); } catch { apiKey = apiConfig.key; }

  const data = await request.json();
  if (!data.message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });

  if (data.handoff) {
    db.insert(contactSubmissions).values({
      schoolId: school.id,
      name: data.name || 'Chatbot User',
      email: data.email || null,
      message: data.handoffMessage || 'Requested human assistance via chatbot.',
      formType: 'general',
    }).run();
    return new Response(JSON.stringify({
      response: 'Thank you! Your request has been forwarded to our team. Someone will get back to you soon.',
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const context = buildSchoolContext(school.id);
  const customInstructions = db.select().from(aiSettings)
    .where(and(eq(aiSettings.schoolId, school.id), eq(aiSettings.key, 'public_chatbot_instructions'))).get();

  const systemPrompt = `You are a friendly and helpful AI assistant for ${school.name}. You help visitors find information about the school, its programs, admissions, events, and more. Be concise, warm, and professional. Only share information from the school context provided. Do not make up information. If you don't know something or the visitor needs human help, suggest they type "talk to someone" to be connected with a staff member.\n\n${customInstructions?.value ? `Additional instructions: ${customInstructions.value}` : ''}\n\nSchool Information:\n${context}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(data.history || []),
    { role: 'user', content: data.message },
  ];

  try {
    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: apiConfig.modelId || 'gpt-4o-mini', messages, max_tokens: 1024, temperature: 0.7 }),
    });

    if (!response.ok) return new Response(JSON.stringify({ error: 'AI error' }), { status: 502 });
    const result = await response.json();
    let content = result.choices?.[0]?.message?.content || 'I apologize, I could not process your request. Please try again.';

    const handoffTriggers = ['talk to someone', 'speak to a person', 'human', 'real person', 'agent'];
    const wantsHuman = handoffTriggers.some(t => data.message.toLowerCase().includes(t));
    if (wantsHuman) {
      content += '\n\nI can connect you with a staff member. Would you like me to forward your request? Just provide your name and email, or type "yes" to proceed.';
    }

    return new Response(JSON.stringify({ response: content, usage: result.usage, wantsHuman }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response(JSON.stringify({ error: 'School slug required' }), { status: 400 });
  const db = getDb();
  const school = db.select().from(schools).where(eq(schools.slug, slug)).get();
  if (!school) return new Response(JSON.stringify({ error: 'School not found' }), { status: 404 });

  const welcomeMsg = db.select().from(aiSettings)
    .where(and(eq(aiSettings.schoolId, school.id), eq(aiSettings.key, 'public_chatbot_welcome'))).get();
  const chatEnabled = db.select().from(aiSettings)
    .where(and(eq(aiSettings.schoolId, school.id), eq(aiSettings.key, 'public_chatbot_enabled'))).get();
  const chatName = db.select().from(aiSettings)
    .where(and(eq(aiSettings.schoolId, school.id), eq(aiSettings.key, 'public_chatbot_name'))).get();

  return new Response(JSON.stringify({
    enabled: chatEnabled ? chatEnabled.value !== false : false,
    welcomeMessage: welcomeMsg?.value || `Hello! I'm here to help you learn more about ${school.name}. Ask me anything!`,
    chatbotName: chatName?.value || 'School Assistant',
    suggestedQuestions: [
      'What programs do you offer?',
      'How do I apply for admission?',
      'What are the upcoming events?',
      'How can I contact the school?',
    ],
  }), { headers: { 'Content-Type': 'application/json' } });
};
