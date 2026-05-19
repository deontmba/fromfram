"use client";

import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import styles from "../role-portal-screen.module.css";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function AdminIngredientsTab() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [restockPrice, setRestockPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleOpenRestock = (item: any) => {
    setSelectedIngredient(item);
    setRestockQty("");
    setRestockPrice(String(item.pricePerKg || ""));
    setShowRestockForm(true);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/ingredients/${selectedIngredient.id}/restock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          addQtyKg: Number(restockQty),
          pricePerKg: restockPrice ? Number(restockPrice) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal restock");

      setShowRestockForm(false);
      setCustomAlert({
        title: "Restock Berhasil",
        message: `Stok "${selectedIngredient.name}" berhasil ditambahkan.`,
        confirmLabel: "OK",
        variant: "admin",
        hideCancel: true,
        onConfirm: () => {
          fetchIngredients();
        },
      });
    } catch (err: any) {
      setCustomAlert({
        title: "Gagal Restock",
        message: err.message || "Terjadi kesalahan.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => {},
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  return (
    <div>
      <div className={styles.notice} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p className={styles.noticeTitle}>Stok Bahan Baku</p>
          <p>Pantau sisa stok dan tambahkan stok bahan baku (Restock) beserta penyesuaian harga jika diperlukan.</p>
        </div>
      </div>

      {error && <div className={styles.notice} style={{ color: "#dc2626", background: "#fee2e2" }}>{error}</div>}

      {showRestockForm && selectedIngredient && (
        <form
          onSubmit={handleRestockSubmit}
          style={{
            margin: "1rem 0", padding: "1.25rem", background: "#f8fafc",
            borderRadius: "10px", border: "1px solid #e2e8f0",
          }}
        >
          <p className={styles.noticeTitle} style={{ margin: "0 0 1rem 0" }}>Restock: {selectedIngredient.name}</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
                Tambah Stok (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                className={styles.input}
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.25rem" }}>
                Update Harga per Kg (Opsional)
              </label>
              <input
                type="number"
                step="100"
                min="0"
                className={styles.input}
                value={restockPrice}
                onChange={(e) => setRestockPrice(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="submit" disabled={isSubmitting} className={clsx(styles.tabButton, styles.tabButtonActive)}>
              {isSubmitting ? "Menyimpan..." : "Simpan Restock"}
            </button>
            <button type="button" disabled={isSubmitting} className={styles.tabButton} onClick={() => setShowRestockForm(false)}>
              Batal
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>Memuat stok bahan baku...</div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Bahan</th>
                <th>Asal / Supplier</th>
                <th>Sisa Stok (kg)</th>
                <th>Harga/kg</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => (
                <tr key={item.id} style={{ background: item.stockKg <= 0 ? "#fff5f5" : item.stockKg < 5 ? "#fffbeb" : "white" }}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>
                    <div style={{ color: "#64748b" }}>{item.origin || "-"}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{item.supplierName || "-"}</div>
                  </td>
                  <td>
                    {item.stockKg <= 0 ? (
                      <span style={{ color: "#dc2626", fontWeight: 700 }}>Habis</span>
                    ) : item.stockKg < 5 ? (
                      <span style={{ color: "#d97706", fontWeight: 700 }}>Hampir Habis ({item.stockKg.toFixed(1)} kg)</span>
                    ) : (
                      <span style={{ color: "#16a34a", fontWeight: 600 }}>{item.stockKg.toFixed(1)} kg</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: "#475569" }}>
                    {item.pricePerKg > 0 ? formatCurrency(item.pricePerKg) : "-"}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleOpenRestock(item)}
                      style={{ color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", padding: "0.25rem 0.75rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
                    >
                      + Restock
                    </button>
                  </td>
                </tr>
              ))}
              {ingredients.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Belum ada data bahan baku.</td>
                </tr>
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
