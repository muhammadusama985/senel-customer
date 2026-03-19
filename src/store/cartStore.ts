import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

export interface CartItem {
  cartItemId: string;
  productId: string;
  vendorId: string;
  slug?: string;
  title: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
  variantSku?: string;
  moq?: number;
  requiresManualShipping?: boolean;
}

interface CartResponse {
  cart: {
    _id: string;
    items: any[];
    subtotal: number;
    totalItems: number;
  };
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  normalizeServerItems: (serverItems: any[]) => CartItem[];
  setCartFromItems: (items: CartItem[]) => void;
  
  fetchCart: () => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    variantSku?: string,
    productData?: Partial<CartItem>
  ) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncGuestCartToServer: () => Promise<void>;
  resetLocalCart: () => void;
  clearError: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      itemCount: 0,
      isLoading: false,
      error: null,

      normalizeServerItems: (serverItems: any[] = []) => {
        return serverItems.map((raw: any) => ({
          cartItemId: String(raw._id || raw.id || raw.productId),
          productId: String(raw.productId || ''),
          vendorId: String(raw.vendorId || ''),
          slug: raw.slug || '',
          title: raw.title || 'Product',
          quantity: Number(raw.qty || raw.quantity || 0),
          unitPrice: Number(raw.unitPrice || 0),
          lineTotal: Number(raw.lineTotal || 0),
          imageUrl: raw.imageUrl || '',
          variantSku: raw.variantSku || '',
          moq: Number(raw.moq || 1),
          requiresManualShipping: Boolean(raw.requiresManualShipping),
        }));
      },

      setCartFromItems: (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        set({
          items,
          subtotal,
          itemCount,
          isLoading: false,
          error: null,
        });
      },

      fetchCart: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await api.get<CartResponse>('/cart/me');
          const cart = response.data.cart;
          const normalizedItems = get().normalizeServerItems(cart.items || []);
          set({
            items: normalizedItems,
            subtotal: cart.subtotal || normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0),
            itemCount: cart.totalItems || normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to fetch cart',
            isLoading: false 
          });
        }
      },

      addItem: async (productId, quantity, variantSku = '', productData) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          const currentItems = get().items;
          const existingItem = currentItems.find(
            (item) => item.productId === productId && (item.variantSku || '') === variantSku
          );
          const unitPrice = productData?.unitPrice || existingItem?.unitPrice || 0;
          const nextItems = existingItem
            ? currentItems.map((item) =>
                item.productId === productId && (item.variantSku || '') === variantSku
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      lineTotal: unitPrice * (item.quantity + quantity),
                    }
                  : item
              )
            : [
                ...currentItems,
                {
                  cartItemId: productId,
                  productId,
                  vendorId: productData?.vendorId || '',
                  slug: productData?.slug || '',
                  title: productData?.title || 'Product',
                  quantity,
                  unitPrice,
                  lineTotal: unitPrice * quantity,
                  imageUrl: productData?.imageUrl,
                  variantSku,
                  moq: productData?.moq,
                  requiresManualShipping: productData?.requiresManualShipping,
                },
              ];

          const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const itemCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);
          set({ items: nextItems, subtotal, itemCount, isLoading: false, error: null });
          return;
        }

        set({ isLoading: true });
        try {
          await api.post('/cart/me/items', {
            productId,
            qty: quantity,
            variantSku,
          });
          await get().fetchCart();
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to add item',
            isLoading: false 
          });
          throw error;
        }
      },

      updateQuantity: async (cartItemId, quantity) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          const nextItems = get().items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
              : item
          );
          const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const itemCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);
          set({ items: nextItems, subtotal, itemCount, isLoading: false, error: null });
          return;
        }

        set({ isLoading: true });
        try {
          const item = get().items.find((i) => i.cartItemId === cartItemId);
          if (item) {
            await api.patch(`/cart/me/items/${item.cartItemId}`, { qty: quantity });
            await get().fetchCart();
          }
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to update quantity',
            isLoading: false 
          });
        }
      },

      removeItem: async (cartItemId) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          const nextItems = get().items.filter((item) => item.cartItemId !== cartItemId);
          const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const itemCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);
          set({ items: nextItems, subtotal, itemCount, isLoading: false, error: null });
          return;
        }

        set({ isLoading: true });
        try {
          const item = get().items.find((i) => i.cartItemId === cartItemId);
          if (item) {
            await api.delete(`/cart/me/items/${item.cartItemId}`);
            await get().fetchCart();
          }
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to remove item',
            isLoading: false 
          });
        }
      },

      clearCart: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          set({ items: [], subtotal: 0, itemCount: 0 });
          return;
        }

        set({ isLoading: true });
        try {
          await api.delete('/cart/me');
          set({ items: [], subtotal: 0, itemCount: 0, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to clear cart',
            isLoading: false 
          });
        }
      },

      syncGuestCartToServer: async () => {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        const guestItems = [...get().items];
        if (!guestItems.length) {
          await get().fetchCart();
          return;
        }

        set({ isLoading: true });
        try {
          for (const item of guestItems) {
            if (!item.productId || item.quantity <= 0) continue;
            try {
              await api.post('/cart/me/items', {
                productId: item.productId,
                qty: item.quantity,
                variantSku: item.variantSku || '',
              });
            } catch {
              // Keep merge resilient; skip invalid/out-of-stock items.
            }
          }
          try {
            const response = await api.get<CartResponse>('/cart/me');
            const cart = response.data.cart;
            const normalizedItems = get().normalizeServerItems(cart.items || []);

            // Keep the guest cart visible if the server merge responds empty right after login.
            if (normalizedItems.length === 0 && guestItems.length > 0) {
              get().setCartFromItems(guestItems);
              return;
            }

            set({
              items: normalizedItems,
              subtotal: cart.subtotal || normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0),
              itemCount: cart.totalItems || normalizedItems.reduce((sum, item) => sum + item.quantity, 0),
              isLoading: false,
              error: null,
            });
          } catch {
            get().setCartFromItems(guestItems);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      resetLocalCart: () => {
        set({ items: [], subtotal: 0, itemCount: 0, error: null, isLoading: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ 
        items: state.items, 
        subtotal: state.subtotal, 
        itemCount: state.itemCount 
      }),
    }
  )
);
