import React from 'react';
import { Layers, Weight, Wallet, Users } from 'lucide-react';

export function SummaryCards({ data }: { data: any[] }) {
  let totalRows = 0;
  let totalWeight = 0;
  let totalValue = 0;
  let farmerCount = data.length;

  data.forEach((group) => {
    group.purchaseOrders.forEach((po: any) => {
      totalRows++;
      totalWeight += po.orderedQtyKg;
      totalValue += po.totalPrice;
    });
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Layers size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Jenis Bahan</p>
          <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
        </div>
      </div>
      
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-green-50 text-green-600 rounded-lg">
          <Weight size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Berat</p>
          <p className="text-2xl font-bold text-gray-900">{totalWeight.toFixed(1)} <span className="text-base font-medium text-gray-500">kg</span></p>
        </div>
      </div>
      
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
          <Wallet size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Total Nilai Pembelian</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>
      
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start gap-4">
        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Jumlah Petani</p>
          <p className="text-2xl font-bold text-gray-900">{farmerCount}</p>
        </div>
      </div>
    </div>
  );
}
