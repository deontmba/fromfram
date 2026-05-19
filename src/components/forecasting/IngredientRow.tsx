import React, { useState, useEffect } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';

export function IngredientRow({ item, onConfirm, onCancel }: any) {
  const isConfirmed = item.status === 'CONFIRMED';
  const [qty, setQty] = useState(item.orderedQtyKg);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQty(item.orderedQtyKg);
  }, [item.orderedQtyKg]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(item.id, Number(qty));
    setIsSubmitting(false);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="p-3 text-sm font-medium text-gray-800">{item.ingredient.name}</td>
      <td className="p-3 text-sm text-gray-600">{Number(item.forecastedQtyKg).toFixed(1)}</td>
      <td className="p-3 text-sm">
        <ConfidenceBadge score={item.confidenceScore} />
      </td>
      <td className="p-3 text-sm text-gray-600">{formatCurrency(item.pricePerKg)}</td>
      <td className="p-3 text-sm font-medium text-gray-800">
        {formatCurrency(item.pricePerKg * (isConfirmed ? item.orderedQtyKg : qty))}
      </td>
      <td className="p-3 text-sm">
        {isConfirmed ? (
          <span className="inline-flex items-center text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
            Terkonfirmasi ✓
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              step="0.1" 
              min="0"
              className="w-20 border border-gray-300 rounded p-1.5 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={isSubmitting}
            />
            <button 
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? '...' : 'Konfirmasi'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
