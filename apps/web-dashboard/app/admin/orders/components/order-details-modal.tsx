'use client';

import React, { useState } from 'react';
import { Package, Truck } from 'lucide-react';
import { ApiOrder } from '../../../utils/order-api';
import { ApiShipment, ShipmentStatusType } from '../../../utils/shipping-api';
import { ApiPayment } from '../../../utils/payment-api';

interface OrderDetailsModalProps {
  order: ApiOrder | null;
  shipment: ApiShipment | null;
  payment?: ApiPayment | null;
  onClose: () => void;
  onConfirmOrder: (orderId: string) => Promise<void>;
  onOpenCancelModal: (order: ApiOrder) => void;
  onUpdateShipmentStatus?: (orderId: string, status: ShipmentStatusType) => Promise<void>;
  onCreateShipment?: (order: ApiOrder) => void;
}

export function OrderDetailsModal({
  order,
  shipment,
  payment,
  onClose,
  onConfirmOrder,
  onOpenCancelModal,
  onUpdateShipmentStatus,
  onCreateShipment,
}: OrderDetailsModalProps) {
  const [isUpdatingShipment, setIsUpdatingShipment] = useState(false);

  if (!order) return null;

  const SHIPMENT_STATUS_RANK: Record<string, number> = {
    READY_TO_PICK: 0,
    PICKING: 1,
    DELIVERING: 2,
    DELIVERED: 3,
    DELIVERY_FAIL: 3,
    CANCELLED: 3,
  };

  const currentShipmentRank = shipment ? (SHIPMENT_STATUS_RANK[shipment.status?.toUpperCase()] ?? 0) : 0;
  const isTerminalShipmentState = currentShipmentRank >= 3;

  const handleShipmentStatusChange = async (newStatus: ShipmentStatusType) => {
    if (!order || !onUpdateShipmentStatus) return;
    setIsUpdatingShipment(true);
    try {
      await onUpdateShipmentStatus(order.id, newStatus);
    } finally {
      setIsUpdatingShipment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="ui-card p-6 max-w-2xl w-full bg-white border-slate-300 shadow-2xl space-y-5 rounded-sm font-sans animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Order Details</span>
              <span className="ui-badge bg-slate-100 text-slate-800 border-slate-300 font-mono text-[11px]">
                #{order.id.substring(0, 8)}
              </span>
            </h3>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              ID: {order.id}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm p-1 rounded-sm transition font-bold"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-sm border border-slate-200">
            <div>
              <span className="text-slate-500 text-[11px] font-medium block mb-0.5">Recipient:</span>
              {order.recipientName || order.phone || order.shippingAddress ? (
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2 flex-wrap">
                    <span>{order.recipientName || 'N/A'}</span>
                    {order.phone && (
                      <span className="text-slate-500 font-mono font-normal text-[11px] bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-200">
                        {order.phone}
                      </span>
                    )}
                  </div>
                  {order.shippingAddress && (
                    <div className="text-[11px] text-slate-600 break-words whitespace-normal leading-normal">
                      {order.shippingAddress}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 font-mono text-[11px] italic">No recipient info or missing</span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 font-mono text-[11px]">
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
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Shipment: </span>
                {shipment && onUpdateShipmentStatus ? (
                  <select
                    value={shipment.status}
                    disabled={isUpdatingShipment || isTerminalShipmentState}
                    onChange={(e) => handleShipmentStatusChange(e.target.value as ShipmentStatusType)}
                    className={`font-bold font-mono text-[11px] rounded px-1.5 py-0.5 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${shipment.status.toUpperCase() === 'DELIVERED'
                      ? 'text-emerald-600 bg-emerald-50 border border-emerald-300 focus:ring-emerald-500'
                      : shipment.status.toUpperCase() === 'CANCELLED' || shipment.status.toUpperCase() === 'DELIVERY_FAIL'
                        ? 'text-rose-600 bg-rose-50 border border-rose-300 focus:ring-rose-500'
                        : 'text-blue-600 bg-blue-50 border border-blue-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="READY_TO_PICK" disabled={currentShipmentRank > 0} className="text-slate-800 font-sans disabled:text-slate-400">READY_TO_PICK</option>
                    <option value="PICKING" disabled={currentShipmentRank > 1} className="text-slate-800 font-sans disabled:text-slate-400">PICKING</option>
                    <option value="DELIVERING" disabled={currentShipmentRank > 2} className="text-slate-800 font-sans disabled:text-slate-400">DELIVERING</option>
                    <option value="DELIVERED" disabled={currentShipmentRank > 3} className="text-emerald-600 font-sans font-bold disabled:text-slate-400">DELIVERED</option>
                    <option value="DELIVERY_FAIL" disabled={currentShipmentRank > 3} className="text-rose-600 font-sans font-bold disabled:text-slate-400">DELIVERY_FAIL</option>
                  </select>
                ) : shipment ? (
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
                <span className="text-slate-500 font-medium">Payment: </span>
                {(() => {
                  const method = (payment?.paymentMethod || order.paymentMethod || 'COD').toUpperCase();
                  let status = payment?.status || (method === 'COD' ? 'PENDING' : 'COMPLETED');
                  if (method === 'COD' && (order.status === 'DELIVERED' || shipment?.status?.toUpperCase() === 'DELIVERED')) {
                    status = 'COMPLETED';
                  } else if (method === 'COD' && (order.status === 'CANCELLED' || shipment?.status?.toUpperCase() === 'DELIVERY_FAIL')) {
                    status = 'FAILED';
                  }

                  return (
                    <span
                      className={`font-bold px-1.5 py-0.5 text-[10px] ${status === 'COMPLETED'
                        ? 'text-emerald-700'
                        : status === 'REFUNDED'
                          ? 'text-purple-700'
                          : status === 'FAILED'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                    >
                      {method} - {status}
                    </span>
                  );
                })()}
              </div>
              {shipment && shipment.trackingCode && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Tracking: {shipment.trackingCode}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-700">
              Items ({order.items.length})
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-sm overflow-hidden bg-white">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-sm bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-slate-400 stroke-[1.2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        ${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })} × {item.quantity}
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

          {order.status === 'CANCELLED' && (
            <div className="text-xs space-y-1">
              <span className="text-slate-500 font-medium italic">
                {order.cancelReason ? `Reason: ${order.cancelReason}` : 'No reason specified or missing'}
              </span>
            </div>
          )}

          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-700">
                Tracking
              </div>
              <div className="relative pl-4 space-y-2.5 border-l-2 border-slate-200 ml-1 py-1 font-mono text-[11px]">
                {order.statusHistory.map((h, idx) => (
                  <div key={h.id || idx} className="relative">
                    <div
                      className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${h.status === 'DELIVERED' || h.status === 'CONFIRMED'
                        ? 'bg-emerald-500'
                        : h.status === 'CANCELLED'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                        }`}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-bold uppercase text-[10px] ${h.status === 'DELIVERED' || h.status === 'CONFIRMED'
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
        </div>

        <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-slate-900 text-base font-mono ml-1">
              ${Number(order.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {order.status === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => onConfirmOrder(order.id)}
                  className="px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-sm transition font-medium border border-emerald-300"
                >
                  Confirm Order
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCancelModal(order)}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                >
                  Cancel Order
                </button>
              </>
            )}
            {order.status === 'CONFIRMED' && !shipment && onCreateShipment && (
              <button
                type="button"
                onClick={() => onCreateShipment(order)}
                className="px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 bg-blue-50/50 rounded-sm transition font-medium border border-blue-300 inline-flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Create GHN Shipment</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ui-button-secondary px-4 py-1.5 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
