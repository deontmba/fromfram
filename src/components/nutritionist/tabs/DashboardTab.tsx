"use client";

import type { ReactNode } from "react";
import { BookOpen, CalendarDays, Users } from "lucide-react";
import type { KpiItem, ActivityItem } from "../hooks/useNutritionistData";
import styles from "../../operations/role-portal-screen.module.css";

function activityIcon(type: ActivityItem["type"]): ReactNode {
  return type === "menu" ? <CalendarDays /> : <BookOpen />;
}

function kpiIcon(label: string): ReactNode {
  if (label.includes("Recipe") || label.includes("Resep")) return <BookOpen />;
  if (label.includes("Menu")) return <CalendarDays />;
  return <Users />;
}

type Props = {
  kpis: KpiItem[];
  activities: ActivityItem[];
  isLoading: boolean;
};

export function DashboardTab({ kpis, activities, isLoading }: Props) {
  if (isLoading) {
    return <div className={styles.emptyState}>Memuat data...</div>;
  }

  return (
    <>
      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiRow}>
              <p className={styles.kpiLabel} style={{ margin: 0 }}>{kpi.label}</p>
              <span className={styles.activityIcon}>{kpiIcon(kpi.label)}</span>
            </div>
            <p className={styles.kpiValue}>{kpi.value}</p>
            {kpi.delta ? <p className={styles.deltaBadge}>{kpi.delta}</p> : null}
          </article>
        ))}
      </div>

      <section className={styles.activityCard}>
        <h2 className={styles.activityHeader}>Aktivitas Terkini</h2>
        {activities.length === 0 ? (
          <p className={styles.emptyState}>Belum ada aktivitas.</p>
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
    </>
  );
}
