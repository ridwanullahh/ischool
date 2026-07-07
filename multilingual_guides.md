

بسم الله الرحمن الرحيم
# Multilingual Implementation Guide (NB: This was original used in a next app, so just adapt as applied this current Astro stack)
## Automatic Runtime Translation for Next.js Applications

This guide documents the approach used to implement automatic multilingual support without language files.

---

## Overview

This implementation provides automatic translation for any Next.js application using:
- **Runtime translation** via Google Translate API (free, no API key needed)
- **No language files** - all translations happen automatically
- **SPA-aware** - translations persist and update on route changes
- **RTL support** - automatic directionality for Arabic, Hebrew, Persian, Urdu
- **Performance optimized** - client and server-side caching with rate limiting

---

## Architecture

### Core Components

1. **Translation Service** (`lib/i18n/translation-service.ts`)
   - Manages language preferences
   - Handles API calls for translation
   - Client-side caching
   - Language detection
   - RTL detection

2. **Translation API** (`app/api/translate/route.ts`)
   - Server-side endpoint for translations
   - Uses `google-translate-api-x` package
   - Server-side caching (1 hour)
   - Rate limiting protection
   - Error handling with graceful fallbacks

3. **Language Selector** (`components/layout/language-selector.tsx`)
   - UI component for language switching
   - Displays native language names
   - Saves preference to localStorage
   - Updates HTML lang and dir attributes

4. **Translation Provider** (`components/providers/translation-provider.tsx`)
   - Sets initial language on mount
   - Applies RTL/LTR directionality

5. **Auto-Translate Provider** (`components/providers/auto-translate-provider.tsx`)
   - Automatically translates all text on the page
   - Batch processing with rate limiting
   - Route-aware (re-translates on navigation)
   - MutationObserver for dynamic content
   - Tracks translated nodes to avoid duplication

---

## Installation Steps

### 1. Install Required Package

```bash
npm install google-translate-api-x
```

### 2. Update package.json

Add to dependencies:
```json
"google-translate-api-x": "^10.7.1"
```

---

## Implementation Steps

### Step 1: Create Translation Service

**File:** `lib/i18n/translation-service.ts`

```typescript
export class TranslationService {
  private cache: Map<string, Map<string, string>> = new Map()
  private supportedLanguages = [
    'en', 'ar', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'hi', 'ur', 'tr', 'fa', 'id', 'ms', 'th', 'vi', 'sw', 'ha'
  ]

  isRTL(lang?: string): boolean {
    const language = lang || 'en'
    const rtlLanguages = ['ar', 'he', 'fa', 'ur']
    return rtlLanguages.includes(language)
  }

  getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      // ... add all supported languages
    ]
  }

  async translateText(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> {
    if (sourceLang === targetLang || !text?.trim()) return text
    
    // Check cache
    const cacheKey = `${sourceLang}-${targetLang}`
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, new Map())
    }
    const langCache = this.cache.get(cacheKey)!
    if (langCache.has(text)) {
      return langCache.get(text)!
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang, sourceLang })
      })

      if (!response.ok) throw new Error('Translation failed')

      const data = await response.json()
      const translation = data.translatedText || text

      langCache.set(text, translation)
      return translation
    } catch (error) {
      console.error('Translation error:', error)
      return text
    }
  }

  getCurrentLanguage(): string {
    if (typeof window === 'undefined') return 'en'
    const saved = localStorage.getItem('preferredLanguage')
    if (saved) return saved
    const browserLang = navigator.language.split('-')[0]
    return this.supportedLanguages.includes(browserLang) ? browserLang : 'en'
  }

  setLanguage(lang: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('preferredLanguage', lang)
    document.documentElement.lang = lang
    const isRTL = this.isRTL(lang)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    window.location.reload()
  }

  formatNumber(number: number, lang?: string): string {
    const language = lang || 'en'
    return new Intl.NumberFormat(language).format(number)
  }

  formatDate(date: Date | string, lang?: string, options?: Intl.DateTimeFormatOptions): string {
    const language = lang || 'en'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }
    return new Intl.DateTimeFormat(language, defaultOptions).format(dateObj)
  }

  formatCurrency(amount: number, currency: string = 'USD', lang?: string): string {
    const language = lang || 'en'
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency
    }).format(amount)
  }
}

export const translationService = new TranslationService()
```

### Step 2: Create Translation API Endpoint

