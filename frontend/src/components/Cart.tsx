'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { placeOrder } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function Cart() {
  const { items, totalItems, removeItem, updateQuantity, clearCart } =
    useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setPlacing(true);
    setError(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const result = await placeOrder(items, idempotencyKey);
      clearCart();
      router.push(`/orders/${result.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-400">
        Your cart is empty
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-bold text-lg text-gray-900">
          Your Order{' '}
          <span className="text-sm font-normal text-gray-500">
            ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </span>
        </h2>
      </div>

      <ul className="divide-y divide-gray-100">
        {items.map((item) => {
          const modEntries = Object.entries(item.selectedModifiers);
          return (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {item.productName}
                  </p>
                  {modEntries.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-500 space-y-0.5">
                      {modEntries.map(([group, opts]) => (
                        <li key={group}>
                          {group}: {opts.join(', ')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-400 hover:text-red-500 text-sm shrink-0"
                  aria-label={`Remove ${item.productName}`}
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Qty:</label>
                <select
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(item.id, Number(e.target.value))
                  }
                  className="border border-gray-300 rounded text-sm px-2 py-1"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {placing ? 'Placing Order…' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}
