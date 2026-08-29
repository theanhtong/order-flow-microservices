'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ImageOff,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  Banknote,
  QrCode,
  ShoppingBag,
  X,
  Plus,
  Edit3,
} from 'lucide-react';
import NavHeader from '../components/nav-header';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { Product } from '../utils/product-api';
import { createOrderApi } from '../utils/order-api';

import {
  fetchUserAddressesApi,
  createAddressApi,
  updateAddressApi,
  setDefaultAddressApi,
  UserAddress,
} from '../utils/address-api';

interface CheckoutItem {
  product: Product;
  quantity: number;
}

interface AddressOption {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  note?: string;
  isDefault?: boolean;
}

const INITIAL_SAVED_ADDRESSES: AddressOption[] = [
  {
    id: 'addr-home',
    fullName: 'John Doe',
    phone: '0901234567',
    address: '123 High Tech Street, Ward 1, District 1, Ho Chi Minh City',
    note: 'Call before delivery',
    isDefault: true,
  },
  {
    id: 'addr-office',
    fullName: 'John Doe (OrderFlow)',
    phone: '0988777666',
    address: 'Floor 12, Landmark 81 Tower, Binh Thanh District, Ho Chi Minh City',
    note: 'Deliver during office hours (8AM - 5PM)',
  },
  {
    id: 'addr-warehouse',
    fullName: 'John Doe (Logistics)',
    phone: '0912345678',
    address: '456 Logistics Boulevard, Tan Binh District, Ho Chi Minh City',
    note: 'Leave at reception gate',
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const cartItems = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);

  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [checkoutSource, setCheckoutSource] = useState<string>('cart');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<AddressOption[]>(INITIAL_SAVED_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('addr-home');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const activeAddress = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];

  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNote, setFormNote] = useState('');

  const [shippingMethod, setShippingMethod] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CARD' | 'BANK_TRANSFER'>('CARD');

  useEffect(() => {
    setMounted(true);

    const loadBackendAddresses = async () => {
      if (user) {
        try {
          const apiAddrs = await fetchUserAddressesApi();
          if (apiAddrs && apiAddrs.length > 0) {
            const mapped: AddressOption[] = apiAddrs.map((a) => ({
              id: a.id,
              fullName: a.recipientName,
              phone: a.phone,
              address: a.address,
              note: a.note,
              isDefault: a.isDefault,
            }));
            setSavedAddresses(mapped);
            const defaultAddr = mapped.find((a) => a.isDefault) || mapped[0];
            setSelectedAddressId(defaultAddr.id);
            return;
          }
        } catch {
          // fallback to local initial addresses
        }

        if (INITIAL_SAVED_ADDRESSES[0].fullName === 'John Doe') {
          const updated = [...INITIAL_SAVED_ADDRESSES];
          updated[0].fullName = user.fullName || user.email.split('@')[0];
          setSavedAddresses(updated);
        }
      }
    };

    loadBackendAddresses();

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('checkout_items');
      const source = sessionStorage.getItem('checkout_source') || 'cart';
      setCheckoutSource(source);

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CheckoutItem[];
          if (parsed && parsed.length > 0) {
            setItems(parsed);
            return;
          }
        } catch {
        }
      }

      if (cartItems && cartItems.length > 0) {
        setItems(cartItems);
      }
    }
  }, [user, cartItems]);

  const handleStartEdit = (addr: AddressOption) => {
    setEditingAddrId(addr.id);
    setFormFullName(addr.fullName);
    setFormPhone(addr.phone);
    setFormAddress(addr.address);
    setFormNote(addr.note || '');
  };

  const handleStartNew = () => {
    setEditingAddrId('new');
    setFormFullName(user?.fullName || '');
    setFormPhone('');
    setFormAddress('');
    setFormNote('');
  };

  const handleSaveAddressForm = async () => {
    if (!formFullName.trim() || !formPhone.trim() || !formAddress.trim()) {
      toast.error('Please fill in recipient name, phone, and address');
      return;
    }

    if (editingAddrId === 'new') {
      let newAddr: AddressOption = {
        id: `addr-${Date.now()}`,
        fullName: formFullName,
        phone: formPhone,
        address: formAddress,
        note: formNote.trim() || undefined,
      };

      if (user) {
        try {
          const savedApi = await createAddressApi({
            recipientName: formFullName,
            phone: formPhone,
            address: formAddress,
            note: formNote.trim() || undefined,
          });
          newAddr = {
            id: savedApi.id,
            fullName: savedApi.recipientName,
            phone: savedApi.phone,
            address: savedApi.address,
            note: savedApi.note,
            isDefault: savedApi.isDefault,
          };
        } catch {
          // fallback to client id
        }
      }

      setSavedAddresses([...savedAddresses, newAddr]);
      setSelectedAddressId(newAddr.id);
    } else if (editingAddrId) {
      if (user && !editingAddrId.startsWith('addr-')) {
        try {
          await updateAddressApi(editingAddrId, {
            recipientName: formFullName,
            phone: formPhone,
            address: formAddress,
            note: formNote.trim() || undefined,
          });
        } catch {
          // fallback
        }
      }

      setSavedAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddrId
            ? {
                ...a,
                fullName: formFullName,
                phone: formPhone,
                address: formAddress,
                note: formNote.trim() || undefined,
              }
            : a
        )
      );
    }

    setEditingAddrId(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <NavHeader />
        <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
          Loading checkout...
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
        <NavHeader />
        <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col items-center justify-center font-mono space-y-4">
          <div className="ui-card p-12 text-center font-mono space-y-4 bg-white border border-slate-200 shadow-xs max-w-md w-full">
            <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8 text-slate-400 stroke-[1.2]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">No Items to Checkout</h2>
              <p className="text-xs text-slate-500">
                Please select products or add items to your cart to proceed with checkout.
              </p>
            </div>
            <Link href="/" className="ui-button-primary px-5 py-2 text-xs font-bold inline-block uppercase tracking-wider">
              Explore Products
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);
  const isFreeShippingAvailable = subtotal >= 500;
  const shippingFee =
    shippingMethod === 'EXPRESS'
      ? 15
      : isFreeShippingAvailable
        ? 0
        : 5;
  const totalAmount = subtotal + shippingFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Sign in required', {
        description: 'Please sign in to complete your order.',
      });
      router.push('/login');
      return;
    }

    if (!activeAddress.fullName || !activeAddress.phone || !activeAddress.address) {
      toast.error('Missing shipping info', {
        description: 'Please select or add a valid shipping address.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerId: user.email,
        items: items.map((i) => ({
          productId: i.product.id,
          sku: i.product.sku,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        shippingAddress: {
          fullName: activeAddress.fullName,
          phone: activeAddress.phone,
          address: activeAddress.address,
          note: activeAddress.note,
        },
        paymentMethod,
        shippingFee,
        totalAmount,
      };

      const res = await createOrderApi(orderPayload);

      if (checkoutSource === 'cart') {
        for (const item of items) {
          await removeItem(item.product.id);
        }
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('checkout_items');
        sessionStorage.removeItem('checkout_source');
      }

      toast.success('Order Placed Successfully!', {
        description: `Order #${res.id || 'CONFIRMED'} created. Total: $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      });

      router.push('/orders');
    } catch (err: any) {
      toast.error('Failed to place order', {
        description: err?.message || 'Something went wrong during checkout. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6 font-mono text-xs">
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Cart
          </Link>
        </div>

        <div className="border-b border-slate-200 pb-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Checkout
          </h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 ui-card bg-white border border-slate-200 shadow-xs divide-y divide-slate-200 overflow-hidden font-mono">

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShoppingBag className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Order Items ({items.reduce((acc, i) => acc + i.quantity, 0)})
                </h2>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center font-mono bg-white"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-20 h-20 shrink-0 bg-slate-100 border border-slate-200 rounded-sm flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-slate-300 stroke-[1.2]" />
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <h3 className="text-sm sm:text-base text-slate-900 truncate font-semibold">
                          {item.product.name}
                        </h3>
                        <div className="text-sm text-slate-600">
                          ${item.product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} × {item.quantity}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="font-bold text-slate-900 text-sm sm:text-base font-mono min-w-[80px] text-right">
                        ${(item.product.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-700" />
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                    Shipping Address
                  </h2>
                </div>
              </div>

              <div
                onClick={() => setIsAddressModalOpen(true)}
                className="p-4 bg-slate-50 border border-slate-300 rounded-sm hover:border-slate-800 active:bg-slate-100 active:scale-[0.99] cursor-pointer transition-all duration-75 flex items-center justify-between gap-4 group touch-manipulation select-none"
              >
                <div className="space-y-1 min-w-0 font-mono text-xs">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="font-semibold text-sm">{activeAddress.fullName}</span>
                    <span className="text-slate-500 font-normal">({activeAddress.phone})</span>
                  </div>
                  <div className="text-slate-600 font-normal truncate">
                    {activeAddress.address}
                  </div>
                  {activeAddress.note && (
                    <div className="text-slate-400 font-normal text-[11px] italic truncate">
                      Note: {activeAddress.note}
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-900 underline font-normal shrink-0">
                  Change
                </span>
              </div>
            </div>

            {/* <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Truck className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Shipping Method
                </h2>
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setShippingMethod('STANDARD')}
                  className={`flex items-center justify-between p-3.5 border rounded-sm cursor-pointer select-none touch-manipulation active:scale-[0.99] transition-all duration-75 ${shippingMethod === 'STANDARD'
                    ? 'border-slate-900 bg-slate-50/80 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === 'STANDARD'}
                      onChange={() => setShippingMethod('STANDARD')}
                      className="accent-slate-900 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Standard Delivery</div>
                      <div className="text-slate-500 text-[11px]">3-5 Business Days</div>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {isFreeShippingAvailable ? (
                      <span className="text-emerald-600 uppercase">FREE</span>
                    ) : (
                      '$5.00'
                    )}
                  </div>
                </label>

                <label
                  onClick={() => setShippingMethod('EXPRESS')}
                  className={`flex items-center justify-between p-3.5 border rounded-sm cursor-pointer select-none touch-manipulation active:scale-[0.99] transition-all duration-75 ${shippingMethod === 'EXPRESS'
                    ? 'border-slate-900 bg-slate-50/80 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === 'EXPRESS'}
                      onChange={() => setShippingMethod('EXPRESS')}
                      className="accent-slate-900 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Express Expedited</div>
                      <div className="text-slate-500 text-[11px]">1-2 Business Days</div>
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900">$15.00</div>
                </label>
              </div>
            </div> */}

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-slate-700" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Payment Method
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3.5 border rounded-sm flex items-center gap-3 select-none touch-manipulation active:scale-[0.99] transition-all duration-75 ${paymentMethod === 'CARD'
                    ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <CreditCard className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">VNPAY</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3.5 border rounded-sm flex items-center gap-3 select-none touch-manipulation active:scale-[0.99] transition-all duration-75 ${paymentMethod === 'COD'
                    ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Banknote className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">COD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3.5 border rounded-sm flex items-center gap-3 select-none touch-manipulation active:scale-[0.99] transition-all duration-75 ${paymentMethod === 'BANK_TRANSFER'
                    ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <QrCode className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">Bank QR</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="ui-card p-5 sm:p-6 bg-white border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Shipping Fee:</span>
                  <span className="font-semibold text-slate-900">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 uppercase">FREE</span>
                    ) : (
                      `$${shippingFee.toFixed(2)}`
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-900 text-xs uppercase">Total Amount:</span>
                  <span className="font-bold text-slate-900 text-xl">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full ui-button-primary py-3.5 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-xs transition"
              >
                {isSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <span>Place Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-75 font-mono">
          <div className="ui-card bg-white border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                {editingAddrId ? (editingAddrId === 'new' ? 'Add New Address' : 'Edit Address') : 'Select Shipping Address'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setEditingAddrId(null);
                }}
                className="text-slate-400 hover:text-slate-900 transition p-1 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingAddrId ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium block">Recipient Name *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="Full recipient name"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium block">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="Contact phone number"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium block">Delivery Address *</label>
                  <input
                    type="text"
                    required
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Street, building, district, city"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium block">Delivery Note (Optional)</label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="e.g. Call before delivery, deliver during office hours..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-sm text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingAddrId(null)}
                    className="px-4 py-2 border border-slate-300 rounded-sm text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAddressForm}
                    className="ui-button-primary px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {savedAddresses.map((addr) => {
                    const isSelected = addr.id === selectedAddressId;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3.5 border rounded-sm cursor-pointer transition flex justify-between items-start gap-3 select-none touch-manipulation active:scale-[0.99] ${isSelected
                          ? 'border-slate-900 bg-slate-50/90 shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50/50'
                          }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <input
                            type="radio"
                            name="selectedAddressInModal"
                            checked={isSelected}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-slate-900 shrink-0 cursor-pointer"
                          />
                          <div className="space-y-0.5 min-w-0 text-xs">
                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                              <span>{addr.fullName}</span>
                              <span className="text-slate-500 font-normal">({addr.phone})</span>
                              {addr.isDefault && (
                                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-xs font-normal">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600 font-normal truncate">
                              {addr.address}
                            </div>
                            {addr.note && (
                              <div className="text-slate-400 font-normal text-[11px] italic truncate">
                                Note: {addr.note}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(addr);
                          }}
                          className="text-slate-400 hover:text-slate-900 p-1 shrink-0 transition active:scale-95"
                          title="Edit Address"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleStartNew}
                    className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-sm text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(false)}
                      className="ui-button-primary px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
