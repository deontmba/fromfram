"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./role-portal-screen.module.css";

type RoleVariant = "admin" | "nutritionist";

type TabItem = {
  id: string;
  label: string;
};

type KpiItem = {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
};

type ActivityItem = {
  text: string;
  time: string;
  type: "user" | "subscription" | "delivered" | "shipped";
  timestamp: string;
  icon: ReactNode;
};

type ActionItem = {
  title: string;
  subtitle: string;
  icon: ReactNode;
};

type DeliveryRow = {
  id: string;
  user: string;
  userId: string;
  mealType: "LUNCH" | "DINNER";
  menu: string;
  address: string;
  plan: string | null;
  deliveryDate: string;
  status: "PREPARING" | "SHIPPED" | "DELIVERED";
  shippedAt: string | null;
  deliveredAt: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  plan: string | null;
  servings: number | null;
  subscriptionStatus: string | null;
  goal: string | null;
  joinedAt: string;
  nextDelivery: string | null;
  totalDeliveries: number;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RecipeRow = {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  servings: number;
};

type WeeklyMenuItem = {
  id: string;
  recipeName: string;
  calories: number;
  protein: number;
  suitableGoals: string[];
};

type WeeklyMenuGroup = {
  weekStartDate: string;
  weekEndDate: string;
  isActiveWeek: boolean;
  menus: WeeklyMenuItem[];
};

type GoalOption = {
  id: string;
  name: string;
};

type RoleConfig = {
  title: string;
  subtitle: string;
  tabs: TabItem[];
  heroTitle: Record<string, string>;
  heroSubtitle: Record<string, string>;
  actions: ActionItem[];
  accentStrong: string;
  accentMid: string;
  accentSoft: string;
};

const adminConfig: RoleConfig = {
  title: "Admin Panel",
  subtitle: "FromFram Operations",
  tabs: [
    { id: "dashboard", label: "Dashboard" },
    { id: "deliveries", label: "Deliveries" },
    { id: "users", label: "Users" },
  ],
  heroTitle: {
    dashboard: "Operational Dashboard",
    deliveries: "Delivery Operations",
    users: "User and Subscription Management",
  },
  heroSubtitle: {
    dashboard: "Pantau data operasional harian dalam satu layar.",
    deliveries: "Kontrol status batch delivery dan monitor flow logistik.",
    users: "Lihat status pelanggan dan dampaknya ke pengiriman berikutnya.",
  },
  actions: [
    { title: "Kelola Users", subtitle: "Lihat dan update data user", icon: <PeopleIcon /> },
    { title: "Deliveries", subtitle: "Track dan manage delivery", icon: <TruckIcon /> },
    { title: "Reports", subtitle: "Pantau tren operasional", icon: <ChartArrowIcon /> },
  ],
  accentStrong: "#e12533",
  accentMid: "#ff575f",
  accentSoft: "#ffd5d8",
};

const nutritionConfig: RoleConfig = {
  title: "Panel Ahli Gizi",
  subtitle: "FromFram Nutrition Management",
  tabs: [
    { id: "dashboard", label: "Dashboard" },
    { id: "recipes", label: "Recipes" },
    { id: "weekly-menu", label: "Weekly Menu" },
  ],
  heroTitle: {
    dashboard: "Nutrition Control Center",
    recipes: "Recipe Nutrition Validation",
    "weekly-menu": "Weekly Menu Validation by Goal",
  },
  heroSubtitle: {
    dashboard: "Validasi kalori, protein, dan kualitas menu mingguan.",
    recipes: "Periksa detail resep sebelum dipublikasikan ke user.",
    "weekly-menu": "Kelompokkan menu berdasarkan target kesehatan pengguna.",
  },
  actions: [
    { title: "Kelola Resep", subtitle: "Validasi AKG dan makronutrien", icon: <BookIcon /> },
    { title: "Jadwal Menu", subtitle: "Atur menu per tujuan kesehatan", icon: <CalendarIcon /> },
    { title: "Rekomendasi", subtitle: "Saran gizi untuk kebutuhan khusus", icon: <PulseIcon /> },
  ],
  accentStrong: "#1d4ed8",
  accentMid: "#4f8df8",
  accentSoft: "#dbeafe",
};

const statusClass: Record<string, string> = {
  PREPARING: styles.tagAmber,
  SHIPPED: styles.tagRed,
  DELIVERED: styles.tagGreen,
  ACTIVE: styles.tagGreen,
  PAUSED: styles.tagAmber,
  CANCELLED: styles.tagRed,
  UNPAID: styles.tagAmber,
  Mudah: styles.tagBlue,
  Sedang: styles.tagAmber,
  Sulit: styles.tagRed,
  OK: styles.tagGreen,
  "Needs Review": styles.tagRed,
  Valid: styles.tagGreen,
  Review: styles.tagAmber,
};

const activityIconMap: Record<ActivityItem["type"], ReactNode> = {
  user: <PeopleIcon />,
  subscription: <ChartArrowIcon />,
  delivered: <CheckCircleIcon />,
  shipped: <TruckIcon />,
};

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function formatWeekRangeLabel(weekStartDate: string, weekEndDate: string) {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(weekStartDate))} - ${formatter.format(new Date(weekEndDate))}`;
}

function formatMonthLabel(monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(2026, monthIndex, 1)
  );
}

function buildGoalPreview(
  row: WeeklyMenuItem,
  goalOverrides: Record<string, string[]>
) {
  return goalOverrides[row.id] ?? row.suitableGoals;
}

export function RolePortalScreen({ role }: { role: RoleVariant }) {
  const config = role === "admin" ? adminConfig : nutritionConfig;
  const [activeTab, setActiveTab] = useState(config.tabs[0].id);

  // ── Admin: Dashboard state ──────────────────────────────────────────────
  const [dashboardKpis, setDashboardKpis] = useState<KpiItem[] | null>(null);
  const [dashboardActivities, setDashboardActivities] = useState<ActivityItem[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ── Admin: Deliveries state ─────────────────────────────────────────────
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [deliveryPagination, setDeliveryPagination] = useState<Pagination | null>(null);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [deliveryAreaFilter, setDeliveryAreaFilter] = useState("all");
  const [deliveryDateFilter, setDeliveryDateFilter] = useState("");
  const [deliveryMealTypeFilter, setDeliveryMealTypeFilter] = useState("all");
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // ── Admin: Users state ──────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userPagination, setUserPagination] = useState<Pagination | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [usersLoading, setUsersLoading] = useState(false);

  // ── Shared error ────────────────────────────────────────────────────────
  const [error, setError] = useState("");

  // ── Nutritionist states (tidak diubah) ──────────────────────────────────
  const [nutritionKpis, setNutritionKpis] = useState<KpiItem[] | null>(null);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenuGroup[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<GoalOption[]>([]);
  const [weeklyYearFilter, setWeeklyYearFilter] = useState<string>(
    String(new Date().getFullYear())
  );
  const [weeklyMonthFilter, setWeeklyMonthFilter] = useState<string>(
    String(new Date().getMonth())
  );
  const [expandedWeekStartDate, setExpandedWeekStartDate] = useState<string | null>(null);
  const [goalEditorMenuId, setGoalEditorMenuId] = useState<string | null>(null);
  const [goalOverrides, setGoalOverrides] = useState<Record<string, string[]>>({});
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState({
    id: "",
    name: "",
    description: "",
    calories: "",
    protein: "",
    servings: "",
  });
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({ recipeId: "", weekStartDate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nutritionistLoading, setNutritionistLoading] = useState(false);

  const themeVars = {
    "--accent-strong": config.accentStrong,
    "--accent-mid": config.accentMid,
    "--accent-soft": config.accentSoft,
  } as CSSProperties;

  // ── Fetch: Dashboard KPIs & Activities ─────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setError("");
    try {
      const [kpisRes, activitiesRes] = await Promise.all([
        fetch("/api/admin/dashboard/kpis", { credentials: "include" }),
        fetch("/api/admin/dashboard/activities?limit=8", { credentials: "include" }),
      ]);

      if (!kpisRes.ok) throw new Error("Gagal mengambil KPI dashboard");
      if (!activitiesRes.ok) throw new Error("Gagal mengambil aktivitas");

      const kpisData = await kpisRes.json();
      const activitiesData = await activitiesRes.json();

      setDashboardKpis([
        {
          label: "Total Users",
          value: String(kpisData.totalUsers ?? 0),
          delta: "Realtime",
          icon: <PeopleIcon />,
        },
        {
          label: "Active Subscriptions",
          value: String(kpisData.activeSubscriptions ?? 0),
          delta: "Realtime",
          icon: <ChartArrowIcon />,
        },
        {
          label: "Deliveries Today",
          value: String(kpisData.deliveriesToday ?? 0),
          delta: "Hari ini",
          icon: <BoxIcon />,
        },
      ]);

      const rawActivities: ActivityItem[] = (activitiesData.activities ?? []).map(
        (a: { text: string; type: ActivityItem["type"]; time: string; timestamp: string }) => ({
          text: a.text,
          type: a.type,
          time: a.time,
          timestamp: a.timestamp,
          icon: activityIconMap[a.type] ?? <BoxIcon />,
        })
      );
      setDashboardActivities(rawActivities);
    } catch (err) {
      console.error("[FETCH DASHBOARD]", err);
      setError("Gagal memuat data dashboard");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // ── Fetch: Deliveries ───────────────────────────────────────────────────
  const fetchDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (deliveryStatusFilter !== "all") params.set("status", deliveryStatusFilter.toUpperCase());
      if (deliveryAreaFilter !== "all") params.set("area", deliveryAreaFilter);
      if (deliveryDateFilter) params.set("date", deliveryDateFilter);
      if (deliveryMealTypeFilter !== "all") params.set("mealType", deliveryMealTypeFilter.toUpperCase());
      if (deliverySearch) params.set("search", deliverySearch);
      params.set("page", String(deliveryPage));

      const res = await fetch(`/api/admin/deliveries?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal mengambil data deliveries");
      const data = await res.json();
      setDeliveries(data.data ?? []);
      setDeliveryPagination(data.pagination ?? null);
    } catch (err) {
      console.error("[FETCH DELIVERIES]", err);
      setError("Gagal memuat data deliveries");
    } finally {
      setDeliveriesLoading(false);
    }
  }, [
    deliveryStatusFilter,
    deliveryAreaFilter,
    deliveryDateFilter,
    deliveryMealTypeFilter,
    deliverySearch,
    deliveryPage,
  ]);

  // ── Fetch: Users ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      if (userStatusFilter !== "all") params.set("status", userStatusFilter.toUpperCase());
      if (userPlanFilter !== "all") params.set("plan", userPlanFilter.toUpperCase());
      params.set("page", String(userPage));

      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal mengambil data users");
      const data = await res.json();
      setUsers(data.data ?? []);
      setUserPagination(data.pagination ?? null);
    } catch (err) {
      console.error("[FETCH USERS]", err);
      setError("Gagal memuat data users");
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userStatusFilter, userPlanFilter, userPage]);

  // ── Nutritionist fetchers (tidak diubah) ────────────────────────────────
  const fetchNutritionKpis = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/dashboard/kpis", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch KPIs");
      const data = await res.json();
      setNutritionKpis([
        {
          label: "Total Recipes",
          value: String(data.data.totalRecipes),
          delta: "Realtime",
          icon: <BookIcon />,
        },
        {
          label: "Weekly Menus",
          value: String(data.data.weeklyMenusCount),
          delta: "Active",
          icon: <CalendarIcon />,
        },
        {
          label: "Active Users",
          value: String(data.data.activeUsers),
          delta: "Healthy",
          icon: <PeopleIcon />,
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/recipes", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch recipes");
      const data = await res.json();
      setRecipes(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchWeeklyMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/weekly-menus", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch weekly menus");
      const data = await res.json() as {
        data?: WeeklyMenuGroup[];
        goals?: GoalOption[];
      };
      setWeeklyMenus(data.data || []);
      setWeeklyGoals(data.goals || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ── Load data saat tab aktif berubah ────────────────────────────────────
  useEffect(() => {
    if (role === "admin") {
      if (activeTab === "dashboard") fetchDashboard();
      else if (activeTab === "deliveries") fetchDeliveries();
      else if (activeTab === "users") fetchUsers();
    } else if (role === "nutritionist") {
      setNutritionistLoading(true);
      const load = async () => {
        if (activeTab === "dashboard") await fetchNutritionKpis();
        else if (activeTab === "recipes") await fetchRecipes();
        else if (activeTab === "weekly-menu") await fetchWeeklyMenus();
        setNutritionistLoading(false);
      };
      load();
    }
  }, [
    role,
    activeTab,
    fetchDashboard,
    fetchDeliveries,
    fetchUsers,
    fetchNutritionKpis,
    fetchRecipes,
    fetchWeeklyMenus,
  ]);

  // Re-fetch deliveries ketika filter berubah, reset ke page 1
  useEffect(() => {
    if (role === "admin" && activeTab === "deliveries") {
      setDeliveryPage(1);
    }
  }, [deliveryStatusFilter, deliveryAreaFilter, deliveryDateFilter, deliveryMealTypeFilter, deliverySearch, role, activeTab]);

  // Re-fetch users ketika filter berubah, reset ke page 1
  useEffect(() => {
    if (role === "admin" && activeTab === "users") {
      setUserPage(1);
    }
  }, [userSearch, userStatusFilter, userPlanFilter, role, activeTab]);

  // ── Advance Delivery ────────────────────────────────────────────────────
  async function advanceDelivery(id: string) {
    setAdvancingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/deliveries/${id}/advance`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance delivery");
      await fetchDeliveries();
    } catch (err: unknown) {
      console.error("[ADVANCE DELIVERY]", err);
      const message =
        err instanceof Error ? err.message : "Gagal memajukan status delivery";
      setError(message);
    } finally {
      setAdvancingId(null);
    }
  }

  // ── CRUD Nutritionist ───────────────────────────────────────────────────
  async function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = recipeForm.id ? "PATCH" : "POST";
      const url = recipeForm.id
        ? `/api/nutritionist/recipes/${recipeForm.id}`
        : "/api/nutritionist/recipes";
      const body = {
        name: recipeForm.name,
        description: recipeForm.description,
        calories: parseInt(recipeForm.calories),
        protein: parseFloat(recipeForm.protein),
        servings: parseInt(recipeForm.servings),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menyimpan resep");
      await fetchRecipes();
      setShowRecipeForm(false);
      setRecipeForm({ id: "", name: "", description: "", calories: "", protein: "", servings: "" });
    } catch (err) {
      console.error(err);
      alert("Error saving recipe");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRecipe(id: string) {
    if (!confirm("Hapus resep ini?")) return;
    try {
      const res = await fetch(`/api/nutritionist/recipes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menghapus resep");
      await fetchRecipes();
    } catch (err) {
      console.error(err);
      alert("Error deleting recipe");
    }
  }

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/nutritionist/weekly-menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: menuForm.recipeId,
          weekStartDate: menuForm.weekStartDate || new Date().toISOString(),
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menambah menu");
      await fetchWeeklyMenus();
      setShowMenuForm(false);
      setMenuForm({ recipeId: "", weekStartDate: "" });
    } catch (err) {
      console.error(err);
      alert("Error adding menu");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMenu(id: string) {
    if (!confirm("Hapus dari jadwal minggu ini?")) return;
    try {
      const res = await fetch(`/api/nutritionist/weekly-menus/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menghapus menu");
      setGoalEditorMenuId((current) => (current === id ? null : current));
      setGoalOverrides((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await fetchWeeklyMenus();
    } catch (err) {
      console.error(err);
      alert("Error deleting menu");
    }
  }

  // ── Computed KPIs ───────────────────────────────────────────────────────
  const deliveryKpis = useMemo<KpiItem[]>(() => {
    const preparing = deliveries.filter((d) => d.status === "PREPARING").length;
    const shipped = deliveries.filter((d) => d.status === "SHIPPED").length;
    const delivered = deliveries.filter((d) => d.status === "DELIVERED").length;
    return [
      { label: "Preparing", value: String(preparing), delta: "Live", icon: <ClockIcon /> },
      { label: "Shipped", value: String(shipped), delta: "Live", icon: <TruckIcon /> },
      { label: "Delivered", value: String(delivered), delta: "Live", icon: <CheckCircleIcon /> },
    ];
  }, [deliveries]);

  const userKpis = useMemo<KpiItem[]>(() => {
    const total = userPagination?.total ?? users.length;
    const active = users.filter((u) => u.subscriptionStatus === "ACTIVE").length;
    const pausedCancelled = users.filter(
      (u) =>
        u.subscriptionStatus === "PAUSED" || u.subscriptionStatus === "CANCELLED"
    ).length;
    return [
      { label: "Total Users", value: String(total), delta: "Realtime", icon: <PeopleIcon /> },
      { label: "Active", value: String(active), delta: "Healthy", icon: <CheckCircleIcon /> },
      {
        label: "Paused/Cancelled",
        value: String(pausedCancelled),
        delta: "Needs Action",
        icon: <AlertIcon />,
      },
    ];
  }, [users, userPagination]);

  const weeklyPeriods = useMemo(() => {
    const seen = new Map<string, { year: number; month: number }>();
    for (const week of weeklyMenus) {
      const date = new Date(week.weekStartDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!seen.has(key)) {
        seen.set(key, { year: date.getFullYear(), month: date.getMonth() });
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => b.year - a.year || b.month - a.month
    );
  }, [weeklyMenus]);

  const weeklyYearOptions = useMemo(() => {
    return Array.from(new Set(weeklyPeriods.map((p) => p.year))).sort(
      (a, b) => b - a
    );
  }, [weeklyPeriods]);

  const weeklyMonthOptions = useMemo(() => {
    const scopedPeriods =
      weeklyYearFilter === "all"
        ? weeklyPeriods
        : weeklyPeriods.filter((p) => p.year === Number(weeklyYearFilter));
    return Array.from(new Set(scopedPeriods.map((p) => p.month))).sort(
      (a, b) => a - b
    );
  }, [weeklyMonthFilter, weeklyPeriods, weeklyYearFilter]);

  const visibleWeeklyMenus = useMemo(() => {
    return weeklyMenus.filter((week) => {
      const weekDate = new Date(week.weekStartDate);
      const matchesYear =
        weeklyYearFilter === "all" ||
        weekDate.getFullYear() === Number(weeklyYearFilter);
      const matchesMonth =
        weeklyMonthFilter === "all" ||
        weekDate.getMonth() === Number(weeklyMonthFilter);
      return matchesYear && matchesMonth;
    });
  }, [weeklyMenus, weeklyMonthFilter, weeklyYearFilter]);

  const weeklyMenuKpis = useMemo<KpiItem[]>(() => {
    const visibleGoals = weeklyGoals.length;
    const validatedSlots = visibleWeeklyMenus.reduce((count, week) => {
      return (
        count +
        week.menus.filter(
          (menu) => buildGoalPreview(menu, goalOverrides).length > 0
        ).length
      );
    }, 0);
    const pendingReview = visibleWeeklyMenus.reduce((count, week) => {
      return (
        count +
        week.menus.filter(
          (menu) => buildGoalPreview(menu, goalOverrides).length === 0
        ).length
      );
    }, 0);
    return [
      { label: "Goal Groups", value: String(visibleGoals), delta: "Active", icon: <TargetIcon /> },
      { label: "Validated Slots", value: String(validatedSlots), delta: "On Track", icon: <CheckCircleIcon /> },
      { label: "Pending Review", value: String(pendingReview), delta: "Needs Action", icon: <AlertIcon /> },
    ];
  }, [goalOverrides, visibleWeeklyMenus, weeklyGoals.length]);

  useEffect(() => {
    if (role !== "nutritionist" || activeTab !== "weekly-menu") return;
    if (visibleWeeklyMenus.length === 0) {
      setExpandedWeekStartDate(null);
      return;
    }
    const preferredWeek =
      visibleWeeklyMenus.find((week) => week.isActiveWeek) ??
      visibleWeeklyMenus[0];
    setExpandedWeekStartDate((current) => {
      if (
        current &&
        visibleWeeklyMenus.some((week) => week.weekStartDate === current)
      ) {
        return current;
      }
      return preferredWeek.weekStartDate;
    });
  }, [activeTab, role, visibleWeeklyMenus]);

  // ── Resolve KPIs untuk tab aktif ────────────────────────────────────────
  const currentKpis = useMemo<KpiItem[]>(() => {
    if (role === "admin" && activeTab === "dashboard") {
      return dashboardKpis ?? [
        { label: "Total Users", value: "—", delta: "Loading", icon: <PeopleIcon /> },
        { label: "Active Subscriptions", value: "—", delta: "Loading", icon: <ChartArrowIcon /> },
        { label: "Deliveries Today", value: "—", delta: "Loading", icon: <BoxIcon /> },
      ];
    }
    if (role === "admin" && activeTab === "deliveries") return deliveryKpis;
    if (role === "admin" && activeTab === "users") return userKpis;
    if (role === "nutritionist" && activeTab === "dashboard" && nutritionKpis)
      return nutritionKpis;
    if (role === "nutritionist" && activeTab === "weekly-menu")
      return weeklyMenuKpis;
    // Fallback untuk nutritionist tabs lain
    return [];
  }, [
    role,
    activeTab,
    dashboardKpis,
    deliveryKpis,
    userKpis,
    nutritionKpis,
    weeklyMenuKpis,
  ]);

  // ── Metric summary row untuk deliveries tab ─────────────────────────────
  const deliveryMetrics = useMemo(() => {
    const total = deliveryPagination?.total ?? deliveries.length;
    return [
      { label: "Preparing", value: String(deliveries.filter((d) => d.status === "PREPARING").length) },
      { label: "Shipped", value: String(deliveries.filter((d) => d.status === "SHIPPED").length) },
      { label: "Delivered", value: String(deliveries.filter((d) => d.status === "DELIVERED").length) },
      { label: "Total (semua filter)", value: String(total), hot: true },
    ];
  }, [deliveries, deliveryPagination]);

  // ── Loading state per section ───────────────────────────────────────────
  const isLoading =
    (role === "admin" && activeTab === "dashboard" && dashboardLoading) ||
    (role === "admin" && activeTab === "deliveries" && deliveriesLoading) ||
    (role === "admin" && activeTab === "users" && usersLoading) ||
    (role === "nutritionist" && nutritionistLoading);

  return (
    <main className={styles.shell} style={themeVars}>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              {role === "admin" ? <ShieldIcon /> : <PulseIcon />}
            </span>
            <div>
              <h1 className={styles.brandTitle}>{config.title}</h1>
              <p className={styles.brandSub}>{config.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(
                () => { window.location.href = "/login"; }
              );
            }}
          >
            Logout
          </button>
        </header>

        <section className={styles.panelCard}>
          <div className={styles.tabList}>
            {config.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={clsx(
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.contentWrap}>
            <h2 className={styles.sectionTitle}>{config.heroTitle[activeTab]}</h2>
            <p className={styles.sectionSub}>{config.heroSubtitle[activeTab]}</p>

            {error && (
              <div
                className={styles.notice}
                style={{ background: "#fee2e2", borderColor: "#ef4444" }}
              >
                <p
                  className={styles.noticeTitle}
                  style={{ color: "#dc2626" }}
                >
                  Error:
                </p>
                <p style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}

            {/* KPI Cards */}
            <div className={styles.kpiGrid}>
              {currentKpis.map((kpi, index) => (
                <article
                  key={kpi.label}
                  className={styles.kpiCard}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={styles.kpiRow}>
                    <span className={styles.activityIcon}>{kpi.icon}</span>
                    <span className={styles.deltaBadge}>{kpi.delta}</span>
                  </div>
                  <p className={styles.kpiValue}>{kpi.value}</p>
                  <p className={styles.kpiLabel}>{kpi.label}</p>
                </article>
              ))}
            </div>

            {isLoading && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                Memuat data...
              </div>
            )}

            {/* ── ADMIN: DELIVERIES TAB ─────────────────────────────────── */}
            {role === "admin" && activeTab === "deliveries" && !deliveriesLoading ? (
              <>
                <div className={styles.metricRow}>
                  {deliveryMetrics.map((metric) => (
                    <article
                      key={metric.label}
                      className={clsx(styles.metric, metric.hot && styles.metricHot)}
                    >
                      <p className={styles.metricLabel}>{metric.label}</p>
                      <p className={styles.metricValue}>{metric.value}</p>
                    </article>
                  ))}
                </div>

                {/* Search & Filter */}
                <div className={styles.searchRow}>
                  <input
                    className={styles.input}
                    placeholder="Cari nama user"
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                  />
                  <select
                    className={styles.select}
                    value={deliveryStatusFilter}
                    onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua status</option>
                    <option value="preparing">Preparing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <select
                    className={styles.select}
                    value={deliveryMealTypeFilter}
                    onChange={(e) => setDeliveryMealTypeFilter(e.target.value)}
                  >
                    <option value="all">Semua meal</option>
                    <option value="lunch">Makan Siang</option>
                    <option value="dinner">Makan Malam</option>
                  </select>
                  <select
                    className={styles.select}
                    value={deliveryAreaFilter}
                    onChange={(e) => setDeliveryAreaFilter(e.target.value)}
                  >
                    <option value="all">Semua area</option>
                    <option value="jakarta">Jakarta</option>
                    <option value="tangerang">Tangerang</option>
                    <option value="bekasi">Bekasi</option>
                    <option value="depok">Depok</option>
                  </select>
                  <input
                    className={styles.input}
                    type="date"
                    value={deliveryDateFilter}
                    onChange={(e) => setDeliveryDateFilter(e.target.value)}
                    title="Filter by tanggal"
                  />
                </div>

                {/* Table */}
                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Delivery ID</th>
                        <th>User</th>
                        <th>Meal</th>
                        <th>Menu</th>
                        <th>Tanggal</th>
                        <th>Plan</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            style={{ textAlign: "center", padding: "2rem", color: "#666" }}
                          >
                            Tidak ada data delivery
                          </td>
                        </tr>
                      ) : (
                        deliveries.map((row) => (
                          <tr key={row.id}>
                            <td className={styles.tableKey}>
                              {row.id.slice(0, 8)}...
                            </td>
                            <td>{row.user}</td>
                            <td>
                              <span
                                className={clsx(
                                  styles.tag,
                                  row.mealType === "LUNCH"
                                    ? styles.tagBlue
                                    : styles.tagAmber
                                )}
                              >
                                {row.mealType === "LUNCH" ? "Siang" : "Malam"}
                              </span>
                            </td>
                            <td>{row.menu}</td>
                            <td>
                              {new Date(row.deliveryDate).toLocaleDateString(
                                "id-ID"
                              )}
                            </td>
                            <td>
                              {row.plan ? (
                                <span className={clsx(styles.tag, styles.tagRed)}>
                                  {row.plan}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>{row.address}</td>
                            <td>
                              <span
                                className={clsx(
                                  styles.tag,
                                  statusClass[row.status]
                                )}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionCard}
                                style={{ padding: "0.45rem 0.7rem" }}
                                onClick={() => advanceDelivery(row.id)}
                                disabled={
                                  row.status === "DELIVERED" ||
                                  advancingId === row.id
                                }
                              >
                                {advancingId === row.id
                                  ? "Memproses..."
                                  : row.status === "DELIVERED"
                                  ? "Selesai"
                                  : "Advance"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {deliveryPagination && deliveryPagination.totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      marginTop: "1rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      className={styles.tabButton}
                      disabled={deliveryPage <= 1}
                      onClick={() => setDeliveryPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      Hal {deliveryPagination.page} / {deliveryPagination.totalPages}
                      {" "}({deliveryPagination.total} total)
                    </span>
                    <button
                      type="button"
                      className={styles.tabButton}
                      disabled={deliveryPage >= deliveryPagination.totalPages}
                      onClick={() => setDeliveryPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>
                    Force Advance Status:
                  </p>
                  <ul>
                    <li>PREPARING → SHIPPED → DELIVERED</li>
                    <li>Setiap user memiliki 2 delivery per hari: Makan Siang & Makan Malam.</li>
                    <li>Jika semua delivery dalam 1 WeeklyBox DELIVERED, box otomatis COMPLETED.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {/* ── ADMIN: USERS TAB ──────────────────────────────────────── */}
            {role === "admin" && activeTab === "users" && !usersLoading ? (
              <>
                <div className={styles.searchRow}>
                  <input
                    className={styles.input}
                    placeholder="Cari user by nama atau email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <select
                    className={styles.select}
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value)}
                  >
                    <option value="all">Semua plan</option>
                    <option value="mingguan">Mingguan</option>
                    <option value="bulanan">Bulanan</option>
                    <option value="tahunan">Tahunan</option>
                  </select>
                  <select
                    className={styles.select}
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                  >
                    <option value="all">Semua status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>

                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Contact</th>
                        <th>Address</th>
                        <th>Plan</th>
                        <th>Serving</th>
                        <th>Goal</th>
                        <th>Status</th>
                        <th>Total Delivery</th>
                        <th>Joined</th>
                        <th>Next Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={10}
                            style={{ textAlign: "center", padding: "2rem", color: "#666" }}
                          >
                            Tidak ada data user
                          </td>
                        </tr>
                      ) : (
                        users.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>
                              {row.email}
                              {row.phoneNumber && (
                                <>
                                  <br />
                                  {row.phoneNumber}
                                </>
                              )}
                            </td>
                            <td>{row.address || "-"}</td>
                            <td>
                              <span className={clsx(styles.tag, styles.tagRed)}>
                                {row.plan || "-"}
                              </span>
                            </td>
                            <td>
                              {row.servings ? `${row.servings} orang` : "-"}
                            </td>
                            <td>{row.goal || "-"}</td>
                            <td>
                              <span
                                className={clsx(
                                  styles.tag,
                                  statusClass[row.subscriptionStatus || ""]
                                )}
                              >
                                {row.subscriptionStatus || "-"}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {row.totalDeliveries}
                            </td>
                            <td>
                              {new Date(row.joinedAt).toLocaleDateString("id-ID")}
                            </td>
                            <td>
                              {row.nextDelivery
                                ? new Date(row.nextDelivery).toLocaleDateString(
                                    "id-ID"
                                  )
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {userPagination && userPagination.totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      marginTop: "1rem",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      className={styles.tabButton}
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => p - 1)}
                    >
                      ← Prev
                    </button>
                    <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      Hal {userPagination.page} / {userPagination.totalPages}
                      {" "}({userPagination.total} total)
                    </span>
                    <button
                      type="button"
                      className={styles.tabButton}
                      disabled={userPage >= userPagination.totalPages}
                      onClick={() => setUserPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>User Management:</p>
                  <ul>
                    <li>
                      Informasi user dan subscription ditampilkan langsung dalam
                      satu tabel.
                    </li>
                    <li>
                      Status otomatis mengikuti lifecycle subscription user.
                    </li>
                    <li>
                      Kolom next delivery membantu tim operasional prioritas
                      jadwal.
                    </li>
                  </ul>
                </div>
              </>
            ) : null}

            {/* ── NUTRITIONIST: RECIPES TAB ────────────────────────────── */}
            {role === "nutritionist" && activeTab === "recipes" ? (
              <>
                <div
                  className={styles.notice}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p className={styles.noticeTitle}>Daftar Resep Sistem</p>
                    <p>Kelola resep. Klik Tambah Resep untuk menyimpan resep baru.</p>
                  </div>
                  <button
                    className={clsx(styles.tabButton, styles.tabButtonActive)}
                    onClick={() => {
                      setRecipeForm({
                        id: "",
                        name: "",
                        description: "",
                        calories: "",
                        protein: "",
                        servings: "",
                      });
                      setShowRecipeForm(!showRecipeForm);
                    }}
                  >
                    {showRecipeForm ? "Batal" : "+ Tambah Resep"}
                  </button>
                </div>

                {showRecipeForm && (
                  <form
                    onSubmit={handleSaveRecipe}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      marginBottom: "2rem",
                      padding: "1rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
                    >
                      <input
                        className={styles.input}
                        style={{ flex: 1, minWidth: "200px" }}
                        placeholder="Nama Resep"
                        required
                        value={recipeForm.name}
                        onChange={(e) =>
                          setRecipeForm({ ...recipeForm, name: e.target.value })
                        }
                      />
                      <input
                        className={styles.input}
                        style={{ width: "120px" }}
                        type="number"
                        placeholder="Kalori"
                        required
                        value={recipeForm.calories}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            calories: e.target.value,
                          })
                        }
                      />
                      <input
                        className={styles.input}
                        style={{ width: "120px" }}
                        type="number"
                        step="0.1"
                        placeholder="Protein (g)"
                        required
                        value={recipeForm.protein}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            protein: e.target.value,
                          })
                        }
                      />
                      <input
                        className={styles.input}
                        style={{ width: "120px" }}
                        type="number"
                        placeholder="Porsi"
                        required
                        value={recipeForm.servings}
                        onChange={(e) =>
                          setRecipeForm({
                            ...recipeForm,
                            servings: e.target.value,
                          })
                        }
                      />
                    </div>
                    <textarea
                      className={styles.input}
                      placeholder="Deskripsi Singkat"
                      required
                      value={recipeForm.description}
                      onChange={(e) =>
                        setRecipeForm({
                          ...recipeForm,
                          description: e.target.value,
                        })
                      }
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={styles.actionCard}
                      style={{ padding: "0.5rem", maxWidth: "150px" }}
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan Resep"}
                    </button>
                  </form>
                )}

                {nutritionistLoading ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    Memuat...
                  </div>
                ) : (
                  <div className={styles.tableShell}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Recipe</th>
                          <th>Description</th>
                          <th>Calories</th>
                          <th>Protein</th>
                          <th>Servings</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipes.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                textAlign: "center",
                                padding: "2rem",
                                color: "#666",
                              }}
                            >
                              Tidak ada data resep
                            </td>
                          </tr>
                        ) : (
                          recipes.map((row) => (
                            <tr key={row.id}>
                              <td>{row.name}</td>
                              <td>
                                {row.description
                                  ? row.description.slice(0, 50) + "..."
                                  : "-"}
                              </td>
                              <td>{row.calories} kcal</td>
                              <td>{row.protein} g</td>
                              <td>{row.servings}</td>
                              <td>
                                <button
                                  onClick={() => {
                                    setRecipeForm({
                                      id: row.id,
                                      name: row.name,
                                      description: row.description || "",
                                      calories: String(row.calories),
                                      protein: String(row.protein),
                                      servings: String(row.servings),
                                    });
                                    setShowRecipeForm(true);
                                  }}
                                  style={{
                                    marginRight: "0.5rem",
                                    color: "#2563eb",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRecipe(row.id)}
                                  style={{
                                    color: "#dc2626",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}

            {/* ── NUTRITIONIST: WEEKLY MENU TAB ────────────────────────── */}
            {role === "nutritionist" && activeTab === "weekly-menu" ? (
              <>
                <div
                  className={styles.notice}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <p className={styles.noticeTitle}>Menu Minggu Ini:</p>
                    <p>
                      Setiap kartu mewakili satu minggu kalender. Badge{" "}
                      <strong>Minggu ini</strong> menandai minggu yang sedang
                      berjalan.
                    </p>
                  </div>
                </div>

                <div
                  className={styles.searchRow}
                  style={{
                    marginTop: "1rem",
                    gridTemplateColumns: "1fr 1fr 1fr",
                  }}
                >
                  <select
                    className={styles.select}
                    value={weeklyYearFilter}
                    onChange={(event) => setWeeklyYearFilter(event.target.value)}
                  >
                    <option value="all">Semua Tahun</option>
                    {weeklyYearOptions.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.select}
                    value={weeklyMonthFilter}
                    onChange={(event) =>
                      setWeeklyMonthFilter(event.target.value)
                    }
                  >
                    <option value="all">Semua Bulan</option>
                    {weeklyMonthOptions.map((month) => (
                      <option key={month} value={String(month)}>
                        {formatMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.tabButton}
                    onClick={() => {
                      const now = new Date();
                      setWeeklyYearFilter(String(now.getFullYear()));
                      setWeeklyMonthFilter(String(now.getMonth()));
                    }}
                  >
                    Kembali ke bulan ini
                  </button>
                </div>

                {showMenuForm && (
                  <form
                    onSubmit={handleAddMenu}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1rem",
                      marginBottom: "2rem",
                      padding: "1rem",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <select
                      className={styles.select}
                      style={{ flex: 1, minWidth: "200px" }}
                      required
                      value={menuForm.recipeId}
                      onChange={(e) =>
                        setMenuForm({ ...menuForm, recipeId: e.target.value })
                      }
                    >
                      <option value="">-- Pilih Resep --</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.input}
                      style={{ width: "180px" }}
                      type="date"
                      required
                      value={menuForm.weekStartDate}
                      onChange={(e) =>
                        setMenuForm({
                          ...menuForm,
                          weekStartDate: e.target.value,
                        })
                      }
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={styles.actionCard}
                      style={{ padding: "0.5rem 1rem" }}
                    >
                      {isSubmitting ? "Menambah..." : "Tambah"}
                    </button>
                  </form>
                )}

                {nutritionistLoading ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    Memuat...
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {visibleWeeklyMenus.length === 0 ? (
                      <div
                        className={styles.notice}
                        style={{ marginBottom: 0 }}
                      >
                        <p className={styles.noticeTitle}>
                          Belum ada menu pada periode ini.
                        </p>
                        <p>
                          Coba ubah filter bulan/tahun, atau tambahkan resep ke
                          minggu ini lewat kartu minggu yang tersedia.
                        </p>
                      </div>
                    ) : (
                      visibleWeeklyMenus.map((week) => {
                        const isExpanded =
                          expandedWeekStartDate === week.weekStartDate;
                        return (
                          <section
                            key={week.weekStartDate}
                            style={{
                              borderRadius: "18px",
                              border: week.isActiveWeek
                                ? "1px solid #1d4ed8"
                                : "1px solid #e5e7eb",
                              background: week.isActiveWeek
                                ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
                                : "#ffffff",
                              boxShadow: week.isActiveWeek
                                ? "0 14px 28px rgba(29, 78, 216, 0.12)"
                                : "0 10px 22px rgba(15, 23, 42, 0.06)",
                              padding: "1rem",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedWeekStartDate(
                                  isExpanded ? null : week.weekStartDate
                                )
                              }
                              style={{
                                width: "100%",
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
                                <p
                                  className={styles.noticeTitle}
                                  style={{ marginBottom: "0.2rem" }}
                                >
                                  {formatWeekRangeLabel(
                                    week.weekStartDate,
                                    week.weekEndDate
                                  )}
                                </p>
                                <p
                                  style={{
                                    margin: 0,
                                    color: "#64748b",
                                    fontSize: "0.92rem",
                                  }}
                                >
                                  {week.menus.length} menu tersimpan untuk
                                  minggu ini.
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
                                  <span
                                    className={clsx(
                                      styles.tag,
                                      styles.tagGreen
                                    )}
                                  >
                                    Minggu ini
                                  </span>
                                )}
                                <span
                                  aria-hidden="true"
                                  style={{ fontSize: "1.15rem", color: "#64748b" }}
                                >
                                  {isExpanded ? "▾" : "▸"}
                                </span>
                              </div>
                            </button>

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
                                        weekStartDate:
                                          week.weekStartDate.slice(0, 10),
                                      });
                                      setShowMenuForm(true);
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
                                        <th>Recipe</th>
                                        <th>Calories</th>
                                        <th>Protein</th>
                                        <th>Suitable Goals</th>
                                        <th>Aksi</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {week.menus.map((row) => {
                                        const previewGoals = buildGoalPreview(
                                          row,
                                          goalOverrides
                                        );
                                        const isEditingGoal =
                                          goalEditorMenuId === row.id;
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
                                                  gap: "0.45rem",
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                {previewGoals.length > 0 ? (
                                                  previewGoals.map((goal) => (
                                                    <span
                                                      key={goal}
                                                      className={clsx(
                                                        styles.tag,
                                                        styles.tagBlue
                                                      )}
                                                    >
                                                      {goal}
                                                    </span>
                                                  ))
                                                ) : (
                                                  <button
                                                    type="button"
                                                    className={
                                                      styles.goalLinkButton
                                                    }
                                                    onClick={() =>
                                                      setGoalEditorMenuId(
                                                        row.id
                                                      )
                                                    }
                                                  >
                                                    + Hubungkan Target
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  className={
                                                    styles.goalEditButton
                                                  }
                                                  onClick={() =>
                                                    setGoalEditorMenuId(
                                                      (current) =>
                                                        current === row.id
                                                          ? null
                                                          : row.id
                                                    )
                                                  }
                                                  aria-label="Edit target kesehatan"
                                                >
                                                  ✎
                                                </button>
                                                {isEditingGoal && (
                                                  <div
                                                    className={
                                                      styles.goalPopover
                                                    }
                                                  >
                                                    <div
                                                      className={
                                                        styles.goalPopoverTitle
                                                      }
                                                    >
                                                      Hubungkan target kesehatan
                                                    </div>
                                                    <div
                                                      className={
                                                        styles.goalPopoverList
                                                      }
                                                    >
                                                      {weeklyGoals.length ===
                                                      0 ? (
                                                        <p
                                                          style={{
                                                            margin: 0,
                                                            color: "#64748b",
                                                          }}
                                                        >
                                                          Belum ada goal master
                                                          tersedia.
                                                        </p>
                                                      ) : (
                                                        weeklyGoals.map(
                                                          (goal) => {
                                                            const currentGoals =
                                                              new Set(
                                                                goalOverrides[
                                                                  row.id
                                                                ] ??
                                                                  row.suitableGoals
                                                              );
                                                            const checked =
                                                              currentGoals.has(
                                                                goal.name
                                                              );
                                                            return (
                                                              <label
                                                                key={goal.id}
                                                                className={
                                                                  styles.goalPopoverItem
                                                                }
                                                              >
                                                                <input
                                                                  type="checkbox"
                                                                  checked={
                                                                    checked
                                                                  }
                                                                  onChange={() => {
                                                                    setGoalOverrides(
                                                                      (prev) => {
                                                                        const next =
                                                                          new Set(
                                                                            prev[
                                                                              row
                                                                                .id
                                                                            ] ??
                                                                              row.suitableGoals
                                                                          );
                                                                        if (
                                                                          next.has(
                                                                            goal.name
                                                                          )
                                                                        )
                                                                          next.delete(
                                                                            goal.name
                                                                          );
                                                                        else
                                                                          next.add(
                                                                            goal.name
                                                                          );
                                                                        return {
                                                                          ...prev,
                                                                          [row.id]:
                                                                            Array.from(
                                                                              next
                                                                            ),
                                                                        };
                                                                      }
                                                                    );
                                                                  }}
                                                                />
                                                                <span>
                                                                  {goal.name}
                                                                </span>
                                                              </label>
                                                            );
                                                          }
                                                        )
                                                      )}
                                                    </div>
                                                    <div
                                                      className={
                                                        styles.goalPopoverActions
                                                      }
                                                    >
                                                      <button
                                                        type="button"
                                                        className={
                                                          styles.tabButton
                                                        }
                                                        onClick={() =>
                                                          setGoalEditorMenuId(
                                                            null
                                                          )
                                                        }
                                                      >
                                                        Tutup
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className={clsx(
                                                          styles.tabButton,
                                                          styles.tabButtonActive
                                                        )}
                                                        onClick={() =>
                                                          setGoalEditorMenuId(
                                                            null
                                                          )
                                                        }
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
                                                className={
                                                  styles.iconDangerButton
                                                }
                                                onClick={() =>
                                                  handleDeleteMenu(row.id)
                                                }
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
              </>
            ) : null}

            {/* ── DASHBOARD TAB: Activities & Actions ──────────────────── */}
            {activeTab === "dashboard" ? (
              <>
                <section className={styles.activityCard}>
                  <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                  {dashboardLoading ? (
                    <p style={{ color: "#64748b", padding: "1rem 0" }}>
                      Memuat aktivitas...
                    </p>
                  ) : dashboardActivities.length === 0 ? (
                    <p style={{ color: "#64748b", padding: "1rem 0" }}>
                      Belum ada aktivitas tercatat.
                    </p>
                  ) : (
                    <ul className={styles.activityList}>
                      {dashboardActivities.map((activity) => (
                        <li key={activity.timestamp + activity.text} className={styles.activityItem}>
                          <span className={styles.activityIcon}>
                            {activity.icon}
                          </span>
                          <div>
                            <p className={styles.activityText}>
                              {activity.text}
                            </p>
                            <p className={styles.activityTime}>
                              {activity.time}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className={styles.actionGrid}>
                  {config.actions.map((action) => (
                    <button
                      key={action.title}
                      type="button"
                      className={styles.actionCard}
                    >
                      <span>{action.icon}</span>
                      <p className={styles.actionTitle}>{action.title}</p>
                      <p className={styles.actionSub}>{action.subtitle}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {/* Activities untuk tab selain dashboard (nutritionist) */}
            {activeTab !== "dashboard" && role === "nutritionist" ? (
              <section className={styles.activityCard}>
                <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                <ul className={styles.activityList}>
                  {[
                    activeTab === "recipes" && {
                      text: "Data resep diambil dari database",
                      time: "Baru saja",
                      icon: <BookIcon />,
                    },
                    activeTab === "weekly-menu" && {
                      text: "Menu mingguan diambil dari database",
                      time: "Baru saja",
                      icon: <CalendarIcon />,
                    },
                  ]
                    .filter(Boolean)
                    .map((activity) => {
                      if (!activity) return null;
                      return (
                        <li
                          key={activity.text}
                          className={styles.activityItem}
                        >
                          <span className={styles.activityIcon}>
                            {activity.icon}
                          </span>
                          <div>
                            <p className={styles.activityText}>
                              {activity.text}
                            </p>
                            <p className={styles.activityTime}>
                              {activity.time}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

// --- Icons ---

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20a3.5 3.5 0 0 1 7 0M13 20a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m6 14 4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 7.5V16l8.5 4 8.5-4V7.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
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

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.1 2.1 4.9-4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 4 3.5 19h17L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-4 3 8 2-4h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

// Suppress unused warning — MapPinIcon dipakai di activityIconMap extension future
void MapPinIcon;