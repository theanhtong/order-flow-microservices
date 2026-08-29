'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import NavHeader from '../components/nav-header';
import { CartItemsList } from '../components/cart-items-list';
import { useCartStore } from '../store/cart-store';
import { useAuthStore } from '../store/auth-store';

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected item IDs: default all items checked, including newly added items
  useEffect(() => {
    if (cartItems.length > 0) {
      setSelectedIds((prev) => {
        const currentIds = cartItems.map((i) => i.product.id);
        if (prev.length === 0) {
          return currentIds;
        }
        const validPrev = prev.filter((id) => currentIds.includes(id));
        const brandNewItems = currentIds.filter((id) => !prev.includes(id));
        return Array.from(new Set([...validPrev, ...brandNewItems]));
      });
    } else {
      setSelectedIds([]);
    }
  }, [cartItems]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <NavHeader />
        <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
          Loading cart...
        </main>
      </div>
    );
  }

  const selectedCartItems = cartItems.filter((i) => selectedIds.includes(i.product.id));
  const totalSelectedItems = selectedCartItems.reduce((acc, i) => acc + i.quantity, 0);
  const selectedSubtotal = selectedCartItems.reduce(
    (acc, i) => acc + i.product.price * i.quantity,
    0
  );

  const handleToggleSelect = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === cartItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((i) => i.product.id));
    }
  };

  const handleCheckout = () => {
    if (selectedCartItems.length === 0) {
      toast.error('No items selected', {
        description: 'Please select at least one item to checkout.',
      });
      return;
    }

    if (!user) {
      toast.error('Sign in required for checkout', {
        description: 'Your cart items are saved. Please sign in to proceed to payment.',
      });
      router.push('/login');
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_items', JSON.stringify(selectedCartItems));
      sessionStorage.setItem('checkout_source', 'cart');
    }

    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Products
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="ui-card p-12 text-center font-mono space-y-4 bg-white border-slate-200">
            <div className="flex items-center justify-center mx-auto">
              <ShoppingCart className="w-14 h-14" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Your Cart is Empty</h2>
            </div>
            <Link href="/" className="ui-button-primary px-5 py-2 text-xs font-bold inline-block">
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3 font-mono">
              <h1 className="text-xl font-bold text-slate-900">
                Cart
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <CartItemsList
                items={cartItems}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
              />

              <div className="ui-card p-5 sm:p-6 bg-white border-slate-200 shadow-xs space-y-5 font-mono">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({totalSelectedItems} items):</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ${selectedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleCheckout}
                    disabled={selectedCartItems.length === 0}
                    className={`w-full ui-button-primary py-3 text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-2 ${selectedCartItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    Checkout
                  </button>

                  <button
                    onClick={clearCart}
                    className="w-full text-slate-500 hover:text-red-600 text-xs py-1 transition font-mono"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
