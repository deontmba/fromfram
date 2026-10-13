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
  carbs: "",
  fat: "",
  fiber: "",
  sodium: "",
  sugar: "",
  micronutrients: {},
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
  const [micronutrientsList, setMicronutrientsList] = useState<Array<{ name: string; amount: string }>>([]);
  const [viewNutritionRecipe, setViewNutritionRecipe] = useState<RecipeRow | null>(null);

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
        else if (unit === "sdm") kg = (qty * 15) / 1000;
        else if (unit === "sdt") kg = (qty * 5) / 1000;
        else if (unit === "lembar" || unit === "buah" || unit === "butir") kg = qty * 0.05;
        else kg = qty / 1000;
        updated[index] = { ...updated[index], quantityInKg: parseFloat(kg.toFixed(6)) };
      }

      return { ...prev, ingredients: updated };
    });
  }

  // ── Micronutrient helpers ─────────────────────────────────────────────────

  function addMicronutrientRow(presetName = "", presetAmount = "") {
    setMicronutrientsList((prev) => [...prev, { name: presetName, amount: presetAmount }]);
  }

  function removeMicronutrientRow(index: number) {
    setMicronutrientsList((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMicronutrientRow(index: number, patch: Partial<{ name: string; amount: string }>) {
    setMicronutrientsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  }

  // ── Form open/close ───────────────────────────────────────────────────────

  function openAddForm() {
    setForm(EMPTY_FORM);
    setMicronutrientsList([]);
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

    const rawMicro = row.micronutrients;
    let microList: Array<{ name: string; amount: string }> = [];
    if (rawMicro && typeof rawMicro === "object") {
      microList = Object.entries(rawMicro).map(([name, amount]) => ({
        name,
        amount: String(amount),
      }));
    }

    setForm({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      calories: String(row.calories),
      protein: String(row.protein),
      carbs: row.carbs !== undefined ? String(row.carbs) : "0",
      fat: row.fat !== undefined ? String(row.fat) : "0",
      fiber: row.fiber !== undefined ? String(row.fiber) : "0",
      sodium: row.sodium !== undefined ? String(row.sodium) : "0",
      sugar: row.sugar !== undefined ? String(row.sugar) : "0",
      micronutrients: {},
      servings: String(row.servings),
      imageUrl: "",
      ingredients: existingIngredients,
    });
    setMicronutrientsList(microList);
    setImagePreview(row.imageUrl ?? "");
    setErrorMsg("");
    setShowForm(true);
  }

  function cancelForm() {
    setForm(EMPTY_FORM);
    setMicronutrientsList([]);
    setShowForm(false);
    setErrorMsg("");
    setImagePreview("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    // Build micronutrients object
    const microRecord: Record<string, string> = {};
    micronutrientsList.forEach((item) => {
      const k = item.name.trim();
      const v = item.amount.trim();
      if (k && v) {
        microRecord[k] = v;
      }
    });

    const payload: RecipeFormData = {
      ...form,
      micronutrients: microRecord,
    };

    const ok = await onSave(payload);
    setIsSubmitting(false);
    if (ok) {
      const savedName = form.name;
      cancelForm();
      setCustomAlert({
        title: "Resep Disimpan",
        message: `Resep "${savedName}" beserta informasi gizi lengkap berhasil disimpan.`,
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
          <p className={styles.noticeTitle}>Daftar Resep &amp; Transparansi Nutrisi</p>
          <p>Kelola komposisi bahan, makronutrien, serat, natrium, gula, dan mikronutrien resep makanan sehat.</p>
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
            gap: "1rem",
            margin: "1rem 0",
            padding: "1.25rem",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className={styles.noticeTitle} style={{ margin: 0 }}>
              {form.id ? "✏️ Edit Resep" : "➕ Tambah Resep Baru"}
            </p>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Field bertanda <strong style={{ color: "#dc2626" }}>*</strong> wajib diisi
            </span>
          </div>

          {/* ── 1. Info Dasar ── */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem" }}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
              📝 Informasi Dasar Resep
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                  Nama Resep <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className={styles.input}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="Contoh: Salmon Panggang Lemon Asparagus"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                  Jumlah Porsi <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className={styles.input}
                  style={{ width: "100%", boxSizing: "border-box" }}
                  type="number"
                  placeholder="Contoh: 1 atau 2"
                  required
                  min={1}
                  value={form.servings}
                  onChange={(e) => setForm({ ...form, servings: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.25rem" }}>
                Deskripsi Resep <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                className={styles.input}
                style={{ width: "100%", boxSizing: "border-box" }}
                rows={2}
                placeholder="Deskripsi singkat menu, rasa, dan manfaat kesehatannya..."
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Gambar */}
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#475569", display: "block", marginBottom: "0.3rem" }}>
                Foto Resep (Opsional):
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label
                  className={clsx(styles.tabButton)}
                  style={{
                    display: "inline-block",
                    padding: "0.45rem 1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontSize: "0.82rem",
                  }}
                >
                  {form.imageUrl || imagePreview ? "Ganti Foto..." : "📁 Pilih Foto Resep..."}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
                {imagePreview && (
                  <div style={{ position: "relative", width: "50px", height: "50px" }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview("");
                        setForm((prev) => ({ ...prev, imageUrl: "" }));
                      }}
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Informasi Nilai Gizi Lengkap (Nutrition Facts) ── */}
          <div style={{
            background: "#fff",
            border: "1.5px solid #bfdbfe",
            borderRadius: "10px",
            padding: "1rem",
            boxShadow: "0 2px 6px rgba(59, 130, 246, 0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#1d4ed8" }}>
                  🥗 Rincian Nilai Gizi Lengkap (Nutrition Facts)
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                  Kandungan gizi per 1 porsi saji. Transparansi gizi untuk mendukung program diet pelanggan.
                </p>
              </div>
            </div>

            {/* Kelompok Makronutrien Inti */}
            <p style={{ margin: "0.5rem 0 0.35rem", fontSize: "0.76rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Makronutrien Inti
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "0.85rem" }}>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#c2410c", marginBottom: "0.2rem" }}>
                  ⚡ Energi (Kalori) *
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    placeholder="0"
                    required
                    min={1}
                    value={form.calories}
                    onChange={(e) => setForm({ ...form, calories: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#9a3412", fontWeight: 600 }}>kcal</span>
                </div>
              </div>

              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#b91c1c", marginBottom: "0.2rem" }}>
                  🍗 Protein *
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    required
                    min={0.1}
                    value={form.protein}
                    onChange={(e) => setForm({ ...form, protein: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#991b1b", fontWeight: 600 }}>g</span>
                </div>
              </div>

              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#1d4ed8", marginBottom: "0.2rem" }}>
                  🍚 Karbohidrat
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    min={0}
                    value={form.carbs}
                    onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#1e40af", fontWeight: 600 }}>g</span>
                </div>
              </div>

              <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#a16207", marginBottom: "0.2rem" }}>
                  🥑 Lemak Total
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    min={0}
                    value={form.fat}
                    onChange={(e) => setForm({ ...form, fat: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#854d0e", fontWeight: 600 }}>g</span>
                </div>
              </div>
            </div>

            {/* Kelompok Nutrisi Kesehatan Khusus */}
            <p style={{ margin: "0.5rem 0 0.35rem", fontSize: "0.76rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Detail Nutrisi Khusus (Gula, Garam &amp; Serat)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.6rem", marginBottom: "0.85rem" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#15803d", marginBottom: "0.2rem" }}>
                  🥦 Serat Pangan (Fiber)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    min={0}
                    value={form.fiber}
                    onChange={(e) => setForm({ ...form, fiber: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>g</span>
                </div>
              </div>

              <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#7e22ce", marginBottom: "0.2rem" }}>
                  🍬 Gula (Sugar)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    min={0}
                    value={form.sugar}
                    onChange={(e) => setForm({ ...form, sugar: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#6b21a8", fontWeight: 600 }}>g</span>
                </div>
              </div>

              <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "8px", padding: "0.5rem 0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#0f766e", marginBottom: "0.2rem" }}>
                  🧂 Natrium (Sodium)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    className={styles.input}
                    style={{ flex: 1, padding: "0.4rem 0.5rem", fontSize: "0.9rem", fontWeight: 700, background: "#fff" }}
                    type="number"
                    step="1"
                    placeholder="0"
                    min={0}
                    value={form.sodium}
                    onChange={(e) => setForm({ ...form, sodium: e.target.value })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#115e59", fontWeight: 600 }}>mg</span>
                </div>
              </div>
            </div>

            {/* Mikronutrien (Vitamin & Mineral) */}
            <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                    🧪 Mikronutrien (Vitamin &amp; Mineral Opsional)
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", marginLeft: "0.4rem" }}>
                    Tersimpan rapi dalam format JSON
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => addMicronutrientRow("Vitamin C", "25 mg")}
                    style={{ border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: "6px", fontSize: "0.72rem", padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}
                  >
                    + Vit C
                  </button>
                  <button
                    type="button"
                    onClick={() => addMicronutrientRow("Zat Besi", "3.5 mg")}
                    style={{ border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: "6px", fontSize: "0.72rem", padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}
                  >
                    + Zat Besi
                  </button>
                  <button
                    type="button"
                    onClick={() => addMicronutrientRow("Kalsium", "120 mg")}
                    style={{ border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: "6px", fontSize: "0.72rem", padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}
                  >
                    + Kalsium
                  </button>
                  <button
                    type="button"
                    onClick={() => addMicronutrientRow("", "")}
                    style={{ border: "1px solid #2563eb", background: "#eff6ff", color: "#1d4ed8", borderRadius: "6px", fontSize: "0.72rem", padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}
                  >
                    + Kustom
                  </button>
                </div>
              </div>

              {micronutrientsList.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "150px", overflowY: "auto", background: "#f8fafc", padding: "0.5rem", borderRadius: "8px" }}>
                  {micronutrientsList.map((micro, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        className={styles.input}
                        style={{ flex: 1, padding: "0.35rem 0.6rem", fontSize: "0.82rem", background: "#fff" }}
                        placeholder="Nama (misal: Vitamin D, Kalium)"
                        value={micro.name}
                        onChange={(e) => updateMicronutrientRow(idx, { name: e.target.value })}
                      />
                      <input
                        className={styles.input}
                        style={{ flex: 1, padding: "0.35rem 0.6rem", fontSize: "0.82rem", background: "#fff" }}
                        placeholder="Jumlah (misal: 15 mcg, 200 mg)"
                        value={micro.amount}
                        onChange={(e) => updateMicronutrientRow(idx, { amount: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeMicronutrientRow(idx)}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", width: "26px", height: "26px", cursor: "pointer", fontWeight: 700 }}
                        title="Hapus"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Bahan Baku (Ingredients) ── */}
          <div style={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "1rem",
            background: "#fff",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", margin: 0 }}>
                  🧪 Komposisi Bahan Baku (Ingredients)
                </p>
                <p style={{ fontSize: "0.76rem", color: "#64748b", margin: "2px 0 0" }}>
                  Kuantitas dihitung otomatis ke satuan Kg untuk sistem peramalan bahan baku.
                </p>
              </div>
              <button
                type="button"
                className={styles.tabButton}
                onClick={addIngredientRow}
                style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
              >
                + Tambah Bahan
              </button>
            </div>

            {form.ingredients.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                Belum ada bahan baku. Klik <strong>+ Tambah Bahan</strong> di atas.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {form.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    {/* Select ingredient */}
                    <select
                      className={styles.select}
                      style={{ fontSize: "0.82rem" }}
                      value={ing.ingredientId}
                      required
                      onChange={(e) => updateIngredientRow(i, { ingredientId: e.target.value })}
                    >
                      <option value="">-- Pilih Bahan Baku --</option>
                      {ingredientOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} (Stok: {opt.stockKg} kg)
                        </option>
                      ))}
                    </select>

                    {/* Quantity */}
                    <input
                      className={styles.input}
                      type="number"
                      step="0.01"
                      min={0.01}
                      placeholder="Jumlah"
                      required
                      value={ing.quantity || ""}
                      onChange={(e) => updateIngredientRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                    />

                    {/* Unit */}
                    <select
                      className={styles.select}
                      style={{ fontSize: "0.82rem" }}
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
                        width: "30px",
                        height: "30px",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "0.9rem",
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

          {/* Tombol Simpan / Batal */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(styles.tabButton, styles.tabButtonActive)}
            >
              {isSubmitting ? "Menyimpan…" : form.id ? "💾 Simpan Perubahan" : "➕ Simpan Resep"}
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

      {/* Table Resep */}
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
                <th>Nilai Gizi (Per Porsi)</th>
                <th>Porsi</th>
                <th>Ingredients</th>
                <th>Image</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Belum ada resep. Klik <strong>+ Tambah Resep</strong> untuk mulai.
                  </td>
                </tr>
              ) : (
                recipes.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600 }}>{row.name}</td>
                    <td style={{ color: "#64748b" }}>
                      {row.description
                        ? row.description.length > 50
                          ? row.description.slice(0, 50) + "…"
                          : row.description
                        : "-"}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem" }}>
                          ⚡ {row.calories} kcal
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "3px" }}>
                          <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "1px 6px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            P: {row.protein}g
                          </span>
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            C: {row.carbs ?? 0}g
                          </span>
                          <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px", fontSize: "0.68rem", fontWeight: 700 }}>
                            F: {row.fat ?? 0}g
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewNutritionRecipe(row)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "2px 0 0",
                            color: "#2563eb",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "underline",
                            display: "inline-block",
                          }}
                        >
                          🔍 Nutrition Facts Lengkap
                        </button>
                      </div>
                    </td>
                    <td>{row.servings} porsi</td>
                    <td>
                      {row.ingredients && row.ingredients.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
                          {row.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              style={{
                                background: "#f1f5f9",
                                color: "#334155",
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
                            fontSize: "0.8rem",
                            padding: 0,
                          }}
                        >
                          Lihat foto
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🗑️ Hapus
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

      {/* ── Modal Pratinjau Nutrition Facts Lengkap ── */}
      {viewNutritionRecipe && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)",
            padding: "1rem",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewNutritionRecipe(null); }}
        >
          <div
            style={{
              background: "#ffffff", borderRadius: "18px", width: "min(440px, 100%)",
              boxShadow: "0 28px 60px rgba(15, 23, 42, 0.25)",
              overflow: "hidden", animation: "liftIn 240ms ease",
            }}
          >
            {/* Header Nutrition Label */}
            <div style={{
              background: "#0f172a", color: "#fff", padding: "1.2rem 1.4rem",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Nutrition Facts
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                  Informasi Nilai Gizi • {viewNutritionRecipe.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewNutritionRecipe(null)}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "1.2rem 1.4rem", maxHeight: "75vh", overflowY: "auto" }}>
              <div style={{ borderBottom: "8px solid #0f172a", paddingBottom: "0.5rem" }}>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Takaran Saji: 1 Porsi</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  Resep dibuat untuk {viewNutritionRecipe.servings} porsi saji
                </p>
              </div>

              {/* Kalori */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "4px solid #0f172a", padding: "0.6rem 0" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase" }}>Jumlah Per Porsi</span>
                  <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>Kalori</p>
                </div>
                <span style={{ fontSize: "2rem", fontWeight: 900 }}>{viewNutritionRecipe.calories}</span>
              </div>

              {/* Rincian Nutrisi */}
              <div style={{ fontSize: "0.84rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontWeight: 800 }}>Lemak Total (Total Fat)</span>
                  <span style={{ fontWeight: 800 }}>{viewNutritionRecipe.fat ?? 0} g</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontWeight: 800 }}>Protein</span>
                  <span style={{ fontWeight: 800 }}>{viewNutritionRecipe.protein} g</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span style={{ fontWeight: 800 }}>Karbohidrat Total</span>
                  <span style={{ fontWeight: 800 }}>{viewNutritionRecipe.carbs ?? 0} g</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0 0.35rem 1.25rem", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <span>Serat Pangan (Dietary Fiber)</span>
                  <span style={{ fontWeight: 700 }}>{viewNutritionRecipe.fiber ?? 0} g</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0 0.35rem 1.25rem", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <span>Gula Total (Total Sugars)</span>
                  <span style={{ fontWeight: 700 }}>{viewNutritionRecipe.sugar ?? 0} g</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "4px solid #0f172a" }}>
                  <span style={{ fontWeight: 800 }}>Natrium (Sodium)</span>
                  <span style={{ fontWeight: 800 }}>{viewNutritionRecipe.sodium ?? 0} mg</span>
                </div>
              </div>

              {/* Mikronutrien */}
              {viewNutritionRecipe.micronutrients && typeof viewNutritionRecipe.micronutrients === "object" && Object.keys(viewNutritionRecipe.micronutrients).length > 0 && (
                <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.8rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase" }}>
                    🧪 Mikronutrien (Vitamin &amp; Mineral)
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", fontSize: "0.76rem" }}>
                    {Object.entries(viewNutritionRecipe.micronutrients).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", background: "#fff", padding: "2px 6px", borderRadius: "4px", border: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#64748b" }}>{k}:</span>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setViewNutritionRecipe(null)}
                style={{
                  width: "100%", marginTop: "1rem", padding: "0.65rem",
                  background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
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