import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export interface Vendor {
  id: string;
  storeName: string;
  storeSlug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  isVerifiedBadge: boolean;
  business?: {
    country: string;
    city: string;
  };
}

interface VendorsListResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: Vendor[];
}

interface VendorsListParams {
  q?: string;
  country?: string;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export const useVendor = (slug: string) => {
  return useQuery({
    queryKey: ['vendor', slug],
    queryFn: async () => {
      const response = await api.get(`/shop/vendors/${slug}`);
      return response.data.vendor;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
};

export const useVendorProducts = (slug: string, page: number = 1, limit: number = 12) => {
  return useQuery({
    queryKey: ['vendor-products', slug, page],
    queryFn: async () => {
      const response = await api.get(
        `/shop/vendors/${slug}/products`,
        { params: { page, limit } }
      );
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

export const useVendorsList = (params: VendorsListParams = {}) => {
  const {
    q = '',
    country = '',
    verified,
    page = 1,
    limit = 20,
  } = params;

  return useQuery({
    queryKey: ['vendors-list', q, country, verified, page, limit],
    queryFn: async () => {
      const response = await api.get<VendorsListResponse>('/shop/vendors', {
        params: {
          q: q || undefined,
          country: country || undefined,
          verified: verified === undefined ? undefined : String(verified),
          page,
          limit,
        },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
