import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { IngredientRow } from './IngredientRow';
import styles from '../operations/role-portal-screen.module.css';

type POStatus = 'DRAFT' | 'CONFIRMED' | 'FULFILLED';

interface PurchaseOrder {
  id: string | number;
  status: POStatus;
  totalPrice: number;
  [key: string]: any; // field lain (nama bahan, harga/kg, dll.) tetap diizinkan
}

interface Farmer {
  name: string;
  [key: string]: any;
}

interface FarmerGroupData {
  farmer: Farmer;
  purchaseOrders: PurchaseOrder[];
  regionName?: string;
}

interface FarmerGroupProps {
  farmerData: FarmerGroupData;
  onConfirm: (item: any) => void;
  onCancel: (item: any) => void;
  onOpenFulfill?: (item: any) => void;
  expandOverride?: boolean | null;
}

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);

export function FarmerGroup({
  farmerData,
  onConfirm,
  onCancel,
  onOpenFulfill,
  expandOverride,
}: FarmerGroupProps) {
  const { farmer, purchaseOrders, regionName } = farmerData;

  const isAllFulfilled = purchaseOrders.every((po) => po.status === 'FULFILLED');
  const isAllConfirmed = purchaseOrders.every(
    (po) => po.status === 'CONFIRMED' || po.status === 'FULFILLED'
  );
  const hasDraft = purchaseOrders.some((po) => po.status === 'DRAFT');
  const subtotal = purchaseOrders.reduce((sum, po) => sum + po.totalPrice, 0);

  // DRAFT terbuka otomatis, CONFIRMED/FULFILLED bisa dilipat
  const [open, setOpen] = useState<boolean>(hasDraft);

  // Ikuti perintah "Buka Semua / Tutup Semua" dari parent
  useEffect(() => {
    if (expandOverride !== null && expandOverride !== undefined) {
      setOpen(expandOverride);
    }
  }, [expandOverride]);

  const statusTag = isAllFulfilled
    ? styles.tagGreen
    : isAllConfirmed
      ? styles.tagBlue
      : styles.tagAmber;

  const statusLabel = isAllFulfilled
    ? 'Semua panen diterima'
    : isAllConfirmed
      ? 'Terkonfirmasi'
      : 'Belum dikonfirmasi';

  const titleText = regionName || farmer.name;

  return (
    <section className={styles.groupCard}>
      {/* ── Header: Wilayah / Provinsi ── */}
      <button
        type="button"
        className={styles.groupHead}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        <span className={styles.groupTitle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={16} style={{ color: '#0284c7' }} />
            {titleText}
          </span>
          <span className={`${styles.tag} ${styles.tagGray}`}>Sentra Pengadaan</span>
          <span style={{ fontWeight: 400, fontSize: '0.82rem', color: 'var(--muted)' }}>
            {purchaseOrders.length} bahan baku
          </span>
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`${styles.tag} ${statusTag}`}>{statusLabel}</span>
          <span
            style={{
              fontWeight: 600,
              fontSize: '0.88rem',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatCurrency(subtotal)}
          </span>
          {open ? (
            <ChevronUp size={16} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
          ) : (
            <ChevronDown size={16} aria-hidden="true" style={{ color: 'var(--muted)', flexShrink: 0 }} />
          )}
        </span>
      </button>

      {/* ── Detail tabel: hanya tampil saat open ── */}
      {open && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <colgroup>
                <col style={{ minWidth: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '85px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '105px' }} />
                <col style={{ width: '190px', minWidth: '190px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Bahan Baku</th>
                  <th>Mitra / Supplier</th>
                  <th className={styles.alignRight}>Kebutuhan</th>
                  <th className={styles.alignRight}>Perlu dibeli</th>
                  <th>Keyakinan</th>
                  <th className={styles.alignRight}>Harga / kg</th>
                  <th className={styles.alignRight}>Estimasi</th>
                  <th>Status / aksi</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
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
            Subtotal Pengadaan {titleText}: <strong>{formatCurrency(subtotal)}</strong>
          </div>
        </>
      )}
    </section>
  );
}