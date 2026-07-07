const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60;

export class TranslationService {
  private supportedLanguages = [
    'en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'hi', 'ur', 'tr', 'fa', 'id', 'ms', 'th', 'vi', 'sw', 'ha'
  ];

  isRTL(lang: string): boolean {
    return ['ar', 'he', 'fa', 'ur'].includes(lang);
  }

  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
      { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
      { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
      { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
    ];
  }

  async translateText(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> {
    if (sourceLang === targetLang || !text?.trim()) return text;

    const cacheKey = `${sourceLang}-${targetLang}-${text}`;
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.text;
    }

    try {
      const translate = (await import('google-translate-api-x')).default;
      const result = await translate(text, { from: sourceLang, to: targetLang });

      translationCache.set(cacheKey, { text: result.text, timestamp: Date.now() });
      return result.text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }
}

export const translationService = new TranslationService();
