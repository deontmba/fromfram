"use client";

import { useState } from "react";
import type { RecipeRow, RecipeFormData } from "../hooks/useNutritionistData";
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
};

type Props = {
  recipes: RecipeRow[];
  isLoading: boolean;
  onSave: (form: RecipeFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function RecipesTab({ recipes, isLoading, onSave, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RecipeFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");

  function openAddForm() {
    setForm(EMPTY_FORM);
    setErrorMsg("");
    setShowForm(true);
  }

  function openEditForm(row: RecipeRow) {
    setForm({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      calories: String(row.calories),
      protein: String(row.protein),
      servings: String(row.servings),
      imageUrl: "",
    });
    setImagePreview(row.imageUrl ?? "");
    setErrorMsg("");
    setShowForm(true);
  }

  function cancelForm() {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    const ok = await onSave(form);
    setIsSubmitting(false);
    if (ok) {
      cancelForm();
    } else {
      setErrorMsg("Gagal menyimpan resep. Coba lagi.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus resep ini? Aksi ini tidak bisa dibatalkan.")) return;
    const ok = await onDelete(id);
    if (!ok) alert("Gagal menghapus resep.");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran (opsional, misal max 2MB untuk base64 agar tidak berat)
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal 2MB.");
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
            <div style={{ flex: "1 1 100%" }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ marginBottom: "0.5rem" }}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px" }}
                />
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
                <th>Image</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
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
    </>
  );
}