'use client';

import React from 'react';
import { CartItem } from '../store/cart-store';
import { CartItemCard } from './cart-item-card';

interface CartItemsListProps {
  items: CartItem[];
  selectedIds: string[];
  onToggleSelect: (productId: string) => void;
  onToggleSelectAll: () => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
}

export function CartItemsList({
  items,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  updateQuantity,
  removeItem,
}: CartItemsListProps) {
  const isAllSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="lg:col-span-2 ui-card bg-white border border-slate-200 shadow-xs divide-y divide-slate-200 overflow-hidden">
      <div className="px-4 py-3 sm:px-5 bg-slate-50 flex items-center justify-between font-mono text-xs text-slate-700">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
          />
          <span className="font-bold">Select All</span>
        </label>
        <span>{selectedIds.length}/{items.length} items</span>
      </div>

      {items.map((item) => (
        <CartItemCard
          key={item.product.id}
          item={item}
          isSelected={selectedIds.includes(item.product.id)}
          onToggleSelect={() => onToggleSelect(item.product.id)}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
        />
      ))}
    </div>
  );
}
