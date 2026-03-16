import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Product } from '../types/product';

interface TrendingResponse {
  trending: Product[];
}

export const useTrendingProducts = (limit: number = 8) => {
  return useQuery({
    queryKey: ['products', 'trending', limit],
    queryFn: async () => {
      const response = await api.get<TrendingResponse>('/shop/trending', {
        params: { limit }
      });
      return response.data.trending;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};