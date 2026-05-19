import React, { useState, useEffect, useCallback } from 'react';
import { ForecastHeader } from './ForecastHeader';
import { SummaryCards } from './SummaryCards';
import { FarmerGroup } from './FarmerGroup';
import { BrainCircuit } from 'lucide-react';

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
  
  const showToast = (msg: string) => {
    const el = document.createElement('div');
    el.className = 'fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl z-50 transition-all duration-300 transform translate-y-0 opacity-100 font-medium text-sm flex items-center gap-2 border border-gray-700';
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span>${msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/forecast?week=${selectedWeek}`);
      if (!res.ok) throw new Error('Gagal mengambil data forecast');
      const json = await res.json();
      setData(json.data || json);
    } catch (err: any) {
      console.error(err);
      // Fail silently if endpoint is not fully wired up yet in Next.js, just for preview
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
      if (!res.ok) throw new Error('Gagal melakukan generate prediksi AI');
      showToast('Berhasil men-generate prediksi');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'Gagal generate');
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
      showToast('PO Terkonfirmasi');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error confirm');
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
      showToast('Semua PO berhasil dikonfirmasi');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error confirm all');
    }
  };

  const handleCancel = async (poId: string) => {
    try {
      const res = await fetch(`/api/admin/forecast/${poId}/cancel`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error('Gagal cancel PO');
      showToast('PO Dibatalkan');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Error cancel');
    }
  };

  const hasData = data && data.length > 0;

  return (
    <div className="w-full bg-slate-50/50 min-h-screen rounded-2xl">
      <ForecastHeader 
        selectedWeek={selectedWeek} 
        setSelectedWeek={setSelectedWeek} 
        isGenerating={isGenerating} 
        onGenerate={handleGenerate} 
        onConfirmAll={handleConfirmAll}
        data={data}
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200/50 rounded-xl animate-pulse"></div>)}
          </div>
          <div className="h-64 bg-gray-200/50 rounded-xl animate-pulse"></div>
        </div>
      ) : hasData ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SummaryCards data={data} />
          <div className="space-y-6">
            {data.map((group: any, idx: number) => (
              <FarmerGroup 
                key={group.farmer?.id || idx} 
                farmerData={group} 
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 bg-white border border-gray-200 rounded-2xl shadow-sm text-center animate-in fade-in duration-500">
          <div className="bg-blue-50 p-5 rounded-full mb-6 border border-blue-100">
            <BrainCircuit className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Data Prediksi</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-base">
            Belum ada prediksi kebutuhan bahan baku untuk minggu <span className="font-semibold text-gray-700">{selectedWeek}</span>. Klik tombol di bawah untuk meminta AI memproses prediksi berdasarkan histori dan meal plan.
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sedang Menghitung Model...
              </>
            ) : (
              <>
                <BrainCircuit size={20} />
                Generate Prediksi AI Sekarang
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
