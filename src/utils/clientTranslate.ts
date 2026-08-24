/**
 * Client-side translation utilities.
 *
 * The customer app previously relied on the backend's `translateResponse`
 * middleware (which uses Google Translate) to translate every dynamic string
 * before it reached the browser. That worked but had two downsides:
 *   - every language switch was a fresh server roundtrip;
 *   - if the translate middleware was slow or failed, the home page would
 *     flash an error state.
 *
 * This module does the translation in the browser instead. It uses the same
 * underlying Google Translate endpoint the server used to call, but now the
 * roundtrip is from the customer's machine, results are cached in memory for
 * the lifetime of the page, and switching language is instant once a string
 * has been seen at least once.
 */

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export type SupportedLang = 'en' | 'de' | 'tr';

export function isSupportedLang(lang: string): lang is SupportedLang {
  return lang === 'en' || lang === 'de' || lang === 'tr';
}

/**
 * Translate a single string of text using Google's public translate endpoint.
 * - English is a no-op (returns the input unchanged).
 * - Unknown target languages are a no-op.
 * - Identical inputs share a single in-flight Promise, so a list of 12
 *   products will only issue one HTTP request per unique title.
 * - Results are cached for the lifetime of the page; the second time the
 *   customer visits the home page the translation is instant.
 */
export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  if (!text || !targetLang || targetLang === 'en') return text;
  if (!isSupportedLang(targetLang)) return text;
  if (text.length < 2) return text;

  const cacheKey = `${targetLang}::${text}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const url =
        `https://translate.googleapis.com/translate_a/single` +
        `?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) return text;
      const data = await res.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map((seg: unknown[]) => (Array.isArray(seg) ? String(seg[0] ?? '') : '')).join('')
        : text;
      const result = translated || text;
      cache.set(cacheKey, result);
      return result;
    } catch {
      return text;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, promise);
  return promise;
}

/**
 * Clear the in-memory translation cache. Useful in tests or when we ever
 * need to force a re-translation (not used in the app today).
 */
export function clearTranslationCache(): void {
  cache.clear();
  inflight.clear();
}
