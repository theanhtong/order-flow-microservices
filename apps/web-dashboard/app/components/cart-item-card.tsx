'use client';

import React from 'react';
import { ImageOff, Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem } from '../store/cart-store';

interface CartItemCardProps {
  item: CartItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
}

export function CartItemCard({
  item,
  isSelected,
  onToggleSelect,
  updateQuantity,
  removeItem,
}: CartItemCardProps) {
  return (
    <div
      className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center font-mono transition ${isSelected ? 'bg-white' : 'bg-slate-50/60 opacity-75'
        }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900 shrink-0"
        />

        <div className="w-20 h-20 shrink-0 bg-slate-100 border border-slate-200 rounded-sm flex items-center justify-center">
          <ImageOff className="w-8 h-8 text-slate-300 stroke-[1.2]" />
        </div>

        <div className="space-y-1.5 min-w-0">
          <h3 className="text-sm sm:text-base text-slate-900 truncate font-semibold">
            {item.product.name}
          </h3>
          <div className="text-sm text-slate-600">
            ${item.product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Quantity Controls */}
        <div className="flex items-center border border-slate-300 rounded-sm overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border-r border-slate-200"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              updateQuantity(item.product.id, isNaN(val) ? 1 : Math.max(1, val));
            }}
            className="w-10 text-center py-1 text-xs font-mono font-bold bg-transparent outline-none border-none"
          />
          <button
            type="button"
            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border-l border-slate-200"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="font-bold text-slate-900 text-sm font-mono min-w-[80px] text-right">
          ${(item.product.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>

        {/* Trash Button */}
        <button
          onClick={() => removeItem(item.product.id)}
          className="text-slate-400 hover:text-red-600 transition p-1"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
