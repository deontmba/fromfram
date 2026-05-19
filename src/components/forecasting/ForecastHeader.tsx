import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export function ForecastHeader({ 
  selectedWeek, 
  setSelectedWeek, 
  isGenerating, 
  onGenerate, 
  onConfirmAll,
  data 
}: any) {
  
  let allConfirmed = true;
  let hasData = data && data.length > 0;
  
  if (hasData) {
    allConfirmed = data.every((group: any) => 
      group.purchaseOrders.every((po: any) => po.status === 'CONFIRMED')
    );
  }

  const handleConfirmAllClick = () => {
    if (window.confirm("Anda akan mengkonfirmasi semua pesanan ke seluruh petani minggu ini. Lanjutkan?")) {
      onConfirmAll();
    }
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Prediksi Kebutuhan Pasokan</h2>
          <p className="text-gray-500 text-sm mt-1">Kelola purchase order otomatis berdasarkan AI Demand Forecasting.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {hasData && (
            <button
              onClick={handleConfirmAllClick}
              disabled={allConfirmed}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 shadow-sm ${
                allConfirmed 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 hover:shadow-green-700/30'
              }`}
            >
              <CheckCircle2 size={18} />
              Konfirmasi Semua
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-70 transition-all duration-200 shadow-sm shadow-blue-600/20"
          >
            {isGenerating ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Sparkles size={18} />
            )}
            {isGenerating ? 'Sedang menghitung...' : 'Generate Prediksi AI'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border border-gray-200 rounded-xl shadow-sm gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Pilih Minggu:</label>
          <input 
            type="date" 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-lg p-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
          />
        </div>
        
        {hasData && (
          <div className="w-full sm:w-auto flex justify-end">
            {allConfirmed ? (
              <span className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-3.5 py-1.5 rounded-full text-sm font-semibold">
                <CheckCircle2 size={16} />
                Semua Terkonfirmasi
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-3.5 py-1.5 rounded-full text-sm font-semibold">
                <AlertCircle size={16} />
                Menunggu Konfirmasi
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
