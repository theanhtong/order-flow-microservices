'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User as UserIcon, Clock, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

const INITIAL_ORDERS: Order[] = [
  {
    id: '050a5a95-dde2-4e89-9a21-7299a9b401f1',
    customerId: 'cust-101',
    status: 'CONFIRMED',
    totalAmount: 6999.98,
    items: [
      { productId: 'prod-macbook-pro', quantity: 2, price: 3499.99 },
    ],
    createdAt: '2026-08-29 09:30:15',
  },
  {
    id: '21bcb2d5-06cd-4b12-881a-4c2810a902e4',
    customerId: 'cust-102',
    status: 'CANCELLED',
    totalAmount: 3499.99,
    items: [
      { productId: 'prod-macbook-pro', quantity: 1, price: 3499.99 },
    ],
    createdAt: '2026-08-29 09:15:00',
  },
  {
    id: '8f7a1b92-44c1-4d33-a128-98e3711903a7',
    customerId: 'cust-103',
    status: 'PENDING',
    totalAmount: 1299.00,
    items: [
      { productId: 'prod-iphone-15', quantity: 1, price: 1299.00 },
    ],
    createdAt: '2026-08-29 09:00:22',
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states for Create Order
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formProductId, setFormProductId] = useState<string>('prod-macbook-pro');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formPrice, setFormPrice] = useState<number>(3499.99);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId.trim()) {
      toast.error('Please enter Customer ID');
      return;
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      customerId: formCustomerId.trim(),
      status: 'PENDING',
      totalAmount: formPrice * formQuantity,
      items: [
        {
          productId: formProductId,
          quantity: formQuantity,
          price: formPrice,
        },
      ],
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setOrders([newOrder, ...orders]);
    setCreateModalOpen(false);
    toast.success(`Order ${newOrder.id} created successfully`);

    // Reset form
    setFormCustomerId('');
    setFormQuantity(1);
  };

  const handleUpdateStatus = (orderId: string, newStatus: 'CONFIRMED' | 'CANCELLED') => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    toast.info(`Order status updated to ${newStatus}`);
  };

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
              <Link
                href="/profile"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Profile & Addresses</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>

              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm bg-slate-900 text-white font-semibold transition"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>My Orders</span>
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

          {/* RIGHT MAIN CONTENT AREA */}
          <section className="md:col-span-3 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 font-mono">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  My Orders
                </h1>
              </div>

              <button
                onClick={() => setCreateModalOpen(true)}
                className="ui-button-primary px-3.5 py-1.5 text-xs font-medium self-start sm:self-auto"
              >
                + Create Order
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="ui-card p-3">
                <div className="text-[10px] text-slate-500 uppercase">Total Orders</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{totalCount}</div>
              </div>
              <div className="ui-card p-3">
                <div className="text-[10px] text-slate-500 uppercase">Pending</div>
                <div className="text-base font-bold text-amber-700 mt-0.5">{pendingCount}</div>
              </div>
              <div className="ui-card p-3">
                <div className="text-[10px] text-slate-500 uppercase">Confirmed</div>
                <div className="text-base font-bold text-emerald-700 mt-0.5">{confirmedCount}</div>
              </div>
              <div className="ui-card p-3">
                <div className="text-[10px] text-slate-500 uppercase">Cancelled</div>
                <div className="text-base font-bold text-rose-700 mt-0.5">{cancelledCount}</div>
              </div>
            </div>

            {/* Toolbar: Search and Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-sm border border-slate-300 w-full sm:w-auto">
                {['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2.5 py-1 text-xs rounded-sm transition ${
                      filterStatus === status
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search Order ID or Customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ui-input px-3 py-1.5 text-xs w-full sm:w-64"
              />
            </div>

            {/* Orders Table */}
            <div className="ui-card overflow-hidden font-mono">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-500">
                          No orders found matching current filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-900">
                            {order.id.length > 18 ? `${order.id.substring(0, 18)}...` : order.id}
                          </td>
                          <td className="p-3 text-slate-700">{order.customerId}</td>
                          <td className="p-3 text-slate-600">
                            {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3">
                            <span
                              className={`ui-badge font-semibold text-[10px] uppercase ${
                                order.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : order.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">{order.createdAt}</td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2 py-1 text-[11px] font-medium rounded-sm border border-slate-300 bg-white hover:bg-slate-100 transition"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* CREATE ORDER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-mono animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Create New Order
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Customer ID / User UUID *
                </label>
                <input
                  type="text"
                  required
                  value={formCustomerId}
                  onChange={(e) => setFormCustomerId(e.target.value)}
                  placeholder="e.g. cust-104 or UUID"
                  className="w-full ui-input p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium block">
                    Product
                  </label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full ui-input p-2 text-xs"
                  >
                    <option value="prod-macbook-pro">MacBook Pro 16"</option>
                    <option value="prod-iphone-15">iPhone 15 Pro</option>
                    <option value="prod-airpods-max">AirPods Max</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full ui-input p-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-medium block">
                  Unit Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                  className="w-full ui-input p-2 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-900 border-t border-slate-100">
                <span>Total Amount:</span>
                <span>${(formPrice * formQuantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="ui-button-secondary px-3.5 py-1.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ui-button-primary px-4 py-1.5 text-xs font-semibold"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-lg w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-mono animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Order Details
                </h3>
                <div className="text-[10px] text-slate-500">{selectedOrder.id}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer ID:</span>
                <span className="font-bold text-slate-900">{selectedOrder.customerId}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Created Date:</span>
                <span className="text-slate-700">{selectedOrder.createdAt}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`ui-badge font-semibold text-[10px] uppercase ${
                    selectedOrder.status === 'CONFIRMED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : selectedOrder.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {selectedOrder.status}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase">Items</div>
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="text-slate-800 font-medium">
                        {item.productId} × {item.quantity}
                      </span>
                      <span className="font-bold text-slate-900">
                        ${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span>${selectedOrder.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              {selectedOrder.status === 'PENDING' && (
                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                    className="flex-1 ui-button-primary py-1.5 text-xs"
                  >
                    Confirm Order
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-sm bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
