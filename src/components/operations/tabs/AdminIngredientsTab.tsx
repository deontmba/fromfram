"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
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

// ── Komponen badge stok ───────────────────────────────────────────────────────
function StockBadge({ stockKg, minStock }: { stockKg: number; minStock?: number }) {
  const threshold = minStock ?? 5;
  if (stockKg <= 0) {
    return (
      <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "999px", padding: "3px 12px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
        Habis (0 kg)
      </span>
    );
  }
  if (stockKg < threshold) {
    return (
      <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: "999px", padding: "3px 12px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
        {stockKg.toFixed(1)} kg (Menipis)
      </span>
    );
  }
  return (
    <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: "999px", padding: "3px 12px", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {stockKg.toFixed(1)} kg (Aman)
    </span>
  );
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

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
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#ffffff", borderRadius: "20px", width: "min(560px, 100%)",
          boxShadow: "0 32px 64px rgba(15, 23, 42, 0.22)",
          overflow: "hidden", animation: "liftIn 260ms ease",
          maxHeight: "92vh", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #edf1f5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isEdit
            ? "linear-gradient(135deg, #e12533, #ff575f)"
            : "linear-gradient(135deg, #15803d, #16a34a)",
          color: "#fff", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}>
              {isEdit ? "✏️ Edit Bahan Baku" : "➕ Tambah Bahan Baku Baru"}
            </p>
            <p style={{ margin: "2px 0 0", opacity: 0.9, fontSize: "0.82rem" }}>
              {isEdit
                ? `Perbarui data katalog untuk "${initialData?.name}"`
                : "Input detail bahan baku untuk katalog & persediaan"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px", width: 32, height: 32, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
          {/* 1. Nama Bahan Baku */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
              Nama Bahan Baku <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beras Merah Organik, Daging Ayam Fillet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%", border: "1.5px solid #d9e1ec", borderRadius: "10px",
                padding: "0.65rem 0.85rem", fontSize: "0.92rem", outline: "none",
                boxSizing: "border-box", transition: "border-color 150ms",
              }}
            />
          </div>

          {/* 2. Asal / Supplier Mitra */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.85rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
              Asal / Supplier Mitra
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
                  Asal Daerah / Lokasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Cianjur / Malang"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  style={{
                    width: "100%", border: "1.5px solid #d9e1ec", borderRadius: "8px",
                    padding: "0.55rem 0.75rem", fontSize: "0.86rem", outline: "none",
                    boxSizing: "border-box", background: "#fff",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem" }}>
                  Supplier / Petani Mitra
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gapoktan Makmur"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  style={{
                    width: "100%", border: "1.5px solid #d9e1ec", borderRadius: "8px",
                    padding: "0.55rem 0.75rem", fontSize: "0.86rem", outline: "none",
                    boxSizing: "border-box", background: "#fff",
                  }}
                />
              </div>
            </div>
            <p style={{ margin: "0.45rem 0 0", fontSize: "0.73rem", color: "#64748b" }}>
              💡 Tampilan kolom: <strong>{supplierName.trim() || "-"}</strong> &nbsp;•&nbsp; 📍 {origin.trim() || "-"}
            </p>
          </div>

          {/* 3. Sisa Stok & Harga Acuan / KG */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                Sisa Stok (kg) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={stockKg}
                  onChange={(e) => setStockKg(e.target.value)}
                  style={{
                    width: "100%", border: "1.5px solid #d9e1ec", borderRadius: "10px",
                    padding: "0.65rem 2.5rem 0.65rem 0.85rem", fontSize: "0.95rem", fontWeight: 700,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <span style={{ position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.82rem", fontWeight: 700 }}>
                  kg
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                Harga Acuan / KG (Rp) <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>
                  Rp
                </span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  required
                  placeholder="0"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  style={{
                    width: "100%", border: "1.5px solid #d9e1ec", borderRadius: "10px",
                    padding: "0.65rem 0.85rem 0.65rem 2.4rem", fontSize: "0.95rem", fontWeight: 700,
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              {parseFloat(pricePerKg) > 0 && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                  {formatCurrency(parseFloat(pricePerKg))} / kg
                </p>
              )}
            </div>
          </div>

          {/* 4. Alergen Checkbox */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px", padding: "0.75rem 0.9rem",
          }}>
            <input
              type="checkbox"
              id="modalIsAllergen"
              checked={isAllergen}
              onChange={(e) => setIsAllergen(e.target.checked)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
            <label htmlFor="modalIsAllergen" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e", cursor: "pointer" }}>
              ⚠️ Mengandung Alergen Pangan (seafood, kacang, susu, gluten, dll)
            </label>
          </div>

          {error && (
            <div style={{ padding: "0.65rem 0.85rem", background: "#fee2e2", borderRadius: "8px", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Tombol Aksi */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1, border: "none", borderRadius: "10px",
                background: isEdit
                  ? "linear-gradient(135deg, #e12533, #ff575f)"
                  : "linear-gradient(135deg, #15803d, #16a34a)",
                color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                padding: "0.75rem", cursor: "pointer",
                opacity: isSubmitting ? 0.7 : 1, transition: "all 160ms ease",
              }}
            >
              {isSubmitting ? "Menyimpan..." : isEdit ? "💾 Simpan Perubahan" : "➕ Tambah Bahan Baku"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                border: "1.5px solid #e2e8f0", borderRadius: "10px",
                background: "#fafafa", color: "#475569", fontWeight: 700,
                fontSize: "0.9rem", padding: "0.75rem 1.25rem", cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#ffffff", borderRadius: "20px", width: "min(520px, 100%)",
          boxShadow: "0 32px 64px rgba(15, 23, 42, 0.22)",
          overflow: "hidden", animation: "liftIn 260ms ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #edf1f5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #e12533, #ff575f)",
          color: "#fff",
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}>✏️ Edit Stok Presisi</p>
            <p style={{ margin: "2px 0 0", opacity: 0.88, fontSize: "0.82rem" }}>{ingredient.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px", width: 32, height: 32, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        {/* Stok saat ini */}
        <div style={{ padding: "1rem 1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", borderRadius: "12px", padding: "0.75rem 1rem", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>Stok Saat Ini</span>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}>{ingredient.stockKg.toFixed(2)} kg</span>
          </div>
        </div>

        {/* Tab selector */}
        <div style={{ padding: "1rem 1.5rem 0" }}>
          <div style={{ display: "flex", gap: "0.4rem", background: "#f1f5f9", borderRadius: "10px", padding: "3px" }}>
            {(["delta", "direct"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, border: "none", borderRadius: "8px", padding: "0.55rem",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
                  background: tab === t ? "#ffffff" : "transparent",
                  color: tab === t ? "#e12533" : "#64748b",
                  boxShadow: tab === t ? "0 2px 6px rgba(15,23,42,0.1)" : "none",
                  transition: "all 180ms ease",
                }}
              >
                {t === "delta" ? "➕/➖ Tambah / Kurang" : "🎯 Set Langsung"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "1rem 1.5rem" }}>
          {tab === "delta" ? (
            <>
              {/* Mode toggle */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <button
                  onClick={() => setMode("add")}
                  style={{
                    flex: 1, border: `2px solid ${mode === "add" ? "#16a34a" : "#e2e8f0"}`,
                    background: mode === "add" ? "#f0fdf4" : "#fafafa",
                    color: mode === "add" ? "#15803d" : "#64748b",
                    borderRadius: "10px", padding: "0.6rem", fontWeight: 700, fontSize: "0.88rem",
                    cursor: "pointer", transition: "all 160ms ease",
                  }}
                >
                  ➕ Tambah Stok
                </button>
                <button
                  onClick={() => setMode("subtract")}
                  style={{
                    flex: 1, border: `2px solid ${mode === "subtract" ? "#dc2626" : "#e2e8f0"}`,
                    background: mode === "subtract" ? "#fff5f5" : "#fafafa",
                    color: mode === "subtract" ? "#dc2626" : "#64748b",
                    borderRadius: "10px", padding: "0.6rem", fontWeight: 700, fontSize: "0.88rem",
                    cursor: "pointer", transition: "all 160ms ease",
                  }}
                >
                  ➖ Kurangi Stok
                </button>
              </div>

              {/* Quick select amounts */}
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>Jumlah Cepat (kg)</p>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setDeltaInput(String(amt))}
                    style={{
                      border: `1.5px solid ${parseFloat(deltaInput) === amt ? "#e12533" : "#e2e8f0"}`,
                      background: parseFloat(deltaInput) === amt ? "#fff0f1" : "#fafafa",
                      color: parseFloat(deltaInput) === amt ? "#e12533" : "#334155",
                      borderRadius: "8px", padding: "0.35rem 0.7rem",
                      fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                      transition: "all 140ms ease",
                    }}
                  >
                    {amt} kg
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>
                Atau masukkan jumlah kustom (kg)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => setDeltaInput(String(Math.max(0, parseFloat(deltaInput || "0") - 0.5)))}
                  style={{ width: 36, height: 36, border: "1.5px solid #e2e8f0", background: "#f1f5f9", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >−</button>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(e.target.value)}
                  style={{ flex: 1, border: "1.5px solid #d9e1ec", borderRadius: "10px", padding: "0.6rem 0.75rem", fontSize: "1rem", fontWeight: 700, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => setDeltaInput(String(parseFloat(deltaInput || "0") + 0.5))}
                  style={{ width: 36, height: 36, border: "1.5px solid #e2e8f0", background: "#f1f5f9", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >+</button>
                <span style={{ color: "#64748b", fontWeight: 600, fontSize: "0.85rem" }}>kg</span>
              </div>
            </>
          ) : (
            <>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>
                Set stok akhir langsung (kg)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => setDirectInput(String(Math.max(0, parseFloat(directInput || "0") - 0.5)))}
                  style={{ width: 36, height: 36, border: "1.5px solid #e2e8f0", background: "#f1f5f9", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >−</button>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  style={{ flex: 1, border: "1.5px solid #d9e1ec", borderRadius: "10px", padding: "0.6rem 0.75rem", fontSize: "1rem", fontWeight: 700, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => setDirectInput(String(parseFloat(directInput || "0") + 0.5))}
                  style={{ width: 36, height: 36, border: "1.5px solid #e2e8f0", background: "#f1f5f9", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >+</button>
                <span style={{ color: "#64748b", fontWeight: 600, fontSize: "0.85rem" }}>kg</span>
              </div>
            </>
          )}

          {/* Preview */}
          <div style={{
            marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "12px",
            background: previewStock <= 0 ? "#fff5f5" : previewStock < 5 ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${previewStock <= 0 ? "#fca5a5" : previewStock < 5 ? "#fcd34d" : "#86efac"}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>Stok Setelah Perubahan</span>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: previewStock <= 0 ? "#dc2626" : previewStock < 5 ? "#d97706" : "#15803d" }}>
              {isNaN(previewStock) ? "—" : Math.max(0, previewStock).toFixed(2)} kg
            </span>
          </div>

          {error && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", background: "#fee2e2", borderRadius: "8px", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                flex: 1, border: "none", borderRadius: "10px",
                background: "linear-gradient(135deg, #e12533, #ff575f)",
                color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                padding: "0.75rem", cursor: "pointer",
                opacity: isSubmitting ? 0.7 : 1, transition: "all 160ms ease",
              }}
            >
              {isSubmitting ? "Menyimpan..." : "💾 Simpan Perubahan"}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                border: "1.5px solid #e2e8f0", borderRadius: "10px",
                background: "#fafafa", color: "#475569", fontWeight: 700,
                fontSize: "0.9rem", padding: "0.75rem 1.25rem", cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
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
      } catch (err: any) {
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

  const statusColor: Record<string, string> = {
    created: "#15803d",
    updated: "#1d4ed8",
    not_found: "#dc2626",
    invalid: "#d97706",
  };
  const statusLabel: Record<string, string> = {
    created: "✨ Ditambahkan Baru",
    updated: "🔄 Diperbarui",
    not_found: "❌ Tidak Ditemukan",
    invalid: "⚠️ Data Tidak Valid",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
        padding: "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#ffffff", borderRadius: "20px", width: "min(680px, 100%)",
          maxHeight: "92vh",
          boxShadow: "0 32px 64px rgba(15, 23, 42, 0.22)",
          display: "flex", flexDirection: "column",
          animation: "liftIn 260ms ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid #edf1f5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #1d4ed8, #4f8df8)",
          color: "#fff", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.05rem" }}>📂 Impor Bahan Baku dari File</p>
            <p style={{ margin: "2px 0 0", opacity: 0.88, fontSize: "0.82rem" }}>
              Upload CSV atau Excel untuk menambah dan memperbarui bahan baku secara massal
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px", width: 32, height: 32, cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >✕</button>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {!importResult ? (
            <>
              {/* Format panduan & template download */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "0.9rem 1rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <p style={{ margin: 0, fontWeight: 700, color: "#1d4ed8", fontSize: "0.86rem" }}>
                    📋 Format File (Sama dengan Input Manual)
                  </p>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => downloadTemplate("xlsx")}
                      style={{
                        background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px",
                        padding: "0.3rem 0.65rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      📥 Unduh Template Excel (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTemplate("csv")}
                      style={{
                        background: "#fff", color: "#1d4ed8", border: "1px solid #1d4ed8", borderRadius: "6px",
                        padding: "0.3rem 0.65rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      📥 CSV
                    </button>
                  </div>
                </div>

                <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#1e40af" }}>
                  File harus berisi 4 kolom utama: <strong>Nama Bahan Baku</strong>, <strong>Asal / Supplier Mitra</strong>, <strong>Sisa Stok</strong>, dan <strong>Harga Acuan / KG</strong>.
                </p>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: "0.76rem", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "#1d4ed8", color: "#fff" }}>
                        <th style={{ padding: "4px 8px", textAlign: "left", borderRadius: "4px 0 0 4px" }}>Nama Bahan Baku</th>
                        <th style={{ padding: "4px 8px", textAlign: "left" }}>Asal / Supplier Mitra</th>
                        <th style={{ padding: "4px 8px", textAlign: "right" }}>Sisa Stok</th>
                        <th style={{ padding: "4px 8px", textAlign: "right", borderRadius: "0 4px 4px 0" }}>Harga Acuan / KG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Beras Merah Organik", "Cianjur / Gapoktan Makmur", "50", "22.000"],
                        ["Daging Ayam Fillet", "Bogor / PT Ternak Berkah", "30", "46.000"],
                        ["Wortel Brastagi", "Brastagi / Tani Sejahtera", "15.5", "13.500"],
                      ].map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#f0f7ff" : "#fff" }}>
                          <td style={{ padding: "4px 8px", fontWeight: 600 }}>{r[0]}</td>
                          <td style={{ padding: "4px 8px" }}>{r[1]}</td>
                          <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700 }}>{r[2]} kg</td>
                          <td style={{ padding: "4px 8px", textAlign: "right" }}>Rp {r[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.73rem", color: "#475569" }}>
                  💡 Jika bahan baku sudah ada di sistem, stok dan data akan otomatis diperbarui. Jika belum ada, bahan baku baru akan langsung ditambahkan ke katalog.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "#1d4ed8" : "#cbd5e1"}`,
                  borderRadius: "14px",
                  background: isDragging ? "#eff6ff" : "#fafafa",
                  padding: "1.75rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "2.3rem", marginBottom: "0.4rem" }}>📁</div>
                <p style={{ margin: "0 0 0.2rem", fontWeight: 700, color: isDragging ? "#1d4ed8" : "#374151", fontSize: "0.92rem" }}>
                  {isDragging ? "Lepaskan file di sini..." : "Seret & lepas file, atau klik untuk memilih file"}
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                  Format didukung: .xlsx, .xls, .csv
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
                />
              </div>

              {parseError && (
                <div style={{ padding: "0.75rem 1rem", background: "#fee2e2", borderRadius: "10px", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600, marginBottom: "1rem" }}>
                  ⚠️ {parseError}
                </div>
              )}

              {parsedRows && (
                <>
                  <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", borderRadius: "10px", border: "1px solid #86efac", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>✅</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: "0.86rem" }}>
                        File siap diimpor: {fileName}
                      </p>
                      <p style={{ margin: 0, color: "#16a34a", fontSize: "0.76rem" }}>
                        {parsedRows.length} baris data bahan baku terdeteksi.
                      </p>
                    </div>
                  </div>

                  {/* Preview tabel */}
                  <div style={{ borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "auto", maxHeight: "200px", marginBottom: "1rem" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead>
                        <tr style={{ background: "#1d4ed8", color: "#fff", position: "sticky", top: 0 }}>
                          <th style={{ padding: "6px 10px", textAlign: "left" }}>#</th>
                          <th style={{ padding: "6px 10px", textAlign: "left" }}>Nama Bahan Baku</th>
                          <th style={{ padding: "6px 10px", textAlign: "left" }}>Asal / Supplier Mitra</th>
                          <th style={{ padding: "6px 10px", textAlign: "right" }}>Sisa Stok</th>
                          <th style={{ padding: "6px 10px", textAlign: "right" }}>Harga Acuan / KG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                            <td style={{ padding: "5px 10px", color: "#94a3b8" }}>{i + 1}</td>
                            <td style={{ padding: "5px 10px", fontWeight: 600 }}>{r.name}</td>
                            <td style={{ padding: "5px 10px" }}>
                              <span style={{ fontWeight: 600, color: "#334155" }}>{r.supplierName !== "-" ? r.supplierName : ""}</span>
                              {r.origin !== "-" && <span style={{ color: "#64748b", fontSize: "0.75rem", marginLeft: "0.3rem" }}>📍 {r.origin}</span>}
                              {r.supplierName === "-" && r.origin === "-" && <span style={{ color: "#cbd5e1" }}>-</span>}
                            </td>
                            <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700 }}>{r.stockKg.toFixed(2)} kg</td>
                            <td style={{ padding: "5px 10px", textAlign: "right" }}>{r.pricePerKg > 0 ? formatCurrency(r.pricePerKg) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {submitError && (
                <div style={{ padding: "0.6rem 0.8rem", background: "#fee2e2", borderRadius: "8px", color: "#dc2626", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                  {submitError}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleImport}
                  disabled={!parsedRows || isSubmitting}
                  style={{
                    flex: 1, border: "none", borderRadius: "10px",
                    background: parsedRows ? "linear-gradient(135deg, #1d4ed8, #4f8df8)" : "#d1d5db",
                    color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                    padding: "0.75rem", cursor: parsedRows ? "pointer" : "not-allowed",
                    opacity: isSubmitting ? 0.7 : 1, transition: "all 160ms ease",
                  }}
                >
                  {isSubmitting ? "Mengimpor Data..." : `🚀 Impor ${parsedRows ? parsedRows.length + " Bahan Baku" : ""}`}
                </button>
                <button
                  onClick={onClose}
                  style={{ border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#fafafa", color: "#475569", fontWeight: 700, fontSize: "0.9rem", padding: "0.75rem 1.25rem", cursor: "pointer" }}
                >
                  Batal
                </button>
              </div>
            </>
          ) : (
            /* Hasil import */
            <>
              {/* Ringkasan */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "1rem" }}>
                {[
                  { label: "Ditambahkan (Baru)", value: importResult.summary.createdCount || 0, color: "#15803d", bg: "#f0fdf4", border: "#86efac" },
                  { label: "Diperbarui (Stok/Info)", value: importResult.summary.updatedCount || 0, color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
                  { label: "Data Tidak Valid", value: importResult.summary.invalidCount || 0, color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: "10px", padding: "0.75rem", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: stat.color }}>{stat.value}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: stat.color }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Detail hasil */}
              <div style={{ borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "auto", maxHeight: "260px", marginBottom: "1rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#374151", color: "#fff", position: "sticky", top: 0 }}>
                      <th style={{ padding: "6px 12px", textAlign: "left" }}>Nama Bahan Baku</th>
                      <th style={{ padding: "6px 12px", textAlign: "left" }}>Status</th>
                      <th style={{ padding: "6px 12px", textAlign: "left" }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.results.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "#f9fafb" : "#fff" }}>
                        <td style={{ padding: "5px 12px", fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: "5px 12px", color: statusColor[r.status] || "#334155", fontWeight: 700, fontSize: "0.78rem" }}>
                          {statusLabel[r.status] || r.status}
                        </td>
                        <td style={{ padding: "5px 12px", color: "#64748b", fontSize: "0.75rem" }}>{r.message || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={onClose}
                style={{ width: "100%", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #1d4ed8, #4f8df8)", color: "#fff", fontWeight: 700, fontSize: "0.9rem", padding: "0.75rem", cursor: "pointer" }}
              >
                ✅ Selesai
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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
      stockFilter === "menipis" ? item.stockKg > 0 && item.stockKg < 5 :
      stockFilter === "aman" ? item.stockKg >= 5 : true;
    return matchSearch && matchStock;
  });

  const emptyStockCount = ingredients.filter((i) => i.stockKg <= 0).length;
  const lowStockCount = ingredients.filter((i) => i.stockKg > 0 && i.stockKg < 5).length;

  return (
    <div>
      {/* ── Header ── */}
      <div
        className={styles.notice}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}
      >
        <div>
          <p className={styles.noticeTitle}>Manajemen &amp; Katalog Bahan Baku</p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", opacity: 0.85 }}>
            Kelola katalog bahan baku secara manual, edit stok secara presisi (+/- kg), atau impor massal dari file CSV/Excel.
            {emptyStockCount > 0 && <span style={{ color: "#dc2626", fontWeight: 700 }}> {emptyStockCount} bahan habis!</span>}
            {lowStockCount > 0 && emptyStockCount === 0 && <span style={{ color: "#d97706", fontWeight: 700 }}> {lowStockCount} bahan menipis.</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {/* Tombol Tambah Bahan Baku Manual (di samping Impor CSV/Excel) */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              background: "linear-gradient(135deg, #15803d, #16a34a)",
              color: "#fff", border: "none",
              fontWeight: 700, fontSize: "0.82rem", borderRadius: "10px",
              padding: "0.5rem 0.95rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
              boxShadow: "0 2px 8px rgba(22, 163, 74, 0.28)",
              transition: "all 160ms ease",
            }}
          >
            ➕ Tambah Bahan Baku
          </button>
          {/* Tombol Impor CSV/Excel */}
          <button
            type="button"
            onClick={() => setShowImport(true)}
            style={{
              border: "1.5px solid #1d4ed8", background: "#eff6ff", color: "#1d4ed8",
              fontWeight: 700, fontSize: "0.82rem", borderRadius: "10px",
              padding: "0.5rem 0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem",
              transition: "all 160ms ease",
            }}
          >
            📂 Impor CSV/Excel
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.notice} style={{ color: "#dc2626", background: "#fee2e2", marginTop: "0.75rem" }}>
          {error}
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div style={{ display: "flex", gap: "0.6rem", margin: "0.85rem 0", flexWrap: "wrap", alignItems: "center" }}>
        <input
          className={styles.input}
          style={{ flex: "1 1 220px" }}
          placeholder="🔍 Cari nama bahan, supplier, atau asal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.select}
          style={{ flex: "0 1 180px" }}
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="all">Semua Status Stok</option>
          <option value="habis">Habis (0 kg)</option>
          <option value="menipis">Menipis (&lt; 5 kg)</option>
          <option value="aman">Aman (≥ 5 kg)</option>
        </select>
        {(search || stockFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStockFilter("all"); }}
            style={{ border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#64748b", borderRadius: "8px", padding: "0.55rem 0.8rem", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem" }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* ── Tabel Bahan Baku ── */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          Memuat data bahan baku...
        </div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Bahan Baku</th>
                <th>Asal / Supplier Mitra</th>
                <th>Sisa Stok</th>
                <th>Harga Acuan / KG</th>
                <th>Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  style={{ background: item.stockKg <= 0 ? "#fff5f5" : item.stockKg < 5 ? "#fffbeb" : "white" }}
                >
                  <td>
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>{item.name}</span>
                    {item.isAllergen && (
                      <span style={{ marginLeft: "0.4rem", background: "#fef3c7", color: "#92400e", borderRadius: "4px", padding: "1px 6px", fontSize: "0.65rem", fontWeight: 700 }}>
                        ⚠ Alergen
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#334155", fontSize: "0.88rem" }}>{item.supplierName || "-"}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>📍 {item.origin || "-"}</div>
                  </td>
                  <td>
                    <StockBadge stockKg={item.stockKg} />
                  </td>
                  <td style={{ fontWeight: 700, color: "#475569" }}>
                    {item.pricePerKg > 0 ? formatCurrency(item.pricePerKg) : <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                      {/* Edit full details */}
                      <button
                        type="button"
                        title="Edit Informasi Lengkap Bahan Baku"
                        onClick={() => setEditingIngredient(item)}
                        style={{
                          background: "#f8fafc",
                          color: "#334155", border: "1.5px solid #cbd5e1", borderRadius: "8px",
                          padding: "0.35rem 0.65rem", cursor: "pointer",
                          fontWeight: 700, fontSize: "0.76rem",
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          transition: "all 160ms ease",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      {/* Quick stock adjustment */}
                      <button
                        type="button"
                        title="Sesuaikan Stok Presisi (+/- kg)"
                        onClick={() => setAdjustIngredient(item)}
                        style={{
                          background: "linear-gradient(135deg, #e12533, #ff575f)",
                          color: "#fff", border: "none", borderRadius: "8px",
                          padding: "0.35rem 0.75rem", cursor: "pointer",
                          fontWeight: 700, fontSize: "0.76rem",
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          boxShadow: "0 2px 6px rgba(225, 37, 51, 0.25)",
                          transition: "all 160ms ease",
                        }}
                      >
                        ⚖️ Stok
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        title="Hapus Bahan Baku dari Sistem"
                        onClick={() => handleDeleteIngredient(item)}
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px",
                          padding: "0.35rem 0.65rem", cursor: "pointer",
                          fontWeight: 700, fontSize: "0.76rem",
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          transition: "all 160ms ease",
                        }}
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2.5rem", color: "#94a3b8" }}>
                    {search || stockFilter !== "all"
                      ? "Tidak ada bahan baku yang cocok dengan filter."
                      : "Belum ada data bahan baku terdaftar."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "0.6rem", fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>
        Menampilkan {filtered.length} dari {ingredients.length} bahan baku terdaftar.
      </div>

      {/* ── Modals ── */}
      {/* Modal Tambah Bahan Baku Baru */}
      {showAddModal && (
        <IngredientFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchIngredients}
        />
      )}

      {/* Modal Edit Informasi Bahan Baku */}
      {editingIngredient && (
        <IngredientFormModal
          initialData={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSuccess={fetchIngredients}
        />
      )}

      {/* Modal Edit Stok Presisi */}
      {adjustIngredient && (
        <StockAdjustModal
          ingredient={adjustIngredient}
          onClose={() => setAdjustIngredient(null)}
          onSuccess={fetchIngredients}
        />
      )}

      {/* Modal Import CSV/Excel */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={fetchIngredients}
        />
      )}

      {/* Dialog Konfirmasi Hapus / Alert */}
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
