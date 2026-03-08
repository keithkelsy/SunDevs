'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ModifierGroup, Product } from '@/types/menu';
import { formatCents } from '@/lib/format';
import { useCart } from '@/context/CartContext';

interface CustomizeModalProps {
  product: Product;
  onClose: () => void;
}

export default function CustomizeModal({
  product,
  onClose,
}: CustomizeModalProps) {
  // selections: groupName → Set of selected option names
  const [selections, setSelections] = useState<Record<string, Set<string>>>(
    () => {
      const init: Record<string, Set<string>> = {};
      for (const g of product.modifierGroups) {
        init[g.name] = new Set<string>();
      }
      return init;
    },
  );

  const { addItem } = useCart();

  /* ---------------------------------------------------------------- */
  /*  Selection helpers                                                */
  /* ---------------------------------------------------------------- */

  const toggleOption = useCallback(
    (group: ModifierGroup, optionName: string) => {
      setSelections((prev) => {
        const current = new Set(prev[group.name]);

        if (group.required && group.minSelections === 1 && group.maxSelections === 1) {
          // Radio-style: exactly 1 selection
          return { ...prev, [group.name]: new Set([optionName]) };
        }

        if (current.has(optionName)) {
          current.delete(optionName);
        } else {
          if (current.size < group.maxSelections) {
            current.add(optionName);
          }
        }
        return { ...prev, [group.name]: current };
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Validation                                                       */
  /* ---------------------------------------------------------------- */

  const isValid = useMemo(() => {
    for (const g of product.modifierGroups) {
      const count = selections[g.name]?.size ?? 0;
      if (g.required && count < g.minSelections) return false;
    }
    return true;
  }, [selections, product.modifierGroups]);

  /* ---------------------------------------------------------------- */
  /*  Computed price                                                   */
  /* ---------------------------------------------------------------- */

  const totalPrice = useMemo(() => {
    let total = product.basePrice;
    for (const g of product.modifierGroups) {
      const selected = selections[g.name];
      if (!selected) continue;
      for (const opt of g.options) {
        if (selected.has(opt.name)) {
          total += opt.priceAdjustment;
        }
      }
    }
    return total;
  }, [selections, product]);

  /* ---------------------------------------------------------------- */
  /*  Submit                                                           */
  /* ---------------------------------------------------------------- */

  function handleAdd() {
    if (!isValid) return;
    const mods: Record<string, string[]> = {};
    for (const [groupName, opts] of Object.entries(selections)) {
      if (opts.size > 0) {
        mods[groupName] = [...opts];
      }
    }
    addItem({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      selectedModifiers: mods,
    });
    onClose();
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const isRadio = (g: ModifierGroup) =>
    g.required && g.minSelections === 1 && g.maxSelections === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500">
              Base price: {formatCents(product.basePrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modifier groups */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {product.modifierGroups.map((group) => {
            const selected = selections[group.name] ?? new Set();
            const radio = isRadio(group);

            return (
              <div key={group.name}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{group.name}</h3>
                  <span className="text-xs text-gray-400">
                    {group.required ? 'Required' : 'Optional'}
                    {' · '}
                    {radio
                      ? 'Choose 1'
                      : `Up to ${group.maxSelections}`}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = selected.has(opt.name);
                    const atMax =
                      !radio && selected.size >= group.maxSelections;

                    return (
                      <label
                        key={opt.name}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                          ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}
                          ${!isSelected && atMax ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type={radio ? 'radio' : 'checkbox'}
                          name={group.name}
                          checked={isSelected}
                          disabled={!isSelected && atMax}
                          onChange={() => toggleOption(group, opt.name)}
                          className="accent-orange-600 w-4 h-4"
                        />
                        <span className="flex-1 text-gray-700">{opt.name}</span>
                        {opt.priceAdjustment !== 0 && (
                          <span className="text-sm font-medium text-gray-500">
                            +{formatCents(opt.priceAdjustment)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add to Order — {formatCents(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
