"use client";

import { Fragment, useState } from "react";
import { BookOpen, ImageUp, Info, Pencil, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
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

  const nutrientField = (
    label: string,
    key: "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium",
    unit: string,
    opts: { required?: boolean; step?: string; min?: number } = {},
  ) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label} {opts.required && <span className={styles.required}>*</span>}
      </span>
      <span className={styles.affixWrap}>
        <input
          className={styles.input}
          type="number"
          step={opts.step ?? "0.1"}
          min={opts.min ?? 0}
          placeholder="0"
          required={opts.required}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
        <span className={clsx(styles.affix, styles.affixEnd)}>{unit}</span>
      </span>
    </label>
  );

  return (
    <>
      {!showForm && (
        <div className={styles.toolbar} style={{ justifyContent: "flex-end" }}>
          <button type="button" className={styles.actionCard} onClick={openAddForm}>
            <Plus aria-hidden="true" />
            Tambah Resep
          </button>
        </div>
      )}

      {errorMsg && <div className={styles.notice} role="alert">{errorMsg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <div className={styles.formSectionHead}>
            <h2 className={styles.formTitle} style={{ margin: 0 }}>{form.id ? "Ubah Resep" : "Resep Baru"}</h2>
            <span className={styles.fieldHint}>
              <span className={styles.required}>*</span> wajib diisi
            </span>
          </div>

          {/* ── 1. Info dasar ── */}
          <div className={styles.formSection}>
            <p className={styles.formSectionTitle}>Informasi dasar</p>
            <div className={styles.fieldGrid} style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Nama resep <span className={styles.required}>*</span>
                </span>
                <input
                  className={styles.input}
                  placeholder="Contoh: Salmon Panggang Lemon"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Jumlah porsi <span className={styles.required}>*</span>
                </span>
                <input
                  className={styles.input}
                  type="number"
                  required
                  min={1}
                  value={form.servings}
                  onChange={(e) => setForm({ ...form, servings: e.target.value })}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Deskripsi <span className={styles.required}>*</span>
              </span>
              <textarea
                className={styles.input}
                rows={2}
                placeholder="Rasa dan manfaat kesehatan menu ini"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Foto (opsional, maks. 2 MB)</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label className={styles.tabButton}>
                  <ImageUp aria-hidden="true" />
                  {form.imageUrl || imagePreview ? "Ganti foto" : "Pilih foto"}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
                </label>
                {imagePreview && (
                  <>
                    <img src={imagePreview} alt="Pratinjau foto resep" className={styles.thumb} />
                    <button
                      type="button"
                      className={clsx(styles.iconButton, styles.dangerButton)}
                      aria-label="Hapus foto"
                      onClick={() => {
                        setImagePreview("");
                        setForm((prev) => ({ ...prev, imageUrl: "" }));
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. Nilai gizi ── */}
          <div className={styles.formSection}>
            <div>
              <p className={styles.formSectionTitle}>Nilai gizi per porsi</p>
              <p className={styles.fieldHint}>Ditampilkan ke pelanggan untuk mendukung program diet.</p>
            </div>
            <div className={styles.nutrientGrid}>
              {nutrientField("Energi", "calories", "kcal", { required: true, step: "1", min: 1 })}
              {nutrientField("Protein", "protein", "g", { required: true, min: 0.1 })}
              {nutrientField("Karbohidrat", "carbs", "g")}
              {nutrientField("Lemak total", "fat", "g")}
              {nutrientField("Serat", "fiber", "g")}
              {nutrientField("Gula", "sugar", "g")}
              {nutrientField("Natrium", "sodium", "mg", { step: "1" })}
            </div>

            <div className={styles.formSectionHead}>
              <span className={styles.fieldLabel}>Mikronutrien (opsional)</span>
              <div className={styles.chipRow}>
                <button type="button" className={styles.chip} onClick={() => addMicronutrientRow("Vitamin C", "25 mg")}>+ Vitamin C</button>
                <button type="button" className={styles.chip} onClick={() => addMicronutrientRow("Zat Besi", "3.5 mg")}>+ Zat Besi</button>
                <button type="button" className={styles.chip} onClick={() => addMicronutrientRow("Kalsium", "120 mg")}>+ Kalsium</button>
                <button type="button" className={styles.chip} onClick={() => addMicronutrientRow("", "")}>+ Lainnya</button>
              </div>
            </div>

            {micronutrientsList.map((micro, idx) => (
              <div key={idx} className={styles.microLine}>
                <input
                  className={styles.input}
                  aria-label="Nama mikronutrien"
                  placeholder="Nama, mis. Vitamin D"
                  value={micro.name}
                  onChange={(e) => updateMicronutrientRow(idx, { name: e.target.value })}
                />
                <input
                  className={styles.input}
                  aria-label="Jumlah mikronutrien"
                  placeholder="Jumlah, mis. 15 mcg"
                  value={micro.amount}
                  onChange={(e) => updateMicronutrientRow(idx, { amount: e.target.value })}
                />
                <button
                  type="button"
                  className={clsx(styles.iconButton, styles.dangerButton)}
                  aria-label="Hapus mikronutrien"
                  onClick={() => removeMicronutrientRow(idx)}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {/* ── 3. Bahan baku ── */}
          <div className={styles.formSection}>
            <div className={styles.formSectionHead}>
              <div>
                <p className={styles.formSectionTitle}>Komposisi bahan</p>
                <p className={styles.fieldHint}>Jumlah diubah otomatis ke kg untuk peramalan stok.</p>
              </div>
              <button type="button" className={styles.tabButton} onClick={addIngredientRow}>
                <Plus aria-hidden="true" />
                Tambah Bahan
              </button>
            </div>

            {form.ingredients.length === 0 ? (
              <p className={styles.fieldHint}>Belum ada bahan.</p>
            ) : (
              form.ingredients.map((ing, i) => (
                <div key={i} className={styles.ingredientLine}>
                  <select
                    className={styles.select}
                    aria-label="Bahan baku"
                    value={ing.ingredientId}
                    required
                    onChange={(e) => updateIngredientRow(i, { ingredientId: e.target.value })}
                  >
                    <option value="">{isIngredientsLoading ? "Memuat..." : "Pilih bahan baku"}</option>
                    {ingredientOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name} (stok {opt.stockKg} kg)
                      </option>
                    ))}
                  </select>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.01"
                    min={0.01}
                    aria-label="Jumlah"
                    placeholder="Jumlah"
                    required
                    value={ing.quantity || ""}
                    onChange={(e) => updateIngredientRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                  />
                  <select
                    className={styles.select}
                    aria-label="Satuan"
                    value={ing.unit}
                    onChange={(e) => updateIngredientRow(i, { unit: e.target.value })}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <span className={styles.affixWrap}>
                    <input
                      className={styles.input}
                      type="number"
                      readOnly
                      tabIndex={-1}
                      aria-label="Setara kg"
                      style={{ background: "var(--surface-muted)", color: "var(--muted)" }}
                      value={ing.quantityInKg || ""}
                    />
                    <span className={clsx(styles.affix, styles.affixEnd)}>kg</span>
                  </span>
                  <button
                    type="button"
                    className={clsx(styles.iconButton, styles.dangerButton)}
                    aria-label="Hapus bahan"
                    onClick={() => removeIngredientRow(i)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.tabButton} onClick={cancelForm} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className={styles.actionCard} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : form.id ? "Simpan Perubahan" : "Simpan Resep"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className={styles.emptyState}>Memuat data resep...</div>
      ) : recipes.length === 0 ? (
        <div className={styles.emptyCard}>
          <BookOpen aria-hidden="true" strokeWidth={1.5} />
          <h2>Belum ada resep</h2>
          <p>Tambahkan resep pertama beserta komposisi bahan dan nilai gizinya.</p>
        </div>
      ) : (
        <div className={styles.recipeGrid}>
          {recipes.map((row) => {
            const ingredientText = (row.ingredients ?? [])
              .map((ing) => `${ing.ingredient.name} ${ing.quantity} ${ing.unit}`)
              .join(", ");
            return (
              <article key={row.id} className={styles.recipeCard}>
                <div className={styles.recipeHead}>
                  {row.imageUrl ? (
                    <img src={row.imageUrl} alt="" className={styles.recipeImg} />
                  ) : (
                    <span className={clsx(styles.recipeImg, styles.recipeImgEmpty)}>
                      <UtensilsCrossed aria-hidden="true" />
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 className={styles.recipeName}>{row.name}</h3>
                    {row.description && (
                      <p className={clsx(styles.recipeDesc, styles.clamp2)}>{row.description}</p>
                    )}
                  </div>
                </div>

                <dl className={styles.macroRow}>
                  <div>
                    <dt>Energi</dt>
                    <dd>{row.calories}<span> kcal</span></dd>
                  </div>
                  <div>
                    <dt>Protein</dt>
                    <dd>{row.protein}<span> g</span></dd>
                  </div>
                  <div>
                    <dt>Karbo</dt>
                    <dd>{row.carbs ?? 0}<span> g</span></dd>
                  </div>
                  <div>
                    <dt>Lemak</dt>
                    <dd>{row.fat ?? 0}<span> g</span></dd>
                  </div>
                </dl>

                <div className={styles.recipeIngredients}>
                  <span className={styles.fieldLabel}>
                    {row.ingredients?.length ? `${row.ingredients.length} bahan` : "Bahan"}
                  </span>
                  {ingredientText ? (
                    <p className={clsx(styles.recipeDesc, styles.clamp2)} title={ingredientText}>{ingredientText}</p>
                  ) : (
                    <span className={clsx(styles.tag, styles.tagAmber)} style={{ justifySelf: "start" }}>Belum ada bahan</span>
                  )}
                </div>

                <div className={styles.recipeFoot}>
                  <span className={styles.fieldHint}>{row.servings} porsi</span>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.tabButton} onClick={() => setViewNutritionRecipe(row)}>
                      <Info aria-hidden="true" />
                      Gizi
                    </button>
                    <button type="button" className={styles.tabButton} onClick={() => openEditForm(row)}>
                      <Pencil aria-hidden="true" />
                      Ubah
                    </button>
                    <button
                      type="button"
                      className={clsx(styles.tabButton, styles.dangerButton)}
                      aria-label={`Hapus ${row.name}`}
                      onClick={() => handleDelete(row.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewNutritionRecipe && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setViewNutritionRecipe(null); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Informasi nilai gizi">
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalTitle}>Informasi Nilai Gizi</p>
                <p className={styles.modalSub}>
                  {viewNutritionRecipe.name} · per porsi, resep untuk {viewNutritionRecipe.servings} porsi
                </p>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setViewNutritionRecipe(null)} aria-label="Tutup">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.statLine}>
                Energi
                <strong>{viewNutritionRecipe.calories} kcal</strong>
              </div>
              <dl className={styles.dl}>
                <dt>Protein</dt>
                <dd>{viewNutritionRecipe.protein} g</dd>
                <dt>Karbohidrat total</dt>
                <dd>{viewNutritionRecipe.carbs ?? 0} g</dd>
                <dt>Serat</dt>
                <dd>{viewNutritionRecipe.fiber ?? 0} g</dd>
                <dt>Gula</dt>
                <dd>{viewNutritionRecipe.sugar ?? 0} g</dd>
                <dt>Lemak total</dt>
                <dd>{viewNutritionRecipe.fat ?? 0} g</dd>
                <dt>Natrium</dt>
                <dd>{viewNutritionRecipe.sodium ?? 0} mg</dd>
              </dl>

              {viewNutritionRecipe.micronutrients &&
                typeof viewNutritionRecipe.micronutrients === "object" &&
                Object.keys(viewNutritionRecipe.micronutrients).length > 0 && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Mikronutrien</span>
                    <dl className={styles.dl}>
                      {Object.entries(viewNutritionRecipe.micronutrients).map(([k, v]) => (
                        <Fragment key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v)}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                )}
            </div>
          </div>
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
