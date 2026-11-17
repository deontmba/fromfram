"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, CircleAlert, CircleCheck, Pencil, Plus, Sparkles, Target, Trash2 } from "lucide-react";
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
      { label: "Target kesehatan", value: String(weeklyGoals.length), delta: "" },
      { label: "Menu dengan target", value: String(validatedSlots), delta: "" },
      { label: "Menu tanpa target", value: String(pendingReview), delta: "" },
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
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <article key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiRow}>
              <p className={styles.kpiLabel} style={{ margin: 0 }}>{kpi.label}</p>
              <span className={styles.activityIcon}>{[<Target key="t" />, <CircleCheck key="c" />, <CircleAlert key="a" />][i]}</span>
            </div>
            <p className={styles.kpiValue}>{kpi.value}</p>
          </article>
        ))}
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.select}
          aria-label="Tahun"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="all">Semua tahun</option>
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="Bulan"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="all">Semua bulan</option>
          {monthOptions.map((m) => (
            <option key={m} value={String(m)}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
        {(yearFilter !== "all" || monthFilter !== "all") && (
          <button
            type="button"
            className={styles.tabButton}
            onClick={() => {
              setYearFilter("all");
              setMonthFilter("all");
            }}
          >
            Semua pekan
          </button>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto", flexWrap: "wrap" }}>
          <button type="button" className={styles.tabButton} onClick={handleAutoGenerate} disabled={isGenerating}>
            <Sparkles aria-hidden="true" />
            {isGenerating ? "Menganalisis..." : "Buat Otomatis Pekan Depan"}
          </button>
          <button
            type="button"
            className={styles.actionCard}
            onClick={() => {
              setMenuForm({
                recipeId: "",
                weekStartDate: new Date().toISOString().slice(0, 10),
              });
              setShowForm(true);
            }}
          >
            <Plus aria-hidden="true" />
            Jadwalkan Menu
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAddMenu} className={styles.formCard}>
          <h2 className={styles.formTitle}>Jadwalkan Menu</h2>
          <div className={styles.fieldGrid} style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Resep</span>
              <select
                className={styles.select}
                required
                value={menuForm.recipeId}
                onChange={(e) => setMenuForm({ ...menuForm, recipeId: e.target.value })}
              >
                <option value="">Pilih resep</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tanggal dalam pekan</span>
              <input
                className={styles.input}
                type="date"
                required
                value={menuForm.weekStartDate}
                onChange={(e) => setMenuForm({ ...menuForm, weekStartDate: e.target.value })}
              />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.tabButton} onClick={() => setShowForm(false)} disabled={isSubmitting}>
              Batal
            </button>
            <button type="submit" className={styles.actionCard} disabled={isSubmitting}>
              {isSubmitting ? "Menambah..." : "Tambah"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className={styles.emptyState}>Memuat data menu...</div>
      ) : visibleWeeks.length === 0 ? (
        <div className={styles.emptyCard}>
          <CalendarDays aria-hidden="true" strokeWidth={1.5} />
          <h2>Belum ada menu pada periode ini</h2>
          <p>Ubah filter bulan atau tahun, atau jadwalkan resep untuk pekan ini.</p>
        </div>
      ) : (
        visibleWeeks.map((week) => {
          const isExpanded = expandedWeekStart === week.weekStartDate;

          return (
            <section
              key={week.weekStartDate}
              className={clsx(styles.weeklyMenuSection, week.isActiveWeek && styles.active)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className={styles.weeklyMenuHeader}
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedWeekStart(isExpanded ? null : week.weekStartDate)}
                >
                  <div className={styles.weeklyMenuHeaderContent}>
                    <p className={styles.weeklyMenuHeaderTitle}>
                      {formatWeekRangeLabel(week.weekStartDate, week.weekEndDate)}
                    </p>
                    <p className={styles.weeklyMenuHeaderSub}>{week.menus.length} menu</p>
                  </div>
                  <div className={styles.weeklyMenuHeaderRight}>
                    {week.isActiveWeek && <span className={clsx(styles.tag, styles.tagGreen)}>Minggu ini</span>}
                    <span className={clsx(styles.expandToggle, isExpanded && styles.expandToggleOpen)}>
                      <ChevronRight aria-hidden="true" />
                    </span>
                  </div>
                </button>

                {!week.isActiveWeek && (
                  <button
                    type="button"
                    className={styles.iconDangerButton}
                    onClick={() => handleDeleteWholeWeek(week.weekStartDate)}
                    aria-label="Hapus seluruh menu pekan ini"
                    title="Hapus seluruh menu pekan ini"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className={styles.weeklyMenuContent}>
                  <div className={styles.weeklyMenuAddButton}>
                    <button
                      type="button"
                      className={styles.tabButton}
                      onClick={() => {
                        setMenuForm({
                          recipeId: "",
                          weekStartDate: week.weekStartDate.slice(0, 10),
                        });
                        setShowForm(true);
                      }}
                    >
                      <Plus aria-hidden="true" />
                      Tambah resep ke pekan ini
                    </button>
                  </div>

                  <div className={styles.tableShell}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Resep</th>
                          <th>Kalori</th>
                          <th>Protein</th>
                          <th>Target kesehatan</th>
                          <th aria-label="Aksi" />
                        </tr>
                      </thead>
                      <tbody>
                        {week.menus.map((row) => {
                          const previewGoals = buildGoalPreview(row, goalOverrides);
                          const isEditingGoal = goalEditorMenuId === row.id;

                          return (
                            <tr key={row.id}>
                              <td className={styles.tableKey}>{row.recipeName}</td>
                              <td className={styles.nowrap}>{row.calories} kcal</td>
                              <td className={styles.nowrap}>{row.protein} g</td>
                              <td>
                                <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                  {previewGoals.length > 0 ? (
                                    previewGoals.map((g) => (
                                      <span key={g} className={clsx(styles.tag, styles.tagBlue)}>
                                        {g}
                                      </span>
                                    ))
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.goalLinkButton}
                                      onClick={() => setGoalEditorMenuId(row.id)}
                                    >
                                      + Hubungkan target
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className={styles.goalEditButton}
                                    onClick={() => setGoalEditorMenuId((curr) => (curr === row.id ? null : row.id))}
                                    aria-label="Ubah target kesehatan"
                                  >
                                    <Pencil aria-hidden="true" />
                                  </button>

                                  {isEditingGoal && (
                                    <div className={styles.goalPopover}>
                                      <div className={styles.goalPopoverTitle}>Hubungkan target kesehatan</div>
                                      <div className={styles.goalPopoverList}>
                                        {weeklyGoals.length === 0 ? (
                                          <p className={styles.fieldHint}>Belum ada target tersedia.</p>
                                        ) : (
                                          weeklyGoals.map((goal) => {
                                            const current = new Set(goalOverrides[row.id] ?? row.suitableGoals);
                                            const checked = current.has(goal.name);
                                            return (
                                              <label key={goal.id} className={styles.goalPopoverItem}>
                                                <input
                                                  type="checkbox"
                                                  checked={checked}
                                                  onChange={() => {
                                                    setGoalOverrides((prev) => {
                                                      const next = new Set(prev[row.id] ?? row.suitableGoals);
                                                      if (next.has(goal.name)) next.delete(goal.name);
                                                      else next.add(goal.name);
                                                      return { ...prev, [row.id]: Array.from(next) };
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
                                        <button type="button" className={styles.tabButton} onClick={() => setGoalEditorMenuId(null)}>
                                          Tutup
                                        </button>
                                        <button type="button" className={styles.actionCard} onClick={() => setGoalEditorMenuId(null)}>
                                          Simpan tampilan
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className={styles.alignRight}>
                                <button
                                  type="button"
                                  className={styles.iconDangerButton}
                                  onClick={() => handleDeleteMenu(row.id)}
                                  aria-label={`Hapus ${row.recipeName} dari pekan ini`}
                                >
                                  <Trash2 aria-hidden="true" />
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
