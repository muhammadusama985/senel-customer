import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Product } from '../types/product';
import { useI18n } from '../i18n';

interface TrendingResponse {
  trending: Product[];
}

export const useTrendingProducts = (limit: number = 8) => {
  const { lang } = useI18n();
  return useQuery({
    queryKey: ['products', 'trending', limit, lang],
    queryFn: async () => {
      const response = await api.get<TrendingResponse>('/shop/trending', {
        params: { limit }
      });
      return response.data.trending;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
