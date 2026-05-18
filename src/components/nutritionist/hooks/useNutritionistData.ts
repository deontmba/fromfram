"use client";

import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiItem = {
  label: string;
  value: string;
  delta: string;
};

export type ActivityItem = {
  text: string;
  time: string;
  type: "recipe" | "menu";
};

export type RecipeRow = {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  servings: number;
  imageUrl: string | null;
};

export type WeeklyMenuItem = {
  id: string;
  recipeName: string;
  calories: number;
  protein: number;
  suitableGoals: string[];
};

export type WeeklyMenuGroup = {
  weekStartDate: string;
  weekEndDate: string;
  isActiveWeek: boolean;
  menus: WeeklyMenuItem[];
};

export type GoalOption = {
  id: string;
  name: string;
};

export type RecipeFormData = {
  id: string;
  name: string;
  description: string;
  calories: string;
  protein: string;
  servings: string;
  imageUrl: string;
};

export type MenuFormData = {
  recipeId: string;
  weekStartDate: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNutritionistData() {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  const [dashboardKpis, setDashboardKpis] = useState<KpiItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
    try {
      const [kpiRes, actRes] = await Promise.all([
        fetch("/api/nutritionist/dashboard/kpis", { credentials: "include" }),
        fetch("/api/nutritionist/dashboard/activities", { credentials: "include" }),
      ]);

      if (kpiRes.ok) {
        const kpiJson = await kpiRes.json();
        const d = kpiJson.data ?? kpiJson;
        setDashboardKpis([
          { label: "Total Recipes", value: String(d.totalRecipes ?? 0), delta: "Realtime" },
          { label: "Weekly Menus", value: String(d.weeklyMenusCount ?? 0), delta: "Active" },
          { label: "Active Users", value: String(d.activeUsers ?? 0), delta: "Healthy" },
        ]);
      }

      if (actRes.ok) {
        const actJson = await actRes.json();
        setActivities(actJson.data ?? []);
      }
    } catch (err) {
      console.error("[useNutritionistData] fetchDashboard", err);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  // ── Recipes ────────────────────────────────────────────────────────────────
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [isRecipesLoading, setIsRecipesLoading] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setIsRecipesLoading(true);
    try {
      const res = await fetch("/api/nutritionist/recipes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recipes");
      const json = await res.json();
      setRecipes(json.data ?? []);
    } catch (err) {
      console.error("[useNutritionistData] fetchRecipes", err);
    } finally {
      setIsRecipesLoading(false);
    }
  }, []);

  const saveRecipe = useCallback(
    async (form: RecipeFormData): Promise<boolean> => {
      const method = form.id ? "PATCH" : "POST";
      const url = form.id
        ? `/api/nutritionist/recipes/${form.id}`
        : "/api/nutritionist/recipes";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          calories: parseInt(form.calories),
          protein: parseFloat(form.protein),
          servings: parseInt(form.servings),
          imageUrl: form.imageUrl || undefined,
        }),
      });

      if (!res.ok) return false;
      await fetchRecipes();
      return true;
    },
    [fetchRecipes]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/nutritionist/recipes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return false;
      await fetchRecipes();
      return true;
    },
    [fetchRecipes]
  );

  // ── Weekly Menus ───────────────────────────────────────────────────────────
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenuGroup[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalOption[]>([]);
  const [isWeeklyMenuLoading, setIsWeeklyMenuLoading] = useState(false);

  const fetchWeeklyMenus = useCallback(async () => {
    setIsWeeklyMenuLoading(true);
    try {
      const res = await fetch("/api/nutritionist/weekly-menus", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly menus");
      const json = await res.json() as { data?: WeeklyMenuGroup[]; goals?: GoalOption[] };
      setWeeklyMenus(json.data ?? []);
      setWeeklyGoals(json.goals ?? []);
    } catch (err) {
      console.error("[useNutritionistData] fetchWeeklyMenus", err);
    } finally {
      setIsWeeklyMenuLoading(false);
    }
  }, []);

  const addMenu = useCallback(
    async (form: MenuFormData): Promise<boolean> => {
      const res = await fetch("/api/nutritionist/weekly-menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recipeId: form.recipeId,
          weekStartDate: form.weekStartDate || new Date().toISOString(),
        }),
      });
      if (!res.ok) return false;
      await fetchWeeklyMenus();
      return true;
    },
    [fetchWeeklyMenus]
  );

  const deleteMenu = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/nutritionist/weekly-menus/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return false;
      await fetchWeeklyMenus();
      return true;
    },
    [fetchWeeklyMenus]
  );

  const autoGenerateMenu = useCallback(
    async (): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch("/api/nutritionist/weekly-menus/auto-generate", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            success: false,
            message: data.error || "Gagal meng-generate menu otomatis.",
          };
        }
        await fetchWeeklyMenus();
        return {
          success: true,
          message: data.message || "Berhasil meng-generate menu otomatis untuk minggu depan.",
        };
      } catch (err: any) {
        console.error("[useNutritionistData] autoGenerateMenu error:", err);
        return {
          success: false,
          message: err.message || "Terjadi kesalahan koneksi saat meng-generate menu.",
        };
      }
    },
    [fetchWeeklyMenus]
  );

  return {
    // Dashboard
    dashboardKpis,
    activities,
    isDashboardLoading,
    fetchDashboard,

    // Recipes
    recipes,
    isRecipesLoading,
    fetchRecipes,
    saveRecipe,
    deleteRecipe,

    // Weekly Menus
    weeklyMenus,
    weeklyGoals,
    isWeeklyMenuLoading,
    fetchWeeklyMenus,
    addMenu,
    deleteMenu,
    autoGenerateMenu,
  };
}