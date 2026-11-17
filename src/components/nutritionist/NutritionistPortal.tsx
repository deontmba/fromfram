"use client";

import { useEffect } from "react";
import { Activity, BookOpen, CalendarDays, LayoutDashboard, Wheat } from "lucide-react";
import { PageHeader, PortalShell } from "../operations/portal-shell";
import { useNutritionistData } from "./hooks/useNutritionistData";
import { DashboardTab } from "./tabs/DashboardTab";
import { RecipesTab } from "./tabs/RecipesTab";
import { IngredientsTab } from "./tabs/IngredientsTab";
import { WeeklyMenuTab } from "./tabs/WeeklyMenuTab";
import { useState } from "react";
import styles from "../operations/role-portal-screen.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "recipes", label: "Resep", icon: BookOpen },
  { id: "ingredients", label: "Bahan Baku", icon: Wheat },
  { id: "weekly-menu", label: "Menu Mingguan", icon: CalendarDays },
] as const;

type TabId = (typeof TABS)[number]["id"];

const HERO: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dasbor Gizi",
    subtitle: "Validasi kalori, protein, dan kualitas menu mingguan.",
  },
  recipes: {
    title: "Resep",
    subtitle: "Komposisi bahan dan nilai gizi tiap resep sebelum tampil ke pelanggan.",
  },
  ingredients: {
    title: "Bahan Baku",
    subtitle: "Katalog dan harga acuan bahan baku untuk prediksi AI.",
  },
  "weekly-menu": {
    title: "Menu Mingguan",
    subtitle: "Kelompokkan menu berdasarkan target kesehatan pengguna.",
  },
};

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
    deleteWholeWeek,
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

  return (
    <PortalShell
      title="Panel Ahli Gizi"
      subtitle="FromFram"
      icon={Activity}
      accent={{ strong: "#1d4ed8", mid: "#4f8df8", soft: "#dbeafe" }}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabId)}
    >
          <div className={styles.contentWrap} key={activeTab}>
            <PageHeader title={HERO[activeTab].title} subtitle={HERO[activeTab].subtitle} />

            {/* Tab content */}
            {activeTab === "dashboard" && (
              <DashboardTab
                kpis={dashboardKpis}
                activities={activities}
                isLoading={isDashboardLoading}
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
                onDeleteWeek={deleteWholeWeek}
                onAutoGenerate={autoGenerateMenu}
              />
            )}
          </div>
    </PortalShell>
  );
}