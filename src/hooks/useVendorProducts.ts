import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Product } from '../types/product';
import { useI18n } from '../i18n';

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
  const { lang } = useI18n();
  return useQuery({
    // Include `lang` so vendor product titles/descriptions are refetched
    // (and re-translated) when the customer switches language. Without
    // this, the list keeps showing the previously fetched language.
    queryKey: ['vendor-products', slug, page, limit, lang],
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
};
