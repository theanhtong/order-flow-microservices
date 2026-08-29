'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Package, ShoppingCart, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

export default function NavHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const cartItems = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartItems = mounted
    ? cartItems.reduce((acc, item) => acc + item.quantity, 0)
    : 0;

  const getLinkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition border ${isActive
      ? 'bg-slate-100 text-slate-900 border-slate-300 font-semibold'
      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`;
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <span className="font-bold font-mono text-sm tracking-tight text-slate-900">
              OrderFlow
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">

          <Link href="/" className={getLinkClass('/')}>
            <Package className="w-3.5 h-3.5" />
            <span>Product</span>
          </Link>

          <Link href="/cart" className={`relative ${getLinkClass('/cart')}`}>
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Cart</span>
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center ring-2 ring-white leading-none">
                {totalCartItems}
              </span>
            )}
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 border border-slate-200 hover:border-slate-400 bg-white rounded-sm p-2 transition">
              <Link
                href="/profile"
                className="flex flex-col min-w-0 hover:opacity-80 transition cursor-pointer"
                title="View Profile & Address Book"
              >
                <span className="text-slate-900 font-bold truncate text-xs">
                  {user.fullName || 'User Account'}
                </span>
                <span className="text-slate-500 text-[10px] truncate">
                  {user.email}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-sm transition shrink-0 ml-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="ui-button-primary px-3.5 py-1.5 text-xs font-semibold">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
