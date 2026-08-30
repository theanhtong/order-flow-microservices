'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Search,
  Eye,
  Truck,
} from 'lucide-react';
import {
  fetchUserOrdersApi,
  updateOrderStatusApi,
  ApiOrder,
} from '../../utils/order-api';
import { updateShipmentStatusApi, fetchShipmentByOrderIdApi, ApiShipment, ShipmentStatusType } from '../../utils/shipping-api';
import { fetchPaymentByOrderIdApi, refundPaymentApi, cancelPaymentByOrderIdApi, ApiPayment } from '../../utils/payment-api';
import { CancelOrderModal } from './components/cancel-order-modal';
import { OrderDetailsModal } from './components/order-details-modal';

export default function AdminOrdersPage() {
  const [ordersList, setOrdersList] = useState<ApiOrder[]>([]);
  const [shipmentsMap, setShipmentsMap] = useState<Record<string, ApiShipment>>({});
  const [paymentsMap, setPaymentsMap] = useState<Record<string, ApiPayment>>({});
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<ApiOrder | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [loadingShipmentOrderId, setLoadingShipmentOrderId] = useState<string | null>(null);

  const loadOrdersData = async () => {
    setLoadingOrders(true);
    try {
      const data = await fetchUserOrdersApi();
      setOrdersList(data);

      const promises = data.map(async (order) => {
        const [shipment, payment] = await Promise.all([
          fetchShipmentByOrderIdApi(order.id),
          fetchPaymentByOrderIdApi(order.id),
        ]);
        return { orderId: order.id, shipment, payment };
      });
      const results = await Promise.all(promises);
      const newShipmentsMap: Record<string, ApiShipment> = {};
      const newPaymentsMap: Record<string, ApiPayment> = {};
      results.forEach(({ orderId, shipment, payment }) => {
        if (shipment) newShipmentsMap[orderId] = shipment;
        if (payment) newPaymentsMap[orderId] = payment;
      });
      setShipmentsMap(newShipmentsMap);
      setPaymentsMap(newPaymentsMap);

      setSelectedOrder((prevSelected) => {
        if (prevSelected) {
          const refreshedOrder = data.find((o) => o.id === prevSelected.id);
          return refreshedOrder || prevSelected;
        }
        return prevSelected;
      });
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrdersData();
  }, []);

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

  const handleAdminCreateShipmentDirect = async (order: ApiOrder) => {
    setLoadingShipmentOrderId(order.id);
    try {
      const payloadDistrictId = order.toDistrictId ? Number(order.toDistrictId) : undefined;
      const res = await updateShipmentStatusApi(
        order.id,
        'READY_TO_PICK',
        undefined,
        'GHN',
        order.toWardCode || undefined,
        payloadDistrictId,
        order.shippingAddress || undefined,
        order.recipientName || undefined,
        order.phone || undefined,
      );
      toast.success(
        `GHN Shipment created successfully! Carrier: GHN, Tracking Code: ${res.trackingCode || 'GHN-READY'}`,
      );
      await loadOrdersData();
    } catch (err: any) {
      console.error('Shipment creation error:', err);
      toast.error(err?.response?.data?.message || 'Failed to create GHN shipment');
    } finally {
      setLoadingShipmentOrderId(null);
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
  };

  const handleConfirmCancelOrder = async (orderId: string, finalReason: string) => {
    setIsSubmittingCancel(true);
    try {
      await updateOrderStatusApi(orderId, 'CANCELLED', finalReason);
      await cancelPaymentByOrderIdApi(orderId, finalReason).catch(() => null);

      toast.info('Order cancelled');

      if (selectedOrder && selectedOrder.id === orderId) {
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

  const handleUpdateShipmentStatus = async (orderId: string, status: ShipmentStatusType) => {
    try {
      const updatedShipment = await updateShipmentStatusApi(orderId, status);

      let targetOrderStatus: 'DELIVERED' | 'CANCELLED' | null = null;
      let cancelReason: string | undefined = undefined;

      if (status === 'DELIVERY_FAIL') {
        targetOrderStatus = 'CANCELLED';
        cancelReason = 'Delivery failed or returned';
      } else if (status === 'DELIVERED') {
        targetOrderStatus = 'DELIVERED';
      }

      let updatedOrder: ApiOrder | null = null;
      if (targetOrderStatus) {
        updatedOrder = await updateOrderStatusApi(orderId, targetOrderStatus, cancelReason);
      }

      if (status === 'DELIVERY_FAIL') {
        await cancelPaymentByOrderIdApi(orderId, 'Delivery failed or returned').catch(() => null);
      }

      setShipmentsMap((prev) => ({
        ...prev,
        [orderId]: updatedShipment,
      }));

      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }

      toast.success(`Shipment status updated to ${status}`);
      await loadOrdersData();
    } catch (err: any) {
      console.error('Failed to update shipment status:', err);
      toast.error(err?.response?.data?.message || 'Failed to update shipment status');
    }
  };

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

  return (
    <div className="space-y-4">
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
        <div className="ui-card bg-white border border-slate-200 rounded-sm overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <th className="py-2.5 px-4">Info</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Items</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((order) => {
                  const shipment = shipmentsMap[order.id];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 align-top font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          #{order.id.substring(0, 8)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-sans">
                          {typeof order.createdAt === 'string'
                            ? order.createdAt.replace('T', ' ').substring(0, 16)
                            : new Date(order.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top max-w-[320px]">
                        {order.recipientName || order.phone || order.shippingAddress ? (
                          <>
                            <div className="font-bold text-slate-900 text-xs">
                              {order.recipientName || 'N/A'}
                              {order.phone && (
                                <span className="text-slate-500 font-mono font-normal ml-1.5">
                                  {order.phone}
                                </span>
                              )}
                            </div>
                            {order.shippingAddress && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5" title={order.shippingAddress}>
                                {order.shippingAddress}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] italic">No recipient info or missing</span>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top max-w-[300px]">
                        <div className="space-y-0.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col text-xs text-slate-800 truncate">
                              <span className="font-medium">{item.productName}</span>
                              <div>
                                <span className="text-slate-500 font-mono">{item.price}</span>
                                <span className="text-slate-500 font-mono"> × {item.quantity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right font-mono font-bold text-slate-900 text-xs">
                        ${Number(order.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-0.5 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 font-medium">Order: </span>
                            <span
                              className={`font-bold ${order.status === 'DELIVERED'
                                ? 'text-emerald-600'
                                : order.status === 'SHIPPING'
                                  ? 'text-blue-600'
                                  : order.status === 'CONFIRMED'
                                    ? 'text-emerald-700'
                                    : order.status === 'PENDING'
                                      ? 'text-amber-600'
                                      : 'text-rose-600'
                                }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Shipment: </span>
                            {shipment ? (
                              <span
                                className={`font-bold ${shipment.status.toUpperCase() === 'DELIVERED'
                                  ? 'text-emerald-600'
                                  : shipment.status.toUpperCase() === 'CANCELLED' || shipment.status.toUpperCase() === 'DELIVERY_FAIL'
                                    ? 'text-rose-600'
                                    : 'text-blue-600'
                                  }`}
                              >
                                {shipment.status}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">No Shipment</span>
                            )}
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium">Pay: </span>
                            {(() => {
                              const pay = paymentsMap[order.id];
                              const method = (pay?.paymentMethod || order.paymentMethod || 'COD').toUpperCase();
                              let status = pay?.status || (method === 'COD' ? 'PENDING' : 'COMPLETED');
                              if (method === 'COD' && (order.status === 'DELIVERED' || shipment?.status?.toUpperCase() === 'DELIVERED')) {
                                status = 'COMPLETED';
                              } else if (method === 'COD' && (order.status === 'CANCELLED' || shipment?.status?.toUpperCase() === 'DELIVERY_FAIL')) {
                                status = 'FAILED';
                              }

                              return (
                                <span
                                  className={`font-bold ${status === 'COMPLETED'
                                    ? 'text-emerald-600'
                                    : status === 'REFUNDED'
                                      ? 'text-purple-600'
                                      : status === 'FAILED'
                                        ? 'text-rose-600'
                                        : 'text-amber-600'
                                    }`}
                                >
                                  {method} - {status}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleAdminConfirmOrder(order.id)}
                              className="px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-sm transition font-semibold border border-emerald-300"
                            >
                              Confirm
                            </button>
                          )}
                          {order.status === 'CONFIRMED' && !shipment && (
                            <button
                              type="button"
                              disabled={loadingShipmentOrderId === order.id}
                              onClick={() => handleAdminCreateShipmentDirect(order)}
                              className="px-2.5 py-1 text-[11px] text-blue-700 hover:bg-blue-100 bg-blue-50 rounded-sm transition font-semibold border border-blue-300 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Truck className={`w-3 h-3 text-blue-600 ${loadingShipmentOrderId === order.id ? 'animate-spin' : ''}`} />
                              <span>{loadingShipmentOrderId === order.id ? 'GHN...' : 'Create GHN'}</span>
                            </button>
                          )}
                          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && shipment?.status?.toUpperCase() !== 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(order)}
                              className="px-2.5 py-1 text-[11px] text-rose-600 hover:bg-rose-100 bg-rose-50 rounded-sm transition font-semibold border border-rose-200"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="ui-button-secondary px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CancelOrderModal
        order={cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onConfirmCancel={handleConfirmCancelOrder}
        isSubmitting={isSubmittingCancel}
      />

      <OrderDetailsModal
        order={selectedOrder}
        shipment={selectedOrder ? shipmentsMap[selectedOrder.id] : null}
        payment={selectedOrder ? paymentsMap[selectedOrder.id] : null}
        onClose={() => setSelectedOrder(null)}
        onConfirmOrder={handleAdminConfirmOrder}
        onOpenCancelModal={handleOpenCancelModal}
        onUpdateShipmentStatus={handleUpdateShipmentStatus}
        onCreateShipment={handleAdminCreateShipmentDirect}
      />
    </div>
  );
}
