'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Clock,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Package,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Banknote,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';
import {
  fetchUserOrdersApi,
  updateOrderStatusApi,
  ApiOrder,
} from '../utils/order-api';
import { fetchPaymentByOrderIdApi, ApiPayment } from '../utils/payment-api';

const PRESET_CANCEL_REASONS = [
  'Want to change shipping address',
  'Want to change products or quantity',
  'Found a better price elsewhere',
  'Delivery time is too long',
  'Other',
];

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [paymentsMap, setPaymentsMap] = useState<Record<string, ApiPayment>>({});
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchUserOrdersApi();
      setOrders(data);

      const promises = data.map(async (order) => {
        const payment = await fetchPaymentByOrderIdApi(order.id);
        return { orderId: order.id, payment };
      });
      const results = await Promise.all(promises);
      const newPaymentsMap: Record<string, ApiPayment> = {};
      results.forEach(({ orderId, payment }) => {
        if (payment) newPaymentsMap[orderId] = payment;
      });
      setPaymentsMap(newPaymentsMap);
    } catch {
      toast.error('Failed to load orders from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

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

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesSearch =
      !searchTerm.trim() ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      o.items.some((item) =>
        (item.productName || item.productId)
          .toLowerCase()
          .includes(searchTerm.toLowerCase().trim())
      );
    return matchesStatus && matchesSearch;
  });

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
      toast.error('Please enter your cancellation reason');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const updated = await updateOrderStatusApi(cancellingOrder.id, 'CANCELLED', finalReason);
      toast.info('Order has been cancelled');

      if (selectedOrder && selectedOrder.id === cancellingOrder.id) {
        setSelectedOrder({
          ...selectedOrder,
          status: 'CANCELLED',
          cancelReason: finalReason,
        });
      }

      setCancellingOrder(null);
      await loadOrders();
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
            Back to Products
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <aside className="md:col-span-1 space-y-3 font-mono">
            <nav className="ui-card p-1.5 bg-white border-slate-200 space-y-1">
              <Link
                href="/profile"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>

              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm bg-slate-900 text-white font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Orders</span>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-sm border border-slate-200 w-full sm:w-auto">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'PENDING', label: 'Pending' },
                  { key: 'CONFIRMED', label: 'Confirmed' },
                  { key: 'SHIPPING', label: 'Shipping' },
                  { key: 'DELIVERED', label: 'Delivered' },
                  { key: 'CANCELLED', label: 'Cancelled' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterStatus(tab.key)}
                    className={`px-3 py-1.5 text-xs rounded-sm transition font-medium ${filterStatus === tab.key
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
                  placeholder="Search product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full ui-input pl-8 pr-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {loading ? (
              <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500 font-sans">
                Loading orders from server...
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

                      <div className="flex items-center gap-2 flex-wrap font-mono">
                        {(() => {
                          const payment = paymentsMap[order.id];
                          const method = (payment?.paymentMethod || order.paymentMethod || 'COD').toUpperCase();
                          const status = payment?.status || (method === 'COD' ? 'PENDING' : 'COMPLETED');

                          let payBadge = null;
                          if (status === 'COMPLETED') {
                            payBadge = (
                              <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800">
                                ✓ PAY: {method} (PAID)
                              </span>
                            );
                          } else if (status === 'REFUNDED') {
                            payBadge = (
                              <span className="ui-badge bg-purple-50 border-purple-300 text-purple-800">
                                ↩ PAY: {method} (REFUNDED)
                              </span>
                            );
                          } else if (status === 'FAILED') {
                            payBadge = (
                              <span className="ui-badge bg-rose-50 border-rose-300 text-rose-800">
                                ✕ PAY: {method} (FAILED)
                              </span>
                            );
                          } else if (method === 'COD') {
                            payBadge = (
                              <span className="ui-badge bg-amber-50 border-amber-300 text-amber-800">
                                ● PAY: COD (UNPAID)
                              </span>
                            );
                          } else {
                            payBadge = (
                              <span className="ui-badge bg-blue-50 border-blue-300 text-blue-800">
                                ● PAY: {method} (PENDING)
                              </span>
                            );
                          }

                          let orderBadge = null;
                          if (order.status === 'PENDING') {
                            orderBadge = <span className="ui-badge bg-amber-50 border-amber-300 text-amber-800">● ORDER: PENDING</span>;
                          } else if (order.status === 'CONFIRMED') {
                            orderBadge = <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800">✓ ORDER: CONFIRMED</span>;
                          } else if (order.status === 'SHIPPING') {
                            orderBadge = <span className="ui-badge bg-blue-50 border-blue-300 text-blue-800">⚡ ORDER: SHIPPING</span>;
                          } else if (order.status === 'DELIVERED') {
                            orderBadge = <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800">✓ ORDER: DELIVERED</span>;
                          } else {
                            orderBadge = <span className="ui-badge bg-rose-50 border-rose-300 text-rose-800">✕ ORDER: CANCELLED</span>;
                          }

                          return (
                            <>
                              {orderBadge}
                              {payBadge}
                            </>
                          );
                        })()}
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
                        {/* {order.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(order)}
                            className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                          >
                            Cancel Order
                          </button>
                        )} */}
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
          </section>
        </div>
      </main>

      {/* CANCEL ORDER REASON MODAL */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900">
                  Cancel Order
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
                Please select a reason for cancelling Order{' '}
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
                    placeholder="Please explain why you want to cancel this order..."
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

      {/* VIEW ORDER DETAIL MODAL */}
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
                            {item.productName}
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
                          className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${h.status === 'CONFIRMED'
                            ? 'bg-emerald-500'
                            : h.status === 'CANCELLED'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                            }`}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-bold uppercase text-[10px] ${h.status === 'CONFIRMED'
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

              {selectedOrder.status === 'CANCELLED' && (
                <div className="flex gap-2">
                  <span className="text-slate-500 font-medium block">Cancellation Reason: </span>
                  <div className="text-rose-700 font-semibold italic text-[11px] leading-relaxed">
                    {selectedOrder.cancelReason || '(No reason specified or missing)'}
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
                  <button
                    type="button"
                    onClick={() => handleOpenCancelModal(selectedOrder)}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                  >
                    Cancel Order
                  </button>
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
