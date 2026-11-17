"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FileUp, Minus, Pencil, Plus, Scale, Trash2, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { PageHeader } from "../portal-shell";
import styles from "../role-portal-screen.module.css";
import * as XLSX from "xlsx";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

// ── Tipe ─────────────────────────────────────────────────────────────────────
type Ingredient = {
  id: string;
  name: string;
  origin: string;
  supplierName: string;
  isAllergen: boolean;
  stockKg: number;
  pricePerKg: number;
};

type ImportRow = {
  name: string;
  origin: string;
  supplierName: string;
  stockKg: number;
  pricePerKg: number;
  isAllergen?: boolean;
};

type ImportResultRow = {
  name: string;
  status: "created" | "updated" | "invalid" | "not_found";
  message?: string;
};

const LOW_STOCK_KG = 5;

function stockTone(stockKg: number) {
  if (stockKg <= 0) return "red" as const;
  if (stockKg < LOW_STOCK_KG) return "amber" as const;
  return "green" as const;
}

// ── Komponen badge stok ───────────────────────────────────────────────────────
function StockBadge({ stockKg }: { stockKg: number }) {
  const tone = stockTone(stockKg);
  if (tone === "red") return <span className={clsx(styles.tag, styles.tagRed)}>Habis</span>;
  if (tone === "amber") return <span className={clsx(styles.tag, styles.tagAmber)}>{stockKg.toFixed(1)} kg · Menipis</span>;
  return <span className={clsx(styles.tag, styles.tagGreen)}>{stockKg.toFixed(1)} kg</span>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

function Modal({
  title,
  subtitle,
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={clsx(styles.modal, wide && styles.modalWide)} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.modalTitle}>{title}</p>
            {subtitle ? <p className={styles.modalSub}>{subtitle}</p> : null}
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Tutup">
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Modal Tambah / Edit Bahan Baku Manual ─────────────────────────────────────
function IngredientFormModal({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData?: Ingredient | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = Boolean(initialData);
  const [name, setName] = useState(initialData?.name || "");
  const [origin, setOrigin] = useState(initialData?.origin === "-" ? "" : initialData?.origin || "");
  const [supplierName, setSupplierName] = useState(initialData?.supplierName === "-" ? "" : initialData?.supplierName || "");
  const [stockKg, setStockKg] = useState(initialData !== undefined && initialData !== null ? String(initialData.stockKg) : "");
  const [pricePerKg, setPricePerKg] = useState(initialData !== undefined && initialData !== null ? String(initialData.pricePerKg) : "");
  const [isAllergen, setIsAllergen] = useState(initialData?.isAllergen || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nama bahan baku wajib diisi.");
      return;
    }

    const stock = parseFloat(stockKg);
    if (isNaN(stock) || stock < 0) {
      setError("Sisa stok harus berupa angka non-negatif (≥ 0).");
      return;
    }

    const price = parseFloat(pricePerKg);
    if (isNaN(price) || price < 0) {
      setError("Harga acuan / KG harus berupa angka non-negatif (≥ 0).");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/ingredients/${initialData!.id}` : "/api/admin/ingredients";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          origin: origin.trim() || "-",
          supplierName: supplierName.trim() || "-",
          stockKg: stock,
          pricePerKg: price,
          isAllergen,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Gagal ${isEdit ? "memperbarui" : "menambahkan"} bahan baku.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Ubah Bahan Baku" : "Tambah Bahan Baku"}
      subtitle={isEdit ? initialData?.name : "Detail bahan baku untuk katalog dan persediaan"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} style={{ display: "contents" }}>
        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              Nama bahan baku <span className={styles.required}>*</span>
            </span>
            <input
              className={styles.input}
              type="text"
              required
              placeholder="Contoh: Beras Merah Organik"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Asal daerah</span>
              <input
                className={styles.input}
                type="text"
                placeholder="Contoh: Cianjur"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Supplier / petani mitra</span>
              <input
                className={styles.input}
                type="text"
                placeholder="Contoh: Gapoktan Makmur"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Sisa stok <span className={styles.required}>*</span>
              </span>
              <span className={styles.affixWrap}>
                <input
                  className={styles.input}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={stockKg}
                  onChange={(e) => setStockKg(e.target.value)}
                />
                <span className={clsx(styles.affix, styles.affixEnd)}>kg</span>
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Harga acuan per kg <span className={styles.required}>*</span>
              </span>
              <span className={clsx(styles.affixWrap, styles.affixWrapPrefix)}>
                <span className={clsx(styles.affix, styles.affixStart)}>Rp</span>
                <input
                  className={styles.input}
                  type="number"
                  step="100"
                  min="0"
                  required
                  placeholder="0"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                />
              </span>
              {parseFloat(pricePerKg) > 0 && (
                <p className={styles.fieldHint}>{formatCurrency(parseFloat(pricePerKg))} / kg</p>
              )}
            </label>
          </div>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={isAllergen} onChange={(e) => setIsAllergen(e.target.checked)} />
            Mengandung alergen (seafood, kacang, susu, gluten, dll.)
          </label>

          {error && <div className={styles.notice} role="alert" style={{ margin: 0 }}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.tabButton} onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button type="submit" className={styles.actionCard} disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Bahan Baku"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal Edit Stok Presisi ───────────────────────────────────────────────────
function StockAdjustModal({
  ingredient,
  onClose,
  onSuccess,
}: {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [deltaInput, setDeltaInput] = useState("0");
  const [directInput, setDirectInput] = useState(String(ingredient.stockKg));
  const [tab, setTab] = useState<"delta" | "direct">("delta");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const delta = parseFloat(deltaInput) || 0;
  const direct = parseFloat(directInput) ?? ingredient.stockKg;

  const previewStock = tab === "delta"
    ? (mode === "add" ? ingredient.stockKg + Math.abs(delta) : Math.max(0, ingredient.stockKg - Math.abs(delta)))
    : direct;

  const QUICK_AMOUNTS = [0.5, 1, 2, 5, 10, 20];

  async function handleSubmit() {
    setError("");
    let deltaKg = 0;

    if (tab === "delta") {
      deltaKg = mode === "add" ? Math.abs(delta) : -Math.abs(delta);
      if (delta === 0) { setError("Masukkan jumlah yang valid (bukan 0)."); return; }
    } else {
      if (isNaN(direct) || direct < 0) { setError("Masukkan stok akhir yang valid (>= 0)."); return; }
      deltaKg = direct - ingredient.stockKg;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/ingredients/${ingredient.id}/adjust-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ deltaKg }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengubah stok.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewClass = { red: styles.textRed, amber: styles.textAmber, green: styles.textGreen }[stockTone(previewStock)];

  const stepper = (value: string, setValue: (v: string) => void, label: string) => (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Kurangi 0,5 kg"
          onClick={() => setValue(String(Math.max(0, parseFloat(value || "0") - 0.5)))}
        >
          <Minus aria-hidden="true" />
        </button>
        <input
          className={styles.input}
          type="number"
          step="0.01"
          min="0"
          aria-label={label}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Tambah 0,5 kg"
          onClick={() => setValue(String(parseFloat(value || "0") + 0.5))}
        >
          <Plus aria-hidden="true" />
        </button>
        <span className={styles.fieldHint}>kg</span>
      </div>
    </div>
  );

  return (
    <Modal title="Sesuaikan Stok" subtitle={ingredient.name} onClose={onClose}>
      <div className={styles.modalBody}>
        <div className={styles.statLine}>
          Stok saat ini
          <strong>{ingredient.stockKg.toFixed(2)} kg</strong>
        </div>

        <div className={styles.segmented} role="tablist">
          {(["delta", "direct"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={clsx(styles.segmentedItem, tab === t && styles.segmentedItemActive)}
              onClick={() => setTab(t)}
            >
              {t === "delta" ? "Tambah / kurangi" : "Set langsung"}
            </button>
          ))}
        </div>

        {tab === "delta" ? (
          <>
            <div className={styles.segmented}>
              <button
                type="button"
                className={clsx(styles.segmentedItem, mode === "add" && styles.segmentedItemActive)}
                aria-pressed={mode === "add"}
                onClick={() => setMode("add")}
              >
                <Plus aria-hidden="true" />
                Tambah stok
              </button>
              <button
                type="button"
                className={clsx(styles.segmentedItem, mode === "subtract" && styles.segmentedItemActive)}
                aria-pressed={mode === "subtract"}
                onClick={() => setMode("subtract")}
              >
                <Minus aria-hidden="true" />
                Kurangi stok
              </button>
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Jumlah cepat</span>
              <div className={styles.chipRow}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className={clsx(styles.chip, parseFloat(deltaInput) === amt && styles.chipActive)}
                    onClick={() => setDeltaInput(String(amt))}
                  >
                    {amt} kg
                  </button>
                ))}
              </div>
            </div>

            {stepper(deltaInput, setDeltaInput, "Jumlah kustom")}
          </>
        ) : (
          stepper(directInput, setDirectInput, "Stok akhir")
        )}

        <div className={styles.statLine}>
          Stok setelah perubahan
          <strong className={previewClass}>
            {isNaN(previewStock) ? "-" : Math.max(0, previewStock).toFixed(2)} kg
          </strong>
        </div>

        {error && <div className={styles.notice} role="alert" style={{ margin: 0 }}>{error}</div>}
      </div>

      <div className={styles.modalFooter}>
        <button type="button" className={styles.tabButton} onClick={onClose} disabled={isSubmitting}>
          Batal
        </button>
        <button type="button" className={styles.actionCard} onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </Modal>
  );
}

// ── Modal Import CSV/Excel ─────────────────────────────────────────────────────
function ImportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { createdCount: number; updatedCount: number; notFoundCount?: number; invalidCount: number; totalRows: number };
    results: ImportResultRow[];
  } | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Download template format Excel/CSV
  function downloadTemplate(ext: "xlsx" | "csv" = "xlsx") {
    const templateData = [
      {
        "Nama Bahan Baku": "Beras Merah Organik",
        "Asal / Supplier Mitra": "Cianjur / Gapoktan Makmur",
        "Sisa Stok": 50,
        "Harga Acuan / KG": 22000,
      },
      {
        "Nama Bahan Baku": "Daging Ayam Fillet",
        "Asal / Supplier Mitra": "Bogor / PT Ternak Berkah",
        "Sisa Stok": 30,
        "Harga Acuan / KG": 46000,
      },
      {
        "Nama Bahan Baku": "Wortel Segar Brastagi",
        "Asal / Supplier Mitra": "Brastagi / Kelompok Tani Sejahtera",
        "Sisa Stok": 15.5,
        "Harga Acuan / KG": 13500,
      },
      {
        "Nama Bahan Baku": "Minyak Kelapa Murni",
        "Asal / Supplier Mitra": "Manado / CV Kelapa Nusantara",
        "Sisa Stok": 20,
        "Harga Acuan / KG": 35000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bahan Baku");
    XLSX.writeFile(wb, `template_impor_bahan_baku.${ext}`);
  }

  function parseFile(file: File) {
    setParseError("");
    setParsedRows(null);
    setImportResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!json || json.length === 0) {
          setParseError("File tidak berisi data. Pastikan ada baris data di sheet pertama.");
          return;
        }

        const sample = json[0];
        const keys = Object.keys(sample);

        // Cari kolom nama bahan baku
        const nameKey = keys.find((k) =>
          /^(nama(\s*bahan(\s*baku)?)?|name|bahan|ingredient)/i.test(k.trim())
        );

        // Cari kolom sisa stok
        const stockKey = keys.find((k) =>
          /^(sisa\s*stok(\s*\(?kg\)?)?|stok(\s*\(?kg\)?)?|stock(\s*\(?kg\)?)?|qty|jumlah|stockkg)/i.test(k.trim())
        );

        // Cari kolom harga acuan
        const priceKey = keys.find((k) =>
          /^(harga\s*acuan(\s*[\/\-]?\s*kg)?|harga(\s*[\/\-]?\s*kg)?|harga\s*per\s*kg|price(\s*per\s*kg)?|priceperkg|harga)/i.test(k.trim())
        );

        // Cari kolom asal & supplier (bisa kolom gabungan atau terpisah)
        const combinedSupplierOriginKey = keys.find((k) =>
          /^(asal\s*[\/\-]\s*supplier|supplier\s*[\/\-]\s*asal|asal\s*supplier|supplier\s*mitra)/i.test(k.trim())
        );
        const originKey = keys.find((k) =>
          /^(asal(\s*daerah|\s*lokasi|\s*wilayah)?|origin|lokasi)/i.test(k.trim())
        );
        const supplierKey = keys.find((k) =>
          /^(supplier(\s*mitra)?|mitra|pemasok|petani)/i.test(k.trim())
        );

        if (!nameKey || !stockKey) {
          setParseError(
            `Kolom minimal tidak ditemukan. Pastikan file memiliki kolom "Nama Bahan Baku" dan "Sisa Stok". Kolom yang terdeteksi: ${keys.join(", ")}`
          );
          return;
        }

        const rows: ImportRow[] = json.map((r) => {
          const rawName = String(r[nameKey] || "").trim();
          const rawStock = parseFloat(String(r[stockKey]).replace(",", ".")) || 0;
          const rawPrice = priceKey
            ? parseFloat(String(r[priceKey]).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0
            : 0;

          let origin = "-";
          let supplierName = "-";

          if (combinedSupplierOriginKey && r[combinedSupplierOriginKey]) {
            const combinedVal = String(r[combinedSupplierOriginKey]).trim();
            if (combinedVal.includes("/")) {
              const parts = combinedVal.split("/").map((p) => p.trim());
              origin = parts[0] || "-";
              supplierName = parts[1] || parts[0] || "-";
            } else {
              supplierName = combinedVal || "-";
            }
          } else {
            if (originKey && r[originKey]) origin = String(r[originKey]).trim() || "-";
            if (supplierKey && r[supplierKey]) supplierName = String(r[supplierKey]).trim() || "-";
          }

          return {
            name: rawName,
            origin,
            supplierName,
            stockKg: rawStock,
            pricePerKg: rawPrice,
          };
        }).filter((r) => r.name !== "");

        if (rows.length === 0) {
          setParseError("Tidak ada baris data valid yang ditemukan dalam file.");
          return;
        }

        setParsedRows(rows);
      } catch {
        setParseError("Gagal membaca file. Pastikan format file valid (.xlsx, .xls, atau .csv).");
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    if (!parsedRows || parsedRows.length === 0) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/ingredients/bulk-stock-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows: parsedRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses impor.");
      setImportResult(json);
      onSuccess();
    } catch (err: any) {
      setSubmitError(err.message || "Terjadi kesalahan saat mengimpor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusTag: Record<string, { label: string; className: string }> = {
    created: { label: "Ditambahkan", className: styles.tagGreen },
    updated: { label: "Diperbarui", className: styles.tagBlue },
    not_found: { label: "Tidak ditemukan", className: styles.tagRed },
    invalid: { label: "Tidak valid", className: styles.tagAmber },
  };

  return (
    <Modal
      title="Impor Bahan Baku"
      subtitle="Unggah CSV atau Excel untuk menambah dan memperbarui bahan baku sekaligus"
      wide
      onClose={onClose}
    >
      {!importResult ? (
        <>
          <div className={styles.modalBody}>
            <div className={clsx(styles.notice, styles.noticeInfo)} style={{ margin: 0, flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", width: "100%" }}>
                <p className={styles.noticeTitle}>Format file</p>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button type="button" className={styles.tabButton} onClick={() => downloadTemplate("xlsx")}>
                    Template .xlsx
                  </button>
                  <button type="button" className={styles.tabButton} onClick={() => downloadTemplate("csv")}>
                    Template .csv
                  </button>
                </div>
              </div>
              <p style={{ margin: 0 }}>
                Kolom wajib: <strong>Nama Bahan Baku</strong>, <strong>Asal / Supplier Mitra</strong>, <strong>Sisa Stok</strong>, <strong>Harga Acuan / KG</strong>.
                Bahan yang sudah ada diperbarui, yang belum ada ditambahkan.
              </p>
            </div>

            <div
              className={clsx(styles.dropzone, isDragging && styles.dropzoneActive)}
              role="button"
              tabIndex={0}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            >
              <Upload aria-hidden="true" />
              <strong>{isDragging ? "Lepaskan file di sini" : "Seret file ke sini, atau klik untuk memilih"}</strong>
              <span className={styles.fieldHint}>.xlsx, .xls, atau .csv</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
              />
            </div>

            {parseError && <div className={styles.notice} role="alert" style={{ margin: 0 }}>{parseError}</div>}

            {parsedRows && (
              <>
                <p className={styles.fieldHint}>
                  <strong>{fileName}</strong>: {parsedRows.length} baris siap diimpor.
                </p>
                <div className={styles.miniTableWrap}>
                  <table className={styles.miniTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nama</th>
                        <th>Supplier / asal</th>
                        <th className={styles.alignRight}>Stok</th>
                        <th className={styles.alignRight}>Harga / kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className={styles.tableKey}>{r.name}</td>
                          <td>
                            {r.supplierName !== "-" ? r.supplierName : "-"}
                            {r.origin !== "-" && <span className={styles.cellSub}>{r.origin}</span>}
                          </td>
                          <td className={styles.alignRight}>{r.stockKg.toFixed(2)} kg</td>
                          <td className={styles.alignRight}>{r.pricePerKg > 0 ? formatCurrency(r.pricePerKg) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {submitError && <div className={styles.notice} role="alert" style={{ margin: 0 }}>{submitError}</div>}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.tabButton} onClick={onClose}>
              Batal
            </button>
            <button type="button" className={styles.actionCard} onClick={handleImport} disabled={!parsedRows || isSubmitting}>
              <FileUp aria-hidden="true" />
              {isSubmitting ? "Mengimpor..." : parsedRows ? `Impor ${parsedRows.length} bahan baku` : "Impor"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.modalBody}>
            <div className={styles.statGrid}>
              <div className={styles.statBox}>
                <strong className={styles.textGreen}>{importResult.summary.createdCount || 0}</strong>
                <span>Ditambahkan</span>
              </div>
              <div className={styles.statBox}>
                <strong>{importResult.summary.updatedCount || 0}</strong>
                <span>Diperbarui</span>
              </div>
              <div className={styles.statBox}>
                <strong className={styles.textAmber}>{importResult.summary.invalidCount || 0}</strong>
                <span>Tidak valid</span>
              </div>
            </div>

            <div className={styles.miniTableWrap}>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.results.map((r, i) => (
                    <tr key={i}>
                      <td className={styles.tableKey}>{r.name}</td>
                      <td>
                        <span className={clsx(styles.tag, statusTag[r.status]?.className)}>
                          {statusTag[r.status]?.label ?? r.status}
                        </span>
                      </td>
                      <td>{r.message || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.actionCard} onClick={onClose}>
              Selesai
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Komponen Utama ─────────────────────────────────────────────────────────────
export function AdminIngredientsTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [adjustIngredient, setAdjustIngredient] = useState<Ingredient | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: "default" | "destructive" | "admin";
    hideCancel?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const fetchIngredients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/ingredients", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data bahan baku");
      const json = await res.json();
      setIngredients(json.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);

  // Handle delete ingredient
  function handleDeleteIngredient(item: Ingredient) {
    setCustomAlert({
      title: "Hapus Bahan Baku",
      message: `Apakah Anda yakin ingin menghapus bahan baku "${item.name}"? Bahan baku yang sedang digunakan dalam resep atau pesanan mitra tidak dapat dihapus.`,
      confirmLabel: "Ya, Hapus",
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/ingredients/${item.id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const json = await res.json();
          if (!res.ok) {
            setCustomAlert({
              title: "Gagal Menghapus",
              message: json.error || "Terjadi kesalahan saat menghapus bahan baku.",
              confirmLabel: "Tutup",
              variant: "destructive",
              hideCancel: true,
              onConfirm: () => {},
            });
            return;
          }
          await fetchIngredients();
        } catch (err: any) {
          setCustomAlert({
            title: "Gagal Menghapus",
            message: err.message || "Terjadi kesalahan koneksi.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => {},
          });
        }
      },
    });
  }

  // Filter & search
  const filtered = ingredients.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      item.origin.toLowerCase().includes(search.toLowerCase());
    const matchStock =
      stockFilter === "all" ? true :
      stockFilter === "habis" ? item.stockKg <= 0 :
      stockFilter === "menipis" ? item.stockKg > 0 && item.stockKg < LOW_STOCK_KG :
      stockFilter === "aman" ? item.stockKg >= LOW_STOCK_KG : true;
    return matchSearch && matchStock;
  });

  const emptyStockCount = ingredients.filter((i) => i.stockKg <= 0).length;
  const lowStockCount = ingredients.filter((i) => i.stockKg > 0 && i.stockKg < LOW_STOCK_KG).length;

  return (
    <div>
      <PageHeader
        title="Stok Bahan Baku"
        subtitle="Kelola katalog, sesuaikan stok, atau impor dari CSV/Excel."
        actions={
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className={styles.tabButton} onClick={() => setShowImport(true)}>
              <Upload aria-hidden="true" />
              Impor
            </button>
            <button type="button" className={styles.actionCard} onClick={() => setShowAddModal(true)}>
              <Plus aria-hidden="true" />
              Tambah Bahan Baku
            </button>
          </div>
        }
      />

      {(emptyStockCount > 0 || lowStockCount > 0) && (
        <div className={clsx(styles.notice, emptyStockCount === 0 && styles.noticeWarn)}>
          {emptyStockCount > 0 && <span>{emptyStockCount} bahan habis. </span>}
          {lowStockCount > 0 && <span>{lowStockCount} bahan di bawah {LOW_STOCK_KG} kg.</span>}
        </div>
      )}

      {error && <div className={styles.notice} role="alert">{error}</div>}

      <div className={styles.toolbar}>
        <input
          className={styles.input}
          type="search"
          aria-label="Cari bahan baku"
          placeholder="Cari nama, supplier, atau asal"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          aria-label="Filter stok"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="all">Semua stok</option>
          <option value="habis">Habis (0 kg)</option>
          <option value="menipis">Menipis (&lt; {LOW_STOCK_KG} kg)</option>
          <option value="aman">Aman (≥ {LOW_STOCK_KG} kg)</option>
        </select>
        {(search || stockFilter !== "all") && (
          <button type="button" className={styles.tabButton} onClick={() => { setSearch(""); setStockFilter("all"); }}>
            Reset
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>Memuat data bahan baku...</div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bahan baku</th>
                <th>Supplier / asal</th>
                <th>Stok</th>
                <th>Harga / kg</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={styles.tableKey}>{item.name}</span>
                    {item.isAllergen && (
                      <span className={clsx(styles.tag, styles.tagAmber)} style={{ marginLeft: "0.4rem" }}>Alergen</span>
                    )}
                  </td>
                  <td>
                    {item.supplierName || "-"}
                    <span className={styles.cellSub}>{item.origin || "-"}</span>
                  </td>
                  <td><StockBadge stockKg={item.stockKg} /></td>
                  <td className={styles.nowrap}>{item.pricePerKg > 0 ? formatCurrency(item.pricePerKg) : "-"}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.tabButton} onClick={() => setAdjustIngredient(item)}>
                        <Scale aria-hidden="true" />
                        Stok
                      </button>
                      <button type="button" className={styles.tabButton} onClick={() => setEditingIngredient(item)}>
                        <Pencil aria-hidden="true" />
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={clsx(styles.tabButton, styles.dangerButton)}
                        aria-label={`Hapus ${item.name}`}
                        onClick={() => handleDeleteIngredient(item)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    {search || stockFilter !== "all"
                      ? "Tidak ada bahan baku yang cocok dengan filter."
                      : "Belum ada bahan baku."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.footNote}>
        {filtered.length} dari {ingredients.length} bahan baku
      </p>

      {showAddModal && (
        <IngredientFormModal onClose={() => setShowAddModal(false)} onSuccess={fetchIngredients} />
      )}

      {editingIngredient && (
        <IngredientFormModal
          initialData={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSuccess={fetchIngredients}
        />
      )}

      {adjustIngredient && (
        <StockAdjustModal
          ingredient={adjustIngredient}
          onClose={() => setAdjustIngredient(null)}
          onSuccess={fetchIngredients}
        />
      )}

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onSuccess={fetchIngredients} />
      )}

      <ConfirmDialog
        isOpen={Boolean(customAlert)}
        title={customAlert?.title ?? ""}
        message={customAlert?.message ?? ""}
        confirmLabel={customAlert?.confirmLabel ?? "OK"}
        variant={customAlert?.variant}
        hideCancel={customAlert?.hideCancel}
        onCancel={() => setCustomAlert(null)}
        onConfirm={async () => {
          if (customAlert?.onConfirm) await customAlert.onConfirm();
          setCustomAlert(null);
        }}
      />
    </div>
  );
}
