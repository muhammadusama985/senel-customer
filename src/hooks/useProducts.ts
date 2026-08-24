import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';
import { Product } from '../types/product';
import { useTranslatedData } from './useTranslatedData';

export interface ProductsQueryParams {
  q?: string;
  categoryId?: string;
  vendorId?: string;
  country?: string;
  featured?: boolean;
  source?: 'vendor' | 'admin_platform' | 'admin_vendor';
  isPlatformProduct?: boolean;
  createdByAdmin?: boolean;
  minMoq?: number;
  maxMoq?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

interface ProductsResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Product[];
}

// NOTE: `lang` is intentionally NO LONGER part of any queryKey below.
// Translation now happens entirely in the browser (see `useTranslatedData`),
// so the data the server returns never depends on the customer's language.
// That means a language switch is a pure client-side operation — no
// server roundtrip, no skeleton flash, no failure if the backend translation
// pass is slow.

export const useProducts = (params: ProductsQueryParams = {}) => {
  const {
    q = '',
    categoryId,
    vendorId,
    country,
    featured,
    source,
    isPlatformProduct,
    createdByAdmin,
    minMoq,
    maxMoq,
    minPrice,
    maxPrice,
    minRating,
    sort = 'newest',
    page = 1,
    limit = 20,
  } = params;

  const query = useQuery({
    queryKey: ['products', params],
    // Keep the previous products visible while a refetch (caused by filter
    // / sort changes, not language changes) is in flight.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      
      if (q) searchParams.append('q', q);
      if (categoryId) searchParams.append('categoryId', categoryId);
      if (vendorId) searchParams.append('vendorId', vendorId);
      if (country) searchParams.append('country', country);
      if (featured !== undefined) searchParams.append('featured', String(featured));
      if (source) searchParams.append('source', source);
      if (isPlatformProduct !== undefined) searchParams.append('isPlatformProduct', String(isPlatformProduct));
      if (createdByAdmin !== undefined) searchParams.append('createdByAdmin', String(createdByAdmin));
      if (minMoq) searchParams.append('minMoq', String(minMoq));
      if (maxMoq) searchParams.append('maxMoq', String(maxMoq));
      if (minPrice) searchParams.append('minPrice', String(minPrice));
      if (maxPrice) searchParams.append('maxPrice', String(maxPrice));
      if (minRating) searchParams.append('minRating', String(minRating));
      if (sort) searchParams.append('sort', sort);
      if (page) searchParams.append('page', String(page));
      if (limit) searchParams.append('limit', String(limit));

      const response = await api.get<ProductsResponse>(`/shop/products?${searchParams}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Client-side translation pass. Walks the products tree and replaces
  // every human-language string with its cached/translated version for
  // the current language. Components below this hook see the translated
  // data and never need to know about translation themselves.
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};

export const useProduct = (slug: string) => {
  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await api.get<{ product: Product }>(`/shop/products/${slug}`);
      return response.data.product;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};

export const useRelatedProducts = (productId: string, limit: number = 4) => {
  const query = useQuery({
    queryKey: ['related-products', productId, limit],
    queryFn: async () => {
      const response = await api.get(`/shop/recommendations/${productId}`, {
        params: { limit }
      });
      return response.data.recommendations || [];
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};

export const useTrendingProducts = (limit: number = 8) => {
  const query = useQuery({
    queryKey: ['trending', limit],
    queryFn: async () => {
      const response = await api.get('/shop/trending', {
        params: { limit }
      });
      return response.data.trending || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};
