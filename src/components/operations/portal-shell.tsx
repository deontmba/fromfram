"use client";

import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import styles from "./role-portal-screen.module.css";

export type PortalTab = { id: string; label: string; icon: LucideIcon };

type Props = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: { strong: string; mid: string; soft: string };
  tabs: readonly PortalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
};

function logout() {
  fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
    window.location.href = "/login";
  });
}

/** Sidebar layout shared by the admin and nutritionist portals. */
export function PortalShell({ title, subtitle, icon: BrandIcon, accent, tabs, activeTab, onTabChange, children }: Props) {
  const themeVars = {
    "--accent-strong": accent.strong,
    "--accent-mid": accent.mid,
    "--accent-soft": accent.soft,
  } as CSSProperties;

  return (
    <div className={styles.shell} style={themeVars}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <BrandIcon aria-hidden="true" />
          </span>
          <div>
            <p className={styles.brandTitle}>{title}</p>
            <p className={styles.brandSub}>{subtitle}</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label={title}>
          <p className={styles.navLabel}>Menu</p>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${activeTab === id ? styles.navItemActive : ""}`}
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => onTabChange(id)}
            >
              <Icon aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.ghostButton} onClick={logout}>
            <LogOut aria-hidden="true" />
            Keluar
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.page}>{children}</div>
      </main>
    </div>
  );
}

/** Page title block used at the top of every tab. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1 className={styles.sectionTitle}>{title}</h1>
        {subtitle ? <p className={styles.sectionSub}>{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}
