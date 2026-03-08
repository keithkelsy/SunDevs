'use client';

import type { Product } from '@/types/menu';
import { formatCents } from '@/lib/format';
import { useCart } from '@/context/CartContext';

interface ProductCardProps {
  product: Product;
  onCustomize: (product: Product) => void;
}

export default function ProductCard({ product, onCustomize }: ProductCardProps) {
  const { addItem } = useCart();
  const hasModifiers = product.modifierGroups.length > 0;

  function handleQuickAdd() {
    addItem({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      selectedModifiers: {},
    });
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-orange-600 font-bold text-lg">
          {formatCents(product.basePrice)}
        </span>

        {hasModifiers ? (
          <button
            onClick={() => onCustomize(product)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            Customize
          </button>
        ) : (
          <button
            onClick={handleQuickAdd}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
          >
            Add to Order
          </button>
        )}
      </div>
    </div>
  );
}
