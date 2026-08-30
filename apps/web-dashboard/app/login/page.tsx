'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState<string>('sysadmin@example.com');
  const [password, setPassword] = useState<string>('Sysadmin@123');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'SYSTEM_ADMIN' || user.role === 'OPERATOR') {
        router.replace('/admin/orders');
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Logged in successfully');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'OPERATOR') {
        router.push('/admin/orders');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      toast.error('Login Failed', {
        description: err.response?.data?.message || err.message || 'Invalid email or password',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-mono">
      <NavHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md ui-card p-6 sm:p-8 space-y-6 bg-white border-slate-300 shadow-sm rounded-sm">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sign In
            </h1>
            <p className="text-xs text-slate-500">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-600 font-semibold block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 ui-input text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-slate-600 font-semibold block">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 ui-input text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full ui-button-primary py-2 text-xs font-semibold"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              Don't have an account?{' '}
              <Link href="/register" className="text-slate-900 font-bold hover:underline">
                Register here
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
