import React, { useState, useEffect } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import styles from '../operations/role-portal-screen.module.css';

export function IngredientRow({ item, onConfirm }: any) {
  const isConfirmed = item.status === 'CONFIRMED';
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
      <td className={styles.tableKey}>{item.ingredient.name}</td>
      <td className={`${styles.alignRight} ${styles.nowrap}`}>{Number(item.forecastedQtyKg).toFixed(1)} kg</td>
      <td><ConfidenceBadge score={item.confidenceScore} /></td>
      <td className={`${styles.alignRight} ${styles.nowrap}`}>{formatCurrency(item.pricePerKg)}</td>
      <td className={`${styles.alignRight} ${styles.nowrap} ${styles.tableKey}`}>
        {formatCurrency(item.pricePerKg * (isConfirmed ? item.orderedQtyKg : qty))}
      </td>
      <td>
        {isConfirmed ? (
          <span className={`${styles.tag} ${styles.tagGreen}`}>{Number(item.orderedQtyKg).toFixed(1)} kg dipesan</span>
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
