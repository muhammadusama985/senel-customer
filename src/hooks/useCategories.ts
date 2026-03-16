import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

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
  return useQuery<Category[]>({
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
};