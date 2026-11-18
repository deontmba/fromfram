import React, { useState, useEffect } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { PackageCheck } from 'lucide-react';
import styles from '../operations/role-portal-screen.module.css';

export function IngredientRow({ item, onConfirm, onOpenFulfill }: any) {
  const isFulfilled = item.status === 'FULFILLED';
  const isConfirmed = item.status === 'CONFIRMED';
  const isLocked = isConfirmed || isFulfilled;
  const currentStock = Number(item.currentStockKg ?? item.ingredient?.stockKg ?? 0);
  const grossDemand = Number(item.grossForecastKg ?? item.forecastedQtyKg ?? 0);
  const [qty, setQty] = useState(item.orderedQtyKg);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQty(item.orderedQtyKg);
  }, [item.orderedQtyKg]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(item.id, Number(qty));
    setIsSubmitting(false);
  };

  return (
    <tr>
      <td>
        <span className={styles.tableKey}>{item.ingredient.name}</span>
        <span className={styles.cellSub}>Stok gudang {currentStock.toFixed(1)} kg</span>
      </td>
      <td className={`${styles.alignRight} ${styles.nowrap}`}>{grossDemand.toFixed(1)} kg</td>
      <td className={`${styles.alignRight} ${styles.nowrap} ${styles.tableKey}`}>{Number(item.forecastedQtyKg).toFixed(1)} kg</td>
      <td><ConfidenceBadge score={item.confidenceScore} /></td>
      <td className={`${styles.alignRight} ${styles.nowrap}`}>{formatCurrency(item.pricePerKg)}</td>
      <td className={`${styles.alignRight} ${styles.nowrap} ${styles.tableKey}`}>
        {formatCurrency(item.pricePerKg * (isLocked ? item.orderedQtyKg : qty))}
      </td>
      <td>
        {isFulfilled ? (
          <span className={`${styles.tag} ${styles.tagGreen}`}>Panen diterima</span>
        ) : isConfirmed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={`${styles.tag} ${styles.tagBlue}`}>{Number(item.orderedQtyKg).toFixed(1)} kg dipesan</span>
            <button type="button" className={styles.tabButton} onClick={() => onOpenFulfill?.(item)}>
              <PackageCheck aria-hidden="true" />
              Terima panen
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              className={`${styles.input} ${styles.qtyInput}`}
              type="number"
              step="0.1"
              min="0"
              aria-label={`Jumlah pesan ${item.ingredient.name} (kg)`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={isSubmitting}
            />
            <button type="button" className={styles.actionCard} onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi'}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
