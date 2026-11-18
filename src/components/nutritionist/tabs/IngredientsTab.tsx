"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
  if (stockKg <= 0) return <span className={clsx(styles.tag, styles.tagRed)}>Habis</span>;
  if (stockKg < 5) return <span className={clsx(styles.tag, styles.tagAmber)}>{stockKg.toFixed(1)} kg · Menipis</span>;
  return <span className={clsx(styles.tag, styles.tagGreen)}>{stockKg.toFixed(1)} kg</span>;
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
      {!showForm && (
        <>
          <div className={styles.toolbar} style={{ justifyContent: "flex-end" }}>
            <button type="button" className={styles.actionCard} onClick={openAddForm}>
              <Plus aria-hidden="true" />
              Tambah Bahan Baku
            </button>
          </div>
          {(emptyStockCount > 0 || lowStockCount > 0) && (
            <div className={clsx(styles.notice, emptyStockCount === 0 && styles.noticeWarn)}>
              {emptyStockCount > 0 && <span>{emptyStockCount} bahan habis, minta admin melakukan restock. </span>}
              {lowStockCount > 0 && <span>{lowStockCount} bahan di bawah 5 kg.</span>}
            </div>
          )}
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <h2 className={styles.formTitle}>{form.id ? "Ubah Bahan Baku" : "Bahan Baku Baru"}</h2>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Nama bahan baku <span className={styles.required}>*</span>
              </span>
              <input
                className={styles.input}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Asal daerah</span>
                <input
                  className={styles.input}
                  placeholder="Contoh: Jawa Barat"
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Supplier / petani</span>
                <input
                  className={styles.input}
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                />
              </label>
            </div>

            <div className={styles.fieldGrid}>
              {!form.id && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Stok awal (kg) <span className={styles.required}>*</span>
                  </span>
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
                </label>
              )}
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Harga per kg (Rp) <span className={styles.required}>*</span>
                </span>
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
                <p className={styles.fieldHint}>Dipakai sebagai harga acuan di prediksi AI admin.</p>
              </label>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={form.isAllergen}
                onChange={(e) => setForm({ ...form, isAllergen: e.target.checked })}
              />
              Mengandung alergen
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.tabButton} onClick={cancelForm} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className={styles.actionCard} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : form.id ? "Simpan Perubahan" : "Simpan Bahan Baku"}
            </button>
          </div>
        </form>
      )}

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
              {ingredients.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>Belum ada bahan baku.</td>
                </tr>
              ) : (
                ingredients.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={styles.tableKey}>{row.name}</span>
                      {row.isAllergen && (
                        <span className={clsx(styles.tag, styles.tagAmber)} style={{ marginLeft: "0.4rem" }}>Alergen</span>
                      )}
                    </td>
                    <td>
                      {row.supplierName || "-"}
                      <span className={styles.cellSub}>{row.origin || "-"}</span>
                    </td>
                    <td><StockBadge stockKg={row.stockKg} /></td>
                    <td className={styles.nowrap}>
                      {row.pricePerKg > 0 ? formatCurrency(row.pricePerKg) : "-"}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.tabButton} onClick={() => openEditForm(row)}>
                          <Pencil aria-hidden="true" />
                          Ubah
                        </button>
                        <button
                          type="button"
                          className={clsx(styles.tabButton, styles.dangerButton)}
                          aria-label={`Hapus ${row.name}`}
                          onClick={() => handleDelete(row.id, row.name)}
                        >
                          <Trash2 aria-hidden="true" />
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
