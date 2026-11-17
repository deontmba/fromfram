import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrainCircuit, LoaderCircle } from 'lucide-react';
import { ForecastHeader } from './ForecastHeader';
import { SummaryCards } from './SummaryCards';
import { FarmerGroup } from './FarmerGroup';
import styles from '../operations/role-portal-screen.module.css';

export function ForecastingPage() {
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const [selectedWeek, setSelectedWeek] = useState(getMonday(new Date()));
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/forecast?week=${selectedWeek}`);
      if (!res.ok) throw new Error('Gagal mengambil data forecast');
      const json = await res.json();
      setData(json.data || json);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/forecast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: selectedWeek })
      });
      if (!res.ok) throw new Error('Gagal membuat prediksi AI');
      showToast('Prediksi berhasil dibuat');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat prediksi');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async (poId: string, orderedQtyKg?: number) => {
    try {
      const res = await fetch(`/api/admin/forecast/${poId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedQtyKg })
      });
      if (!res.ok) throw new Error('Gagal mengkonfirmasi PO');
      showToast('PO dikonfirmasi');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Gagal konfirmasi');
    }
  };

  const handleConfirmAll = async () => {
    try {
      const res = await fetch('/api/admin/forecast/confirm-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate: selectedWeek })
      });
      if (!res.ok) throw new Error('Gagal mengkonfirmasi semua PO');
      showToast('Semua PO dikonfirmasi');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Gagal konfirmasi semua');
    }
  };

  const handleCancel = async (poId: string) => {
    try {
      const res = await fetch(`/api/admin/forecast/${poId}/cancel`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Gagal membatalkan PO');
      showToast('PO dibatalkan');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membatalkan');
    }
  };

  const hasData = data && data.length > 0;

  return (
    <div>
      <ForecastHeader
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        onConfirmAll={handleConfirmAll}
        data={data}
      />

      {isLoading ? (
        <div aria-busy="true">
          <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {[1, 2, 3, 4].map((i) => <div key={i} className={styles.skeleton} style={{ height: 96 }} />)}
          </div>
          <div className={styles.skeleton} style={{ height: 240 }} />
        </div>
      ) : hasData ? (
        <>
          <SummaryCards data={data} />
          {data.map((group: any, idx: number) => (
            <FarmerGroup
              key={group.farmer?.id || idx}
              farmerData={group}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))}
        </>
      ) : (
        <div className={styles.emptyCard}>
          <BrainCircuit aria-hidden="true" strokeWidth={1.5} />
          <h2>Belum ada prediksi</h2>
          <p>
            Belum ada prediksi kebutuhan bahan baku untuk minggu {selectedWeek}. AI menghitungnya dari histori dan meal plan pelanggan.
          </p>
          <button type="button" className={styles.actionCard} onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : <BrainCircuit aria-hidden="true" />}
            {isGenerating ? 'Menghitung...' : 'Buat Prediksi'}
          </button>
        </div>
      )}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}
