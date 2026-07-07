import type { APIRoute } from 'astro';
import { translationService } from '../../lib/i18n/translation-service.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, texts, targetLang, sourceLang = 'en', batch } = body;

    if (!targetLang) {
      return new Response(JSON.stringify({ error: 'targetLang is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (sourceLang === targetLang) {
      if (batch && Array.isArray(texts)) {
        return new Response(JSON.stringify({ translations: texts }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ translatedText: text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Batch translation
    if (batch && Array.isArray(texts)) {
      const translations = await Promise.all(
        texts.map(t => translationService.translateText(t, targetLang, sourceLang))
      );
      return new Response(JSON.stringify({ translations }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Single translation
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const translatedText = await translationService.translateText(text, targetLang, sourceLang);

    return new Response(JSON.stringify({ translatedText }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return new Response(JSON.stringify({ translatedText: '', error: 'Translation failed' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
};
