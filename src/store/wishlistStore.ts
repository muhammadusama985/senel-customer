import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

interface WishlistState {
  items: string[];
  isLoading: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  fetchWishlist: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      fetchWishlist: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await api.get('/wishlist/me');
          set({ 
            items: response.data.items.map((i: any) => i.productId),
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      addToWishlist: async (productId) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          // Guest wishlist - store locally
          set((state) => ({
            items: [...state.items, productId]
          }));
          return;
        }

        try {
          await api.post('/wishlist/me', { productId });
          set((state) => ({
            items: [...state.items, productId]
          }));
        } catch (error) {
          console.error('Failed to add to wishlist:', error);
        }
      },

      removeFromWishlist: async (productId) => {
        const token = localStorage.getItem('customerToken');
        
        if (!token) {
          set((state) => ({
            items: state.items.filter(id => id !== productId)
          }));
          return;
        }

        try {
          await api.delete(`/wishlist/me/${productId}`);
          set((state) => ({
            items: state.items.filter(id => id !== productId)
          }));
        } catch (error) {
          console.error('Failed to remove from wishlist:', error);
        }
      },

      isInWishlist: (productId) => {
        return get().items.includes(productId);
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
);