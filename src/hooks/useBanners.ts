import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export interface Banner {
  id: string;
  placement?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  imageUrlMobile?: string;
  ctaUrl?: string;
  ctaText?: string;
}

interface BannersResponse {
  items: Banner[];
}

export const useBanners = () => {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await api.get<BannersResponse>('/banners');
      return Array.isArray(response.data.items) ? response.data.items : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
