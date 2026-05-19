"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  WeeklyMenuGroup,
  WeeklyMenuItem,
  GoalOption,
  RecipeRow,
  MenuFormData,
  KpiItem,
} from "../hooks/useNutritionistData";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import styles from "../../operations/role-portal-screen.module.css";

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRangeLabel(start: string, end: string) {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function formatMonthLabel(monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(2026, monthIndex, 1)
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildGoalPreview(
  row: WeeklyMenuItem,
  overrides: Record<string, string[]>
): string[] {
  return overrides[row.id] ?? row.suitableGoals;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  weeklyMenus: WeeklyMenuGroup[];
  weeklyGoals: GoalOption[];
  recipes: RecipeRow[];
  isLoading: boolean;
  onAdd: (form: MenuFormData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onDeleteWeek: (weekStartDate: string) => Promise<boolean>;
  onAutoGenerate: () => Promise<{ success: boolean; message: string }>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyMenuTab({
  weeklyMenus,
  weeklyGoals,
  recipes,
  isLoading,
  onAdd,
  onDelete,
  onDeleteWeek,
  onAutoGenerate,
}: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: "default" | "destructive" | "admin" | "nutritionist";
    hideCancel?: boolean;
    onConfirm: () => void;
  } | null>(null);

  async function handleAutoGenerate() {
    setIsGenerating(true);
    const res = await onAutoGenerate();
    setIsGenerating(false);
    if (res.success && (res as any).weekStartDate) {
      setYearFilter("all");
      setMonthFilter("all");
      setExpandedWeekStart((res as any).weekStartDate);
    }
    setCustomAlert({
      title: res.success ? "Generasi Berhasil" : "Gagal Meng-generate",
      message: res.message,
      confirmLabel: res.success ? "OK" : "Tutup",
      variant: res.success ? "nutritionist" : "destructive",
      hideCancel: true,
      onConfirm: () => {},
    });
  }
  // ── Filters ────────────────────────────────────────────────────────────────
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const periods = useMemo(() => {
    const seen = new Map<string, { year: number; month: number }>();
    for (const week of weeklyMenus) {
      const d = new Date(week.weekStartDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) seen.set(key, { year: d.getFullYear(), month: d.getMonth() });
    }
    return Array.from(seen.values()).sort(
      (a, b) => b.year - a.year || b.month - a.month
    );
  }, [weeklyMenus]);

  const yearOptions = useMemo(
    () => Array.from(new Set(periods.map((p) => p.year))).sort((a, b) => b - a),
    [periods]
  );

  const monthOptions = useMemo(() => {
    const scoped =
      yearFilter === "all"
        ? periods
        : periods.filter((p) => p.year === Number(yearFilter));
    return Array.from(new Set(scoped.map((p) => p.month))).sort((a, b) => a - b);
  }, [periods, yearFilter]);

  const visibleWeeks = useMemo(
    () =>
      weeklyMenus.filter((w) => {
        const d = new Date(w.weekStartDate);
        const yr = yearFilter === "all" || d.getFullYear() === Number(yearFilter);
        const mo = monthFilter === "all" || d.getMonth() === Number(monthFilter);
        return yr && mo;
      }),
    [weeklyMenus, yearFilter, monthFilter]
  );



  // ── KPIs (derived) ─────────────────────────────────────────────────────────
  const [goalOverrides, setGoalOverrides] = useState<Record<string, string[]>>({});

  const kpis: KpiItem[] = useMemo(() => {
    const validatedSlots = visibleWeeks.reduce(
      (acc, w) =>
        acc + w.menus.filter((m) => buildGoalPreview(m, goalOverrides).length > 0).length,
      0
    );
    const pendingReview = visibleWeeks.reduce(
      (acc, w) =>
        acc + w.menus.filter((m) => buildGoalPreview(m, goalOverrides).length === 0).length,
      0
    );
    return [
      { label: "Goal Groups", value: String(weeklyGoals.length), delta: "Active" },
      { label: "Validated Slots", value: String(validatedSlots), delta: "On Track" },
      { label: "Pending Review", value: String(pendingReview), delta: "Needs Action" },
    ];
  }, [goalOverrides, visibleWeeks, weeklyGoals.length]);

  // ── Expand / collapse ──────────────────────────────────────────────────────
  const [expandedWeekStart, setExpandedWeekStart] = useState<string | null>(null);

  useEffect(() => {
    if (visibleWeeks.length === 0) {
      setExpandedWeekStart(null);
      return;
    }
    const preferred =
      visibleWeeks.find((w) => w.isActiveWeek) ?? visibleWeeks[0];
    setExpandedWeekStart((current) => {
      if (current && visibleWeeks.some((w) => w.weekStartDate === current))
        return current;
      return preferred.weekStartDate;
    });
  }, [visibleWeeks]);

  // ── Add form ───────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [menuForm, setMenuForm] = useState<MenuFormData>({ recipeId: "", weekStartDate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    const targetDate = menuForm.weekStartDate;
    setIsSubmitting(true);
    const ok = await onAdd(menuForm);
    setIsSubmitting(false);
    if (ok) {
      setShowForm(false);
      setMenuForm({ recipeId: "", weekStartDate: "" });
      if (targetDate) {
        const inputDate = new Date(targetDate);
        inputDate.setHours(0, 0, 0, 0);
        const day = inputDate.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        inputDate.setDate(inputDate.getDate() + diff);

        setYearFilter("all");
        setMonthFilter("all");
        setExpandedWeekStart(inputDate.toISOString());
      }
      setCustomAlert({
        title: "Menu Ditambahkan",
        message: "Resep berhasil dijadwalkan ke menu mingguan.",
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => {},
      });
    } else {
      setCustomAlert({
        title: "Gagal Menambahkan Menu",
        message: "Terjadi kesalahan saat menambahkan resep ke jadwal menu mingguan.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => {},
      });
    }
  }

  async function handleDeleteMenu(id: string) {
    setCustomAlert({
      title: "Hapus Menu Mingguan",
      message: "Apakah Anda yakin ingin menghapus resep ini dari jadwal menu?",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "destructive",
      onConfirm: async () => {
        setIsSubmitting(true);
        const ok = await onDelete(id);
        setIsSubmitting(false);
        if (!ok) {
          setCustomAlert({
            title: "Gagal Menghapus Menu",
            message: "Terjadi kesalahan saat menghapus menu dari jadwal.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => {},
          });
        } else {
          setGoalEditorMenuId((curr) => (curr === id ? null : curr));
          setGoalOverrides((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          setCustomAlert({
            title: "Menu Dihapus",
            message: "Menu berhasil dihapus dari jadwal mingguan.",
            confirmLabel: "OK",
            variant: "nutritionist",
            hideCancel: true,
            onConfirm: () => {},
          });
        }
      },
    });
  }

  async function handleDeleteWholeWeek(weekStartDate: string) {
    const formattedRange = formatWeekRangeLabel(
      weekStartDate,
      new Date(new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
    );
    setCustomAlert({
      title: "Hapus Menu Pekan",
      message: `Apakah Anda yakin ingin menghapus seluruh jadwal menu untuk pekan ${formattedRange}? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "destructive",
      onConfirm: async () => {
        setIsSubmitting(true);
        const ok = await onDeleteWeek(weekStartDate);
        setIsSubmitting(false);
        if (ok) {
          setCustomAlert({
            title: "Menu Pekan Dihapus",
            message: "Seluruh jadwal menu untuk pekan tersebut berhasil dihapus.",
            confirmLabel: "OK",
            variant: "nutritionist",
            hideCancel: true,
            onConfirm: () => {},
          });
        } else {
          setCustomAlert({
            title: "Gagal Menghapus",
            message: "Terjadi kesalahan saat menghapus jadwal menu pekan tersebut.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => {},
          });
        }
      },
    });
  }

  // ── Goal editor ────────────────────────────────────────────────────────────
  const [goalEditorMenuId, setGoalEditorMenuId] = useState<string | null>(null);

  return (
    <>
      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <article
            key={kpi.label}
            className={styles.kpiCard}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={styles.kpiRow}>
              <span className={styles.deltaBadge}>{kpi.delta}</span>
            </div>
            <p className={styles.kpiValue}>{kpi.value}</p>
            <p className={styles.kpiLabel}>{kpi.label}</p>
          </article>
        ))}
      </div>

      {/* Info + filter bar */}
      <div 
        className={styles.notice} 
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
      >
        <div>
          <p className={styles.noticeTitle}>Menu Mingguan</p>
          <p>
            Setiap kartu mewakili satu minggu kalender. Badge{" "}
            <strong>Minggu ini</strong> menandai minggu yang sedang berjalan.
          </p>
          {visibleWeeks.length > 0 && (
            <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0.5rem 0 0 0" }}>
              {visibleWeeks.length} minggu ditemukan pada periode ini
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className={styles.tabButton}
            onClick={() => {
              setMenuForm({
                recipeId: "",
                weekStartDate: new Date().toISOString().slice(0, 10),
              });
              setShowForm(true);
            }}
            style={{
              whiteSpace: "nowrap",
              border: "1px solid #1d4ed8",
              color: "#1d4ed8",
              fontWeight: "bold",
              background: "#eff6ff",
            }}
          >
            + Jadwalkan Menu
          </button>
          <button
            type="button"
            className={clsx(styles.tabButton, styles.tabButtonActive)}
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            style={{ whiteSpace: "nowrap" }}
          >
            {isGenerating ? "Menganalisis..." : "Auto-Generate Pekan Selanjutnya"}
          </button>
        </div>
      </div>

      <div
        className={styles.searchRow}
        style={{ marginTop: "1rem", gridTemplateColumns: "1fr 1fr 1fr" }}
      >
        <select
          className={styles.select}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="all">Semua Tahun</option>
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="all">Semua Bulan</option>
          {monthOptions.map((m) => (
            <option key={m} value={String(m)}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.tabButton}
          onClick={() => {
            setYearFilter("all");
            setMonthFilter("all");
          }}
        >
          Tampilkan Semua Pekan
        </button>
      </div>

      {/* Add-menu form (global, shown above list) */}
      {showForm && (
        <form
          onSubmit={handleAddMenu}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            margin: "1rem 0",
            padding: "1rem",
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
          }}
        >
          <select
            className={styles.select}
            style={{ flex: "2 1 200px" }}
            required
            value={menuForm.recipeId}
            onChange={(e) => setMenuForm({ ...menuForm, recipeId: e.target.value })}
          >
            <option value="">— Pilih Resep —</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <input
            className={styles.input}
            style={{ flex: "0 1 180px" }}
            type="date"
            required
            value={menuForm.weekStartDate}
            onChange={(e) => setMenuForm({ ...menuForm, weekStartDate: e.target.value })}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx(styles.tabButton, styles.tabButtonActive)}
          >
            {isSubmitting ? "Menambah…" : "Tambah"}
          </button>

          <button
            type="button"
            className={styles.tabButton}
            onClick={() => setShowForm(false)}
            disabled={isSubmitting}
          >
            Batal
          </button>
        </form>
      )}

      {/* Weekly cards */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
          Memuat data menu…
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
          {visibleWeeks.length === 0 ? (
            <div className={styles.notice} style={{ marginBottom: 0 }}>
              <p className={styles.noticeTitle}>Belum ada menu pada periode ini.</p>
              <p>Coba ubah filter bulan/tahun, atau tambahkan resep ke minggu ini.</p>
            </div>
          ) : (
            visibleWeeks.map((week) => {
              const isExpanded = expandedWeekStart === week.weekStartDate;

              return (
                <section
                  key={week.weekStartDate}
                  style={{
                    borderRadius: "18px",
                    border: week.isActiveWeek
                      ? "1px solid #1d4ed8"
                      : "1px solid #e5e7eb",
                    background: week.isActiveWeek
                      ? "linear-gradient(180deg,#eff6ff 0%,#ffffff 100%)"
                      : "#ffffff",
                    boxShadow: week.isActiveWeek
                      ? "0 14px 28px rgba(29,78,216,.12)"
                      : "0 10px 22px rgba(15,23,42,.06)",
                    padding: "1rem",
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      width: "100%",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWeekStart(isExpanded ? null : week.weekStartDate)
                      }
                      style={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <p className={styles.noticeTitle} style={{ marginBottom: "0.2rem" }}>
                          {formatWeekRangeLabel(week.weekStartDate, week.weekEndDate)}
                        </p>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "0.92rem" }}>
                          {week.menus.length} menu tersimpan untuk minggu ini.
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {week.isActiveWeek && (
                          <span className={clsx(styles.tag, styles.tagGreen)}>Minggu ini</span>
                        )}
                        <span
                          aria-hidden="true"
                          style={{ fontSize: "1.15rem", color: "#64748b" }}
                        >
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      </div>
                    </button>

                    {!week.isActiveWeek && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWholeWeek(week.weekStartDate);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "#ef4444",
                          padding: "0.5rem",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Hapus seluruh menu pekan ini"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ marginTop: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginBottom: "0.75rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuForm({
                              recipeId: "",
                              weekStartDate: week.weekStartDate.slice(0, 10),
                            });
                            setShowForm(true);
                          }}
                          style={{
                            border: "1px solid #1d4ed8",
                            background: "#eef4ff",
                            color: "#1d4ed8",
                            fontWeight: 700,
                            borderRadius: "999px",
                            padding: "0.55rem 0.9rem",
                            cursor: "pointer",
                          }}
                        >
                          + Tambah resep ke minggu ini
                        </button>
                      </div>

                      <div className={styles.tableShell}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Resep</th>
                              <th>Kalori</th>
                              <th>Protein</th>
                              <th>Suitable Goals</th>
                              <th>Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {week.menus.map((row) => {
                              const previewGoals = buildGoalPreview(row, goalOverrides);
                              const isEditingGoal = goalEditorMenuId === row.id;

                              return (
                                <tr key={row.id}>
                                  <td>{row.recipeName}</td>
                                  <td>{row.calories} kcal</td>
                                  <td>{row.protein} g</td>
                                  <td>
                                    <div
                                      style={{
                                        position: "relative",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.4rem",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {previewGoals.length > 0 ? (
                                        previewGoals.map((g) => (
                                          <span
                                            key={g}
                                            className={clsx(styles.tag, styles.tagBlue)}
                                          >
                                            {g}
                                          </span>
                                        ))
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.goalLinkButton}
                                          onClick={() => setGoalEditorMenuId(row.id)}
                                        >
                                          + Hubungkan Target
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        className={styles.goalEditButton}
                                        onClick={() =>
                                          setGoalEditorMenuId((curr) =>
                                            curr === row.id ? null : row.id
                                          )
                                        }
                                        aria-label="Edit target kesehatan"
                                      >
                                        ✎
                                      </button>

                                      {isEditingGoal && (
                                        <div className={styles.goalPopover}>
                                          <div className={styles.goalPopoverTitle}>
                                            Hubungkan target kesehatan
                                          </div>
                                          <div className={styles.goalPopoverList}>
                                            {weeklyGoals.length === 0 ? (
                                              <p style={{ margin: 0, color: "#64748b" }}>
                                                Belum ada goal master tersedia.
                                              </p>
                                            ) : (
                                              weeklyGoals.map((goal) => {
                                                const current = new Set(
                                                  goalOverrides[row.id] ?? row.suitableGoals
                                                );
                                                const checked = current.has(goal.name);
                                                return (
                                                  <label
                                                    key={goal.id}
                                                    className={styles.goalPopoverItem}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      onChange={() => {
                                                        setGoalOverrides((prev) => {
                                                          const next = new Set(
                                                            prev[row.id] ?? row.suitableGoals
                                                          );
                                                          if (next.has(goal.name))
                                                            next.delete(goal.name);
                                                          else next.add(goal.name);
                                                          return {
                                                            ...prev,
                                                            [row.id]: Array.from(next),
                                                          };
                                                        });
                                                      }}
                                                    />
                                                    <span>{goal.name}</span>
                                                  </label>
                                                );
                                              })
                                            )}
                                          </div>
                                          <div className={styles.goalPopoverActions}>
                                            <button
                                              type="button"
                                              className={styles.tabButton}
                                              onClick={() => setGoalEditorMenuId(null)}
                                            >
                                              Tutup
                                            </button>
                                            <button
                                              type="button"
                                              className={clsx(
                                                styles.tabButton,
                                                styles.tabButtonActive
                                              )}
                                              onClick={() => setGoalEditorMenuId(null)}
                                            >
                                              Simpan tampilan
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className={styles.iconDangerButton}
                                      onClick={() => handleDeleteMenu(row.id)}
                                      aria-label="Hapus menu mingguan"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                        width="18"
                                        height="18"
                                      >
                                        <path
                                          d="M4 7h16"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M10 11v6M14 11v6"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M6 7l1 13h10l1-13"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M9 7V4h6v3"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              );
            })
          )}
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