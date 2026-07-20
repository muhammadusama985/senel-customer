import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

const asCleanString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.url === 'string') return candidate.url;
  if (typeof candidate.imageUrl === 'string') return candidate.imageUrl;
  if (typeof candidate.fileUrl === 'string') return candidate.fileUrl;
  if (typeof candidate.src === 'string') return candidate.src;
  if (typeof candidate.title === 'string') return candidate.title;
  if (typeof candidate.name === 'string') return candidate.name;

  return '';
};

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
  variantAttributes?: Record<string, string>;
  currency?: 'EUR' | 'TRY' | 'USD';
  moq?: number;
  availableStock?: number;
  requiresManualShipping?: boolean;
  // Optional fields used when adding from an accepted bulk offer or RFQ
  customPriceSource?: 'offer' | 'rfq';
  customPriceRefId?: string;
  // Pricing data needed to recompute unitPrice when the user changes the quantity
  // in the cart (so the line price always reflects the current tier + offset).
  priceTiers?: Array<{ minQty: number; unitPrice: number }>;
  combinationOffsets?: Record<string, number>;
  baseCombination?: string;
  minEffectiveUnitPrice?: number;
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
          cartItemId: asCleanString(raw._id || raw.id || raw.productId),
          productId: asCleanString(raw.productId),
          vendorId: asCleanString(raw.vendorId),
          slug: asCleanString(raw.slug),
          title: asCleanString(raw.title) || 'Product',
          quantity: Number(raw.qty || raw.quantity || 0),
          unitPrice: Number(raw.unitPrice || 0),
          lineTotal: Number(raw.lineTotal || 0),
          imageUrl: asCleanString(raw.imageUrl),
          variantSku: asCleanString(raw.variantSku),
          variantAttributes:
            raw.variantAttributes && typeof raw.variantAttributes === 'object'
              ? Object.fromEntries(
                  Object.entries(raw.variantAttributes as Record<string, unknown>).map(([key, value]) => [
                    asCleanString(key),
                    asCleanString(value),
                  ]),
                )
              : {},
          currency: raw.currency || 'EUR',
          moq: Number(raw.moq || 1),
          availableStock: Number(raw.availableStock || 0),
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

      /**
       * Recompute the unitPrice for a cart item at a given quantity, using the
       * pricing data stored on the item (priceTiers + combinationOffsets +
       * minEffectiveUnitPrice). Mirrors the math the customer sees on the
       * product detail page (TieredPricing) and the backend pricing util.
       */
      recomputeUnitPrice: (item, newQuantity) => {
        const tiers = Array.isArray(item.priceTiers) ? item.priceTiers : [];
        if (!tiers.length) return Number(item.unitPrice) || 0;
        const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
        const activeTier =
          [...sortedTiers]
            .reverse()
            .find((t) => newQuantity >= Number(t.minQty)) || sortedTiers[0];
        if (!activeTier) return Number(item.unitPrice) || 0;
        const floor = Math.max(0, Number(item.minEffectiveUnitPrice) || 0);
        const base = Number(activeTier.unitPrice);
        if (!Number.isFinite(base)) return Number(item.unitPrice) || 0;

        const combinationOffsets = item.combinationOffsets;
        if (
          item.variantAttributes &&
          combinationOffsets &&
          Object.keys(combinationOffsets).length > 0
        ) {
          const key = Object.keys(item.variantAttributes)
            .sort()
            .map((t) => item.variantAttributes?.[t])
            .filter((v) => v != null && v !== '')
            .join('|');
          if (key) {
            const num = Number(combinationOffsets[key]);
            if (Number.isFinite(num) && num !== 0) {
              return Math.max(floor, base + num);
            }
          }
        }
        return Math.max(floor, base);
      },

      addItem: async (productId, quantity, variantSku = '', productData) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          const currentItems = get().items;
          const existingItem = currentItems.find(
            (item) => item.productId === productId && (item.variantSku || '') === variantSku
          );
          // New line for this add: build the cart item shell (pricing data is
          // filled in below). We need it to recompute unitPrice on every qty
          // change after the add.
          const incomingItem: CartItem = {
            cartItemId: productId,
            productId,
            vendorId: asCleanString(productData?.vendorId),
            slug: asCleanString(productData?.slug),
            title: asCleanString(productData?.title) || 'Product',
            quantity,
            unitPrice: productData?.unitPrice || existingItem?.unitPrice || 0,
            lineTotal: 0, // recomputed below
            imageUrl: asCleanString(productData?.imageUrl),
            variantSku,
            variantAttributes: productData?.variantAttributes || {},
            currency: productData?.currency || 'EUR',
            moq: productData?.moq,
            requiresManualShipping: productData?.requiresManualShipping,
            priceTiers: productData?.priceTiers,
            combinationOffsets: productData?.combinationOffsets,
            baseCombination: productData?.baseCombination,
            minEffectiveUnitPrice: productData?.minEffectiveUnitPrice,
          };
          // Pick the tier price for the post-merge quantity.
          const mergedQty = existingItem ? existingItem.quantity + quantity : quantity;
          const mergedUnitPrice = get().recomputeUnitPrice(incomingItem, mergedQty);
          const nextItems = existingItem
            ? currentItems.map((item) =>
                item.productId === productId && (item.variantSku || '') === variantSku
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      unitPrice: mergedUnitPrice,
                      lineTotal: mergedUnitPrice * (item.quantity + quantity),
                    }
                  : item
              )
            : [
                ...currentItems,
                {
                  ...incomingItem,
                  unitPrice: mergedUnitPrice,
                  lineTotal: mergedUnitPrice * quantity,
                },
              ];

          const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const itemCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);
          set({ items: nextItems, subtotal, itemCount, isLoading: false, error: null });
          return;
        }

        try {
          const response = await api.post<CartResponse>('/cart/me/items', {
            productId,
            qty: quantity,
            variantSku,
            variantAttributes: productData?.variantAttributes || {},
            // Pass the full pricing config so the cart can re-tier on qty change
            // even if the user is offline.
            priceTiers: productData?.priceTiers,
            combinationOffsets: productData?.combinationOffsets,
            baseCombination: productData?.baseCombination,
            minEffectiveUnitPrice: productData?.minEffectiveUnitPrice,
            // Pass negotiated price when adding from an accepted offer/RFQ
            customUnitPrice: productData?.customPriceSource ? productData.unitPrice : undefined,
            customPriceSource: productData?.customPriceSource,
            customPriceRefId: productData?.customPriceRefId,
          });
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
            error: error.response?.data?.message || 'Failed to add item',
            isLoading: false 
          });
          throw error;
        }
      },

      updateQuantity: async (cartItemId, quantity) => {
        const token = localStorage.getItem('customerToken');
        if (!token) {
          const nextItems = get().items.map((item) => {
            if (item.cartItemId !== cartItemId) return item;
            // Re-tier: if the new qty crosses a tier boundary OR the user
            // picked a new combination (e.g. from a different add), the
            // unitPrice needs to be recomputed against the stored pricing.
            const nextUnitPrice = get().recomputeUnitPrice(item, quantity);
            return {
              ...item,
              quantity,
              unitPrice: nextUnitPrice,
              lineTotal: nextUnitPrice * quantity,
            };
          });
          const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
          const itemCount = nextItems.reduce((sum, item) => sum + item.quantity, 0);
          set({ items: nextItems, subtotal, itemCount, isLoading: false, error: null });
          return;
        }

        try {
          const item = get().items.find((i) => i.cartItemId === cartItemId);
          if (item) {
            const response = await api.patch<CartResponse>(`/cart/me/items/${item.cartItemId}`, { qty: quantity });
            const cart = response.data.cart;
            const normalizedItems = get().normalizeServerItems(cart.items || []);
            set({
              items: normalizedItems,
              subtotal: cart.subtotal || normalizedItems.reduce((sum, cartItem) => sum + cartItem.lineTotal, 0),
              itemCount: cart.totalItems || normalizedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to update quantity',
            isLoading: false 
          });
          throw error;
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

        try {
          const item = get().items.find((i) => i.cartItemId === cartItemId);
          if (item) {
            const response = await api.delete<CartResponse>(`/cart/me/items/${item.cartItemId}`);
            const cart = response.data.cart;
            const normalizedItems = get().normalizeServerItems(cart.items || []);
            set({
              items: normalizedItems,
              subtotal: cart.subtotal || normalizedItems.reduce((sum, cartItem) => sum + cartItem.lineTotal, 0),
              itemCount: cart.totalItems || normalizedItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
              isLoading: false,
              error: null,
            });
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

        try {
          const response = await api.delete<CartResponse>('/cart/me');
          const cart = response.data.cart;
          const normalizedItems = get().normalizeServerItems(cart.items || []);
          set({
            items: normalizedItems,
            subtotal: cart.subtotal || 0,
            itemCount: cart.totalItems || 0,
            isLoading: false,
            error: null,
          });
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
                variantAttributes: item.variantAttributes || {},
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
