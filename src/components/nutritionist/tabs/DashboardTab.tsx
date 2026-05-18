"use client";

import type { ReactNode } from "react";
import type { KpiItem, ActivityItem } from "../hooks/useNutritionistData";
import styles from "../../operations/role-portal-screen.module.css";

// ─── Icons ────────────────────────────────────────────────────────────────────

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a3.5 3.5 0 0 1 7 0M13 20a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Activity icons by type ───────────────────────────────────────────────────

function activityIcon(type: ActivityItem["type"]): ReactNode {
  switch (type) {
    case "recipe": return <BookIcon />;
    case "menu":   return <CalendarIcon />;
    default:       return <BookIcon />;
  }
}

// ─── KPI icons by label ───────────────────────────────────────────────────────

function kpiIcon(label: string): ReactNode {
  if (label.includes("Recipe")) return <BookIcon />;
  if (label.includes("Menu")) return <CalendarIcon />;
  return <PeopleIcon />;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    title: "Kelola Resep",
    subtitle: "Validasi AKG dan makronutrien",
    tab: "recipes",
    icon: <BookIcon />,
  },
  {
    title: "Jadwal Menu",
    subtitle: "Atur menu per tujuan kesehatan",
    tab: "weekly-menu",
    icon: <CalendarIcon />,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  kpis: KpiItem[];
  activities: ActivityItem[];
  isLoading: boolean;
  onNavigate: (tab: string) => void;
};

export function DashboardTab({ kpis, activities, isLoading, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
        Memuat data dashboard…
      </div>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, index) => (
          <article
            key={kpi.label}
            className={styles.kpiCard}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className={styles.kpiRow}>
              <span className={styles.activityIcon}>{kpiIcon(kpi.label)}</span>
              <span className={styles.deltaBadge}>{kpi.delta}</span>
            </div>
            <p className={styles.kpiValue}>{kpi.value}</p>
            <p className={styles.kpiLabel}>{kpi.label}</p>
          </article>
        ))}
      </div>

      {/* Aktivitas Terkini */}
      <section className={styles.activityCard}>
        <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>

        {activities.length === 0 ? (
          <p style={{ color: "#94a3b8", padding: "0.75rem 0", fontSize: "0.9rem" }}>
            Belum ada aktivitas tercatat.
          </p>
        ) : (
          <ul className={styles.activityList}>
            {activities.map((activity, i) => (
              <li key={`${activity.text}-${i}`} className={styles.activityItem}>
                <span className={styles.activityIcon}>{activityIcon(activity.type)}</span>
                <div>
                  <p className={styles.activityText}>{activity.text}</p>
                  <p className={styles.activityTime}>{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick Actions */}
      <div className={styles.actionGrid}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.title}
            type="button"
            className={styles.actionCard}
            onClick={() => onNavigate(action.tab)}
          >
            <span>{action.icon}</span>
            <p className={styles.actionTitle}>{action.title}</p>
            <p className={styles.actionSub}>{action.subtitle}</p>
          </button>
        ))}
      </div>
    </>
  );
}