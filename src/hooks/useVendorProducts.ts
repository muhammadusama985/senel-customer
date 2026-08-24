import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Product } from '../types/product';
import { useTranslatedData } from './useTranslatedData';

interface VendorProductsResponse {
  vendor: {
    id: string;
    storeName: string;
    storeSlug: string;
    isVerifiedBadge: boolean;
  };
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const useVendorProducts = (slug: string, page: number = 1, limit: number = 12) => {
  const query = useQuery({
    queryKey: ['vendor-products', slug, page, limit],
    queryFn: async () => {
      const response = await api.get<VendorProductsResponse>(
        `/shop/vendors/${slug}/products`,
        { params: { page, limit } }
      );
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};
