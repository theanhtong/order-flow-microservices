'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users as UsersIcon,
  ShoppingBag,
  Package,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Search,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';
import {
  fetchAdminUsersApi,
  updateAdminUserStatusApi,
  deleteAdminUserApi,
  remoteLogoutUserApi,
  SystemUser,
} from '../utils/admin-api';
import {
  fetchUserOrdersApi,
  updateOrderStatusApi,
  ApiOrder,
} from '../utils/order-api';
import { getProducts, Product } from '../utils/product-api';

const PRESET_CANCEL_REASONS = [
  'Customer request via support',
  'Out of stock / Inventory shortage',
  'Payment verification failed',
  'Fraud risk flag',
  'Other',
];

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'products'>('orders');

  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  const [ordersList, setOrdersList] = useState<ApiOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<ApiOrder | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_CANCEL_REASONS[0]);
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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

  const loadUsersData = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchAdminUsersApi();
      setUsersList(data);
    } catch {
      toast.error('Failed to load system users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadOrdersData = async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchUserOrdersApi();
      setOrdersList(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadProductsData = async () => {
    setLoadingProducts(true);
    try {
      const res = await getProducts();
      setProductsList(res.data);
    } catch {
      toast.error('Failed to load product catalog');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (activeTab === 'users') loadUsersData();
      if (activeTab === 'orders') loadOrdersData();
      if (activeTab === 'products') loadProductsData();
    }
  }, [user, activeTab]);

  useEffect(() => {
    const isAnyModalOpen = Boolean(cancellingOrder || selectedOrder);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cancellingOrder) setCancellingOrder(null);
        else if (selectedOrder) setSelectedOrder(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancellingOrder, selectedOrder]);

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearchTerm.trim() ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase().trim()) ||
      (u.fullName && u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase().trim()));
    return matchesRole && matchesSearch;
  });

  const filteredOrders = ordersList.filter((o) => {
    const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    const matchesSearch =
      !orderSearchTerm.trim() ||
      o.id.toLowerCase().includes(orderSearchTerm.toLowerCase().trim()) ||
      o.items.some((i) =>
        (i.productName || i.productId)
          .toLowerCase()
          .includes(orderSearchTerm.toLowerCase().trim())
      );
    return matchesStatus && matchesSearch;
  });

  const handleToggleUserStatus = async (targetUser: SystemUser) => {
    const nextStatus = !targetUser.isActive;
    const actionText = nextStatus ? 'unlock' : 'lock';
    if (!confirm(`Are you sure you want to ${actionText} user account ${targetUser.email}?`)) return;

    try {
      await updateAdminUserStatusApi(targetUser.id, nextStatus);
      toast.success(`User ${targetUser.email} has been ${nextStatus ? 'unlocked' : 'locked'}`);
      await loadUsersData();
    } catch {
      toast.error(`Failed to ${actionText} user account`);
    }
  };

  const handleDeleteUser = async (targetUser: SystemUser) => {
    if (!confirm(`WARNING: Permanently delete user ${targetUser.email}?`)) return;
    try {
      await deleteAdminUserApi(targetUser.id);
      toast.success(`User ${targetUser.email} deleted`);
      await loadUsersData();
    } catch {
      toast.error('Failed to delete user account');
    }
  };

  const handleAdminConfirmOrder = async (orderId: string) => {
    try {
      await updateOrderStatusApi(orderId, 'CONFIRMED');
      toast.success(`Order #${orderId.substring(0, 8)} confirmed!`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'CONFIRMED' });
      }
      await loadOrdersData();
    } catch {
      toast.error('Failed to confirm order');
    }
  };

  const handleOpenCancelModal = (order: ApiOrder) => {
    setCancellingOrder(order);
    setSelectedReason(PRESET_CANCEL_REASONS[0]);
    setOtherReasonText('');
  };

  const handleConfirmCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingOrder) return;

    const finalReason = selectedReason === 'Other' ? otherReasonText.trim() : selectedReason;
    if (selectedReason === 'Other' && !finalReason) {
      toast.error('Please enter cancellation reason');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await updateOrderStatusApi(cancellingOrder.id, 'CANCELLED', finalReason);
      toast.info('Order cancelled');

      if (selectedOrder && selectedOrder.id === cancellingOrder.id) {
        setSelectedOrder({
          ...selectedOrder,
          status: 'CANCELLED',
          cancelReason: finalReason,
        });
      }

      setCancellingOrder(null);
      await loadOrdersData();
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Customer Store
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <aside className="md:col-span-1 space-y-3 font-mono">
            <nav className="ui-card p-1.5 bg-white border-slate-200 space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition ${activeTab === 'users'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  <span>Users</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition ${activeTab === 'orders'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Orders</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition ${activeTab === 'products'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>Products</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

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

          <section className="md:col-span-3 space-y-6">
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-sm border border-slate-200 w-full sm:w-auto">
                    {[
                      { key: 'ALL', label: 'All' },
                      { key: 'CUSTOMER', label: 'Customer' },
                      { key: 'OPERATOR', label: 'Operator' },
                      { key: 'SYSTEM_ADMIN', label: 'System Admin' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setUserRoleFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs rounded-sm transition font-medium ${userRoleFilter === tab.key
                            ? 'bg-white text-slate-900 font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search user email or name..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full ui-input pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500 font-sans">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="ui-card p-8 bg-white border-slate-200 text-center space-y-3 font-sans">
                    <UsersIcon className="w-10 h-10 text-slate-300 mx-auto stroke-[1.2]" />
                    <div className="text-sm font-semibold text-slate-700">No users found</div>
                  </div>
                ) : (
                  <div className="ui-card bg-white border border-slate-200 rounded-sm overflow-hidden font-sans shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase font-mono">
                            <th className="p-3">User</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/60 transition">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">
                                  {u.fullName || 'User'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {u.email}
                                </div>
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                <span className="ui-badge bg-slate-100 text-slate-700 border-slate-300">
                                  {u.role === 'SYSTEM_ADMIN' ? 'System Admin' : u.role === 'OPERATOR' ? 'Operator' : 'Customer'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                {u.isActive ? (
                                  <span className="ui-badge bg-emerald-100 text-emerald-800 border-emerald-300">
                                    Active
                                  </span>
                                ) : (
                                  <span className="ui-badge bg-rose-100 text-rose-800 border-rose-300">
                                    Locked
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="text-slate-600 hover:text-slate-900 text-xs underline font-medium"
                                >
                                  {u.isActive ? 'Lock' : 'Unlock'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u)}
                                  className="text-rose-600 hover:text-rose-800 text-xs underline font-medium"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-sm border border-slate-200 w-full sm:w-auto">
                    {[
                      { key: 'ALL', label: 'All' },
                      { key: 'PENDING', label: 'Pending' },
                      { key: 'CONFIRMED', label: 'Confirmed' },
                      { key: 'CANCELLED', label: 'Cancelled' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setOrderStatusFilter(tab.key)}
                        className={`px-3 py-1.5 text-xs rounded-sm transition font-medium ${orderStatusFilter === tab.key
                            ? 'bg-white text-slate-900 font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search order ID or product..."
                      value={orderSearchTerm}
                      onChange={(e) => setOrderSearchTerm(e.target.value)}
                      className="w-full ui-input pl-8 pr-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500 font-sans">
                    Loading orders...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="ui-card p-8 bg-white border-slate-200 text-center space-y-3 font-sans">
                    <Package className="w-10 h-10 text-slate-300 mx-auto stroke-[1.2]" />
                    <div className="text-sm font-semibold text-slate-700">No orders found</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="ui-card bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-slate-300 transition shadow-2xs font-sans"
                      >
                        <div className="bg-slate-50/80 px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold text-slate-900">
                              Order #{order.id.substring(0, 18)}...
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500 text-[11px]">
                              {typeof order.createdAt === 'string'
                                ? order.createdAt.replace('T', ' ').substring(0, 19)
                                : new Date(order.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div>
                            <span
                              className={`ui-badge font-semibold text-[10px] uppercase ${order.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : order.status === 'PENDING'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                                }`}
                            >
                              {order.status}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 sm:p-5 space-y-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  <Package className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 stroke-[1.2]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 truncate">
                                    {item.productName || item.productId}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-semibold text-slate-700">{item.quantity}</span> × ${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs font-bold text-slate-900 shrink-0 font-mono">
                                ${(Number(item.price) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-50/50 px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs font-sans">
                            <span className="text-slate-500">Total: </span>
                            <span className="font-bold text-slate-900 font-mono text-sm">
                              ${Number(order.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            {order.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAdminConfirmOrder(order.id)}
                                  className="px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-sm transition font-medium border border-emerald-300"
                                >
                                  Confirm Order
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCancelModal(order)}
                                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                                >
                                  Cancel Order
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="ui-button-secondary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4 font-sans">
                {loadingProducts ? (
                  <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500">
                    Loading products...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {productsList.map((p) => (
                      <div key={p.id} className="ui-card p-4 bg-white border border-slate-200 rounded-sm space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-slate-400 stroke-[1.2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{p.sku}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                          <span className="font-bold text-slate-900 font-mono">${p.price}</span>
                          <span className={`ui-badge font-mono text-[10px] ${p.inStock ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                            {p.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">
                  Admin Cancel Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-sm transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCancelOrder} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Please select cancellation reason for Order{' '}
                <span className="font-mono font-bold text-slate-900">
                  #{cancellingOrder.id.substring(0, 18)}...
                </span>
              </p>

              <div className="space-y-2">
                {PRESET_CANCEL_REASONS.map((reason, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 p-2 rounded-sm border border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="text-slate-900 focus:ring-slate-900 accent-slate-900"
                    />
                    <span className="text-xs text-slate-700 font-medium">{reason}</span>
                  </label>
                ))}
              </div>

              {selectedReason === 'Other' && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Specific Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={otherReasonText}
                    onChange={(e) => setOtherReasonText(e.target.value)}
                    placeholder="Please explain cancellation reason..."
                    className="w-full ui-input p-2 text-xs resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="ui-button-secondary px-4 py-1.5 text-xs font-semibold"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-sm transition"
                >
                  {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-lg w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Order Details
                </h3>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {selectedOrder.id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">

              {selectedOrder.status === 'CANCELLED' && selectedOrder.cancelReason && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-medium block">Cancellation Reason: </span>
                  <div className="text-rose-700 font-semibold italic text-[11px] leading-relaxed">
                    {selectedOrder.cancelReason}
                  </div>
                </div>
              )}

              {selectedOrder.shippingAddress && (
                <div className="space-y-1 py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium block">Shipping Address</span>
                  <div className="font-semibold text-slate-900">
                    {selectedOrder.recipientName} <span className="text-slate-400 text-xs font-normal">({selectedOrder.phone})</span>
                  </div>
                  <div className="text-slate-600 text-[11px] leading-relaxed">
                    {selectedOrder.shippingAddress}
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-slate-700">
                  Purchased Items
                </div>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 py-2 px-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400 stroke-[1.2]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.productName || item.productId}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                            <span className="font-semibold text-slate-700">{item.quantity}</span> × ${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-slate-900 shrink-0 font-mono">
                        ${(Number(item.price) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700">
                    Status History
                  </div>
                  <div className="relative pl-4 space-y-3 border-l-2 border-slate-200 ml-1 py-1 font-mono text-[11px]">
                    {selectedOrder.statusHistory.map((h, idx) => (
                      <div key={h.id || idx} className="relative">
                        <div
                          className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                            h.status === 'CONFIRMED'
                              ? 'bg-emerald-500'
                              : h.status === 'CANCELLED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-bold uppercase text-[10px] ${
                              h.status === 'CONFIRMED'
                                ? 'text-emerald-700'
                                : h.status === 'CANCELLED'
                                ? 'text-rose-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {h.status}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {typeof h.createdAt === 'string'
                              ? h.createdAt.replace('T', ' ').substring(0, 19)
                              : new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-3 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-base">
                  ${Number(selectedOrder.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                {selectedOrder.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAdminConfirmOrder(selectedOrder.id)}
                      className="px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-sm transition font-medium border border-emerald-300"
                    >
                      Confirm Order
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCancelModal(selectedOrder)}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                    >
                      Cancel Order
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="ui-button-secondary px-4 py-1.5 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
