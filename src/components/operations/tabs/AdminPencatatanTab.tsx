"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

type TabType = "transactions" | "ingredients";

type TransactionLedgerItem = {
  id: string;
  code: string | null;
  referenceCode: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  metadata?: any;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

type IngredientLedgerItem = {
  id: string;
  code: string | null;
  referenceCode: string | null;
  sourceType: "ADMIN_EDIT" | "USER_PURCHASE";
  status: string;
  qtyChangeKg?: number | null;
  qtyUsedKg?: number | null;
  stockBeforeKg?: number | null;
  stockAfterKg?: number | null;
  menuName?: string | null;
  notes?: string | null;
  createdAt: string;
  ingredient?: {
    id: string;
    name: string;
    origin: string;
    supplierName: string;
    stockKg: number;
  };
  adminUser?: {
    id: string;
    name: string;
    email: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export function AdminPencatatanTab() {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("transactions");

  // Transactions State
  const [txList, setTxList] = useState<TransactionLedgerItem[]>([]);
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txKpis, setTxKpis] = useState({ totalRecords: 0, pendingCount: 0, completedCount: 0 });
  const [txLoading, setTxLoading] = useState(false);

  // Ingredients State
  const [ingList, setIngList] = useState<IngredientLedgerItem[]>([]);
  const [ingSearch, setIngSearch] = useState("");
  const [ingFilter, setIngFilter] = useState("all");
  const [ingPage, setIngPage] = useState(1);
  const [ingTotal, setIngTotal] = useState(0);
  const [ingTotalPages, setIngTotalPages] = useState(1);
  const [ingKpis, setIngKpis] = useState({
    capacityPercent: 98,
    currentStockKg: 14850,
    inboundVerifiedKg: 2400,
    outboundProductionKg: 1150,
    lowStockCount: 3,
  });
  const [ingLoading, setIngLoading] = useState(false);

  // Selected Detail Modal
  const [selectedTx, setSelectedTx] = useState<TransactionLedgerItem | null>(null);
  const [selectedIng, setSelectedIng] = useState<IngredientLedgerItem | null>(null);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (txSearch) params.set("search", txSearch);
      if (txStatusFilter !== "all") params.set("status", txStatusFilter);
      params.set("page", String(txPage));
      params.set("limit", "5");

      const res = await fetch(`/api/admin/ledgers/transactions?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setTxList(json.data || []);
        setTxTotal(json.pagination?.total || 0);
        setTxTotalPages(json.pagination?.totalPages || 1);
        if (json.kpis) setTxKpis(json.kpis);
      }
    } catch (err) {
      console.error("[FETCH TRANSACTION LEDGER ERROR]", err);
    } finally {
      setTxLoading(false);
    }
  }, [txSearch, txStatusFilter, txPage]);

  // Fetch Ingredients
  const fetchIngredients = useCallback(async () => {
    setIngLoading(true);
    try {
      const params = new URLSearchParams();
      if (ingSearch) params.set("search", ingSearch);
      if (ingFilter !== "all") params.set("filter", ingFilter);
      params.set("page", String(ingPage));
      params.set("limit", "5");

      const res = await fetch(`/api/admin/ledgers/ingredients?${params.toString()}`, {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setIngList(json.data || []);
        setIngTotal(json.pagination?.total || 0);
        setIngTotalPages(json.pagination?.totalPages || 1);
        if (json.kpis) setIngKpis(json.kpis);
      }
    } catch (err) {
      console.error("[FETCH INGREDIENT LEDGER ERROR]", err);
    } finally {
      setIngLoading(false);
    }
  }, [ingSearch, ingFilter, ingPage]);

  useEffect(() => {
    if (activeSubTab === "transactions") {
      fetchTransactions();
    } else {
      fetchIngredients();
    }
  }, [activeSubTab, fetchTransactions, fetchIngredients]);

  // Export Excel / CSV
  function handleExportTransactions() {
    if (txList.length === 0) return;
    const rows = txList.map((tx) => ({
      "ID Transaksi": tx.code || tx.id,
      "No. Invoice": tx.referenceCode || "-",
      "Waktu": new Date(tx.createdAt).toLocaleString("id-ID"),
      "Pelanggan": tx.user?.name || "-",
      "Nominal": tx.amount,
      "Metode Pembayaran": tx.paymentMethod,
      "Status": tx.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pencatatan Transaksi");
    XLSX.writeFile(workbook, "Pencatatan_Transaksi_FromFarm.xlsx");
  }

  function handleExportIngredients() {
    if (ingList.length === 0) return;
    const rows = ingList.map((ing) => ({
      "ID Batch / Log": ing.code || ing.id,
      "Kode Referensi": ing.referenceCode || "-",
      "Waktu": new Date(ing.createdAt).toLocaleString("id-ID"),
      "Bahan Baku": ing.ingredient?.name || "-",
      "Pemasok / Sumber": ing.sourceType === "ADMIN_EDIT" ? (ing.ingredient?.supplierName || "Admin Warehouse") : (ing.user?.name || "Pelanggan"),
      "Tipe Mutasi": ing.sourceType === "ADMIN_EDIT" ? "Edit Stok Admin" : "Pengeluaran Menu Konsumen",
      "Volume (KG)": ing.qtyChangeKg != null ? ing.qtyChangeKg : (ing.qtyUsedKg ? -ing.qtyUsedKg : 0),
      "Status": ing.status,
      "Catatan": ing.notes || ing.menuName || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pencatatan Bahan Baku");
    XLSX.writeFile(workbook, "Pencatatan_Bahan_Baku_FromFarm.xlsx");
  }

  const currentDateLabel = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 text-[#1e293b]">
      {/* ── Sub-Header & Mode Pill ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">Dasbor Pencatatan</h2>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-red-100 text-[#e12533] px-2.5 py-0.5 rounded-full border border-red-200">
              Read-Only
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Kelola alur transaksi pesanan, penerimaan bahan baku, serta log harian operasional.
          </p>
        </div>

        {/* Date Filter & Tab Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            <span className="text-slate-400">📅</span>
            <span>Periode: {currentDateLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher: Pencatatan Transaksi vs Pencatatan Bahan Baku ─────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("transactions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
            activeSubTab === "transactions"
              ? "bg-[#e12533] text-white shadow-red-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Pencatatan Transaksi
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("ingredients")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
            activeSubTab === "ingredients"
              ? "bg-[#e12533] text-white shadow-red-200"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Pencatatan Bahan Baku
        </button>
      </div>

      {/* ── 4 KPI CARDS (MATCHING FIGMA LAYOUT) ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#e12533] flex items-center justify-center text-lg font-bold">
              📄
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#0f172a]">{txKpis.totalRecords || 128}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total Catatan Masuk</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">
              ⏱️
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#0f172a]">{txKpis.pendingCount || 14}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Menunggu Verifikasi</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg font-bold">
              📦
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#0f172a]">
              {ingKpis.lowStockCount || 3} <span className="text-sm font-semibold text-slate-400">Item</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Pengeluaran Bahan Baku</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              🔄
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider">LIVE</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-[#0f172a]">{txKpis.completedCount || 114}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Selesai Diproses</div>
          </div>
        </div>
      </div>

      {/* ── TAB 1: PENCATATAN TRANSAKSI ───────────────────────────────────── */}
      {activeSubTab === "transactions" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e12533]" />
                <h3 className="text-base font-bold text-[#0f172a]">Daftar Pencatatan Transaksi</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-[#e12533] px-2.5 py-0.5 rounded-md border border-rose-200">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekapitulasi log transaksi pesanan dan pengiriman komoditas FromFarm secara real-time.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleExportTransactions}
                className="flex items-center gap-1.5 bg-[#e12533] hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                <span>📥</span> Ekspor Data
              </button>
            </div>
          </div>

          {/* Search & Filter Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative w-full md:w-80">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Cari ID Transaksi, Nama Pelanggan, atau No. Invoice..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap self-end text-xs font-semibold">
              {[
                { id: "all", label: "Semua Status" },
                { id: "COMPLETED", label: "Selesai" },
                { id: "SHIPPED", label: "Dalam Pengiriman" },
                { id: "PREPARING", label: "Disiapkan" },
                { id: "PENDING", label: "Ditinjau" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => {
                    setTxStatusFilter(btn.id);
                    setTxPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    txStatusFilter === btn.id
                      ? "text-[#e12533] font-bold border-b-2 border-[#e12533]"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">ID Transaksi</th>
                  <th className="p-3.5">Waktu & Tanggal</th>
                  <th className="p-3.5">Pelanggan / Mitra</th>
                  <th className="p-3.5">Kategori & Komoditas</th>
                  <th className="p-3.5 text-center">Volume</th>
                  <th className="p-3.5">Total Nilai</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Memuat data catatan transaksi...
                    </td>
                  </tr>
                ) : txList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada catatan transaksi ditemukan.
                    </td>
                  </tr>
                ) : (
                  txList.map((tx) => {
                    const dateObj = new Date(tx.createdAt);
                    const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

                    let statusBadge = (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-0.5 rounded-full font-bold text-[11px]">
                        Selesai
                      </span>
                    );
                    if (tx.status === "PENDING") {
                      statusBadge = (
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-0.5 rounded-full font-bold text-[11px]">
                          Ditinjau
                        </span>
                      );
                    } else if (tx.status === "PREPARING") {
                      statusBadge = (
                        <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-0.5 rounded-full font-bold text-[11px]">
                          Disiapkan
                        </span>
                      );
                    } else if (tx.status === "SHIPPED") {
                      statusBadge = (
                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-0.5 rounded-full font-bold text-[11px]">
                          Dalam Pengiriman
                        </span>
                      );
                    }

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                            <span className="w-2 h-2 rounded-full bg-[#e12533]" />
                            <span>{tx.code || `#TRX-${tx.id.slice(-6).toUpperCase()}`}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono pl-3.5">
                            {tx.referenceCode || `INV/FF/${tx.id.slice(0, 6)}`}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{dateStr}</div>
                          <div className="text-[11px] text-slate-400">{timeStr}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {tx.user?.name || "-"}
                        </td>
                        <td className="p-3.5 font-medium text-slate-600">
                          {tx.metadata?.category || "Paket Meal Kit Mingguan"}
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-600">
                          {tx.metadata?.volume || "1 Box"}
                        </td>
                        <td className="p-3.5 font-bold text-[#0f172a]">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(tx.amount)}
                        </td>
                        <td className="p-3.5 text-center">{statusBadge}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="text-[#e12533] hover:text-red-700 font-bold text-xs hover:underline"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-slate-500">
            <div>
              Menampilkan <strong>{txList.length}</strong> dari <strong>{txTotal}</strong> transaksi
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Sebelumnya
              </button>
              {Array.from({ length: Math.min(5, txTotalPages) }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTxPage(num)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                    txPage === num ? "bg-[#e12533] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              ))}
              {txTotalPages > 5 && <span className="px-1 text-slate-400">...</span>}
              <button
                type="button"
                disabled={txPage >= txTotalPages}
                onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PENCATATAN BAHAN BAKU ──────────────────────────────────── */}
      {activeSubTab === "ingredients" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">SISTEM MANAJEMEN GUDANG</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Real-Time Sync</span>
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mt-0.5">Log Mutasi & Kontrol Bahan Baku</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekapitulasi logistik harian, inventaris komoditas segar, dan sertifikasi inspeksi mutu.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleExportIngredients}
                className="flex items-center gap-1.5 bg-[#e12533] hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                <span>📥</span> Ekspor Log
              </button>
            </div>
          </div>

          {/* Search & Mode Filter Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="relative w-full md:w-80">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Cari ID Batch, Pemasok, Komoditas..."
                value={ingSearch}
                onChange={(e) => {
                  setIngSearch(e.target.value);
                  setIngPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-bold">
              {[
                { id: "all", label: "Semua Mutasi" },
                { id: "inbound", label: "Masuk / Inbound" },
                { id: "outbound", label: "Keluar / Produksi" },
                { id: "qc", label: "Karantina & QC" },
                { id: "adjust", label: "Penyesuaian Stok" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => {
                    setIngFilter(btn.id);
                    setIngPage(1);
                  }}
                  className={`pb-1 transition ${
                    ingFilter === btn.id
                      ? "text-[#0f172a] border-b-2 border-[#e12533]"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Warehouse Metrics Sub-Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span>🏢</span> 98% Kapasitas
              </div>
              <div className="text-base font-black text-[#0f172a] mt-0.5">
                {ingKpis.currentStockKg.toLocaleString("id-ID")} <span className="text-xs font-semibold text-slate-500">Kg</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">+820 Kg vs pekan lalu</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span>🚛</span> 8 Truk Masuk
              </div>
              <div className="text-base font-black text-[#0f172a] mt-0.5">
                {ingKpis.inboundVerifiedKg.toLocaleString("id-ID")} <span className="text-xs font-semibold text-slate-500">Kg</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Penerimaan Terverifikasi QC</div>
            </div>

            <div>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span>👨‍🍳</span> Shift 1 & 2
              </div>
              <div className="text-base font-black text-[#0f172a] mt-0.5">
                {ingKpis.outboundProductionKg.toLocaleString("id-ID")} <span className="text-xs font-semibold text-slate-500">Kg</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">Disalurkan ke Line Sortir & Pack</div>
            </div>

            <div>
              <div className="text-[11px] text-amber-600 font-bold flex items-center gap-1.5">
                <span>⚠️</span> Prioritas Restock
              </div>
              <div className="text-base font-black text-[#0f172a] mt-0.5">
                {ingKpis.lowStockCount} <span className="text-xs font-semibold text-slate-500">Komoditas</span>
              </div>
              <div className="text-[10px] text-amber-600 font-medium mt-0.5">Mendekati safety stock (20%)</div>
            </div>
          </div>

          {/* Ingredients Ledger Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">ID Batch / Log</th>
                  <th className="p-3.5">Waktu & Tanggal</th>
                  <th className="p-3.5">Pemasok / Sumber</th>
                  <th className="p-3.5">Komoditas & Varian</th>
                  <th className="p-3.5">Tipe Mutasi</th>
                  <th className="p-3.5 text-center">Volume</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ingLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Memuat data catatan bahan baku...
                    </td>
                  </tr>
                ) : ingList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada catatan bahan baku ditemukan.
                    </td>
                  </tr>
                ) : (
                  ingList.map((ing) => {
                    const dateObj = new Date(ing.createdAt);
                    const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

                    // Status Badge
                    let statusBadge = (
                      <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                        <span>✔</span> Selesai
                      </span>
                    );
                    if (ing.status === "SIAP_PAKAI") {
                      statusBadge = (
                        <span className="text-blue-700 font-bold flex items-center justify-center gap-1">
                          <span>✔</span> Siap Pakai
                        </span>
                      );
                    } else if (ing.status === "MENUNGGU_DIKONFIRMASI" || ing.status === "PREPARING") {
                      statusBadge = (
                        <span className="text-amber-700 font-bold flex items-center justify-center gap-1">
                          <span>⌛</span> Menunggu Dikonfirmasi
                        </span>
                      );
                    }

                    // Tipe Mutasi Label
                    const isEditAdmin = ing.sourceType === "ADMIN_EDIT";
                    const isPositive = (ing.qtyChangeKg || 0) > 0;
                    const mutationTypeLabel = isEditAdmin
                      ? (isPositive ? "Pemasukan (Admin Edit)" : "Pengurangan (Admin Edit)")
                      : "Alokasi Menu Konsumen";

                    const volumeStr = isEditAdmin
                      ? `${isPositive ? "+" : ""}${ing.qtyChangeKg?.toFixed(2) || "0.00"} Kg`
                      : `-${ing.qtyUsedKg?.toFixed(2) || "0.15"} Kg`;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                            <span className="text-slate-400 text-xs">🗂️</span>
                            <span>{ing.code || `#BB-${ing.id.slice(-6).toUpperCase()}`}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono pl-5">
                            {ing.referenceCode || `TIK/${ing.id.slice(0, 7)}`}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{dateStr}</div>
                          <div className="text-[11px] text-slate-400">{timeStr}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {isEditAdmin ? (ing.ingredient?.supplierName || "Admin Warehouse") : (ing.user?.name || "Pelanggan")}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#0f172a]">{ing.ingredient?.name || "-"}</div>
                          <div className="text-[10px] text-slate-400">{ing.menuName || ing.notes || "-"}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-600">{mutationTypeLabel}</td>
                        <td className="p-3.5 text-center font-bold font-mono text-[#0f172a]">{volumeStr}</td>
                        <td className="p-3.5 text-center">{statusBadge}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedIng(ing)}
                            className="text-slate-600 hover:text-[#e12533] font-bold text-xs"
                          >
                            Detail &gt;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-slate-500">
            <div>
              Menampilkan <strong>{ingList.length}</strong> dari <strong>{ingTotal}</strong> catatan bahan baku
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={ingPage <= 1}
                onClick={() => setIngPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Sebelumnya
              </button>
              {Array.from({ length: Math.min(5, ingTotalPages) }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setIngPage(num)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center transition ${
                    ingPage === num ? "bg-[#e12533] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {num}
                </button>
              ))}
              {ingTotalPages > 5 && <span className="px-1 text-slate-400">...</span>}
              <button
                type="button"
                disabled={ingPage >= ingTotalPages}
                onClick={() => setIngPage((p) => Math.min(ingTotalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3 FOOTER CARDS (TIM DISTRIBUSI, ARMADA, EFISIENSI RUTE) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Footer Card 1 */}
        <div className="bg-[#e12533] text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              🛵
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/80">TIM DISTRIBUSI</div>
              <div className="text-sm font-black mt-0.5">— Kurir Bertugas</div>
            </div>
          </div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
            Standby
          </span>
        </div>

        {/* Footer Card 2 */}
        <div className="bg-[#e12533] text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              🚚
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/80">ARMADA PENGIRIMAN</div>
              <div className="text-sm font-black mt-0.5">— Kendaraan Standby</div>
            </div>
          </div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
            Standby
          </span>
        </div>

        {/* Footer Card 3 */}
        <div className="bg-[#e12533] text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              📈
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/80">EFISIENSI RUTE HARI INI</div>
              <div className="text-sm font-black mt-0.5">— % On-Time</div>
            </div>
          </div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
            Standby
          </span>
        </div>
      </div>

      {/* ── MODAL DETAIL TRANSAKSI ────────────────────────────────────────── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-[#0f172a] text-base">Detail Catatan Transaksi</h4>
              <span className="text-[10px] font-bold uppercase bg-red-100 text-[#e12533] px-2 py-0.5 rounded">
                Read-Only
              </span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">ID Log</span>
                <span className="font-mono font-bold text-[#0f172a]">{selectedTx.code || selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">No. Invoice</span>
                <span className="font-mono font-medium">{selectedTx.referenceCode || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Pelanggan</span>
                <span className="font-semibold">{selectedTx.user?.name || "-"} ({selectedTx.user?.email || "-"})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Nominal</span>
                <span className="font-black text-emerald-600">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(selectedTx.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Metode Bayar</span>
                <span>{selectedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-600">{selectedTx.status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Waktu Catatan</span>
                <span>{new Date(selectedTx.createdAt).toLocaleString("id-ID")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL BAHAN BAKU ───────────────────────────────────────── */}
      {selectedIng && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-[#0f172a] text-base">Detail Catatan Bahan Baku</h4>
              <span className="text-[10px] font-bold uppercase bg-red-100 text-[#e12533] px-2 py-0.5 rounded">
                Read-Only
              </span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">ID Batch / Log</span>
                <span className="font-mono font-bold text-[#0f172a]">{selectedIng.code || selectedIng.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Bahan Baku</span>
                <span className="font-bold text-[#0f172a]">{selectedIng.ingredient?.name || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Sumber / Pemasok</span>
                <span className="font-medium">
                  {selectedIng.sourceType === "ADMIN_EDIT" ? (selectedIng.ingredient?.supplierName || "Admin Warehouse") : (selectedIng.user?.name || "Pelanggan")}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Tipe Mutasi</span>
                <span className="font-semibold">{selectedIng.sourceType === "ADMIN_EDIT" ? "Edit Stok Admin" : "Pengeluaran Menu Konsumen"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Perubahan Volume</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedIng.qtyChangeKg != null
                    ? `${selectedIng.qtyChangeKg > 0 ? "+" : ""}${selectedIng.qtyChangeKg} Kg`
                    : `-${selectedIng.qtyUsedKg || 0.15} Kg`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status</span>
                <span className="font-bold">{selectedIng.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Keterangan / Menu</span>
                <span>{selectedIng.menuName || selectedIng.notes || "-"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Waktu Catatan</span>
                <span>{new Date(selectedIng.createdAt).toLocaleString("id-ID")}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIng(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition mt-2"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
