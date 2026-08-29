'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../store/auth-store';

export default function NavHeader() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { label: 'Products', href: '/' },
    { label: 'Orders', href: '/orders' },
    { label: 'UI Kit', href: '/ui-kit' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
            <span className="font-bold font-mono text-sm tracking-tight text-slate-900">
              OrderFlow
            </span>
          </Link>

          <nav className="flex items-center gap-1 font-mono text-xs">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-sm transition ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: Auth user state */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 truncate max-w-[150px]">{user.email}</span>
              <span className="ui-badge bg-slate-100 border-slate-300 text-slate-700 text-[10px]">
                {user.role}
              </span>
              <button
                onClick={logout}
                className="ui-button-secondary px-2.5 py-1 text-xs"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="ui-button-primary px-3 py-1.5 text-xs font-semibold">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
