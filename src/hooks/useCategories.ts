import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useI18n } from '../i18n';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive?: boolean;
}

interface CategoriesResponse {
  categories: Category[];
}

export const useCategories = (limit?: number) => {
  const { lang } = useI18n();
  return useQuery<Category[]>({
    queryKey: ['categories', lang],
    queryFn: async () => {
      const response = await api.get<CategoriesResponse>('/shop/categories');
      const categories = response.data.categories || [];
      
      if (limit) {
        return categories.slice(0, limit);
      }
      return categories;
    },
    staleTime: 10 * 60 * 1000,
  });
};
