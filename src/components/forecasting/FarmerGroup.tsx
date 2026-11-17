import React from 'react';
import { IngredientRow } from './IngredientRow';
import styles from '../operations/role-portal-screen.module.css';

export function FarmerGroup({ farmerData, onConfirm, onCancel }: any) {
  const { farmer, purchaseOrders } = farmerData;
  const isAllConfirmed = purchaseOrders.every((po: any) => po.status === 'CONFIRMED');
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
        <span className={`${styles.tag} ${isAllConfirmed ? styles.tagGreen : styles.tagAmber}`}>
          {isAllConfirmed ? 'Terkonfirmasi' : 'Belum dikonfirmasi'}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Bahan</th>
              <th className={styles.alignRight}>Prediksi</th>
              <th>Keyakinan</th>
              <th className={styles.alignRight}>Harga / kg</th>
              <th className={styles.alignRight}>Estimasi</th>
              <th>Jumlah pesan</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po: any) => (
              <IngredientRow key={po.id} item={po} onConfirm={onConfirm} onCancel={onCancel} />
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
