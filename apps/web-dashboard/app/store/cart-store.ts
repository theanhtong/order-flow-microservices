import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../utils/product-api';
import {
  getCartApi,
  addItemApi,
  removeItemApi,
  clearCartApi,
  mergeCartApi,
  ApiCartItem,
} from '../utils/cart-api';
import { getInMemoryAccessToken } from '../utils/auth-api';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  syncUserCartFromRedis: () => Promise<void>;
  mergeGuestCartToRedis: () => Promise<void>;
  logoutCartCleanUp: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (product, quantity = 1) => {
        const isAuthenticated = !!getInMemoryAccessToken();

        if (isAuthenticated) {
          // If authenticated: Push directly to Redis DB
          try {
            const redisCart = await addItemApi({
              productId: product.id,
              sku: product.sku || product.id,
              name: product.name,
              price: product.price,
              quantity,
              category: product.category,
            });
            const mappedItems: CartItem[] = redisCart.map((item) => ({
              product: {
                id: item.productId,
                sku: item.sku,
                name: item.name,
                price: Number(item.price),
                category: (item.category as any) || 'Laptops',
                description: '',
                inStock: true,
              },
              quantity: item.quantity,
            }));
            set({ items: mappedItems });
            return;
          } catch (err) {
            console.error('Failed to add item to Redis Cart:', err);
          }
        }

        // Guest mode: Save to local state & persist to localStorage
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.product.id === product.id);

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex].quantity += quantity;
          set({ items: updated });
        } else {
          set({ items: [...currentItems, { product, quantity }] });
        }
      },

      removeItem: async (productId) => {
        const isAuthenticated = !!getInMemoryAccessToken();

        if (isAuthenticated) {
          try {
            const redisCart = await removeItemApi(productId);
            const mappedItems: CartItem[] = redisCart.map((item) => ({
              product: {
                id: item.productId,
                sku: item.sku,
                name: item.name,
                price: Number(item.price),
                category: (item.category as any) || 'Laptops',
                description: '',
                inStock: true,
              },
              quantity: item.quantity,
            }));
            set({ items: mappedItems });
            return;
          } catch (err) {
            console.error('Failed to remove item from Redis Cart:', err);
          }
        }

        set({ items: get().items.filter((i) => i.product.id !== productId) });
      },

      updateQuantity: async (productId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(productId);
          return;
        }

        const isAuthenticated = !!getInMemoryAccessToken();
        if (isAuthenticated) {
          const currentItem = get().items.find((i) => i.product.id === productId);
          if (!currentItem) return;

          const currentQty = currentItem.quantity;
          if (quantity === currentQty) return;

          try {
            if (quantity > currentQty) {
              const delta = quantity - currentQty;
              const redisCart = await addItemApi({
                productId: currentItem.product.id,
                sku: currentItem.product.sku || currentItem.product.id,
                name: currentItem.product.name,
                price: currentItem.product.price,
                quantity: delta,
                category: currentItem.product.category,
              });
              const mappedItems: CartItem[] = redisCart.map((item) => ({
                product: {
                  id: item.productId,
                  sku: item.sku,
                  name: item.name,
                  price: Number(item.price),
                  category: (item.category as any) || 'Laptops',
                  description: '',
                  inStock: true,
                },
                quantity: item.quantity,
              }));
              set({ items: mappedItems });
            } else {
              await removeItemApi(productId);
              const redisCart = await addItemApi({
                productId: currentItem.product.id,
                sku: currentItem.product.sku || currentItem.product.id,
                name: currentItem.product.name,
                price: currentItem.product.price,
                quantity: quantity,
                category: currentItem.product.category,
              });
              const mappedItems: CartItem[] = redisCart.map((item) => ({
                product: {
                  id: item.productId,
                  sku: item.sku,
                  name: item.name,
                  price: Number(item.price),
                  category: (item.category as any) || 'Laptops',
                  description: '',
                  inStock: true,
                },
                quantity: item.quantity,
              }));
              set({ items: mappedItems });
            }
            return;
          } catch (err) {
            console.error('Failed to update quantity in Redis Cart:', err);
          }
        }

        const updated = get().items.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i
        );
        set({ items: updated });
      },

      clearCart: async () => {
        const isAuthenticated = !!getInMemoryAccessToken();
        if (isAuthenticated) {
          try {
            await clearCartApi();
          } catch (err) {
            console.error('Failed to clear Redis Cart:', err);
          }
        }
        set({ items: [] });
      },

      syncUserCartFromRedis: async () => {
        try {
          const redisCart = await getCartApi();
          const mappedItems: CartItem[] = redisCart.map((item) => ({
            product: {
              id: item.productId,
              sku: item.sku,
              name: item.name,
              price: Number(item.price),
              category: (item.category as any) || 'Laptops',
              description: '',
              inStock: true,
            },
            quantity: item.quantity,
          }));
          set({ items: mappedItems });
        } catch (err) {
          console.error('Failed to sync user cart from Redis:', err);
        }
      },

      mergeGuestCartToRedis: async () => {
        const localGuestItems = get().items;

        if (localGuestItems.length > 0) {
          const formattedGuestItems = localGuestItems.map((item) => ({
            productId: item.product.id,
            sku: item.product.sku || item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            category: item.product.category,
          }));

          try {
            // Push guest items from localStorage into Redis DB
            const redisCart = await mergeCartApi(formattedGuestItems);

            // CLEAR localStorage immediately after merging!
            if (typeof window !== 'undefined') {
              localStorage.removeItem('cart-storage');
            }

            const mappedItems: CartItem[] = redisCart.map((item) => ({
              product: {
                id: item.productId,
                sku: item.sku,
                name: item.name,
                price: Number(item.price),
                category: (item.category as any) || 'Laptops',
                description: '',
                inStock: true,
              },
              quantity: item.quantity,
            }));
            set({ items: mappedItems });
            return;
          } catch (err) {
            console.error('Failed to merge guest cart to Redis:', err);
          }
        }

        // If no guest items, just sync user's existing Redis cart
        await get().syncUserCartFromRedis();
      },

      logoutCartCleanUp: () => {
        // Clear in-memory cart display
        set({ items: [] });
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cart-storage');
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage', // Key in localStorage for Guest persistence
    }
  )
);
