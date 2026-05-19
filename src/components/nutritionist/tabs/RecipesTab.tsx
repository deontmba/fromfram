"use client";

import { useState } from "react";
import type { RecipeRow, RecipeFormData, RecipeIngredientEntry, IngredientOption } from "../hooks/useNutritionistData";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import styles from "../../operations/role-portal-screen.module.css";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

const EMPTY_FORM: RecipeFormData = {
  id: "",
  name: "",
  description: "",
  calories: "",
  protein: "",
  servings: "",
  imageUrl: "",
  ingredients: [],
};

type Props = {
  recipes: RecipeRow[];
  isLoading: boolean;
  ingredientOptions: IngredientOption[];
  isIngredientsLoading: boolean;
  onSave: (form: RecipeFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function RecipesTab({ recipes, isLoading, ingredientOptions, isIngredientsLoading, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RecipeFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: "default" | "destructive" | "admin" | "nutritionist";
    hideCancel?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // ── Ingredient management helpers ─────────────────────────────────────────

  function addIngredientRow() {
    setForm((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredientId: "", quantity: 0, unit: "g", quantityInKg: 0 },
      ],
    }));
  }

  function removeIngredientRow(index: number) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  function updateIngredientRow(index: number, patch: Partial<RecipeIngredientEntry>) {
    setForm((prev) => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], ...patch };

      // Auto-calculate quantityInKg when quantity or unit changes
      const row = updated[index];
      if ("quantity" in patch || "unit" in patch) {
        const qty = typeof row.quantity === "number" ? row.quantity : 0;
        const unit = row.unit;
        let kg = qty;
        if (unit === "g") kg = qty / 1000;
        else if (unit === "mg") kg = qty / 1_000_000;
        else if (unit === "kg") kg = qty;
        else if (unit === "ml") kg = qty / 1000;
        else if (unit === "liter" || unit === "L") kg = qty;
        else if (unit === "sdm") kg = (qty * 15) / 1000;  // ~15g per tablespoon
        else if (unit === "sdt") kg = (qty * 5) / 1000;   // ~5g per teaspoon
        else if (unit === "lembar" || unit === "buah" || unit === "butir") kg = qty * 0.05; // rough estimate
        else kg = qty / 1000; // fallback: assume grams
        updated[index] = { ...updated[index], quantityInKg: parseFloat(kg.toFixed(6)) };
      }

      return { ...prev, ingredients: updated };
    });
  }

  // ── Form open/close ───────────────────────────────────────────────────────

  function openAddForm() {
    setForm(EMPTY_FORM);
    setErrorMsg("");
    setImagePreview("");
    setShowForm(true);
  }

  function openEditForm(row: RecipeRow) {
    const existingIngredients: RecipeIngredientEntry[] = (row.ingredients ?? []).map((ing) => ({
      ingredientId: ing.ingredient.id,
      quantity: ing.quantity,
      unit: ing.unit,
      quantityInKg: 0,
    }));
    setForm({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      calories: String(row.calories),
      protein: String(row.protein),
      servings: String(row.servings),
      imageUrl: "",
      ingredients: existingIngredients,
    });
    setImagePreview(row.imageUrl ?? "");
    setErrorMsg("");
    setShowForm(true);
  }

  function cancelForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setErrorMsg("");
    setImagePreview("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    const ok = await onSave(form);
    setIsSubmitting(false);
    if (ok) {
      const savedName = form.name;
      cancelForm();
      setCustomAlert({
        title: "Resep Disimpan",
        message: `Resep "${savedName}" berhasil disimpan ke dalam database.`,
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => {},
      });
    } else {
      setCustomAlert({
        title: "Gagal Menyimpan Resep",
        message: "Terjadi kesalahan saat menyimpan data resep. Pastikan semua field sudah diisi dengan benar.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => {},
      });
    }
  }

  async function handleDelete(id: string) {
    setCustomAlert({
      title: "Hapus Resep",
      message: "Apakah Anda yakin ingin menghapus resep ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "destructive",
      onConfirm: async () => {
        setIsSubmitting(true);
        const ok = await onDelete(id);
        setIsSubmitting(false);
        if (ok) {
          setCustomAlert({
            title: "Resep Dihapus",
            message: "Resep berhasil dihapus dari database.",
            confirmLabel: "OK",
            variant: "nutritionist",
            hideCancel: true,
            onConfirm: () => {},
          });
        } else {
          setCustomAlert({
            title: "Gagal Menghapus Resep",
            message: "Terjadi kesalahan saat menghapus resep dari database.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => {},
          });
        }
      },
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setCustomAlert({
        title: "Ukuran Gambar Terlalu Besar",
        message: "Ukuran file gambar yang dipilih melebihi batas maksimal 2MB. Silakan pilih gambar yang lebih kecil.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => {},
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  const UNIT_OPTIONS = ["g", "kg", "mg", "ml", "L", "sdm", "sdt", "lembar", "buah", "butir"];

  return (
    <>
      {/* Header bar */}
      <div
        className={styles.notice}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <p className={styles.noticeTitle}>Daftar Resep Sistem</p>
          <p>Kelola resep. Klik <strong>+ Tambah Resep</strong> untuk menyimpan resep baru.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            className={clsx(styles.tabButton, styles.tabButtonActive)}
            onClick={openAddForm}
          >
            + Tambah Resep
          </button>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div
          className={styles.notice}
          style={{ background: "#fee2e2", borderColor: "#ef4444", marginTop: "0.5rem" }}
        >
          <p style={{ color: "#dc2626", margin: 0 }}>{errorMsg}</p>
        </div>
      )}

      {/* Form tambah / edit */}
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
            {form.id ? "Edit Resep" : "Tambah Resep Baru"}
          </p>

          {/* ── Info dasar ── */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              className={styles.input}
              style={{ flex: "2 1 200px" }}
              placeholder="Nama Resep *"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={styles.input}
              style={{ flex: "0 1 120px" }}
              type="number"
              placeholder="Kalori (kcal) *"
              required
              min={0}
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
            <input
              className={styles.input}
              style={{ flex: "0 1 130px" }}
              type="number"
              step="0.1"
              placeholder="Protein (g) *"
              required
              min={0}
              value={form.protein}
              onChange={(e) => setForm({ ...form, protein: e.target.value })}
            />
            <input
              className={styles.input}
              style={{ flex: "0 1 100px" }}
              type="number"
              placeholder="Porsi *"
              required
              min={1}
              value={form.servings}
              onChange={(e) => setForm({ ...form, servings: e.target.value })}
            />

            {/* Gambar */}
            <div style={{ flex: "1 1 100%", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#64748b" }}>Gambar Resep (Opsional):</span>
              <label
                className={clsx(styles.tabButton)}
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1.25rem",
                  fontWeight: 600,
                  textAlign: "center",
                  cursor: "pointer",
                  width: "fit-content",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "#e2e8f0",
                  color: "#334155",
                  fontSize: "0.875rem",
                  transition: "all 0.2s",
                }}
              >
                {form.imageUrl || imagePreview ? "Ganti Gambar..." : "+ Pilih Gambar..."}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
              </label>
              {imagePreview && (
                <div style={{ position: "relative", width: "100px", height: "100px", marginTop: "0.25rem" }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setForm((prev) => ({ ...prev, imageUrl: "" }));
                    }}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <textarea
            className={styles.input}
            rows={3}
            placeholder="Deskripsi singkat resep *"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          {/* ── Bahan Baku (Ingredients) ── */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "1rem",
            background: "#fff",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", margin: 0 }}>
                  🧪 Bahan Baku (Ingredients)
                </p>
                <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.2rem 0 0" }}>
                  Wajib diisi agar AI Forecasting dapat menghitung kebutuhan bahan baku ke petani.
                </p>
              </div>
              <button
                type="button"
                onClick={addIngredientRow}
                disabled={isIngredientsLoading || ingredientOptions.length === 0}
                style={{
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  padding: "0.35rem 0.85rem",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: ingredientOptions.length === 0 ? "not-allowed" : "pointer",
                  opacity: ingredientOptions.length === 0 ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isIngredientsLoading ? "Memuat…" : "+ Tambah Bahan"}
              </button>
            </div>

            {ingredientOptions.length === 0 && !isIngredientsLoading && (
              <p style={{ fontSize: "0.8rem", color: "#ef4444", margin: 0 }}>
                ⚠️ Belum ada data ingredient di database. Minta Admin untuk menambahkan ingredient terlebih dahulu.
              </p>
            )}

            {form.ingredients.length === 0 && ingredientOptions.length > 0 && (
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
                Belum ada bahan baku. Klik "+ Tambah Bahan" untuk mulai.
              </p>
            )}

            {form.ingredients.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Header row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 90px 90px 32px",
                  gap: "0.5rem",
                  padding: "0 0.25rem",
                }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>Bahan Baku</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>Kuantitas</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>Satuan</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>Qty (Kg)</span>
                  <span />
                </div>

                {form.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 90px 90px 32px",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    {/* Ingredient selector */}
                    <select
                      className={styles.input}
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem" }}
                      required
                      value={ing.ingredientId}
                      onChange={(e) => updateIngredientRow(i, { ingredientId: e.target.value })}
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {ingredientOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}{opt.isAllergen ? " ⚠️" : ""}
                        </option>
                      ))}
                    </select>

                    {/* Quantity */}
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      step="0.01"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem" }}
                      required
                      value={ing.quantity || ""}
                      onChange={(e) => updateIngredientRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                    />

                    {/* Unit */}
                    <select
                      className={styles.input}
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem" }}
                      value={ing.unit}
                      onChange={(e) => updateIngredientRow(i, { unit: e.target.value })}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    {/* quantityInKg (read-only, auto-calculated) */}
                    <input
                      className={styles.input}
                      type="number"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.5rem", background: "#f1f5f9", color: "#475569" }}
                      readOnly
                      value={ing.quantityInKg || ""}
                      title="Dihitung otomatis dari kuantitas & satuan"
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeIngredientRow(i)}
                      style={{
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "none",
                        borderRadius: "6px",
                        width: "32px",
                        height: "32px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Hapus bahan ini"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(styles.tabButton, styles.tabButtonActive)}
            >
              {isSubmitting ? "Menyimpan…" : form.id ? "Simpan Perubahan" : "Simpan Resep"}
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
          Memuat data resep…
        </div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Resep</th>
                <th>Deskripsi</th>
                <th>Kalori</th>
                <th>Protein</th>
                <th>Porsi</th>
                <th>Ingredients</th>
                <th>Image</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Belum ada resep. Klik <strong>+ Tambah Resep</strong> untuk mulai.
                  </td>
                </tr>
              ) : (
                recipes.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td style={{ color: "#64748b" }}>
                      {row.description
                        ? row.description.length > 60
                          ? row.description.slice(0, 60) + "…"
                          : row.description
                        : "-"}
                    </td>
                    <td>{row.calories} kcal</td>
                    <td>{row.protein} g</td>
                    <td>{row.servings} porsi</td>
                    <td>
                      {row.ingredients && row.ingredients.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                          {row.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              style={{
                                background: "#dbeafe",
                                color: "#1d4ed8",
                                borderRadius: "4px",
                                padding: "1px 6px",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                              }}
                            >
                              {ing.ingredient.name} ({ing.quantity}{ing.unit})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#f59e0b", fontSize: "0.8rem", fontWeight: 600 }}>
                          ⚠️ Belum ada
                        </span>
                      )}
                    </td>
                    <td>
                      {row.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<img src="${row.imageUrl}" style="max-width:100%" />`);
                            }
                          }}
                          style={{
                            color: "#2563eb",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            padding: 0,
                          }}
                        >
                          Lihat foto
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Belum ada</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          style={{
                            color: "#2563eb",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 700,
                            padding: "0.2rem 0",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          style={{
                            color: "#dc2626",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 700,
                            padding: "0.2rem 0",
                          }}
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
          if (customAlert?.onConfirm) {
            await customAlert.onConfirm();
          }
          setCustomAlert(null);
        }}
      />
    </>
  );
}