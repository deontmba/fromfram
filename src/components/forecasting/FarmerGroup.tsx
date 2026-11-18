import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IngredientRow } from './IngredientRow';
import styles from '../operations/role-portal-screen.module.css';

export function FarmerGroup({ farmerData, onConfirm, onCancel, onOpenFulfill, expandOverride }: any) {
  const { farmer, purchaseOrders } = farmerData;
  const isAllFulfilled = purchaseOrders.every((po: any) => po.status === 'FULFILLED');
  const isAllConfirmed = purchaseOrders.every((po: any) => po.status === 'CONFIRMED' || po.status === 'FULFILLED');
  const hasDraft = purchaseOrders.some((po: any) => po.status === 'DRAFT');
  const subtotal = purchaseOrders.reduce((sum: number, po: any) => sum + po.totalPrice, 0);

  // DRAFT terbuka otomatis, CONFIRMED/FULFILLED bisa dilipat
  const [open, setOpen] = useState(hasDraft);

  // Ikuti perintah "Buka Semua / Tutup Semua" dari parent
  useEffect(() => {
    if (expandOverride !== null && expandOverride !== undefined) {
      setOpen(expandOverride);
    }
  }, [expandOverride]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const statusTag = isAllFulfilled ? styles.tagGreen : isAllConfirmed ? styles.tagBlue : styles.tagAmber;
  const statusLabel = isAllFulfilled ? 'Semua panen diterima' : isAllConfirmed ? 'Terkonfirmasi' : 'Belum dikonfirmasi';

  return (
    <section className={styles.groupCard}>
      {/* ── Header: selalu terlihat, klik untuk toggle ── */}
      <button
        type="button"
        className={styles.groupHead}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
      >
        <span className={styles.groupTitle}>
          {farmer.name}
          <span>{farmer.region}</span>
          <span className={`${styles.tag} ${styles.tagGray}`}>{farmer.commodityType}</span>
          <span style={{ fontWeight: 400, fontSize: '0.82rem', color: 'var(--muted)' }}>
            {purchaseOrders.length} bahan
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`${styles.tag} ${statusTag}`}>{statusLabel}</span>
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', whiteSpace: 'nowrap' }}>
            {formatCurrency(subtotal)}
          </span>
          {open
            ? <ChevronUp size={16} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
            : <ChevronDown size={16} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
          }
        </span>
      </button>

      {/* ── Detail tabel: hanya tampil saat open ── */}
      {open && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ minWidth: '140px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '200px', minWidth: '200px' }} />
              </colgroup>
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
        </>
      )}
    </section>
  );
}
