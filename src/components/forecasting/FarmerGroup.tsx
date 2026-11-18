import React from 'react';
import { IngredientRow } from './IngredientRow';
import styles from '../operations/role-portal-screen.module.css';

export function FarmerGroup({ farmerData, onConfirm, onCancel, onOpenFulfill }: any) {
  const { farmer, purchaseOrders } = farmerData;
  const isAllFulfilled = purchaseOrders.every((po: any) => po.status === 'FULFILLED');
  const isAllConfirmed = purchaseOrders.every((po: any) => po.status === 'CONFIRMED' || po.status === 'FULFILLED');
  const subtotal = purchaseOrders.reduce((sum: number, po: any) => sum + po.totalPrice, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <section className={styles.groupCard}>
      <div className={styles.groupHead}>
        <h3 className={styles.groupTitle}>
          {farmer.name}
          <span>{farmer.region}</span>
          <span className={`${styles.tag} ${styles.tagGray}`}>{farmer.commodityType}</span>
        </h3>
        <span className={`${styles.tag} ${isAllFulfilled ? styles.tagGreen : isAllConfirmed ? styles.tagBlue : styles.tagAmber}`}>
          {isAllFulfilled ? 'Semua panen diterima' : isAllConfirmed ? 'Terkonfirmasi' : 'Belum dikonfirmasi'}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Bahan</th>
              <th className={styles.alignRight}>Kebutuhan</th>
              <th className={styles.alignRight}>Perlu dibeli</th>
              <th>Keyakinan</th>
              <th className={styles.alignRight}>Harga / kg</th>
              <th className={styles.alignRight}>Estimasi</th>
              <th>Status / aksi</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po: any) => (
              <IngredientRow
                key={po.id}
                item={po}
                onConfirm={onConfirm}
                onCancel={onCancel}
                onOpenFulfill={(item: any) => onOpenFulfill?.({ ...item, farmer })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.groupFoot}>
        Subtotal <strong>{formatCurrency(subtotal)}</strong>
      </div>
    </section>
  );
}
