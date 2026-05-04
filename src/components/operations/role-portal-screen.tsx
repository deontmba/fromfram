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
  menu: string;
  address: string;
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
};

type RecipeRow = {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  servings: number;
};

type WeeklyMenuRow = {
  id: string;
  recipeName: string;
  calories: number;
  protein: number;
  suitableGoals: string[];
};
type RoleConfig = {
  title: string;
  subtitle: string;
  tabs: TabItem[];
  heroTitle: Record<string, string>;
  heroSubtitle: Record<string, string>;
  kpis: Record<string, KpiItem[]>;
  activities: Record<string, ActivityItem[]>;
  actions: ActionItem[];
  accentStrong: string;
  accentMid: string;
  accentSoft: string;
};

const nutritionRecipes: RecipeRow[] = [
  { name: "Nasi Goreng Kampung", category: "Indonesian", calories: 450, protein: 18, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
  { name: "Ayam Teriyaki Bowl", category: "Japanese", calories: 520, protein: 31, difficulty: "Mudah", cookTime: "30 min", readiness: "OK" },
  { name: "Spaghetti Carbonara", category: "Italian", calories: 610, protein: 20, difficulty: "Mudah", cookTime: "20 min", readiness: "Needs Review" },
  { name: "Nasi Hainan", category: "Chinese", calories: 480, protein: 24, difficulty: "Sedang", cookTime: "35 min", readiness: "OK" },
  { name: "Beef Bulgogi", category: "Korean", calories: 550, protein: 34, difficulty: "Sedang", cookTime: "40 min", readiness: "OK" },
  { name: "Tom Yum Seafood", category: "Thai", calories: 320, protein: 26, difficulty: "Sedang", cookTime: "30 min", readiness: "OK" },
  { name: "Rendang Sapi", category: "Indonesian", calories: 680, protein: 28, difficulty: "Sulit", cookTime: "45 min", readiness: "Needs Review" },
  { name: "Pad Thai", category: "Thai", calories: 490, protein: 21, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
];

const weeklyNutritionRows: WeeklyDayRow[] = [
  { day: "Senin", menu: "Salmon Teriyaki + Quinoa", goal: "Atlet", calories: 710, protein: 46, validation: "Valid" },
  { day: "Selasa", menu: "Chicken Caesar Light", goal: "Weight Loss", calories: 520, protein: 35, validation: "Valid" },
  { day: "Rabu", menu: "Tempe Power Bowl", goal: "Vegan High Protein", calories: 560, protein: 32, validation: "Valid" },
  { day: "Kamis", menu: "Beef Bulgogi Set", goal: "Atlet", calories: 760, protein: 40, validation: "Review" },
  { day: "Jumat", menu: "Tofu Miso Soup + Rice", goal: "Low Sodium", calories: 430, protein: 23, validation: "Valid" },
  { day: "Sabtu", menu: "Greek Chicken Wrap", goal: "Weight Maintenance", calories: 590, protein: 33, validation: "Valid" },
  { day: "Minggu", menu: "Rendang Lean Plate", goal: "Atlet", calories: 690, protein: 38, validation: "Review" },
];

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
  kpis: {
    dashboard: [
      { label: "Total Users", value: "1,234", delta: "+12%", icon: <PeopleIcon /> },
      { label: "Active Subscriptions", value: "856", delta: "+8%", icon: <ChartArrowIcon /> },
      { label: "Deliveries Today", value: "342", delta: "89%", icon: <BoxIcon /> },
    ],
    deliveries: [
      { label: "Preparing", value: "0", delta: "Live", icon: <ClockIcon /> },
      { label: "Shipped", value: "0", delta: "Live", icon: <TruckIcon /> },
      { label: "Delivered", value: "0", delta: "Live", icon: <CheckCircleIcon /> },
    ],
    users: [
      { label: "Total Users", value: "0", delta: "Realtime", icon: <PeopleIcon /> },
      { label: "Active", value: "0", delta: "Healthy", icon: <CheckCircleIcon /> },
      { label: "Paused/Cancelled", value: "0", delta: "Needs Action", icon: <AlertIcon /> },
    ],
  },
  activities: {
    dashboard: [
      { text: "User baru mendaftar: john@email.com", time: "10 menit lalu", icon: <PeopleIcon /> },
      { text: "15 subscription akan expired minggu depan", time: "2 jam lalu", icon: <CalendarIcon /> },
      { text: "Delivery batch pagi selesai (342 deliveries)", time: "3 jam lalu", icon: <BoxIcon /> },
    ],
    deliveries: [
      { text: "3 order baru pindah ke PREPARING", time: "6 menit lalu", icon: <ClockIcon /> },
      { text: "Kurir A menandai 2 order SHIPPED", time: "14 menit lalu", icon: <TruckIcon /> },
      { text: "Semua order batch malam sudah DELIVERED", time: "42 menit lalu", icon: <CheckCircleIcon /> },
    ],
    users: [
      { text: "2 user pause subscription untuk 1 minggu", time: "12 menit lalu", icon: <AlertIcon /> },
      { text: "4 user upgrade ke paket tahunan", time: "1 jam lalu", icon: <ChartArrowIcon /> },
      { text: "Admin update data alamat user korporat", time: "2 jam lalu", icon: <MapPinIcon /> },
    ],
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
  kpis: {
    dashboard: [
      { label: "Total Recipes", value: "156", delta: "+8", icon: <BookIcon /> },
      { label: "Weekly Menus", value: "24", delta: "+3", icon: <CalendarIcon /> },
      { label: "Active Users", value: "856", delta: "+12", icon: <PeopleIcon /> },
    ],
    recipes: [
      { label: "Ready", value: "133", delta: "85%", icon: <CheckCircleIcon /> },
      { label: "Need Review", value: "23", delta: "15%", icon: <AlertIcon /> },
      { label: "Protein Focus", value: "47", delta: "+5", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { label: "Goal Groups", value: "6", delta: "Active", icon: <TargetIcon /> },
      { label: "Validated Slots", value: "19", delta: "On Track", icon: <CheckCircleIcon /> },
      { label: "Pending Review", value: "5", delta: "Needs Action", icon: <AlertIcon /> },
    ],
  },
  activities: {
    dashboard: [
      { text: "Menu baru ditambahkan: Salmon Teriyaki", time: "1 jam lalu", icon: <BookIcon /> },
      { text: "Resep diupdate: Nasi Goreng Kampung", time: "3 jam lalu", icon: <PulseIcon /> },
      { text: "Weekly menu Week 3 dipublikasikan", time: "5 jam lalu", icon: <CalendarIcon /> },
    ],
    recipes: [
      { text: "2 resep melewati batas sodium harian", time: "8 menit lalu", icon: <AlertIcon /> },
      { text: "6 resep kategori atlet sudah terverifikasi", time: "36 menit lalu", icon: <CheckCircleIcon /> },
      { text: "Audit protein mingguan berhasil", time: "2 jam lalu", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { text: "Goal group Atlet mendapatkan 3 menu baru", time: "11 menit lalu", icon: <TargetIcon /> },
      { text: "Review menu Low Sodium dijadwalkan", time: "47 menit lalu", icon: <ClockIcon /> },
      { text: "Notifikasi rekomendasi gizi terkirim", time: "1 jam lalu", icon: <PeopleIcon /> },
    ],
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
  Mudah: styles.tagBlue,
  Sedang: styles.tagAmber,
  Sulit: styles.tagRed,
  OK: styles.tagGreen,
  "Needs Review": styles.tagRed,
  Valid: styles.tagGreen,
  Review: styles.tagAmber,
};

function clsx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export function RolePortalScreen({ role }: { role: RoleVariant }) {
  const config = role === "admin" ? adminConfig : nutritionConfig;
  const [activeTab, setActiveTab] = useState(config.tabs[0].id);

  // Real data states
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Nutritionist states
  const [nutritionKpis, setNutritionKpis] = useState<KpiItem[] | null>(null);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenuRow[]>([]);

  // CRUD states
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ id: "", name: "", description: "", calories: "", protein: "", servings: "" });
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({ recipeId: "", weekStartDate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/filter states
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [deliveryAreaFilter, setDeliveryAreaFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  const themeVars = {
    "--accent-strong": config.accentStrong,
    "--accent-mid": config.accentMid,
    "--accent-soft": config.accentSoft,
  } as CSSProperties;

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (deliveryStatusFilter !== "all") params.set("status", deliveryStatusFilter.toUpperCase());
      if (deliveryAreaFilter !== "all") params.set("area", deliveryAreaFilter);

      const res = await fetch(`/api/admin/deliveries?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      const data = await res.json();
      setDeliveries(data.data || []);
    } catch (err) {
      console.error("[FETCH DELIVERIES]", err);
      setError("Gagal memuat data deliveries");
    }
  }, [deliveryStatusFilter, deliveryAreaFilter]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.data || []);
    } catch (err) {
      console.error("[FETCH USERS]", err);
      setError("Gagal memuat data users");
    }
  }, []);

  // Fetch Nutrition KPIs
  const fetchNutritionKpis = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/dashboard/kpis", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch KPIs");
      const data = await res.json();
      setNutritionKpis([
        { label: "Total Recipes", value: String(data.data.totalRecipes), delta: "Realtime", icon: <BookIcon /> },
        { label: "Weekly Menus", value: String(data.data.weeklyMenusCount), delta: "Active", icon: <CalendarIcon /> },
        { label: "Active Users", value: String(data.data.activeUsers), delta: "Healthy", icon: <PeopleIcon /> },
      ]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/recipes", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recipes");
      const data = await res.json();
      setRecipes(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchWeeklyMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/weekly-menus", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly menus");
      const data = await res.json();
      setWeeklyMenus(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load data when tab changes or filters change
  useEffect(() => {
    setLoading(true);
    setError("");

    const load = async () => {
      if (role === "admin") {
        if (activeTab === "deliveries") await fetchDeliveries();
        else if (activeTab === "users") await fetchUsers();
      } else if (role === "nutritionist") {
        if (activeTab === "dashboard") await fetchNutritionKpis();
        else if (activeTab === "recipes") await fetchRecipes();
        else if (activeTab === "weekly-menu") await fetchWeeklyMenus();
      }
      setLoading(false);
    };

    load();
  }, [role, activeTab, fetchDeliveries, fetchUsers, fetchNutritionKpis, fetchRecipes, fetchWeeklyMenus]);

  // Advance delivery status
  async function advanceDelivery(id: string) {
    setAdvancingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/deliveries/${id}/advance`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to advance delivery");
      }

      // Refresh the list
      await fetchDeliveries();
    } catch (err: unknown) {
      console.error("[ADVANCE DELIVERY]", err);
      const message = err instanceof Error ? err.message : "Gagal memajukan status delivery";
      setError(message);
    } finally {
      setAdvancingId(null);
    }
  }

  // CRUD Functions
  async function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = recipeForm.id ? "PATCH" : "POST";
      const url = recipeForm.id ? `/api/nutritionist/recipes/${recipeForm.id}` : "/api/nutritionist/recipes";
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
        credentials: "include"
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
      const res = await fetch(`/api/nutritionist/recipes/${id}`, { method: "DELETE", credentials: "include" });
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
          weekStartDate: menuForm.weekStartDate || new Date().toISOString()
        }),
        credentials: "include"
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
      const res = await fetch(`/api/nutritionist/weekly-menus/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Gagal menghapus menu");
      await fetchWeeklyMenus();
    } catch (err) {
      console.error(err);
      alert("Error deleting menu");
    }
  }

  // Computed KPI values from real data
  const deliveryKpis = useMemo(() => {
    const preparing = deliveries.filter((d) => d.status === "PREPARING").length;
    const shipped = deliveries.filter((d) => d.status === "SHIPPED").length;
    const delivered = deliveries.filter((d) => d.status === "DELIVERED").length;
    return [
      { label: "Preparing", value: String(preparing), delta: "Live", icon: <ClockIcon /> },
      { label: "Shipped", value: String(shipped), delta: "Live", icon: <TruckIcon /> },
      { label: "Delivered", value: String(delivered), delta: "Live", icon: <CheckCircleIcon /> },
    ];
  }, [deliveries]);

  const userKpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.subscriptionStatus === "ACTIVE").length;
    const pausedCancelled = users.filter(
      (u) => u.subscriptionStatus === "PAUSED" || u.subscriptionStatus === "CANCELLED"
    ).length;
    return [
      { label: "Total Users", value: String(total), delta: "Realtime", icon: <PeopleIcon /> },
      { label: "Active", value: String(active), delta: "Healthy", icon: <CheckCircleIcon /> },
      { label: "Paused/Cancelled", value: String(pausedCancelled), delta: "Needs Action", icon: <AlertIcon /> },
    ];
  }, [users]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      const matchesSearch =
        deliverySearch === "" ||
        d.id.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        d.user.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        d.menu.toLowerCase().includes(deliverySearch.toLowerCase());
      return matchesSearch;
    });
  }, [deliveries, deliverySearch]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        userSearch === "" ||
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesPlan = userPlanFilter === "all" || u.plan?.toLowerCase() === userPlanFilter.toLowerCase();
      const matchesStatus = userStatusFilter === "all" || u.subscriptionStatus?.toLowerCase() === userStatusFilter.toLowerCase();
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [users, userSearch, userPlanFilter, userStatusFilter]);

  // Get KPIs based on active tab
  const currentKpis = useMemo(() => {
    if (role === "admin" && activeTab === "deliveries") return deliveryKpis;
    if (role === "admin" && activeTab === "users") return userKpis;
    if (role === "nutritionist" && activeTab === "dashboard" && nutritionKpis) return nutritionKpis;
    return config.kpis[activeTab] || [];
  }, [role, activeTab, config.kpis, deliveryKpis, userKpis, nutritionKpis]);

  return (
    <main className={styles.shell} style={themeVars}>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>{role === "admin" ? <ShieldIcon /> : <PulseIcon />}</span>
            <div>
              <h1 className={styles.brandTitle}>{config.title}</h1>
              <p className={styles.brandSub}>{config.subtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.logoutButton} onClick={() => {
            fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
              window.location.href = "/login";
            });
          }}>
            Logout
          </button>
        </header>

        <section className={styles.panelCard}>
          <div className={styles.tabList}>
            {config.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={clsx(styles.tabButton, activeTab === tab.id && styles.tabButtonActive)}
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
              <div className={styles.notice} style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
                <p className={styles.noticeTitle} style={{ color: "#dc2626" }}>Error:</p>
                <p style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}

            <div className={styles.kpiGrid}>
              {currentKpis.map((kpi, index) => (
                <article key={kpi.label} className={styles.kpiCard} style={{ animationDelay: `${index * 80}ms` }}>
                  <div className={styles.kpiRow}>
                    <span className={styles.activityIcon}>{kpi.icon}</span>
                    <span className={styles.deltaBadge}>{kpi.delta}</span>
                  </div>
                  <p className={styles.kpiValue}>{kpi.value}</p>
                  <p className={styles.kpiLabel}>{kpi.label}</p>
                </article>
              ))}
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                Memuat data...
              </div>
            )}

            {role === "admin" && activeTab === "deliveries" && !loading ? (
              <>
                <div className={styles.metricRow}>
                  {[
                    { label: "Preparing", value: String(deliveries.filter((d) => d.status === "PREPARING").length) },
                    { label: "Shipped", value: String(deliveries.filter((d) => d.status === "SHIPPED").length) },
                    { label: "Delivered", value: String(deliveries.filter((d) => d.status === "DELIVERED").length) },
                    { label: "Total Today", value: String(deliveries.length), hot: true },
                  ].map((metric) => (
                    <article key={metric.label} className={clsx(styles.metric, metric.hot && styles.metricHot)}>
                      <p className={styles.metricLabel}>{metric.label}</p>
                      <p className={styles.metricValue}>{metric.value}</p>
                    </article>
                  ))}
                </div>

                <div className={styles.searchRow}>
                  <input
                    className={styles.input}
                    placeholder="Cari delivery by ID, user, atau menu"
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
                    value={deliveryAreaFilter}
                    onChange={(e) => setDeliveryAreaFilter(e.target.value)}
                  >
                    <option value="all">Semua area</option>
                    <option value="jakarta">Jakarta</option>
                    <option value="tangerang">Tangerang</option>
                    <option value="bekasi">Bekasi</option>
                    <option value="depok">Depok</option>
                  </select>
                </div>

                <div className={styles.tableShell}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Delivery ID</th>
                        <th>User</th>
                        <th>Menu</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeliveries.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                            Tidak ada data delivery
                          </td>
                        </tr>
                      ) : (
                        filteredDeliveries.map((row) => (
                          <tr key={row.id}>
                            <td className={styles.tableKey}>{row.id.slice(0, 8)}...</td>
                            <td>{row.user}</td>
                            <td>{row.menu}</td>
                            <td>{row.address}</td>
                            <td>
                              <span className={clsx(styles.tag, statusClass[row.status])}>{row.status}</span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.actionCard}
                                style={{ padding: "0.45rem 0.7rem" }}
                                onClick={() => advanceDelivery(row.id)}
                                disabled={row.status === "DELIVERED" || advancingId === row.id}
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

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>Force Advance Status (Demo UI):</p>
                  <ul>
                    <li>PREPARING -&gt; SHIPPED -&gt; DELIVERED</li>
                    <li>Digunakan untuk testing flow logistik massal.</li>
                    <li>Pada production, status idealnya diupdate otomatis dari sistem kurir.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {role === "admin" && activeTab === "users" && !loading ? (
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
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Next Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                            Tidak ada data user
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>
                              {row.email}
                              {row.phoneNumber && <br />}
                              {row.phoneNumber}
                            </td>
                            <td>{row.address || "-"}</td>
                            <td>
                              <span className={clsx(styles.tag, styles.tagRed)}>
                                {row.plan || "-"}
                              </span>
                            </td>
                            <td>{row.servings ? `${row.servings} orang` : "-"}</td>
                            <td>
                              <span className={clsx(styles.tag, statusClass[row.subscriptionStatus || ""])}>
                                {row.subscriptionStatus || "-"}
                              </span>
                            </td>
                            <td>{new Date(row.joinedAt).toLocaleDateString("id-ID")}</td>
                            <td>{row.nextDelivery ? new Date(row.nextDelivery).toLocaleDateString("id-ID") : "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={styles.notice}>
                  <p className={styles.noticeTitle}>User Management:</p>
                  <ul>
                    <li>Informasi user dan subscription ditampilkan langsung dalam satu tabel.</li>
                    <li>Status otomatis mengikuti lifecycle subscription user.</li>
                    <li>Kolom next delivery membantu tim operasional prioritas jadwal.</li>
                  </ul>
                </div>
              </>
            ) : null}

            {role === "nutritionist" && activeTab === "recipes" ? (
              <>
                <div className={styles.notice} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className={styles.noticeTitle}>Daftar Resep Sistem</p>
                    <p>Kelola resep. Klik Tambah Resep untuk menyimpan resep baru.</p>
                  </div>
                  <button className={clsx(styles.tabButton, styles.tabButtonActive)} onClick={() => {
                    setRecipeForm({ id: "", name: "", description: "", calories: "", protein: "", servings: "" });
                    setShowRecipeForm(!showRecipeForm);
                  }}>
                    {showRecipeForm ? "Batal" : "+ Tambah Resep"}
                  </button>
                </div>

                {showRecipeForm && (
                  <form onSubmit={handleSaveRecipe} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                      <input className={styles.input} style={{ flex: 1, minWidth: "200px" }} placeholder="Nama Resep" required value={recipeForm.name} onChange={e => setRecipeForm({...recipeForm, name: e.target.value})} />
                      <input className={styles.input} style={{ width: "120px" }} type="number" placeholder="Kalori" required value={recipeForm.calories} onChange={e => setRecipeForm({...recipeForm, calories: e.target.value})} />
                      <input className={styles.input} style={{ width: "120px" }} type="number" step="0.1" placeholder="Protein (g)" required value={recipeForm.protein} onChange={e => setRecipeForm({...recipeForm, protein: e.target.value})} />
                      <input className={styles.input} style={{ width: "120px" }} type="number" placeholder="Porsi" required value={recipeForm.servings} onChange={e => setRecipeForm({...recipeForm, servings: e.target.value})} />
                    </div>
                    <textarea className={styles.input} placeholder="Deskripsi Singkat" required value={recipeForm.description} onChange={e => setRecipeForm({...recipeForm, description: e.target.value})} />
                    <button type="submit" disabled={isSubmitting} className={styles.actionCard} style={{ padding: "0.5rem", maxWidth: "150px" }}>
                      {isSubmitting ? "Menyimpan..." : "Simpan Resep"}
                    </button>
                  </form>
                )}

                {loading ? <div style={{ textAlign: "center", padding: "2rem" }}>Memuat...</div> : (
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
                          <tr><td colSpan={6} style={{textAlign: "center", padding: "2rem", color: "#666"}}>Tidak ada data resep</td></tr>
                        ) : (
                          recipes.map((row) => (
                            <tr key={row.id}>
                              <td>{row.name}</td>
                              <td>{row.description ? row.description.slice(0, 50) + "..." : "-"}</td>
                              <td>{row.calories} kcal</td>
                              <td>{row.protein} g</td>
                              <td>{row.servings}</td>
                              <td>
                                <button onClick={() => {
                                  setRecipeForm({
                                    id: row.id,
                                    name: row.name,
                                    description: row.description || "",
                                    calories: String(row.calories),
                                    protein: String(row.protein),
                                    servings: String(row.servings)
                                  });
                                  setShowRecipeForm(true);
                                }} style={{ marginRight: "0.5rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>Edit</button>
                                <button onClick={() => handleDeleteRecipe(row.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>Hapus</button>
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

            {role === "nutritionist" && activeTab === "weekly-menu" ? (
              <>
                <div className={styles.notice} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p className={styles.noticeTitle}>Weekly Menu Pool:</p>
                    <p>Daftar resep yang tersedia untuk jadwal minggu ini. Sistem otomatis mencocokkan resep dengan target kesehatan pengguna.</p>
                  </div>
                  <button className={clsx(styles.tabButton, styles.tabButtonActive)} onClick={() => setShowMenuForm(!showMenuForm)}>
                    {showMenuForm ? "Batal" : "+ Tambah ke Minggu Ini"}
                  </button>
                </div>

                {showMenuForm && (
                  <form onSubmit={handleAddMenu} style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <select className={styles.select} style={{ flex: 1, minWidth: "200px" }} required value={menuForm.recipeId} onChange={e => setMenuForm({...menuForm, recipeId: e.target.value})}>
                      <option value="">-- Pilih Resep --</option>
                      {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input className={styles.input} style={{ width: "180px" }} type="date" required value={menuForm.weekStartDate} onChange={e => setMenuForm({...menuForm, weekStartDate: e.target.value})} />
                    <button type="submit" disabled={isSubmitting} className={styles.actionCard} style={{ padding: "0.5rem 1rem" }}>
                      {isSubmitting ? "Menambah..." : "Tambah"}
                    </button>
                  </form>
                )}

                {loading ? <div style={{ textAlign: "center", padding: "2rem" }}>Memuat...</div> : (
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
                        {weeklyMenus.length === 0 ? (
                          <tr><td colSpan={5} style={{textAlign: "center", padding: "2rem", color: "#666"}}>Tidak ada menu untuk minggu ini</td></tr>
                        ) : (
                          weeklyMenus.map((row) => (
                            <tr key={row.id}>
                              <td>{row.recipeName}</td>
                              <td>{row.calories} kcal</td>
                              <td>{row.protein} g</td>
                              <td>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  {row.suitableGoals.map(goal => (
                                    <span key={goal} className={clsx(styles.tag, styles.tagBlue)}>{goal}</span>
                                  ))}
                                  {row.suitableGoals.length === 0 && <span className={clsx(styles.tag, styles.tagRed)}>Tidak ada</span>}
                                </div>
                              </td>
                              <td>
                                <button type="button" onClick={() => handleDeleteMenu(row.id)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>Hapus</button>
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

            {activeTab === "dashboard" ? (
              <>
                <section className={styles.activityCard}>
                  <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                  <ul className={styles.activityList}>
                    {config.activities[activeTab].map((activity) => (
                      <li key={activity.text} className={styles.activityItem}>
                        <span className={styles.activityIcon}>{activity.icon}</span>
                        <div>
                          <p className={styles.activityText}>{activity.text}</p>
                          <p className={styles.activityTime}>{activity.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className={styles.actionGrid}>
                  {config.actions.map((action) => (
                    <button key={action.title} type="button" className={styles.actionCard}>
                      <span>{action.icon}</span>
                      <p className={styles.actionTitle}>{action.title}</p>
                      <p className={styles.actionSub}>{action.subtitle}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <section className={styles.activityCard}>
                <h3 className={styles.activityHeader}>Aktivitas Terkini</h3>
                <ul className={styles.activityList}>
                  {config.activities[activeTab].map((activity) => (
                    <li key={activity.text} className={styles.activityItem}>
                      <span className={styles.activityIcon}>{activity.icon}</span>
                      <div>
                        <p className={styles.activityText}>{activity.text}</p>
                        <p className={styles.activityTime}>{activity.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
