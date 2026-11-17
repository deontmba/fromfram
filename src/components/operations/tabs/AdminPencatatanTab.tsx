"use client";

import { useState, useEffect, useCallback } from "react";
import { CircleCheck, Clock, Download, FileText, Package, TriangleAlert, Weight, X } from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "../portal-shell";
import styles from "../role-portal-screen.module.css";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

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
    subscriptions?: Array<{
      planType: string;
      servings: number;
      status: string;
    }>;
  };
};

type IngredientLedgerItem = {
  id: string;
  code: string | null;
  referenceCode: string | null;
  sourceType: "ADMIN_EDIT" | "USER_PURCHASE" | "PO_FULFILLMENT";
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

const PAGE_SIZE = 10;

const TX_STATUS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Lunas", className: styles.tagGreen },
  PENDING: { label: "Menunggu", className: styles.tagAmber },
  FAILED: { label: "Gagal", className: styles.tagRed },
};

const ING_STATUS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Selesai", className: styles.tagGreen },
  DELIVERED: { label: "Selesai", className: styles.tagGreen },
  SIAP_PAKAI: { label: "Siap pakai", className: styles.tagBlue },
  MENUNGGU_DIKONFIRMASI: { label: "Menunggu", className: styles.tagAmber },
  PREPARING: { label: "Menunggu", className: styles.tagAmber },
  SHIPPED: { label: "Dikirim", className: styles.tagBlue },
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function getSubscriptionLabel(tx: TransactionLedgerItem) {
  const plan = tx.metadata?.planType || tx.user?.subscriptions?.[0]?.planType;
  if (!plan) return "Mingguan";
  const upper = String(plan).toUpperCase();
  if (upper.includes("BULAN")) return "Bulanan";
  if (upper.includes("TAHUN")) return "Tahunan";
  return "Mingguan";
}

function mutationLabel(ing: IngredientLedgerItem) {
  if (ing.sourceType === "PO_FULFILLMENT") return "Penerimaan PO";
  if (ing.sourceType === "USER_PURCHASE") return "Pemakaian menu";
  return (ing.qtyChangeKg ?? 0) > 0 ? "Penambahan admin" : "Pengurangan admin";
}

function mutationSource(ing: IngredientLedgerItem) {
  if (ing.sourceType === "USER_PURCHASE") return ing.user?.name || "Pelanggan";
  return ing.ingredient?.supplierName || "Gudang";
}

/** Signed change in kg: positive = stock in, negative = stock out. */
function mutationKg(ing: IngredientLedgerItem) {
  if (ing.qtyChangeKg != null) return ing.qtyChangeKg;
  return -(ing.qtyUsedKg ?? 0);
}

function formatKg(kg: number) {
  return `${kg > 0 ? "+" : ""}${kg.toFixed(2)} kg`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
  };
}

function Pagination({ page, totalPages, shown, total, noun, onPage }: {
  page: number;
  totalPages: number;
  shown: number;
  total: number;
  noun: string;
  onPage: (p: number) => void;
}) {
  return (
    <div className={styles.paginationBar}>
      <p className={styles.paginationInfo}>{shown} dari {total} {noun}</p>
      <div className={styles.paginationControls}>
        <button type="button" className={clsx(styles.tabButton, styles.paginationButton)} disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}>
          Sebelumnya
        </button>
        <span className={styles.paginationPageLabel}>{page} / {totalPages}</span>
        <button type="button" className={clsx(styles.tabButton, styles.paginationButton)} disabled={page >= totalPages} onClick={() => onPage(Math.min(totalPages, page + 1))}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>{title}</p>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Tutup">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <dl className={styles.dl}>{children}</dl>
        </div>
      </div>
    </div>
  );
}