**File:** `app/api/translate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import translate from 'google-translate-api-x'

const translationCache = new Map<string, { text: string; timestamp: number }>()
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang, sourceLang = 'en' } = await request.json()

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Text and targetLang are required' }, { status: 400 })
    }

    if (sourceLang === targetLang) {
      return NextResponse.json({ translatedText: text })
    }

    // Check cache
    const cacheKey = `${sourceLang}-${targetLang}-${text}`
    const cached = translationCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ translatedText: cached.text })
    }

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      const result = await translate(text, { from: sourceLang, to: targetLang })
      
      translationCache.set(cacheKey, {
        text: result.text,
        timestamp: Date.now()
      })

      return NextResponse.json({
        translatedText: result.text,
        sourceLang: result.from.language.iso
      })
    } catch (translateError) {
      console.error('Translation service error:', translateError)
      return NextResponse.json({
        translatedText: text,
        error: 'Translation service unavailable'
      })
    }
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json({ translatedText: '', error: 'Invalid request' }, { status: 400 })
  }
}
```

### Step 3: Create Language Selector Component

**File:** `components/layout/language-selector.tsx`

```typescript
"use client"

import { useState, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { translationService } from '@/lib/i18n/translation-service'

export function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setCurrentLanguage(translationService.getCurrentLanguage())
  }, [])

  const languages = translationService.getSupportedLanguages()

  const handleLanguageChange = (langCode: string) => {
    translationService.setLanguage(langCode)
    setCurrentLanguage(langCode)
    setIsOpen(false)
  }

  const currentLangData = languages.find(l => l.code === currentLanguage)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Select Language"
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">
          {currentLangData?.nativeName || 'English'}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-sm font-semibold text-muted-foreground">
                Select Language
              </div>
              <div className="space-y-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                      currentLanguage === lang.code ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{lang.nativeName}</span>
                      <span className="text-xs text-muted-foreground">{lang.name}</span>
                    </div>
                    {currentLanguage === lang.code && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

### Step 4: Create Translation Provider

**File:** `components/providers/translation-provider.tsx`

```typescript
"use client"

import { useEffect } from 'react'
import { translationService } from '@/lib/i18n/translation-service'

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const currentLang = translationService.getCurrentLanguage()
    const isRTL = translationService.isRTL(currentLang)
    
    document.documentElement.lang = currentLang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [])

  return <>{children}</>
}
```

### Step 5: Create Auto-Translate Provider

**File:** `components/providers/auto-translate-provider.tsx`

```typescript
"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { translationService } from '@/lib/i18n/translation-service'

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const currentLang = translationService.getCurrentLanguage()
    
    if (currentLang === 'en') return

    const translatedNodes = new Set<Node>()
    let translationQueue: Array<{ node: Node; text: string }> = []
    let isProcessing = false

    const processQueue = async () => {
      if (isProcessing || translationQueue.length === 0) return
      
      isProcessing = true
      const batch = translationQueue.splice(0, 5)

      for (const { node, text } of batch) {
        try {
          const translated = await translationService.translateText(text, currentLang, 'en')
          if (node.textContent !== translated && !translatedNodes.has(node)) {
            node.textContent = translated
            translatedNodes.add(node)
          }
        } catch (error) {
          // Silently fail
        }
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      isProcessing = false
      
      if (translationQueue.length > 0) {
        setTimeout(processQueue, 200)
      }
    }

    const collectTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text && text.length > 0 && text.length < 500 && !translatedNodes.has(node)) {
          translationQueue.push({ node, text })
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        
        if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'SVG'].includes(element.tagName)) {
          return
        }

        if (element.hasAttribute('data-translated')) {
          return
        }

        for (const child of Array.from(element.childNodes)) {
          collectTextNodes(child)
        }
      }
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          collectTextNodes(node)
        }
      }
      if (translationQueue.length > 0 && !isProcessing) {
        processQueue()
      }
    })

    const timer = setTimeout(() => {
      const body = document.body
      if (body) {
        collectTextNodes(body)
        processQueue()
        
        observer.observe(body, {
          childList: true,
          subtree: true
        })
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
      translationQueue = []
      translatedNodes.clear()
    }
  }, [pathname])

  return <>{children}</>
}
```

### Step 6: Add RTL CSS Support

**File:** `app/globals.css`

Add at the end of the file:

```css
/* RTL Support - Additional Styles */
[dir="rtl"] {
  direction: rtl;
}

[dir="ltr"] {
  direction: ltr;
}

.rtl {
  direction: rtl;
}

.ltr {
  direction: ltr;
}

/* Flip margins and paddings for RTL */
[dir="rtl"] .ml-auto {
  margin-left: 0;
  margin-right: auto;
}

[dir="rtl"] .mr-auto {
  margin-right: 0;
  margin-left: auto;
}

/* RTL-aware text alignment */
[dir="rtl"] .text-left {
  text-align: right;
}

[dir="rtl"] .text-right {
  text-align: left;
}
```

### Step 7: Integrate Providers in Layout

**File:** `app/layout.tsx`

```typescript
import { TranslationProvider } from "@/components/providers/translation-provider"
import { AutoTranslateProvider } from "@/components/providers/auto-translate-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TranslationProvider>
          <AutoTranslateProvider>
            {children}
          </AutoTranslateProvider>
        </TranslationProvider>
      </body>
    </html>
  )
}
```

### Step 8: Add Language Selector to Navigation

Add the LanguageSelector component to your main navigation/header components:

```typescript
import { LanguageSelector } from '@/components/layout/language-selector'

