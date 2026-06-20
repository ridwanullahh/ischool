import type { APIRoute } from 'astro';
import { translationService } from '../../lib/i18n/translation-service.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { text, targetLang, sourceLang = 'en' } = await request.json();

    if (!text || !targetLang) {
      return new Response(JSON.stringify({ error: 'Text and targetLang are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (sourceLang === targetLang) {
      return new Response(JSON.stringify({ translatedText: text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const translatedText = await translationService.translateText(text, targetLang, sourceLang);

    return new Response(JSON.stringify({ translatedText }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return new Response(JSON.stringify({ translatedText: '', error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
