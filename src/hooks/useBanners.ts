import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useI18n } from '../i18n';

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
  const { lang } = useI18n();
  return useQuery({
    // Include `lang` so React Query refetches banners (with the new
    // x-lang header) the moment the customer switches language. Without
    // this, banner titles/subtitles stay in the original language until
    // the page is reloaded.
    queryKey: ['banners', lang],
    queryFn: async () => {
      const response = await api.get<BannersResponse>('/banners');
      return Array.isArray(response.data.items) ? response.data.items : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
