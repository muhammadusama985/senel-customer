import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useTranslatedData } from './useTranslatedData';

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

// `lang` removed from queryKey — the server response no longer depends on
// the customer's language. Translation happens client-side via
// `useTranslatedData` below.
export const useCategories = (limit?: number) => {
  const query = useQuery<Category[]>({
    queryKey: ['categories'],
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
  const translatedData = useTranslatedData(query.data);
  return { ...query, data: translatedData };
};
