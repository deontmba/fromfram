"use client";

import { useEffect, type CSSProperties } from "react";
import { useNutritionistData } from "./hooks/useNutritionistData";
import { DashboardTab } from "./tabs/DashboardTab";
import { RecipesTab } from "./tabs/RecipesTab";
import { IngredientsTab } from "./tabs/IngredientsTab";
import { WeeklyMenuTab } from "./tabs/WeeklyMenuTab";
import { useState } from "react";
import styles from "../operations/role-portal-screen.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "recipes", label: "Recipes" },
  { id: "ingredients", label: "Bahan Baku" },
  { id: "weekly-menu", label: "Weekly Menu" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const HERO: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Nutrition Control Center",
    subtitle: "Validasi kalori, protein, dan kualitas menu mingguan.",
  },
  recipes: {
    title: "Recipe Nutrition Validation",
    subtitle: "Periksa detail resep sebelum dipublikasikan ke user.",
  },
  ingredients: {
    title: "Manajemen Bahan Baku",
    subtitle: "Kelola stok dan harga bahan baku untuk keperluan AI Forecasting.",
  },
  "weekly-menu": {
    title: "Weekly Menu Validation by Goal",
    subtitle: "Kelompokkan menu berdasarkan target kesehatan pengguna.",
  },
};

const ACCENT: CSSProperties = {
  "--accent-strong": "#1d4ed8",
  "--accent-mid": "#4f8df8",
  "--accent-soft": "#dbeafe",
} as CSSProperties;

// ─── Icons ────────────────────────────────────────────────────────────────────

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M3 12h4l2-4 3 8 2-4h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NutritionistPortal() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const {
    dashboardKpis,
    activities,
    isDashboardLoading,
    fetchDashboard,

    recipes,
    isRecipesLoading,
    fetchRecipes,
    saveRecipe,
    deleteRecipe,

    ingredientOptions,
    isIngredientsLoading,
    fetchIngredients,
    saveIngredient,
    deleteIngredient,

    weeklyMenus,
    weeklyGoals,
    isWeeklyMenuLoading,
    fetchWeeklyMenus,
    addMenu,
    deleteMenu,
    autoGenerateMenu,
  } = useNutritionistData();

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === "dashboard") fetchDashboard();
    else if (activeTab === "recipes") {
      fetchRecipes();
      fetchIngredients();
    } else if (activeTab === "ingredients") {
      fetchIngredients();
    } else if (activeTab === "weekly-menu") {
      fetchWeeklyMenus();
      fetchRecipes();
    }
  }, [activeTab, fetchDashboard, fetchRecipes, fetchIngredients, fetchWeeklyMenus]);

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      window.location.href = "/login";
    });
  }

  return (
    <main className={styles.shell} style={ACCENT}>
      <div className={styles.page}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <PulseIcon />
            </span>
            <div>
              <h1 className={styles.brandTitle}>Panel Ahli Gizi</h1>
              <p className={styles.brandSub}>FromFram Nutrition Management</p>
            </div>
          </div>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </header>

        <section className={styles.panelCard}>
          {/* Tab nav */}
          <div className={styles.tabList}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.contentWrap}>
            <h2 className={styles.sectionTitle}>{HERO[activeTab].title}</h2>
            <p className={styles.sectionSub}>{HERO[activeTab].subtitle}</p>

            {/* Tab content */}
            {activeTab === "dashboard" && (
              <DashboardTab
                kpis={dashboardKpis}
                activities={activities}
                isLoading={isDashboardLoading}
                onNavigate={(tab) => setActiveTab(tab as TabId)}
              />
            )}

            {activeTab === "ingredients" && (
              <IngredientsTab
                ingredients={ingredientOptions}
                isLoading={isIngredientsLoading}
                onSave={saveIngredient}
                onDelete={deleteIngredient}
              />
            )}

            {activeTab === "recipes" && (
              <RecipesTab
                recipes={recipes}
                isLoading={isRecipesLoading}
                ingredientOptions={ingredientOptions}
                isIngredientsLoading={isIngredientsLoading}
                onSave={saveRecipe}
                onDelete={deleteRecipe}
              />
            )}

            {activeTab === "weekly-menu" && (
              <WeeklyMenuTab
                weeklyMenus={weeklyMenus}
                weeklyGoals={weeklyGoals}
                recipes={recipes}
                isLoading={isWeeklyMenuLoading}
                onAdd={addMenu}
                onDelete={deleteMenu}
                onAutoGenerate={autoGenerateMenu}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}