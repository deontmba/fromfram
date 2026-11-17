import React from 'react';
import { Layers, Users, Wallet, Weight } from 'lucide-react';
import styles from '../operations/role-portal-screen.module.css';

export function SummaryCards({ data }: { data: any[] }) {
  let totalRows = 0;
  let totalWeight = 0;
  let totalValue = 0;
  const farmerCount = data.length;

  data.forEach((group) => {
    group.purchaseOrders.forEach((po: any) => {
      totalRows++;
      totalWeight += po.orderedQtyKg;
      totalValue += po.totalPrice;
    });
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const cards = [
    { label: 'Jenis bahan', value: String(totalRows), icon: <Layers /> },
    { label: 'Total berat', value: `${totalWeight.toFixed(1)} kg`, icon: <Weight /> },
    { label: 'Nilai pembelian', value: formatCurrency(totalValue), icon: <Wallet /> },
    { label: 'Petani', value: String(farmerCount), icon: <Users /> },
  ];

  return (
    <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      {cards.map((c) => (
        <article key={c.label} className={styles.kpiCard}>
          <div className={styles.kpiRow}>
            <p className={styles.kpiLabel} style={{ margin: 0 }}>{c.label}</p>
            <span className={styles.activityIcon}>{c.icon}</span>
          </div>
          <p className={styles.kpiValue}>{c.value}</p>
        </article>
      ))}
    </div>
  );
}
