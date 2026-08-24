import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { translateText } from '../utils/clientTranslate';

/**
 * Keys that must never be translated. These are IDs, URLs, dates, statuses,
 * money, dimensions and similar non-language fields that share a canonical
 * representation across every language.
 */
const NON_TRANSLATABLE_KEYS = new Set<string>([
  '_id', 'id', 'slug', 'sku', 'currency',
  'imageUrl', 'imageUrlMobile', 'coverImageUrl', 'bannerUrl',
  'logoUrl', 'ctaUrl', 'ctaText', 'deepLink',
  'createdAt', 'updatedAt', 'publishedAt', 'startAt', 'endAt',
  'deletedAt', 'reviewedAt', 'orderNumber', 'vendorOrderNumber',
  'paymentStatus', 'shippingStatus', 'status',
  'lang', 'locale', 'storeSlug', 'categoryId', 'vendorId',
  'attributeSetId', 'createdByAdminId', 'hotRequestedAt',
  'hotReviewedAt', 'hotReviewedByAdminId', 'reviewedByAdminId',
  'lowStockNotifiedAt',
  'minQty', 'unitPrice', 'stockQty', 'moq',
  'avgRating', 'reviewCount',
  'page', 'limit', 'total', 'pages',
  'isFeatured', 'isActive', 'isVerifiedBadge', 'isPlatformProduct',
  'hasVariants', 'trackInventory', 'requiresManualShipping',
  'lowStockActive', 'lowStockThreshold',
  'lengthCm', 'widthCm', 'heightCm',
  'minEffectiveUnitPrice', 'sortOrder', 'parentId',
  'quantity', 'minPrice', 'maxPrice', 'minMoq', 'maxMoq', 'minRating',
  'rating', 'price', 'subtotal', 'shipping', 'discount',
  'estimatedTotal', 'count', 'q', 'sort', 'role',
]);

/** Patterns for strings we should always leave in the original form. */
const PATTERNS_TO_SKIP: RegExp[] = [
  /^[a-f0-9]{24}$/i,          // Mongo ObjectId
  /^https?:\/\//i,            // URL
  /^\/[a-z0-9_]/i,            // /relative/path
  /^\d{4}-\d{2}-\d{2}/,       // ISO date
  /^[A-Z]{2,6}$/,             // Currency code, country code, etc.
  /^[A-Z0-9_-]{4,}$/,         // SKU-like
  /^#?[0-9a-f]{6,8}$/i,       // Hex colour
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // email
  /^[\d.,\-+%€$£¥\s]+$/,      // numbers / money
];

function shouldTranslate(key: string, value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (NON_TRANSLATABLE_KEYS.has(key)) return false;
  if (/_id$/i.test(key) || /^id$/i.test(key)) return false;
  if (/Url$/i.test(key) || /Uri$/i.test(key)) return false;
  if (/At$/i.test(key) || /Date$/i.test(key) || /Time$/i.test(key)) return false;
  if (PATTERNS_TO_SKIP.some((p) => p.test(value))) return false;
  if (value.length < 2) return false;
  // Skip strings that are entirely digits/punctuation.
  if (/^[\d.,\-+%€$£¥\s]+$/.test(value)) return false;
  return true;
}

async function translateObject(obj: unknown, lang: string): Promise<unknown> {
  if (!obj || typeof obj !== 'object' || lang === 'en') return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return Promise.all((obj as unknown[]).map((item) => translateObject(item, lang)));
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  const translated = await Promise.all(
    entries.map(async ([key, value]) => {
      // The product's variant catalogue — its attribute keys (Color, Size,
      // …), attribute values (Red, Blue, M, L, …), SKUs and per-variant
      // stock numbers — must stay in English regardless of the customer's
      // selected language. These names are vendor-defined inventory
      // labels: translating them would make "Red" become "Rot" and the
      // customer could no longer match what they're seeing on the listing
      // to the stock table or to what they originally searched for. The
      // same goes for any other vendor-controlled variant metadata.
      // The pricing tiers for variants are handled separately (see
      // TieredPricing.tsx) and also stay in English.
      if (key === 'variants') {
        return [key, value];
      }

      if (typeof value === 'string') {
        return [key, shouldTranslate(key, value) ? await translateText(value, lang) : value];
      }
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return [key, await translateObject(value, lang)];
      }
      return [key, value];
    })
  );

  const out: Record<string, unknown> = {};
  for (const [key, value] of translated) {
    out[key as string] = value;
  }
  return out;
}

/**
 * Returns a translated deep-clone of `data` for the customer's current
 * language. The hook:
 *   - returns `data` immediately when the language is English;
 *   - walks the object tree, sending every human-language string to the
 *     client translation endpoint;
 *   - caches results so the second time the same string is encountered
 *     (even in a different object) it is returned synchronously;
 *   - cancels in-flight work if `lang` or `data` changes mid-flight so the
 *     UI never flickers with stale translations.
 *
 * Hooks that already wrapped `useQuery` (useProducts, useCategories, ...)
 * use this to keep `data` in sync with the language without triggering a
 * server roundtrip.
 */
export function useTranslatedData<T = unknown>(data: T | undefined): T | undefined {
  const { lang } = useI18n();
  const [translated, setTranslated] = useState<T | undefined>(data);

  useEffect(() => {
    if (data === undefined) {
      setTranslated(undefined);
      return;
    }
    if (lang === 'en') {
      setTranslated(data);
      return;
    }
    let cancelled = false;
    translateObject(data, lang).then((result) => {
      if (!cancelled) setTranslated(result as T);
    });
    return () => {
      cancelled = true;
    };
  }, [lang, data]);

  return translated;
}
