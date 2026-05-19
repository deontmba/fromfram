"use client";

import { useState } from "react";
import type { IngredientOption, IngredientFormData } from "../hooks/useNutritionistData";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import styles from "../../operations/role-portal-screen.module.css";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

const EMPTY_FORM: IngredientFormData = {
  id: "",
  name: "",
  origin: "",
  supplierName: "",
  isAllergen: false,
  stockKg: "",
  pricePerKg: "",
};

type Props = {
  ingredients: IngredientOption[];
  isLoading: boolean;
  onSave: (form: IngredientFormData) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
};

function StockBadge({ stockKg }: { stockKg: number }) {
  if (stockKg <= 0) {
    return (
      <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: "20px", padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
        Habis
      </span>
    );
  }
  if (stockKg < 5) {
    return (
      <span style={{ background: "#fef3c7", color: "#d97706", borderRadius: "20px", padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
        ⚠ Hampir Habis ({stockKg.toFixed(1)} kg)
      </span>
    );
  }
  return (
    <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: "20px", padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700 }}>
      {stockKg.toFixed(1)} kg
    </span>
  );
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function IngredientsTab({ ingredients, isLoading, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IngredientFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: "default" | "destructive" | "admin" | "nutritionist";
    hideCancel?: boolean;
    onConfirm: () => void;
  } | null>(null);

  function openAddForm() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(row: IngredientOption) {
    setForm({
      id: row.id,
      name: row.name,
      origin: row.origin,
      supplierName: row.supplierName,
      isAllergen: row.isAllergen,
      stockKg: String(row.stockKg),
      pricePerKg: String(row.pricePerKg),
    });
    setShowForm(true);
  }

  function cancelForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await onSave(form);
    setIsSubmitting(false);

    if (result.ok) {
      const savedName = form.name;
      cancelForm();
      setCustomAlert({
        title: "Bahan Baku Disimpan",
        message: `"${savedName}" berhasil disimpan.`,
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => {},
      });
    } else {
      setCustomAlert({
        title: "Gagal Menyimpan",
        message: result.error ?? "Terjadi kesalahan saat menyimpan data.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => {},
      });
    }
  }

  function handleDelete(id: string, name: string) {
    setCustomAlert({
      title: "Hapus Bahan Baku",
      message: `Apakah Anda yakin ingin menghapus "${name}"? Bahan baku yang sudah dipakai di resep tidak dapat dihapus.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "destructive",
      onConfirm: async () => {
        setIsSubmitting(true);
        const result = await onDelete(id);
        setIsSubmitting(false);
        if (result.ok) {
          setCustomAlert({
            title: "Berhasil Dihapus",
            message: `"${name}" berhasil dihapus.`,
            confirmLabel: "OK",
            variant: "nutritionist",
            hideCancel: true,
            onConfirm: () => {},
          });
        } else {
          setCustomAlert({
            title: "Gagal Menghapus",
            message: result.error ?? "Terjadi kesalahan saat menghapus.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => {},
          });
        }
      },
    });
  }

  const lowStockCount = ingredients.filter((i) => i.stockKg > 0 && i.stockKg < 5).length;
  const emptyStockCount = ingredients.filter((i) => i.stockKg <= 0).length;

  return (
    <>
      {/* Header */}
      <div
        className={styles.notice}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <p className={styles.noticeTitle}>Manajemen Bahan Baku</p>
          <p>
            Kelola stok dan harga bahan baku.{" "}
            {emptyStockCount > 0 && (
              <strong style={{ color: "#dc2626" }}>{emptyStockCount} bahan habis!</strong>
            )}
            {lowStockCount > 0 && emptyStockCount === 0 && (
              <strong style={{ color: "#d97706" }}>{lowStockCount} bahan hampir habis.</strong>
            )}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            className={clsx(styles.tabButton, styles.tabButtonActive)}
            onClick={openAddForm}
          >
            + Tambah Bahan Baku
          </button>
        )}
      </div>

      {/* Stock Summary Banner */}
      {!showForm && (emptyStockCount > 0 || lowStockCount > 0) && (
        <div style={{
          background: emptyStockCount > 0 ? "#fee2e2" : "#fef3c7",
          border: `1px solid ${emptyStockCount > 0 ? "#fca5a5" : "#fcd34d"}`,
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          color: emptyStockCount > 0 ? "#991b1b" : "#92400e",
          fontWeight: 600,
        }}>
          {emptyStockCount > 0
            ? `⚠️ ${emptyStockCount} bahan baku sudah HABIS. Segera tambah stok atau minta admin melakukan restock.`
            : `⚠️ ${lowStockCount} bahan baku hampir habis (stok < 5 kg). Pertimbangkan restock segera.`}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            margin: "1rem 0",
            padding: "1.25rem",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <p className={styles.noticeTitle} style={{ margin: 0 }}>
            {form.id ? "Edit Bahan Baku" : "Tambah Bahan Baku Baru"}
          </p>

          {/* Row 1: nama & alergen */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <input
              className={styles.input}
              style={{ flex: "2 1 200px" }}
              placeholder="Nama Bahan Baku *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={styles.input}
              style={{ flex: "1 1 150px" }}
              placeholder="Asal/Origin (mis. Jawa Barat)"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
            />
            <input
              className={styles.input}
              style={{ flex: "1 1 150px" }}
              placeholder="Supplier/Petani"
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
            />
          </div>

          {/* Row 2: stok, harga, alergen */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>Stok Awal (kg) *</label>
              <input
                className={styles.input}
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                required
                value={form.stockKg}
                onChange={(e) => setForm({ ...form, stockKg: e.target.value })}
              />
            </div>
            <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b" }}>Harga per Kg (Rp) *</label>
              <input
                className={styles.input}
                type="number"
                step="100"
                min="0"
                placeholder="0"
                required
                value={form.pricePerKg}
                onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })}
              />
            </div>
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.4rem" }}>
              <input
                type="checkbox"
                id="isAllergen"
                checked={form.isAllergen}
                onChange={(e) => setForm({ ...form, isAllergen: e.target.checked })}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="isAllergen" style={{ fontWeight: 600, fontSize: "0.85rem", color: "#b45309", cursor: "pointer" }}>
                ⚠️ Mengandung Alergen
              </label>
            </div>
          </div>

          <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
            💡 <strong>Harga per kg</strong> yang diinput akan digunakan sebagai referensi harga di dashboard prediksi AI Admin.
          </p>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(styles.tabButton, styles.tabButtonActive)}
            >
              {isSubmitting ? "Menyimpan…" : form.id ? "Simpan Perubahan" : "Simpan Bahan Baku"}
            </button>
            <button
              type="button"
              className={styles.tabButton}
              onClick={cancelForm}
              disabled={isSubmitting}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
          Memuat data bahan baku…
        </div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Bahan</th>
                <th>Asal / Supplier</th>
                <th>Stok</th>
                <th>Harga/kg</th>
                <th>Alergen</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Belum ada bahan baku. Klik <strong>+ Tambah Bahan Baku</strong> untuk mulai.
                  </td>
                </tr>
              ) : (
                ingredients.map((row) => (
                  <tr
                    key={row.id}
                    style={{ background: row.stockKg <= 0 ? "#fff5f5" : row.stockKg < 5 ? "#fffbeb" : "white" }}
                  >
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td style={{ color: "#64748b", fontSize: "0.85rem" }}>
                      <div>{row.origin || "-"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{row.supplierName || "-"}</div>
                    </td>
                    <td>
                      <StockBadge stockKg={row.stockKg} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {row.pricePerKg > 0 ? formatCurrency(row.pricePerKg) + "/kg" : <span style={{ color: "#94a3b8" }}>Belum ada</span>}
                    </td>
                    <td>
                      {row.isAllergen ? (
                        <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "4px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>
                          ⚠️ Ya
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Tidak</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "0.2rem 0" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.name)}
                          style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: "0.2rem 0" }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(customAlert)}
        title={customAlert?.title ?? ""}
        message={customAlert?.message ?? ""}
        confirmLabel={customAlert?.confirmLabel ?? "OK"}
        cancelLabel={customAlert?.cancelLabel}
        variant={customAlert?.variant}
        hideCancel={customAlert?.hideCancel}
        onCancel={() => setCustomAlert(null)}
        onConfirm={async () => {
          if (customAlert?.onConfirm) await customAlert.onConfirm();
          setCustomAlert(null);
        }}
      />
    </>
  );
}
