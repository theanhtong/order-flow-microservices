'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function UIKitPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [selectedRadio, setSelectedRadio] = useState('vnpay');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto mb-8 border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm border border-slate-300">
              v1.0.0
            </span>
            <span className="text-xs font-mono text-slate-500">OrderFlow UI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            UI Kit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Design system and core components.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {/* SECTION 1: PALETTE */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            1. Color Palette
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-slate-50 border border-slate-300" />
              <div className="text-[11px] font-mono text-slate-800">Slate 50</div>
              <div className="text-[10px] font-mono text-slate-500">#f8fafc</div>
            </div>
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-white border border-slate-300" />
              <div className="text-[11px] font-mono text-slate-800">White</div>
              <div className="text-[10px] font-mono text-slate-500">#ffffff</div>
            </div>
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-slate-200 border border-slate-400" />
              <div className="text-[11px] font-mono text-slate-800">Slate 200</div>
              <div className="text-[10px] font-mono text-slate-500">#e2e8f0</div>
            </div>
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-blue-600" />
              <div className="text-[11px] font-mono text-blue-900 font-semibold">Primary</div>
              <div className="text-[10px] font-mono text-slate-500">#2563eb</div>
            </div>
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-emerald-100 border border-emerald-400" />
              <div className="text-[11px] font-mono text-emerald-800">Success</div>
              <div className="text-[10px] font-mono text-slate-500">#16a34a</div>
            </div>
            <div className="ui-card p-2.5 space-y-1.5">
              <div className="h-8 rounded-sm bg-rose-100 border border-rose-400" />
              <div className="text-[11px] font-mono text-rose-800">Danger</div>
              <div className="text-[10px] font-mono text-slate-500">#dc2626</div>
            </div>
          </div>
        </section>

        {/* SECTION 2: BUTTONS */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            2. Buttons
          </h2>
          <div className="ui-card p-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => toast.info('Primary action executed')}
              className="ui-button-primary px-3.5 py-1.5 text-xs"
            >
              Primary Action
            </button>
            <button
              onClick={() => toast.info('Secondary action executed')}
              className="ui-button-secondary px-3.5 py-1.5 text-xs"
            >
              Secondary Action
            </button>
            <button
              onClick={() => toast.success('Order confirmed')}
              className="px-3.5 py-1.5 text-xs font-medium rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition"
            >
              Confirm
            </button>
            <button
              onClick={() => toast.error('Order cancelled')}
              className="px-3.5 py-1.5 text-xs font-medium rounded-sm bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 transition"
            >
              Cancel
            </button>
            <button
              disabled
              className="px-3.5 py-1.5 text-xs font-medium rounded-sm bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
            >
              Disabled
            </button>
          </div>
        </section>

        {/* SECTION 3: BADGES */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            3. Status Badges
          </h2>
          <div className="ui-card p-4 space-y-3">
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                Order Status
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="ui-badge bg-amber-50 border-amber-300 text-amber-800 font-mono">
                  ● PENDING
                </span>
                <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800 font-mono">
                  ✓ CONFIRMED
                </span>
                <span className="ui-badge bg-rose-50 border-rose-300 text-rose-800 font-mono">
                  ✕ CANCELLED
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-2.5">
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">
                Service Status
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="ui-badge bg-slate-100 border-slate-300 text-slate-700 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                  Order Service: ONLINE
                </span>
                <span className="ui-badge bg-slate-100 border-slate-300 text-slate-700 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                  Inventory Service: ONLINE
                </span>
                <span className="ui-badge bg-slate-100 border-slate-300 text-slate-700 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                  Payment Service: ONLINE
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: FORM CONTROLS */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            4. Form Controls
          </h2>
          <div className="ui-card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-600">Text Input</label>
              <input
                type="text"
                placeholder="Enter Order ID..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono ui-input"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-600">Select Dropdown</label>
              <select className="w-full px-3 py-1.5 text-xs font-mono ui-input">
                <option value="VNPAY">VNPAY</option>
                <option value="MOMO">MoMo</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-600 mb-1.5 block">Checkbox</label>
              <label className="flex items-center gap-2 text-xs font-mono text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cacheEnabled}
                  onChange={(e) => setCacheEnabled(e.target.checked)}
                  className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Enable Redis Caching</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-600 mb-1.5 block">Radio Group</label>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gateway"
                    value="vnpay"
                    checked={selectedRadio === 'vnpay'}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>VNPAY</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gateway"
                    value="momo"
                    checked={selectedRadio === 'momo'}
                    onChange={(e) => setSelectedRadio(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>MoMo</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: DATA GRID */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            5. Data Grid
          </h2>
          <div className="ui-card overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Order ID</th>
                  <th className="p-2.5">Customer ID</th>
                  <th className="p-2.5">Total Amount</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                <tr className="hover:bg-slate-50 transition">
                  <td className="p-2.5 font-semibold">#050a5a95-dde2</td>
                  <td className="p-2.5 text-slate-500">a5abaa4d-1c46</td>
                  <td className="p-2.5">$6,999.98</td>
                  <td className="p-2.5">
                    <span className="text-emerald-700 font-bold">CONFIRMED</span>
                  </td>
                  <td className="p-2.5 text-slate-500">6ms</td>
                </tr>
                <tr className="hover:bg-slate-50 transition">
                  <td className="p-2.5 font-semibold">#21bcb2d5-06cd</td>
                  <td className="p-2.5 text-slate-500">a5abaa4d-1c46</td>
                  <td className="p-2.5">$3,499.99</td>
                  <td className="p-2.5">
                    <span className="text-rose-700 font-bold">CANCELLED</span>
                  </td>
                  <td className="p-2.5 text-slate-500">4ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6: DIALOGS & TOASTS */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
            6. Notifications & Dialogs
          </h2>
          <div className="ui-card p-4 flex gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="ui-button-secondary px-3 py-1.5 text-xs font-medium"
            >
              Open Dialog
            </button>
            <button
              onClick={() => toast.success('Order #050a5a95 confirmed')}
              className="ui-button-primary px-3 py-1.5 text-xs font-medium"
            >
              Success Toast
            </button>
            <button
              onClick={() => toast.error('Payment failed for Order #21bcb2d5')}
              className="px-3 py-1.5 text-xs font-medium rounded-sm bg-rose-600 text-white hover:bg-rose-700 transition"
            >
              Failure Toast
            </button>
          </div>
        </section>
      </main>

      {/* SAMPLE MODAL DIALOG */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="ui-card p-4 max-w-sm w-full bg-white border-slate-300 shadow-xl space-y-3 rounded-sm">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-900 uppercase">
                Payment Dialog
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-mono"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Confirm payment process for selected order.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setModalOpen(false);
                  toast.success('Payment completed');
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 transition"
              >
                Success
              </button>
              <button
                onClick={() => {
                  setModalOpen(false);
                  toast.error('Payment cancelled');
                }}
                className="flex-1 py-1.5 text-xs font-medium rounded-sm bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