// In your header component
<LanguageSelector />
```

---

## Key Features

### 1. **No Language Files**
- All text is automatically translated at runtime
- No need to maintain translation files
- Add new content without updating translations

### 2. **Automatic Translation**
- Translates all text nodes on the page
- Handles dynamically added content via MutationObserver
- Re-translates when navigating between pages (SPA-aware)

### 3. **Performance Optimized**
- Client-side caching in TranslationService
- Server-side caching in API endpoint (1 hour)
- Batch processing (5 items at a time)
- Rate limiting delays (50ms between client, 100ms on server)
- Tracks translated nodes to avoid duplication

### 4. **RTL Support**
- Automatic detection for Arabic, Hebrew, Persian, Urdu
- CSS directionality applied automatically
- Layout mirroring support

### 5. **Error Handling**
- Graceful fallbacks to original text
- Silent failures don't break the page
- Console logging for debugging

### 6. **SPA Compatible**
- Uses `usePathname()` hook
- Re-translates on route changes
- No page reload needed (except language switch)

---

## Supported Languages

English (en), Arabic (ar), French (fr), Spanish (es), German (de), Italian (it), Portuguese (pt), Russian (ru), Chinese (zh), Japanese (ja), Korean (ko), Hindi (hi), Urdu (ur), Turkish (tr), Persian (fa), Indonesian (id), Malay (ms), Thai (th), Vietnamese (vi), Swahili (sw), Hausa (ha)

---

## Usage in Components

### Using the Translation Service Directly

```typescript
import { translationService } from '@/lib/i18n/translation-service'

const MyComponent = () => {
  const [translated, setTranslated] = useState('')

  useEffect(() => {
    const currentLang = translationService.getCurrentLanguage()
    translationService.translateText('Hello World', currentLang).then(setTranslated)
  }, [])

  return <div>{translated}</div>
}
```

### Format Numbers and Dates

```typescript
const formatted = translationService.formatNumber(1234567.89)
const date = translationService.formatDate(new Date())
const price = translationService.formatCurrency(99.99, 'USD')
```

---

## Best Practices

1. **Keep text under 500 characters** for optimal translation performance
2. **Avoid translating code, scripts, and technical content** - they're automatically skipped
3. **Use semantic HTML** - helps the translator understand context
4. **Test with RTL languages** (Arabic, Hebrew) to ensure layout works properly
5. **Monitor console for translation errors** during development
6. **Consider adding language in schema** for content that should stay in original language

---

## Troubleshooting

### 403 Forbidden Errors
- Server-side caching and rate limiting are implemented
- If errors persist, consider adding more delay or implementing backoff

### Translations Not Appearing
- Check console for errors
- Ensure `google-translate-api-x` is installed
- Verify API endpoint is accessible
- Check that AutoTranslateProvider is wrapping your app

### Performance Issues
- Reduce batch size in processQueue (default is 5)
- Increase delays between translations
- Consider lazy loading translations for below-fold content

### RTL Layout Issues
- Add more RTL-specific CSS rules
- Use Tailwind RTL plugin for better support
- Test thoroughly with Arabic content

---

## Advantages of This Approach

✅ **No maintenance** - No translation files to update
✅ **Instant deployment** - Add new content without translations
✅ **Cost-effective** - Free translation API (google-translate-api-x)
✅ **Automatic** - Everything translates automatically
✅ **SPA-compatible** - Works with client-side routing
✅ **RTL support** - Built-in directionality handling
✅ **Performance** - Multi-level caching strategy
✅ **Scalable** - Add languages without code changes

---

## Limitations

⚠️ **Translation Quality** - Automatic translation may not be perfect
⚠️ **Rate Limiting** - Free API has limits, may need delays
⚠️ **Initial Load** - First translation takes time, subsequent loads are cached
⚠️ **Context** - May miss cultural context or idioms
⚠️ **Technical Terms** - May incorrectly translate technical jargon

---

## Production Considerations

For production deployment:
1. Consider upgrading to paid translation API for better quality and higher limits
2. Implement proper monitoring for translation errors
3. Add fallback mechanisms for when translation service is unavailable
4. Consider pre-translating critical content and caching permanently
5. Add loading states for initial translation
6. Implement language-specific overrides for important content

---

## Conclusion

This implementation provides a robust, automatic multilingual solution for Next.js applications without the overhead of maintaining translation files. It's ideal for applications where:
- Content changes frequently
- Quick deployment is prioritized
- Perfect translations are not critical
- Supporting many languages is important
- Development resources are limited

الحمد لله رب العالمين

---

**Note:** This guide is based on the implementation in the GoSchool Platform. Adapt as needed for your specific use case.
