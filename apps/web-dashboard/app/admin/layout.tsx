'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users as UsersIcon,
  ShoppingBag,
  Package,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated && typeof window !== 'undefined') {
      const timeout = setTimeout(() => {
        if (!useAuthStore.getState().isAuthenticated) {
          router.push('/login');
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, router]);

  if (!mounted) return null;

  const navItems = [
    { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { href: '/admin/users', label: 'Users', icon: UsersIcon },
    { href: '/admin/products', label: 'Products', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-[1440px] w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Customer Store
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-3 xl:col-span-2 space-y-3 font-mono">
            <nav className="ui-card p-1.5 bg-white border-slate-200 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </Link>
                );
              })}

              <div className="border-t border-slate-100 my-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-sm transition font-medium"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </div>
                </button>
              </div>
            </nav>
          </aside>

          <section className="lg:col-span-9 xl:col-span-10 space-y-6">{children}</section>
        </div>
      </main>
    </div>
  );
}
