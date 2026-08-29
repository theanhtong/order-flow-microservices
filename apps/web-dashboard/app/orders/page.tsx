'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import NavHeader from '../components/nav-header';

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
    createdAt: '2026-08-29 09:45:30',
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // New Order Form state
  const [newCustomerId, setNewCustomerId] = useState<string>('');
  const [newProductId, setNewProductId] = useState<string>('prod-macbook-pro');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newPrice, setNewPrice] = useState<number>(1299);

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId.trim()) {
      toast.error('Enter Customer ID');
      return;
    }

    const calculatedTotal = newPrice * newQuantity;
    const newOrder: Order = {
      id: crypto.randomUUID(),
      customerId: newCustomerId,
      status: 'PENDING',
      totalAmount: calculatedTotal,
      items: [
        {
          productId: newProductId,
          quantity: newQuantity,
          price: newPrice,
        },
      ],
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setOrders([newOrder, ...orders]);
    setCreateModalOpen(false);
    setNewCustomerId('');
    toast.success('Order created');
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

      <main className="max-w-6xl w-full mx-auto p-6 space-y-6 flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Orders
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage and track order flow.
            </p>
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

        {/* Data Table */}
        <div className="ui-card overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer ID</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold text-slate-900">
                      #{order.id.substring(0, 8)}
                    </td>
                    <td className="p-3 text-slate-600">{order.customerId}</td>
                    <td className="p-3 text-slate-600">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      {order.status === 'PENDING' && (
                        <span className="ui-badge bg-amber-50 border-amber-300 text-amber-800">
                          ● PENDING
                        </span>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800">
                          ✓ CONFIRMED
                        </span>
                      )}
                      {order.status === 'CANCELLED' && (
                        <span className="ui-badge bg-rose-50 border-rose-300 text-rose-800">
                          ✕ CANCELLED
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{order.createdAt}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="ui-button-secondary px-2.5 py-1 text-xs"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* CREATE ORDER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="ui-card p-5 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="text-sm font-mono font-bold text-slate-900 uppercase">
                Create Order
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-600 block">Customer ID</label>
                <input
                  type="text"
                  placeholder="e.g. cust-104"
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-1.5 ui-input"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 block">Product Item</label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full px-3 py-1.5 ui-input"
                >
                  <option value="prod-macbook-pro">MacBook Pro M3 ($3,499.99)</option>
                  <option value="prod-iphone-15">iPhone 15 Pro ($1,299.00)</option>
                  <option value="prod-ipad-air">iPad Air M2 ($799.00)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 ui-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-600 block">Unit Price ($)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 ui-input"
                  />
                </div>
              </div>

              <div className="bg-slate-100 p-2.5 rounded-sm border border-slate-200 flex justify-between items-center text-slate-700">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${(newPrice * newQuantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 ui-button-secondary py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 ui-button-primary py-1.5 text-xs font-semibold"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER DETAILS & SAGA STATUS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="ui-card p-5 max-w-lg w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-mono">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Order #{selectedOrder.id.substring(0, 8)}
                </h3>
                <div className="text-[10px] text-slate-500">{selectedOrder.id}</div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-sm border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">Customer:</span>
                  <span className="font-semibold">{selectedOrder.customerId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Amount:</span>
                  <span className="font-semibold text-slate-900">
                    ${selectedOrder.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Order Items
                </div>
                <div className="border border-slate-200 rounded-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-2 text-[10px]">Product ID</th>
                        <th className="p-2 text-[10px]">Qty</th>
                        <th className="p-2 text-[10px] text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2">{item.productId}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2 text-right">${item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Saga Timeline */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                  Order Flow Status
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Order Created</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Inventory Reserved</span>
                  </div>
                  {selectedOrder.status === 'CONFIRMED' && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>Payment Completed</span>
                    </div>
                  )}
                  {selectedOrder.status === 'CANCELLED' && (
                    <div className="flex items-center gap-2 text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>Payment Failed - Order Cancelled</span>
                    </div>
                  )}
                  {selectedOrder.status === 'PENDING' && (
                    <div className="flex items-center gap-2 text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                      <span>Processing Payment...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Actions for Testing */}
              {selectedOrder.status === 'PENDING' && (
                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                    className="flex-1 ui-button-primary py-1 text-xs"
                  >
                    Confirm Order
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                    className="flex-1 px-3 py-1 text-xs font-medium rounded-sm bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition"
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
