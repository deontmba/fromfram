import React, { useState } from 'react';
import { PackageCheck, X } from 'lucide-react';
import styles from '../operations/role-portal-screen.module.css';

type FulfillItem = {
  id: string;
  orderedQtyKg: number;
  ingredient: { name: string; stockKg?: number };
  farmer?: { name: string };
};

export function FulfillModal({
  item,
  onClose,
  onConfirm,
}: {
  item: FulfillItem;
  onClose: () => void;
  onConfirm: (actualQtyKg: number) => Promise<void>;
}) {
  const [receivedQty, setReceivedQty] = useState(String(item.orderedQtyKg));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentStock = Number(item.ingredient.stockKg ?? 0);
  const received = Number(receivedQty);
  const isValid = Number.isFinite(received) && received > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('Berat yang diterima harus lebih dari 0 kg.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(received);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses penerimaan panen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}>
      <form className={styles.modal} role="dialog" aria-modal="true" aria-label="Terima panen" onSubmit={handleSubmit}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalTitle}>Terima panen</p>
            <p className={styles.modalSub}>
              {item.ingredient.name}{item.farmer?.name ? ` dari ${item.farmer.name}` : ''}
            </p>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} disabled={isSubmitting} aria-label="Tutup">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.statLine}>
            Dipesan di PO
            <strong>{Number(item.orderedQtyKg).toFixed(1)} kg</strong>
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Berat diterima (kg) <span className={styles.required}>*</span>
            </span>
            <input
              className={styles.input}
              type="number"
              step="0.05"
              min="0.05"
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
            <span className={styles.fieldHint}>Ubah jika hasil timbangan berbeda dari jumlah PO.</span>
          </label>

          <div className={styles.statLine}>
            Stok gudang: {currentStock.toFixed(1)} kg, setelah diterima
            <strong>{(currentStock + (isValid ? received : 0)).toFixed(1)} kg</strong>
          </div>

          {error && <div className={styles.notice} role="alert" style={{ margin: 0 }}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.tabButton} onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button type="submit" className={styles.actionCard} disabled={isSubmitting}>
            <PackageCheck aria-hidden="true" />
            {isSubmitting ? 'Menyimpan...' : 'Masukkan ke gudang'}
          </button>
        </div>
      </form>
    </div>
  );
}
