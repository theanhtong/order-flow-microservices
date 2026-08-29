'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please enter all required fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await register(email, password, fullName);
      toast.success('Account created successfully');
      router.push('/');
    } catch (err: any) {
      toast.error('Registration Failed', {
        description: err.response?.data?.message || err.message || 'Could not create account',
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
              Create Account
            </h1>
            <p className="text-xs text-slate-500">
              Register a new account to manage orders.
            </p>
          </div>

          {isAuthenticated && user ? (
            <div className="bg-slate-50 p-4 rounded-sm border border-slate-200 space-y-3 text-xs text-center">
              <div className="text-slate-600">
                You are currently signed in as <strong className="text-slate-900">{user.email}</strong>
              </div>
              <div className="flex gap-2 justify-center">
                <Link href="/" className="ui-button-primary px-4 py-1.5 text-xs font-semibold">
                  Go to Home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 font-semibold block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 ui-input text-xs"
                />
              </div>

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
                <label className="text-slate-600 font-semibold block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 ui-input text-xs"
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 font-semibold block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 ui-input text-xs"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full ui-button-primary py-2 text-xs font-semibold"
              >
                {submitting ? 'Creating Account...' : 'Register'}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Already have an account?{' '}
                <Link href="/login" className="text-slate-900 font-bold hover:underline">
                  Sign In here
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
