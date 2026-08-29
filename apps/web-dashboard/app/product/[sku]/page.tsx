'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ImageOff,
  ArrowLeft,
  CheckCircle2,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  User,
} from 'lucide-react';
import NavHeader from '../../components/nav-header';
import { getProductBySku, Product } from '../../utils/product-api';
import { useAuthStore } from '../../store/auth-store';

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  likes: number;
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'Alex Rivera',
    rating: 5,
    date: '2 days ago',
    comment: 'Exceptional build quality and lightning-fast performance. Exceeded my expectations for daily work!',
    likes: 12,
  },
  {
    id: 'rev-2',
    author: 'Sarah Chen',
    rating: 4,
    date: '1 week ago',
    comment: 'Sleek design and solid feel. Packaging was clean and delivery was fast.',
    likes: 5,
  },
  {
    id: 'rev-3',
    author: 'David K.',
    rating: 5,
    date: '2 weeks ago',
    comment: 'Top tier hardware. Works seamlessly with the OrderFlow microservices ecosystem.',
    likes: 8,
  },
];

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quantityInput, setQuantityInput] = useState<string>('1');

  // Review State
  const [reviews, setReviews] = useState<Review[]>(SAMPLE_REVIEWS);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const resolvedParams = await params;
      const foundProduct = await getProductBySku(resolvedParams.sku);
      setProduct(foundProduct);
      setLoading(false);
    }
    loadData();
  }, [params]);

  const parsedQuantity = Math.max(1, parseInt(quantityInput, 10) || 1);

  const handleDecrease = () => {
    setQuantityInput(String(Math.max(1, parsedQuantity - 1)));
  };

  const handleIncrease = () => {
    setQuantityInput(String(parsedQuantity + 1));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setQuantityInput(val);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    toast.success(`Added ${parsedQuantity}x ${product.name} to cart`);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user) {
      toast.error('Please sign in to place an order');
      router.push('/login');
      return;
    }

    toast.success(`Order created for ${product.name}`, {
      description: `Customer: ${user.email} • Total: $${(product.price * parsedQuantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    });

    router.push('/orders');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      author: user ? user.fullName || user.email : 'Verified Buyer',
      rating: newRating,
      date: 'Just now',
      comment: newComment,
      likes: 0,
    };

    setReviews([newRev, ...reviews]);
    setNewComment('');
    toast.success('Thank you for your review!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Products
          </Link>
        </div>

        {loading ? (
          <div className="ui-card p-12 text-center text-xs font-mono text-slate-500">
            Loading product details...
          </div>
        ) : !product ? (
          <div className="ui-card p-12 text-center font-mono space-y-3">
            <div className="text-slate-900 font-bold text-sm">Product Not Found</div>
            <div className="text-slate-500 text-xs">
              No product matches SKU code in database.
            </div>
            <Link href="/" className="ui-button-primary px-4 py-1.5 text-xs inline-block">
              Return to Catalog
            </Link>
          </div>
        ) : (
          /* SINGLE CONTAINER BLOCK FOR PRODUCT + REVIEWS SEPARATED BY DIVIDER LINE */
          <div className="ui-card p-6 sm:p-8 bg-white border-slate-200 shadow-xs space-y-8">
            {/* TOP SECTION: PRODUCT DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Image Banner */}
              <div className="w-full aspect-square bg-slate-100 border border-slate-200 rounded-sm flex items-center justify-center">
                <ImageOff className="w-16 h-16 text-slate-300 stroke-[1.2]" />
              </div>

              {/* Right Product Info */}
              <div className="space-y-6 font-mono flex flex-col justify-between h-full">
                <div className="space-y-4">
                  {/* Meta Badges */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-xs font-bold border border-slate-200">
                      {product.sku}
                    </span>
                    <span className="ui-badge bg-slate-100 border-slate-300 text-slate-700">
                      {product.category}
                    </span>
                    <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      In Stock
                    </span>
                  </div>

                  <div className="space-y-2 py-2 border-b border-slate-200">
                    {/* Title */}
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
                      {product.name}
                    </h1>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-sans">
                      {product.description || 'High-performance electronic device with premium quality finish.'}
                    </p>
                  </div>

                  {/* Unit Price */}
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-slate-900">
                      ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Checkout & Quantity Form */}
                <form onSubmit={handlePlaceOrder} className="space-y-6 pt-2">
                  {/* Quantity Input */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                      Quantity
                    </label>
                    <div className="flex items-center border border-slate-300 rounded-sm overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={handleDecrease}
                        className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border-r border-slate-200"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quantityInput}
                        onChange={handleQuantityChange}
                        onBlur={() => setQuantityInput(String(parsedQuantity))}
                        className="w-12 text-center py-1.5 text-xs font-mono font-bold bg-transparent outline-none border-none"
                      />
                      <button
                        type="button"
                        onClick={handleIncrease}
                        className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border-l border-slate-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Total Order Amount Line */}

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 uppercase tracking-wider font-bold">Total Amount:</span>
                    <span className="font-bold text-slate-900 text-xl font-mono">
                      ${(product.price * parsedQuantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="flex-1 ui-button-secondary py-3 text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <button
                      type="submit"
                      className="flex-1 ui-button-primary py-3 text-xs font-bold font-mono tracking-wider uppercase"
                    >
                      Buy Now
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* DIVIDER LINE BETWEEN PRODUCT & REVIEWS */}
            <div className="border-t border-slate-200 pt-8 space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
                    Reviews
                  </h2>
                </div>

                {/* Rating Summary */}
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-slate-900">4.8</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {reviews.length} Verified Reviews
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Review Form */}
              <form onSubmit={handleAddReview} className="bg-slate-50 p-4 rounded-sm border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase">
                  Write a Review
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600">Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-4 h-4 ${star <= newRating
                            ? 'fill-amber-400 stroke-amber-500'
                            : 'text-slate-300 stroke-slate-300'
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full p-2.5 ui-input text-xs font-sans"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="ui-button-primary px-4 py-1.5 text-xs font-bold font-mono"
                  >
                    Send
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-bold text-xs">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{rev.author}</div>
                          <div className="text-[10px] text-slate-400">{rev.date}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating
                              ? 'fill-amber-400 stroke-amber-500'
                              : 'text-slate-300 stroke-slate-300'
                              }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 font-sans leading-relaxed pl-9">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
