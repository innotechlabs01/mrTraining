import { create } from 'zustand';
import type { StoreProduct } from '../storeService';

/**
 * Client-side shopping cart for the athlete store.
 *
 * The Go API only exposes single-line purchases
 * (POST /athlete/store/purchase { productId, quantity }), so the cart lives
 * entirely on the client and is flushed as sequential purchases at checkout.
 * Session-scoped by design: no persistence until a server-side cart endpoint
 * exists (reopening the app starts with an empty cart).
 */
export type CartItem = { product: StoreProduct; qty: number };

type CartState = {
  items: CartItem[];
  add: (product: StoreProduct) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const MAX_PER_PRODUCT = 99;

export const useCart = create<CartState>((set) => ({
  items: [],

  add: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      const stock = product.stock ?? Number.MAX_SAFE_INTEGER;
      if (existing) {
        // Never exceed available stock.
        const nextQty = Math.min(existing.qty + 1, stock, MAX_PER_PRODUCT);
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, qty: nextQty } : i,
          ),
        };
      }
      return { items: [...state.items, { product, qty: 1 }] };
    }),

  setQty: (productId, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { items: state.items.filter((i) => i.product.id !== productId) };
      }
      return {
        items: state.items.map((i) => {
          if (i.product.id !== productId) return i;
          const stock = i.product.stock ?? Number.MAX_SAFE_INTEGER;
          return { ...i, qty: Math.min(qty, stock, MAX_PER_PRODUCT) };
        }),
      };
    }),

  remove: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    })),

  clear: () => set({ items: [] }),
}));

/** Total number of articles in the cart. */
export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** Cart grand total in the store's currency. */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
}
