import React from 'react';
import { IngredientRow } from './IngredientRow';

export function FarmerGroup({ farmerData, onConfirm, onCancel }: any) {
  const { farmer, purchaseOrders } = farmerData;
  const isAllConfirmed = purchaseOrders.every((po: any) => po.status === 'CONFIRMED');
  
  // Hitung subtotal berdasarkan orderedQtyKg dan pricePerKg (jika sudah confirm) 
  // atau bisa hitung dinamis. Sesuai prompt: dari data PO yang difetch.
  const subtotal = purchaseOrders.reduce((sum: number, po: any) => sum + po.totalPrice, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      <div className="bg-gray-50/80 p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800 text-lg">
            {farmer.name} <span className="text-gray-400 font-normal mx-1">—</span> <span className="text-gray-600 font-normal">{farmer.region}</span>
          </h3>
          <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
            {farmer.commodityType}
          </span>
        </div>
        <div>
          {isAllConfirmed ? (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              Terkonfirmasi ✓
            </span>
          ) : (
            <span className="text-yellow-600 text-sm font-medium flex items-center gap-1">
              Belum Dikonfirmasi
            </span>
          )}
        </div>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
              <th className="p-4 font-semibold">Nama Bahan</th>
              <th className="p-4 font-semibold">Prediksi AI (kg)</th>
              <th className="p-4 font-semibold">Confidence</th>
              <th className="p-4 font-semibold">Harga/kg</th>
              <th className="p-4 font-semibold">Total Estimasi</th>
              <th className="p-4 font-semibold w-40">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchaseOrders.map((po: any) => (
              <IngredientRow 
                key={po.id} 
                item={po} 
                onConfirm={onConfirm} 
                onCancel={onCancel} 
              />
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-50/50 p-4 border-t border-gray-200 flex justify-end">
        <div className="text-right">
          <span className="text-gray-500 text-sm mr-4">Subtotal Pembelian:</span>
          <span className="font-bold text-gray-900 text-lg">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
