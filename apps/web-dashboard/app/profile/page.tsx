'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Clock,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';
import {
  fetchUserAddressesApi,
  createAddressApi,
  updateAddressApi,
  deleteAddressApi,
  setDefaultAddressApi,
  UserAddress,
} from '../utils/address-api';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Sidebar Tab: 'profile' | 'orders'
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await fetchUserAddressesApi();
      setAddresses(data);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const handleOpenCreateModal = () => {
    setEditingAddressId(null);
    setFormName(user?.fullName || '');
    setFormPhone('');
    setFormAddress('');
    setFormNote('');
    setFormIsDefault(addresses.length === 0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: UserAddress) => {
    setEditingAddressId(addr.id);
    setFormName(addr.recipientName);
    setFormPhone(addr.phone);
    setFormAddress(addr.address);
    setFormNote(addr.note || '');
    setFormIsDefault(!!addr.isDefault);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAddressId) {
        await updateAddressApi(editingAddressId, {
          recipientName: formName,
          phone: formPhone,
          address: formAddress,
          note: formNote.trim() || undefined,
          isDefault: formIsDefault,
        });
        toast.success('Address updated successfully');
      } else {
        await createAddressApi({
          recipientName: formName,
          phone: formPhone,
          address: formAddress,
          note: formNote.trim() || undefined,
          isDefault: formIsDefault,
        });
        toast.success('New address added successfully');
      }
      setIsModalOpen(false);
      await loadAddresses();
    } catch {
      toast.error('Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteAddressApi(id);
      toast.success('Address removed');
      await loadAddresses();
    } catch {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddressApi(id);
      toast.success('Set as default address');
      await loadAddresses();
    } catch {
      toast.error('Failed to set default address');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Products
          </Link>
        </div>

        {/* 2-COLUMN DASHBOARD LAYOUT WITH LEFT NAVIGATION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">

          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className="md:col-span-1 space-y-3 font-mono">
            <div className="ui-card p-4 bg-white border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName || 'User Account'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>

            <nav className="ui-card p-1.5 bg-white border-slate-200 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition ${
                  activeTab === 'profile'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Profile & Addresses</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <Link
                href="/orders"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>My Orders</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>

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

          {/* RIGHT MAIN CONTENT AREA */}
          <section className="md:col-span-3 space-y-6 font-mono">
            {/* USER ACCOUNT INFORMATION CARD */}
            <div className="ui-card p-6 bg-white border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  User Information
                </h2>
                <span className="ui-badge bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium block">Full Name</span>
                  <div className="font-bold text-slate-900">{user?.fullName || 'N/A'}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium block">Email Address</span>
                  <div className="font-semibold text-slate-800">{user?.email}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium block">Role</span>
                  <div>
                    <span className="ui-badge bg-slate-900 text-white font-semibold uppercase text-[10px]">
                      {user?.role || 'CUSTOMER'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium block">User ID</span>
                  <div className="text-[11px] text-slate-600 truncate" title={user?.id}>
                    {user?.id || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* SAVED DELIVERY ADDRESSES SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Saved Delivery Addresses ({addresses.length})
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="ui-button-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Address</span>
                </button>
              </div>

              {loading ? (
                <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500">
                  Loading saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="ui-card p-8 bg-white border-slate-200 text-center space-y-3">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    No delivery addresses saved yet. Click "Add Address" to create your first address.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="ui-button-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Address</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`ui-card p-4 sm:p-5 bg-white border transition ${
                        addr.isDefault ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {addr.recipientName}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({addr.phone})
                            </span>
                            {addr.isDefault && (
                              <span className="ui-badge bg-slate-900 text-white font-bold text-[10px] uppercase">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-700 leading-relaxed font-sans">
                            {addr.address}
                          </div>

                          {addr.note && (
                            <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 border border-slate-100 rounded-sm">
                              Note: {addr.note}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(addr.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-sm transition"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(addr)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition"
                            title="Edit address"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-sm transition"
                            title="Delete address"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* CREATE / EDIT ADDRESS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-lg w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-mono animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {editingAddressId ? 'Edit Delivery Address' : 'Add New Address'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full ui-input p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 0901234567"
                  className="w-full ui-input p-2.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Delivery Address *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street address, building, district, city..."
                  className="w-full ui-input p-2.5 text-xs resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Delivery Note (Optional)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Call before delivery, deliver in office hours"
                  className="w-full ui-input p-2.5 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formIsDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                />
                <label htmlFor="formIsDefault" className="text-xs text-slate-700 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="ui-button-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ui-button-primary px-5 py-2 text-xs font-semibold"
                >
                  {isSubmitting ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
