import React from 'react';
import { CircleCheck, LoaderCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '../operations/portal-shell';
import styles from '../operations/role-portal-screen.module.css';

export function ForecastHeader({
  selectedWeek,
  setSelectedWeek,
  isGenerating,
  onGenerate,
  onConfirmAll,
  data
}: any) {
  const hasData = data && data.length > 0;
  const allConfirmed = hasData
    ? data.every((group: any) => group.purchaseOrders.every((po: any) => po.status === 'CONFIRMED'))
    : true;

  const handleConfirmAllClick = () => {
    if (window.confirm("Anda akan mengkonfirmasi semua pesanan ke seluruh petani minggu ini. Lanjutkan?")) {
      onConfirmAll();
    }
  };

  return (
    <>
      <PageHeader
        title="Prediksi Kebutuhan Pasokan"
        subtitle="Purchase order ke petani mitra, dihitung dari AI demand forecasting."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hasData && (
              <button type="button" className={styles.tabButton} onClick={handleConfirmAllClick} disabled={allConfirmed}>
                <CircleCheck aria-hidden="true" />
                Konfirmasi Semua
              </button>
            )}
            <button type="button" className={styles.actionCard} onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              {isGenerating ? 'Menghitung...' : 'Buat Prediksi'}
            </button>
          </div>
        }
      />

      <div className={styles.toolbar}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span className={styles.fieldLabel}>Minggu</span>
          <input
            className={styles.input}
            type="date"
            style={{ width: 'auto' }}
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
          />
        </label>
        {hasData && (
          <span className={`${styles.tag} ${allConfirmed ? styles.tagGreen : styles.tagAmber}`}>
            {allConfirmed ? 'Semua terkonfirmasi' : 'Menunggu konfirmasi'}
          </span>
        )}
      </div>
    </>
  );
}
