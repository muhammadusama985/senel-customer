import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import { User, LoginCredentials, RegisterData } from '../types/user';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', credentials);
          const { accessToken, user } = response.data;
          
          localStorage.setItem('customerToken', accessToken);
          set({ user, token: accessToken, isLoading: false });
          await useCartStore.getState().syncGuestCartToServer();
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Login failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', {
            ...data,
            role: 'customer'
          });
          const { accessToken, user } = response.data;
          
          localStorage.setItem('customerToken', accessToken);
          set({ user, token: accessToken, isLoading: false });
          await useCartStore.getState().syncGuestCartToServer();
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Registration failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('customerToken');
        useCartStore.getState().resetLocalCart();
        set({ user: null, token: null, error: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          set({ user: null, token: null, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.user, token, isLoading: false });
          useCartStore.getState().fetchCart();
        } catch (error) {
          localStorage.removeItem('customerToken');
          set({ user: null, token: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
