'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MenuCategory, Product } from '@/types/menu';
import { fetchMenu } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import CustomizeModal from '@/components/CustomizeModal';
import Cart from '@/components/Cart';

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<Product | null>(null);

  useEffect(() => {
    fetchMenu()
      .then((data) => setCategories(data.categories))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load menu'),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleCustomize = useCallback((product: Product) => {
    setCustomizing(product);
  }, []);

  const handleCloseModal = useCallback(() => {
    setCustomizing(null);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Loading / Error states                                           */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
        <p className="font-medium">Could not load the menu</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu section */}
        <div className="flex-1 min-w-0 space-y-8">
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>

          {categories.map((cat) => (
            <section key={cat.name}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                {cat.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cat.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onCustomize={handleCustomize}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cart sidebar */}
        <aside className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-6">
            <Cart />
          </div>
        </aside>
      </div>

      {/* Customization modal */}
      {customizing && (
        <CustomizeModal product={customizing} onClose={handleCloseModal} />
      )}
    </>
  );
}
