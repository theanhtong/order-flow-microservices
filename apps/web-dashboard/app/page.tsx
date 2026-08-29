'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ImageOff, Search } from 'lucide-react';
import NavHeader from './components/nav-header';
import { getProducts, Product } from './utils/product-api';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Laptops', 'Phones', 'Tablets', 'Wearables', 'Audio', 'Accessories'];

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      const res = await getProducts();
      setProducts(res.data);
      setIsLiveApi(res.isLiveApi);
      setLoading(false);
    }
    loadProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <NavHeader />

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1">
        <div className="flex flex-col md:flex-row gap-6">
          {/* LEFT SIDEBAR: Search & Filters (Single Block) */}
          <aside className="w-full md:w-60 shrink-0 font-mono">
            <div className="ui-card p-4 space-y-5">
              {/* Search Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ui-input px-3 py-1.5 text-xs w-full font-mono"
                />
              </div>

              {/* Divider Line */}
              <div className="border-t border-slate-200" />

              {/* Vertical Category Selector */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 uppercase">
                  Categories
                </div>
                <div className="flex flex-col gap-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-sm transition ${selectedCategory === cat
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT AREA: Product Grid */}
          <section className="flex-1 space-y-4">
            {/* Page Header */}
            <div className="border-b border-slate-200 pb-3 flex justify-between items-end">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Products
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>

              {/* <div className="text-[10px] font-mono">
                {isLiveApi ? (
                  <span className="ui-badge bg-emerald-50 border-emerald-300 text-emerald-800">
                    ● Live API (product-service)
                  </span>
                ) : (
                  <span className="ui-badge bg-slate-100 border-slate-300 text-slate-600">
                    Product DB (Offline Fallback)
                  </span>
                )}
              </div> */}
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="ui-card p-8 text-center text-xs text-slate-500 font-mono">
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="ui-card p-8 text-center text-xs text-slate-500 font-mono">
                No products found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="ui-card p-0 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Placeholder Container */}
                      <div className="w-full aspect-square bg-slate-100 flex items-center justify-center border-b border-slate-200">
                        <ImageOff className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      </div>

                      {/* Content */}
                      <div className="p-3 space-y-1.5 font-mono">
                        <h3 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="text-sm font-bold text-slate-900">
                          ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-3 pt-0">
                      <Link
                        href={`/product/${product.sku}`}
                        className="w-full ui-button-primary py-1.5 text-xs font-mono block text-center"
                      >
                        Buy Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
