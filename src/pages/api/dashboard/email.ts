import type { APIRoute } from 'astro';
import { getSessionIdFromCookie, validateSession } from '../../../lib/auth.js';
import { getUserSchoolId, getUserSchool } from '../../../lib/school.js';
import { getDb } from '../../../lib/db/index.js';
import { emailLists, emailSubscribers, emailCampaigns, emailCampaignStats, emailTemplates } from '../../../lib/db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { guardPermission } from '../../../lib/rbac.js';

export const GET: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const type = new URL(request.url).searchParams.get('type');

  if (type === 'lists') {
    const lists = db.select().from(emailLists).where(eq(emailLists.schoolId, schoolId)).all();
    return new Response(JSON.stringify(lists), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'subscribers') {
    const listId = new URL(request.url).searchParams.get('listId');
    const subs = listId
      ? db.select().from(emailSubscribers).where(eq(emailSubscribers.listId, Number(listId))).all()
      : db.select().from(emailSubscribers).where(eq(emailSubscribers.schoolId, schoolId)).all();
    return new Response(JSON.stringify(subs), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'campaigns') {
    const campaigns = db.select().from(emailCampaigns).where(eq(emailCampaigns.schoolId, schoolId)).orderBy(desc(emailCampaigns.createdAt)).all();
    return new Response(JSON.stringify(campaigns), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'templates') {
    const templates = db.select().from(emailTemplates).where(eq(emailTemplates.schoolId, schoolId)).all();
    return new Response(JSON.stringify(templates), { headers: { 'Content-Type': 'application/json' } });
  }

  if (type === 'stats') {
    const campaignId = new URL(request.url).searchParams.get('campaignId');
    if (campaignId) {
      const stats = db.select().from(emailCampaignStats).where(eq(emailCampaignStats.campaignId, Number(campaignId))).all();
      return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Overview stats
  const totalSubs = db.select({ c: sql<number>`count(*)` }).from(emailSubscribers).where(eq(emailSubscribers.schoolId, schoolId)).get()?.c || 0;
  const totalCampaigns = db.select({ c: sql<number>`count(*)` }).from(emailCampaigns).where(eq(emailCampaigns.schoolId, schoolId)).get()?.c || 0;
  const totalLists = db.select({ c: sql<number>`count(*)` }).from(emailLists).where(eq(emailLists.schoolId, schoolId)).get()?.c || 0;

  return new Response(JSON.stringify({
    totalSubscribers: totalSubs,
    totalCampaigns: totalCampaigns,
    totalLists: totalLists,
  }), { headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  const schoolId = getUserSchoolId(user);
  if (!schoolId) return new Response(JSON.stringify({ error: 'No school' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const db = getDb();
  const school = getUserSchool(user);
  const data = await request.json();
  const action = data.action;

  if (action === 'create_list') {
    const [list] = db.insert(emailLists).values({ schoolId, name: data.name, description: data.description || null }).returning().all();
    return new Response(JSON.stringify({ success: true, list }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'add_subscribers') {
    const listId = data.listId;
    const subscribers = data.subscribers || [];
    let added = 0;
    for (const s of subscribers) {
      try {
        db.insert(emailSubscribers).values({
          schoolId, listId, email: s.email, firstName: s.firstName || null,
          lastName: s.lastName || null, status: 'active',
          source: 'manual', subscribedAt: new Date().toISOString(),
        } as any).run();
        added++;
      } catch (e: any) { console.error("Parse error:", e); }
    }
    // Update count
    const count = db.select({ c: sql<number>`count(*)` }).from(emailSubscribers).where(eq(emailSubscribers.listId, listId)).get()?.c || 0;
    db.update(emailLists).set({ subscriberCount: count }).where(eq(emailLists.id, listId)).run();
    return new Response(JSON.stringify({ success: true, added }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'create_campaign') {
    const [campaign] = db.insert(emailCampaigns).values({
      schoolId, name: data.name, subject: data.subject,
      fromName: data.fromName || school?.name || 'School',
      fromEmail: data.fromEmail || 'noreply@ischool.com',
      htmlContent: data.htmlContent || '',
      plainText: data.plainText || '',
      listId: data.listId || null,
      type: data.type || 'regular',
      status: 'draft',
    } as any).returning().all();
    return new Response(JSON.stringify({ success: true, campaign }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'send_campaign') {
    const campaignId = data.campaignId;
    const campaign = db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId)).get();
    if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    // Get subscribers
    const subs = campaign.listId
      ? db.select().from(emailSubscribers).where(eq(emailSubscribers.listId, campaign.listId)).all()
      : db.select().from(emailSubscribers).where(eq(emailSubscribers.schoolId, schoolId)).all();

    const activeSubs = subs.filter(s => s.status === 'active');
    let sent = 0, failed = 0;

    // Send emails using existing email system
    try {
      const { sendEmail } = await import('../../../lib/email.js');
      for (const sub of activeSubs) {
        try {
          const personalizedHtml = (campaign.htmlContent || '').replace(/\{first_name\}/g, sub.firstName || '').replace(/\{last_name\}/g, sub.lastName || '').replace(/\{school_name\}/g, school?.name || 'School');
          const unsubscribeLink = `\n\n---\nUnsubscribe: ${new URL(request.url).origin}/unsubscribe?email=${encodeURIComponent(sub.email)}`;
          await sendEmail({
            to: sub.email,
            subject: campaign.subject || campaign.name,
            html: personalizedHtml + unsubscribeLink,
            fromName: campaign.fromName || undefined,
          });
          sent++;
          // Rate limit: wait 100ms between sends
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          failed++;
        }
      }

      // Update campaign status
      db.update(emailCampaigns).set({ status: 'sent', sentAt: new Date().toISOString() }).where(eq(emailCampaigns.id, campaignId)).run();

      // Create stats record
      db.insert(emailCampaignStats).values({
        campaignId, sent, delivered: sent, date: new Date().toISOString().split('T')[0],
      } as any).run();

      return new Response(JSON.stringify({ success: true, sent, failed }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'Failed to send: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'save_template') {
    const [template] = db.insert(emailTemplates).values({
      schoolId, name: data.name, htmlContent: data.htmlContent || '',
      category: data.category || 'custom',
    } as any).returning().all();
    return new Response(JSON.stringify({ success: true, template }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'ai_generate') {
    // AI generate email content
    try {
      const { getAIConfig } = await import('../../../lib/ai-config.js');
      const aiConfig = getAIConfig();
      if (!aiConfig) return new Response(JSON.stringify({ error: 'AI not configured. Set AI_API_KEY and AI_BASE_URL in .env' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

      const prompt = data.prompt || 'Write a school newsletter email';
      const aiResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
        body: JSON.stringify({
          model: aiConfig.modelId,
          messages: [
            { role: 'system', content: 'You are a professional email marketing writer for schools. Write engaging HTML email content. Return ONLY the HTML content.' },
            { role: 'user', content: `Write an email for ${school?.name || 'a school'}. Topic: ${prompt}` }
          ],
          max_tokens: 2000, temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) return new Response(JSON.stringify({ error: 'AI error' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content || '';

      // Also generate subject line
      const subjectResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: aiConfig.modelId,
          messages: [
            { role: 'system', content: 'Write a compelling email subject line for a school email. Return ONLY the subject line.' },
            { role: 'user', content: `Topic: ${prompt}` }
          ],
          max_tokens: 100, temperature: 0.8,
        }),
      });
      const subjectResult = await subjectResponse.json();
      const subject = subjectResult.choices?.[0]?.message?.content?.trim() || 'School Update';

      return new Response(JSON.stringify({ success: true, content, subject }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: 'AI failed: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }



  if (action === 'save_campaign') {
    const campaignId = data.campaignId;
    const values = {
      name: data.name, subject: data.subject,
      fromName: data.fromName || null, fromEmail: data.fromEmail || null,
      htmlContent: data.htmlContent || '', listId: data.listId || null,
      type: data.type || 'regular', status: data.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: data.scheduledAt || null, updatedAt: new Date(),
    };
    if (campaignId) {
      db.update(emailCampaigns).set(values).where(eq(emailCampaigns.id, Number(campaignId))).run();
      return new Response(JSON.stringify({ success: true, campaignId }), { headers: { 'Content-Type': 'application/json' } });
    } else {
      const [c] = db.insert(emailCampaigns).values({ schoolId, ...values } as any).returning().all();
      return new Response(JSON.stringify({ success: true, campaignId: c.id }), { headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (action === 'delete_campaign') {
    db.delete(emailCampaigns).where(eq(emailCampaigns.id, Number(data.campaignId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'add_subscriber') {
    try {
      db.insert(emailSubscribers).values({
        schoolId, listId: data.listId || null, email: data.email,
        firstName: data.firstName || null, lastName: data.lastName || null,
        status: 'active', source: 'manual', subscribedAt: new Date().toISOString(),
      } as any).run();
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch { return new Response(JSON.stringify({ error: 'Already exists' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  }

  if (action === 'delete_list') {
    db.delete(emailLists).where(eq(emailLists.id, Number(data.listId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'create_automation') {
    db.insert(emailAutomations).values({
      schoolId, name: data.name, trigger: { type: data.trigger }, steps: [],
      status: 'active',
    } as any).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'toggle_automation') {
    db.update(emailAutomations).set({ status: data.status, updatedAt: new Date() }).where(eq(emailAutomations.id, Number(data.automationId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'delete_template') {
    db.delete(emailTemplates).where(eq(emailTemplates.id, Number(data.templateId))).run();
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'ai_subject') {
    try {
      const { getAIConfig } = await import('../../../lib/ai-config.js');
      const aiConfig = getAIConfig();
      if (!aiConfig) return new Response(JSON.stringify({ error: 'AI not configured. Set AI_API_KEY and AI_BASE_URL in .env' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      const aiResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
        body: JSON.stringify({ model: aiConfig.modelId, messages: [{ role: 'system', content: 'Write a compelling email subject line for a school email. Return ONLY the subject line.' }, { role: 'user', content: data.prompt || 'school newsletter' }], max_tokens: 100, temperature: 0.8 }),
      });
      const result = await aiResponse.json();
      return new Response(JSON.stringify({ subject: result.choices?.[0]?.message?.content?.trim() || 'School Update' }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) { return new Response(JSON.stringify({ error: 'AI failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } }); }
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
};