export function AdminPencatatanTab() {
  const [activeSubTab, setActiveSubTab] = useState<TabType>("transactions");

  // Transactions State
  const [txList, setTxList] = useState<TransactionLedgerItem[]>([]);
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txKpis, setTxKpis] = useState<{ totalRecords: number; pendingCount: number; completedCount: number } | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  // Ingredients State
  const [ingList, setIngList] = useState<IngredientLedgerItem[]>([]);
  const [ingSearch, setIngSearch] = useState("");
  const [ingFilter, setIngFilter] = useState("all");
  const [ingPage, setIngPage] = useState(1);
  const [ingTotal, setIngTotal] = useState(0);
  const [ingTotalPages, setIngTotalPages] = useState(1);
  const [ingKpis, setIngKpis] = useState<{ currentStockKg: number; lowStockCount: number } | null>(null);
  const [ingLoading, setIngLoading] = useState(false);

  // Selected Detail Modal
  const [selectedTx, setSelectedTx] = useState<TransactionLedgerItem | null>(null);
  const [selectedIng, setSelectedIng] = useState<IngredientLedgerItem | null>(null);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      if (txSearch) params.set("search", txSearch);
      if (txStatusFilter !== "all") params.set("status", txStatusFilter);
      params.set("page", String(txPage));
      params.set("limit", String(PAGE_SIZE));

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

  const fetchIngredients = useCallback(async () => {
    setIngLoading(true);
    try {
      const params = new URLSearchParams();
      if (ingSearch) params.set("search", ingSearch);
      if (ingFilter !== "all") params.set("filter", ingFilter);
      params.set("page", String(ingPage));
      params.set("limit", String(PAGE_SIZE));

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

  function handleExportTransactions() {
    if (txList.length === 0) return;
    const rows = txList.map((tx) => ({
      "ID Transaksi": tx.code || tx.id,
      "No. Invoice": tx.referenceCode || "-",
      "Waktu": new Date(tx.createdAt).toLocaleString("id-ID"),
      "Pelanggan": tx.user?.name || "-",
      "Jenis Subscription": getSubscriptionLabel(tx),
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
      "Pemasok / Sumber": mutationSource(ing),
      "Tipe Mutasi": mutationLabel(ing),
      "Volume (KG)": mutationKg(ing),
      "Status": ing.status,
      "Catatan": ing.notes || ing.menuName || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pencatatan Bahan Baku");
    XLSX.writeFile(workbook, "Pencatatan_Bahan_Baku_FromFarm.xlsx");
  }

  const kpis =
    activeSubTab === "transactions"
      ? [
          { label: "Total catatan", value: txKpis?.totalRecords, icon: <FileText /> },
          { label: "Menunggu pembayaran", value: txKpis?.pendingCount, icon: <Clock /> },
          { label: "Lunas", value: txKpis?.completedCount, icon: <CircleCheck /> },
        ]
      : [
          { label: "Total stok gudang", value: ingKpis ? `${ingKpis.currentStockKg.toLocaleString("id-ID")} kg` : undefined, icon: <Weight /> },
          { label: "Stok di bawah 20 kg", value: ingKpis?.lowStockCount, icon: <TriangleAlert /> },
          { label: "Catatan mutasi", value: ingTotal, icon: <Package /> },
        ];

  return (
    <div>
      <PageHeader
        title="Pencatatan"
        subtitle="Log transaksi pelanggan dan mutasi stok bahan baku. Hanya baca."
        actions={
          <button
            type="button"
            className={styles.tabButton}
            onClick={activeSubTab === "transactions" ? handleExportTransactions : handleExportIngredients}
            disabled={activeSubTab === "transactions" ? txList.length === 0 : ingList.length === 0}
          >
            <Download aria-hidden="true" />
            Ekspor halaman ini
          </button>
        }
      />

      <div className={styles.segmented} role="tablist" style={{ maxWidth: 420, marginBottom: "1rem" }}>
        {([
          ["transactions", "Transaksi"],
          ["ingredients", "Bahan Baku"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSubTab === id}
            className={clsx(styles.segmentedItem, activeSubTab === id && styles.segmentedItemActive)}
            onClick={() => setActiveSubTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiRow}>
              <p className={styles.kpiLabel} style={{ margin: 0 }}>{kpi.label}</p>
              <span className={styles.activityIcon}>{kpi.icon}</span>
            </div>
            <p className={styles.kpiValue}>{kpi.value ?? "-"}</p>
          </article>
        ))}
      </div>

      {activeSubTab === "transactions" && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              type="search"
              aria-label="Cari transaksi"
              placeholder="Cari ID transaksi, pelanggan, atau invoice"
              value={txSearch}
              onChange={(e) => {
                setTxSearch(e.target.value);
                setTxPage(1);
              }}
            />
            <div className={styles.filterTabs}>
              {[
                { id: "all", label: "Semua" },
                { id: "COMPLETED", label: "Lunas" },
                { id: "PENDING", label: "Menunggu" },
                { id: "FAILED", label: "Gagal" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  aria-pressed={txStatusFilter === btn.id}
                  className={clsx(styles.filterTab, txStatusFilter === btn.id && styles.filterTabActive)}
                  onClick={() => {
                    setTxStatusFilter(btn.id);
                    setTxPage(1);
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Transaksi</th>
                  <th>Waktu</th>
                  <th>Pelanggan</th>
                  <th>Paket</th>
                  <th className={styles.alignRight}>Nominal</th>
                  <th>Status</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr><td colSpan={7} className={styles.emptyState}>Memuat transaksi...</td></tr>
                ) : txList.length === 0 ? (
                  <tr><td colSpan={7} className={styles.emptyState}>Belum ada transaksi.</td></tr>
                ) : (
                  txList.map((tx) => {
                    const { date, time } = formatDateTime(tx.createdAt);
                    const status = TX_STATUS[tx.status];
                    return (
                      <tr key={tx.id}>
                        <td>
                          <span className={styles.tableKey}>{tx.code || `TRX-${tx.id.slice(-6).toUpperCase()}`}</span>
                          {tx.referenceCode && <span className={clsx(styles.cellSub, styles.mono)}>{tx.referenceCode}</span>}
                        </td>
                        <td className={styles.nowrap}>
                          {date}
                          <span className={styles.cellSub}>{time}</span>
                        </td>
                        <td>{tx.user?.name || "-"}</td>
                        <td><span className={clsx(styles.tag, styles.tagGray)}>{getSubscriptionLabel(tx)}</span></td>
                        <td className={clsx(styles.alignRight, styles.nowrap, styles.tableKey)}>{formatRupiah(tx.amount)}</td>
                        <td>
                          <span className={clsx(styles.tag, status?.className)}>{status?.label ?? tx.status}</span>
                        </td>
                        <td className={styles.alignRight}>
                          <button type="button" className={styles.tabButton} onClick={() => setSelectedTx(tx)}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={txPage} totalPages={txTotalPages} shown={txList.length} total={txTotal} noun="transaksi" onPage={setTxPage} />
        </>
      )}

      {activeSubTab === "ingredients" && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.input}
              type="search"
              aria-label="Cari mutasi"
              placeholder="Cari ID batch, pemasok, atau bahan"
              value={ingSearch}
              onChange={(e) => {
                setIngSearch(e.target.value);
                setIngPage(1);
              }}
            />
            <div className={styles.filterTabs}>
              {[
                { id: "all", label: "Semua" },
                { id: "inbound", label: "Masuk" },
                { id: "outbound", label: "Keluar" },
                { id: "qc", label: "Menunggu" },
                { id: "adjust", label: "Penyesuaian" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  aria-pressed={ingFilter === btn.id}
                  className={clsx(styles.filterTab, ingFilter === btn.id && styles.filterTabActive)}
                  onClick={() => {
                    setIngFilter(btn.id);
                    setIngPage(1);
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Log</th>
                  <th>Waktu</th>
                  <th>Bahan baku</th>
                  <th>Sumber</th>
                  <th>Mutasi</th>
                  <th className={styles.alignRight}>Volume</th>
                  <th>Status</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {ingLoading ? (
                  <tr><td colSpan={8} className={styles.emptyState}>Memuat catatan bahan baku...</td></tr>
                ) : ingList.length === 0 ? (
                  <tr><td colSpan={8} className={styles.emptyState}>Belum ada catatan bahan baku.</td></tr>
                ) : (
                  ingList.map((ing) => {
                    const { date, time } = formatDateTime(ing.createdAt);
                    const kg = mutationKg(ing);
                    const status = ING_STATUS[ing.status];
                    return (
                      <tr key={ing.id}>
                        <td>
                          <span className={styles.tableKey}>{ing.code || `BB-${ing.id.slice(-6).toUpperCase()}`}</span>
                          {ing.referenceCode && <span className={clsx(styles.cellSub, styles.mono)}>{ing.referenceCode}</span>}
                        </td>
                        <td className={styles.nowrap}>
                          {date}
                          <span className={styles.cellSub}>{time}</span>
                        </td>
                        <td>
                          <span className={styles.tableKey}>{ing.ingredient?.name || "-"}</span>
                          {(ing.menuName || ing.notes) && <span className={styles.cellSub}>{ing.menuName || ing.notes}</span>}
                        </td>
                        <td>{mutationSource(ing)}</td>
                        <td>{mutationLabel(ing)}</td>
                        <td className={clsx(styles.alignRight, styles.nowrap, styles.tableKey, kg > 0 ? styles.textGreen : kg < 0 ? styles.textRed : undefined)}>
                          {formatKg(kg)}
                        </td>
                        <td>
                          <span className={clsx(styles.tag, status?.className)}>{status?.label ?? ing.status}</span>
                        </td>
                        <td className={styles.alignRight}>
                          <button type="button" className={styles.tabButton} onClick={() => setSelectedIng(ing)}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={ingPage} totalPages={ingTotalPages} shown={ingList.length} total={ingTotal} noun="catatan" onPage={setIngPage} />
        </>
      )}

      {selectedTx && (
        <DetailModal title="Detail Transaksi" onClose={() => setSelectedTx(null)}>
          <dt>ID log</dt>
          <dd className={styles.mono}>{selectedTx.code || selectedTx.id}</dd>
          <dt>No. invoice</dt>
          <dd className={styles.mono}>{selectedTx.referenceCode || "-"}</dd>
          <dt>Pelanggan</dt>
          <dd>{selectedTx.user?.name || "-"}<span className={styles.cellSub}>{selectedTx.user?.email || "-"}</span></dd>
          <dt>Paket</dt>
          <dd>{getSubscriptionLabel(selectedTx)}</dd>
          <dt>Nominal</dt>
          <dd>{formatRupiah(selectedTx.amount)}</dd>
          <dt>Metode bayar</dt>
          <dd>{selectedTx.paymentMethod}</dd>
          <dt>Status</dt>
          <dd>{TX_STATUS[selectedTx.status]?.label ?? selectedTx.status}</dd>
          <dt>Waktu</dt>
          <dd>{new Date(selectedTx.createdAt).toLocaleString("id-ID")}</dd>
        </DetailModal>
      )}

      {selectedIng && (
        <DetailModal title="Detail Mutasi Bahan Baku" onClose={() => setSelectedIng(null)}>
          <dt>ID log</dt>
          <dd className={styles.mono}>{selectedIng.code || selectedIng.id}</dd>
          <dt>Bahan baku</dt>
          <dd>{selectedIng.ingredient?.name || "-"}</dd>
          <dt>Sumber</dt>
          <dd>{mutationSource(selectedIng)}</dd>
          <dt>Mutasi</dt>
          <dd>{mutationLabel(selectedIng)}</dd>
          <dt>Perubahan</dt>
          <dd>{formatKg(mutationKg(selectedIng))}</dd>
          {selectedIng.stockBeforeKg != null && selectedIng.stockAfterKg != null && (
            <>
              <dt>Stok</dt>
              <dd>{selectedIng.stockBeforeKg.toFixed(2)} kg ke {selectedIng.stockAfterKg.toFixed(2)} kg</dd>
            </>
          )}
          <dt>Status</dt>
          <dd>{ING_STATUS[selectedIng.status]?.label ?? selectedIng.status}</dd>
          <dt>Keterangan</dt>
          <dd>{selectedIng.menuName || selectedIng.notes || "-"}</dd>
          <dt>Waktu</dt>
          <dd>{new Date(selectedIng.createdAt).toLocaleString("id-ID")}</dd>
        </DetailModal>
      )}
    </div>
  );
}
