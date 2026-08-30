'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiOrder } from '../../../utils/order-api';

const PRESET_CANCEL_REASONS = [
  'Customer request via support',
  'Out of stock / Inventory shortage',
  'Payment verification failed',
  'Fraud risk flag',
  'Other',
];

interface CancelOrderModalProps {
  order: ApiOrder | null;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export function CancelOrderModal({
  order,
  onClose,
  onConfirmCancel,
  isSubmitting,
}: CancelOrderModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_CANCEL_REASONS[0]);
  const [otherReasonText, setOtherReasonText] = useState<string>('');

  useEffect(() => {
    if (order) {
      setSelectedReason(PRESET_CANCEL_REASONS[0]);
      setOtherReasonText('');
    }
  }, [order]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' ? otherReasonText.trim() : selectedReason;
    if (selectedReason === 'Other' && !finalReason) {
      toast.error('Please enter cancellation reason');
      return;
    }
    await onConfirmCancel(order.id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="ui-card p-6 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-sm font-sans animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-900">Admin Cancel Order</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-sm transition font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Please select cancellation reason for Order{' '}
            <span className="font-mono font-bold text-slate-900">
              #{order.id.substring(0, 18)}...
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
              onClick={onClose}
              className="ui-button-secondary px-4 py-1.5 text-xs font-semibold"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-sm transition"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
