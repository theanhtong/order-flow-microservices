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
  ArrowLeft,
  Mail,
  Clock,
  LogOut,
  ChevronRight,
  KeyRound,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import NavHeader from '../components/nav-header';
import GhnAddressPicker from '../components/ghn-address-picker';
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully!');
    }, 600);
  };

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <aside className="md:col-span-1 space-y-3 font-mono">

            <nav className="ui-card p-1.5 bg-white border-slate-200 space-y-1">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm bg-slate-900 text-white font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <Link
                href="/orders"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Orders</span>
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

          <section className="md:col-span-3">
            <div className="ui-card p-6 sm:p-8 bg-white border-slate-200 shadow-xs space-y-8 font-mono">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserIcon className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    User Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Full Name
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {user?.fullName || 'User Account'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium block">
                      Email Address
                    </span>
                    <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{user?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-700" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Addresses ({addresses.length})
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="ui-button-primary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Address</span>
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 border border-slate-200 rounded-sm text-center text-xs text-slate-500 bg-slate-50">
                    Loading saved addresses...
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="p-8 border border-slate-200 rounded-sm bg-slate-50 text-center space-y-3">
                    <MapPin className="w-10 h-10 text-slate-300 mx-auto stroke-[1.2]" />
                    <p className="text-xs text-slate-500">
                      No delivery addresses saved yet. Click "Add Address" to create your first address.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-4 rounded-sm border transition ${addr.isDefault
                          ? 'border-slate-300 bg-slate-50/80 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div className="space-y-1 min-w-0 flex-1 font-mono">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {addr.recipientName}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({addr.phone})
                              </span>
                              {addr.isDefault && (
                                <span className="ui-badge bg-slate-900 text-white font-bold text-[10px] uppercase">
                                  Default
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600 font-sans leading-relaxed">
                              {addr.address}
                            </div>

                            {addr.note && (
                              <div className="text-[11px] text-slate-400 italic font-sans pt-0.5">
                                Note: {addr.note}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end font-sans">
                            {!addr.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(addr.id)}
                                className="text-xs text-slate-600 hover:text-slate-900 underline transition"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(addr)}
                              className="text-xs text-slate-700 hover:text-slate-900 underline transition font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-xs text-slate-400 hover:text-red-600 transition"
                              title="Delete address"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <KeyRound className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-bold text-slate-900">
                    Change Password
                  </h2>
                </div>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-lg">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium block">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ui-input p-2.5 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium block">
                        New Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full ui-input p-2.5 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500 font-medium block">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full ui-input p-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="ui-button-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </form>
              </div>

            </div>
          </section>
        </div>
      </main>

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

              <GhnAddressPicker
                onChange={(val) => {
                  setFormAddress(val.fullAddress);
                }}
              />

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
