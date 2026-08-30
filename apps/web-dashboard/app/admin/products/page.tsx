'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  getProducts,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  Product,
} from '../../utils/product-api';
import {
  fetchAllInventoryApi,
  updateProductStockApi,
  ApiInventory,
} from '../../utils/inventory-api';
import { fetchUserOrdersApi, ApiOrder } from '../../utils/order-api';

const CATEGORIES = ['ALL', 'Laptops', 'Phones', 'Tablets', 'Wearables', 'Audio', 'Accessories'] as const;

export default function AdminProductsPage() {
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, ApiInventory>>({});
  const [ordersList, setOrdersList] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modals state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Laptops' as Product['category'],
    price: '',
    stockQuantity: '50',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, invMap, ordersData] = await Promise.all([
        getProducts(),
        fetchAllInventoryApi(),
        fetchUserOrdersApi().catch(() => []),
      ]);

      setProductsList(productsRes.data);
      setInventoryMap(invMap);
      setOrdersList(ordersData);
    } catch {
      toast.error('Failed to load product catalog & inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = productsList.filter((p) => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const inv = inventoryMap[p.id];
    const hasStock = inv ? inv.quantity > 0 : p.inStock;
    const matchesStock =
      stockFilter === 'ALL' ||
      (stockFilter === 'IN_STOCK' && hasStock) ||
      (stockFilter === 'OUT_OF_STOCK' && !hasStock);

    return matchesCategory && matchesSearch && matchesStock;
  });

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    const inv = inventoryMap[p.id];
    setEditProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price.toString(),
      stockQuantity: inv ? inv.quantity.toString() : '50',
      description: p.description || '',
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Laptops',
      price: '199.99',
      stockQuantity: '50',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  // Check if Product has been ordered
  const checkIsProductOrdered = (productId: string, name: string): { isOrdered: boolean; orderId?: string } => {
    for (const order of ordersList) {
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          if (
            item.productId === productId ||
            (item.productName && item.productName.toLowerCase() === name.toLowerCase())
          ) {
            return { isOrdered: true, orderId: order.id };
          }
        }
      }
    }
    return { isOrdered: false };
  };

  // Open Delete Confirmation Modal with Validation
  const handleOpenDelete = (p: Product) => {
    const { isOrdered, orderId } = checkIsProductOrdered(p.id, p.name);
    setDeleteTarget(p);
    if (isOrdered) {
      setDeleteBlockedReason(`This product has existing orders (Order #${orderId?.substring(0, 8)}). Deletion is blocked!`);
    } else {
      setDeleteBlockedReason(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteBlockedReason) {
      toast.error('Cannot delete a product that has existing orders');
      return;
    }

    setSubmitting(true);
    try {
      await deleteProductApi(deleteTarget.id);
      toast.success(`Product "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
      await loadData();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Please enter product name and price');
      return;
    }

    setSubmitting(true);
    try {
      const priceNum = parseFloat(formData.price) || 0;
      const stockNum = parseInt(formData.stockQuantity, 10) || 0;

      if (editProduct) {
        await updateProductApi(editProduct.id, {
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          price: priceNum,
          description: formData.description,
          inStock: stockNum > 0,
        });

        await updateProductStockApi(editProduct.id, stockNum).catch(() => null);
        toast.success(`Updated "${formData.name}"`);
        setEditProduct(null);
      } else {
        const newProduct = await createProductApi({
          name: formData.name,
          sku: formData.sku,
          category: formData.category,
          price: priceNum,
          description: formData.description,
          inStock: stockNum > 0,
        });

        await updateProductStockApi(newProduct.id, stockNum).catch(() => null);
        toast.success(`Created "${formData.name}"`);
        setIsAddModalOpen(false);
      }

      await loadData();
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Sleek Top Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Search & Filter Inputs */}
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative min-w-[260px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs ui-input font-mono rounded-md border-slate-200 bg-white focus:bg-white shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stock Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-mono ui-input rounded-md border-slate-200 bg-white shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Right Side: Add Product Button */}
        <button
          onClick={handleOpenAdd}
          className="ui-button-primary px-4 py-2 text-xs flex items-center gap-2 rounded-md shadow-2xs shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Modern Horizontal Category Pills Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/80">
        {CATEGORIES.map((cat) => {
          const count =
            cat === 'ALL'
              ? productsList.length
              : productsList.filter((p) => p.category === cat).length;
          const isSelected = selectedCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{cat === 'ALL' ? 'All Products' : cat}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clean Table Data View (No bulky nested boxes) */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Loading product catalog and inventory data...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto stroke-[1.2]" />
            <div className="text-sm font-bold text-slate-700">No products found</div>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or select another category.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-mono uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Product Info</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Price</th>
                  <th className="py-3 px-4 font-semibold">Inventory Breakdown</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((p) => {
                  const inv = inventoryMap[p.id];
                  const totalStock = inv ? inv.quantity : (p.inStock ? 50 : 0);
                  const reservedStock = inv ? inv.reservedQuantity : 0;
                  const availableStock = Math.max(0, totalStock - reservedStock);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Product Info */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-slate-400 stroke-[1.2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate max-w-[220px]" title={p.name}>
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 align-middle font-mono text-[11px] text-slate-600">
                        {p.category}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 align-middle font-mono font-bold text-slate-900 text-xs">
                        ${Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Inventory Breakdown */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Total</span>
                            <span className="font-semibold text-slate-800">{totalStock}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Reserved</span>
                            <span className="font-semibold text-amber-600">{reservedStock}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Available</span>
                            <span className="font-semibold text-emerald-600">{availableStock}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-middle">
                        <span
                          className={`ui-badge font-mono text-[10px] ${
                            availableStock > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {availableStock > 0 ? `IN STOCK (${availableStock})` : 'OUT OF STOCK'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-lg w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-md font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editProduct ? `Edit Product: ${editProduct.name}` : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditProduct(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="font-medium text-slate-700 block">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-1.5 ui-input font-sans text-xs rounded-md"
                    placeholder="e.g. MacBook Pro M3 Max 16 inch"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-1.5 ui-input font-mono text-xs rounded-md"
                    placeholder="SKU-1001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 ui-input font-sans text-xs rounded-md bg-white cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-1.5 ui-input font-mono text-xs rounded-md"
                    placeholder="299.99"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-700 block">Inventory Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full px-3 py-1.5 ui-input font-mono text-xs font-bold text-emerald-700 rounded-md"
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 block">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-1.5 ui-input font-sans text-xs rounded-md"
                  placeholder="Enter product description..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditProduct(null);
                  }}
                  className="ui-button-secondary px-3.5 py-1.5 text-xs rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ui-button-primary px-4 py-1.5 text-xs rounded-md"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="ui-card p-6 max-w-md w-full bg-white border-slate-300 shadow-xl space-y-4 rounded-md font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Delete Product</h3>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-700">
                Are you sure you want to delete <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.sku})?
              </p>

              {deleteBlockedReason ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 font-medium space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                    <X className="w-4 h-4" />
                    <span>Deletion Blocked</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {deleteBlockedReason}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">
                  This action will remove the product from the active catalog.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="ui-button-secondary px-3.5 py-1.5 text-xs rounded-md"
              >
                {deleteBlockedReason ? 'Close' : 'Cancel'}
              </button>
              {!deleteBlockedReason && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors"
                >
                  {submitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
