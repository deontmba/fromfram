"use client";

import { createPortal } from "react-dom";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { ForecastingPage } from "@/components/forecasting/ForecastingPage";
import { AdminIngredientsTab } from "./tabs/AdminIngredientsTab";
import { AdminPencatatanTab } from "./tabs/AdminPencatatanTab";
import {
  Activity as PulseIcon,
  BookOpen as BookIcon,
  BrainCircuit,
  CalendarDays as CalendarIcon,
  ChevronRight,
  CircleAlert,
  CircleCheck as CheckCircleIcon,
  Clock as ClockIcon,
  CreditCard,
  LayoutDashboard,
  NotebookTabs,
  Package as BoxIcon,
  Plus,
  ShieldCheck,
  Target as TargetIcon,
  TrendingUp as ChartArrowIcon,
  TriangleAlert as AlertIcon,
  Truck as TruckIcon,
  Users as PeopleIcon,
  Wheat,
} from "lucide-react";
import { PageHeader, PortalShell } from "./portal-shell";
import type { PortalTab } from "./portal-shell";
import styles from "./role-portal-screen.module.css";

type RoleVariant = "admin" | "nutritionist";

type TabItem = PortalTab;

type KpiItem = {
  label: string;
  value: string;
  delta: string;
  icon?: ReactNode;
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

type TrendItem = {
  label: string;
  value: string;
  delta: string;
  note: string;
  progress: number;
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
  imageUrl?: string;
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
  kpis: Record<string, KpiItem[]>;
  activities: Record<string, any[]>;
};

function formatDeliveryStatusLabel(status: DeliveryRow["status"]) {
  if (status === "PREPARING") return "Menyiapkan";
  if (status === "SHIPPED") return "Dikirim";
  return "Terkirim";
}

function formatSubscriptionStatusLabel(status: string | null | undefined) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "PAUSED") return "Jeda";
  if (status === "CANCELLED") return "Batal";
  return status || "-";
}

function formatGoalLabel(goal: string) {
  if (goal === "Weight Loss") return "Turun Berat Badan";
  if (goal === "Low Sodium") return "Rendah Natrium";
  if (goal === "Weight Maintenance") return "Jaga Berat Badan";
  if (goal === "Vegan High Protein") return "Vegan Tinggi Protein";
  return goal;
}

const nutritionRecipes: any[] = [
  { name: "Nasi Goreng Kampung", category: "Indonesian", calories: 450, protein: 18, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
  { name: "Ayam Teriyaki Bowl", category: "Japanese", calories: 520, protein: 31, difficulty: "Mudah", cookTime: "30 min", readiness: "OK" },
  { name: "Spaghetti Carbonara", category: "Italian", calories: 610, protein: 20, difficulty: "Mudah", cookTime: "20 min", readiness: "Needs Review" },
  { name: "Nasi Hainan", category: "Chinese", calories: 480, protein: 24, difficulty: "Sedang", cookTime: "35 min", readiness: "OK" },
  { name: "Beef Bulgogi", category: "Korean", calories: 550, protein: 34, difficulty: "Sedang", cookTime: "40 min", readiness: "OK" },
  { name: "Tom Yum Seafood", category: "Thai", calories: 320, protein: 26, difficulty: "Sedang", cookTime: "30 min", readiness: "OK" },
  { name: "Rendang Sapi", category: "Indonesian", calories: 680, protein: 28, difficulty: "Sulit", cookTime: "45 min", readiness: "Needs Review" },
  { name: "Pad Thai", category: "Thai", calories: 490, protein: 21, difficulty: "Mudah", cookTime: "25 min", readiness: "OK" },
];

type WeeklyDayRow = {
  day: string;
  menu: string;
  goal: string;
  calories: number;
  protein: number;
  validation: string;
};

const weeklyNutritionRows: WeeklyDayRow[] = [
  { day: "Senin", menu: "Salmon Teriyaki + Quinoa", goal: "Atlet", calories: 710, protein: 46, validation: "Valid" },
  { day: "Selasa", menu: "Chicken Caesar Light", goal: "Turun Berat Badan", calories: 520, protein: 35, validation: "Valid" },
  { day: "Rabu", menu: "Tempe Power Bowl", goal: "Vegan Protein Tinggi", calories: 560, protein: 32, validation: "Valid" },
  { day: "Kamis", menu: "Beef Bulgogi Set", goal: "Atlet", calories: 760, protein: 40, validation: "Review" },
  { day: "Jumat", menu: "Tofu Miso Soup + Rice", goal: "Rendah Garam", calories: 430, protein: 23, validation: "Valid" },
  { day: "Sabtu", menu: "Greek Chicken Wrap", goal: "Menjaga Berat Badan", calories: 590, protein: 33, validation: "Valid" },
  { day: "Minggu", menu: "Rendang Lean Plate", goal: "Atlet", calories: 690, protein: 38, validation: "Review" },
];

const adminReportTrends: TrendItem[] = [
  {
    label: "Volume pesanan 7 hari",
    value: "2.418",
    delta: "+14%",
    note: "Lonjakan tertinggi muncul di jam 17.00-20.00 pada hari kerja.",
    progress: 78,
  },
  {
    label: "Pengiriman tepat waktu",
    value: "96.4%",
    delta: "+2.1%",
    note: "Rute Jakarta Selatan dan Bekasi paling stabil minggu ini.",
    progress: 96,
  },
  {
    label: "Tingkat kendala",
    value: "1.8%",
    delta: "-0.6%",
    note: "Kendala terbesar berasal dari perubahan alamat mendadak.",
    progress: 18,
  },
  {
    label: "Pelanggan berulang",
    value: "41%",
    delta: "+6%",
    note: "Pelanggan langganan mingguan mulai mendominasi funnel.",
    progress: 41,
  },
];

const adminReportHighlights = [
  { label: "Rentang pesanan puncak", value: "17.00 - 20.00" },
  { label: "Rute dengan keterlambatan tertinggi", value: "Tangerang Timur" },
  { label: "Segmen pertumbuhan tercepat", value: "Langganan tahunan" },
  { label: "Masalah paling sering", value: "Alamat tidak lengkap" },
];

const adminConfig: RoleConfig = {
  title: "Panel Admin",
  subtitle: "Operasional FromFram",
  tabs: [
    { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
    { id: "deliveries", label: "Pengiriman", icon: TruckIcon },
    { id: "users", label: "Pengguna", icon: PeopleIcon },
    { id: "ingredients", label: "Bahan Baku", icon: Wheat },
    { id: "reports", label: "Prediksi AI", icon: BrainCircuit },
    { id: "ledgers", label: "Pencatatan", icon: NotebookTabs },
  ],
  heroTitle: {
    dashboard: "Dasbor Operasional",
    deliveries: "Operasi Pengiriman",
    users: "Manajemen Pengguna dan Langganan",
    ingredients: "Manajemen Stok Bahan Baku",
    reports: "Prediksi Kebutuhan Pasokan",
    ledgers: "Dasbor Pencatatan",
  },
  heroSubtitle: {
    dashboard: "Pantau data operasional harian dalam satu layar.",
    deliveries: "Kontrol status batch pengiriman dan pantau alur logistik.",
    users: "Lihat status pelanggan dan dampaknya ke pengiriman berikutnya.",
    ingredients: "Pantau stok bahan baku dan lakukan restock.",
    reports: "Pantau estimasi kebutuhan bahan baku dan buat Purchase Order ke petani mitra secara otomatis.",
    ledgers: "Kelola alur transaksi pesanan, penerimaan bahan baku, serta log harian operasional.",
  },
  // Shown only until the real numbers load.
  kpis: {
    dashboard: [
      { label: "Total Pengguna", value: "-", delta: "", icon: <PeopleIcon /> },
      { label: "Langganan Aktif", value: "-", delta: "", icon: <ChartArrowIcon /> },
      { label: "Pengiriman Hari Ini", value: "-", delta: "", icon: <BoxIcon /> },
    ],
  },
  activities: {},
  actions: [],
  accentStrong: "#e12533",
  accentMid: "#ff575f",
  accentSoft: "#ffd5d8",
};

const nutritionConfig: RoleConfig = {
  title: "Panel Ahli Gizi",
  subtitle: "Manajemen Gizi FromFram",
  tabs: [
    { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
    { id: "recipes", label: "Resep", icon: BookIcon },
    { id: "weekly-menu", label: "Menu Mingguan", icon: CalendarIcon },
  ],
  heroTitle: {
    dashboard: "Pusat Kontrol Gizi",
    recipes: "Validasi Gizi Resep",
    "weekly-menu": "Validasi Menu Mingguan Berdasarkan Tujuan",
  },
  heroSubtitle: {
    dashboard: "Validasi kalori, protein, dan kualitas menu mingguan.",
    recipes: "Periksa detail resep sebelum dipublikasikan ke pengguna.",
    "weekly-menu": "Kelompokkan menu berdasarkan target kesehatan pengguna.",
  },
  kpis: {
    dashboard: [
      { label: "Total Resep", value: "156", delta: "+8", icon: <BookIcon /> },
      { label: "Menu Mingguan", value: "24", delta: "+3", icon: <CalendarIcon /> },
      { label: "Pengguna Aktif", value: "856", delta: "+12", icon: <PeopleIcon /> },
    ],
    recipes: [
      { label: "Siap", value: "133", delta: "85%", icon: <CheckCircleIcon /> },
      { label: "Perlu Tinjau", value: "23", delta: "15%", icon: <AlertIcon /> },
      { label: "Fokus Protein", value: "47", delta: "+5", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { label: "Kelompok Tujuan", value: "6", delta: "Aktif", icon: <TargetIcon /> },
      { label: "Slot Terverifikasi", value: "19", delta: "Sesuai Jalur", icon: <CheckCircleIcon /> },
      { label: "Menunggu Tinjauan", value: "5", delta: "Perlu Tindakan", icon: <AlertIcon /> },
    ],
  },
  activities: {
    dashboard: [
      { text: "Menu baru ditambahkan: Salmon Teriyaki", time: "1 jam lalu", icon: <BookIcon /> },
      { text: "Resep diperbarui: Nasi Goreng Kampung", time: "3 jam lalu", icon: <PulseIcon /> },
      { text: "Menu mingguan pekan 3 dipublikasikan", time: "5 jam lalu", icon: <CalendarIcon /> },
    ],
    recipes: [
      { text: "2 resep melewati batas natrium harian", time: "8 menit lalu", icon: <AlertIcon /> },
      { text: "6 resep kategori atlet sudah terverifikasi", time: "36 menit lalu", icon: <CheckCircleIcon /> },
      { text: "Audit protein mingguan berhasil", time: "2 jam lalu", icon: <PulseIcon /> },
    ],
    "weekly-menu": [
      { text: "Kelompok tujuan Atlet mendapat 3 menu baru", time: "11 menit lalu", icon: <TargetIcon /> },
      { text: "Tinjauan menu Rendah Natrium dijadwalkan", time: "47 menit lalu", icon: <ClockIcon /> },
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
  const [isLoading, setLoading] = useState(false);

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
  // Dynamic Real-time Dashboard States
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number;
    activeSubscriptions: number;
    todayDeliveries: number;
  } | null>(null);
  const [adminActivities, setAdminActivities] = useState<any[]>([]);
  const [adminReportData, setAdminReportData] = useState<{
    trends: any[];
    highlights: any[];
  } | null>(null);
  const [nutritionActivities, setNutritionActivities] = useState<any[]>([]);

  // CRUD states
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [recipeForm, setRecipeForm] = useState({ id: "", name: "", description: "", calories: "", protein: "", servings: '6', imageUrl: "" });
  const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({ recipeId: "", weekStartDate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generic custom alert state
  const [customAlert, setCustomAlert] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant?: "default" | "destructive" | "admin" | "nutritionist";
    hideCancel?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  // Delivery CRUD UI states (admin)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ id: "", userId: "", menu: "", address: "", deliveryDate: "", status: "PREPARING" });
  const [isDeliverySubmitting, setIsDeliverySubmitting] = useState(false);
  const [isDeletingDeliveryId, setIsDeletingDeliveryId] = useState<string | null>(null);
  const [expandedDeliveryKeys, setExpandedDeliveryKeys] = useState<Set<string>>(new Set());

  const toggleExpandDelivery = (key: string) => {
    setExpandedDeliveryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  // Action dropdown state for table rows
  const [openActionMenu, setOpenActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pendingDeliveryAction, setPendingDeliveryAction] = useState<
    | { type: "save" }
    | { type: "advance"; id: string }
    | { type: "delete"; id: string }
    | null
  >(null);

  // Action dropdown state for recipe and menu tables
  const [openRecipeActionMenu, setOpenRecipeActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [openMenuActionMenu, setOpenMenuActionMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pendingRecipeAction, setPendingRecipeAction] = useState<{ type: "edit" | "delete"; id: string } | null>(null);
  const [pendingMenuAction, setPendingMenuAction] = useState<{ type: "edit" | "delete"; id: string } | null>(null);

  // Search/filter states
  const [deliveryPageSize, setDeliveryPageSize] = useState(25);
  const [userPageSize, setUserPageSize] = useState(25);


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

      const res = await fetch(`/api/admin/deliveries?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data pengiriman");
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
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data pengguna");
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
      const res = await fetch("/api/nutritionist/dashboard/kpis", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil KPI");
      const data = await res.json();
      setNutritionKpis([
        { label: "Total Resep", value: String(data.data.totalRecipes), delta: "", icon: <BookIcon /> },
        { label: "Menu Mingguan", value: String(data.data.weeklyMenusCount), delta: "", icon: <CalendarIcon /> },
        { label: "Pengguna Aktif", value: String(data.data.activeUsers), delta: "", icon: <PeopleIcon /> },
      ]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Admin Dashboard Stats & Dynamic Activities
  const fetchAdminDashboardStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      const data = await res.json();
      setAdminStats({
        totalUsers: data.totalUsers,
        activeSubscriptions: data.activeSubscriptions,
        todayDeliveries: data.todayDeliveries,
      });

      const mapped = (data.activities || []).map((act: any) => {
        let icon = <PeopleIcon />;
        if (act.icon === "delivery") icon = <TruckIcon />;
        if (act.icon === "payment") icon = <CreditCard />;
        return {
          text: act.text,
          time: act.time,
          icon,
        };
      });
      setAdminActivities(mapped);
    } catch (err) {
      console.error("[FETCH ADMIN DASHBOARD]", err);
    }
  }, []);

  // Fetch Admin Reports live trends and highlights
  const fetchAdminReports = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil data laporan");
      const data = await res.json();
      setAdminReportData(data);
    } catch (err) {
      console.error("[FETCH ADMIN REPORTS]", err);
    }
  }, []);

  // Fetch Nutritionist Dashboard dynamic activities
  const fetchNutritionActivities = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/dashboard/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil aktivitas ahli gizi");
      const data = await res.json();
      const mapped = (data.activities || []).map((act: any) => {
        let icon = <BookIcon />;
        if (act.icon === "CalendarIcon") icon = <CalendarIcon />;
        return {
          text: act.text,
          time: act.time,
          icon,
        };
      });
      setNutritionActivities(mapped);
    } catch (err) {
      console.error("[FETCH NUTRITIONIST ACTIVITIES]", err);
    }
  }, []);

  const fetchRecipes = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/recipes", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil resep");
      const data = await res.json();
      setRecipes(data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchWeeklyMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/nutritionist/weekly-menus", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil menu mingguan");
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
    setLoading(true);
    setError("");

    const load = async () => {
      if (role === "admin") {
        if (activeTab === "dashboard") {
          await fetchAdminDashboardStats();
        } else if (activeTab === "deliveries") {
          await Promise.all([fetchUsers(), fetchDeliveries()]);
        } else if (activeTab === "users") {
          await fetchUsers();
        }
      } else if (role === "nutritionist") {
        if (activeTab === "dashboard") {
          await Promise.all([fetchNutritionKpis(), fetchNutritionActivities()]);
        } else if (activeTab === "recipes") {
          await fetchRecipes();
        } else if (activeTab === "weekly-menu") {
          await fetchWeeklyMenus();
        }
      }
      setLoading(false);
    };

    load();
  }, [
    role,
    activeTab,
    fetchDeliveries,
    fetchUsers,
    fetchNutritionKpis,
    fetchRecipes,
    fetchWeeklyMenus,
    fetchAdminDashboardStats,
    fetchAdminReports,
    fetchNutritionActivities,
  ]);

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

  // Delivery CRUD handlers (frontend only, use existing admin APIs)
  async function openEditDelivery(row: DeliveryRow) {
    setDeliveryForm({
      id: row.id,
      userId: row.userId,
      menu: row.menu,
      address: row.address,
      deliveryDate: new Date(row.deliveryDate).toISOString().slice(0, 16),
      status: row.status,
    });
    setShowDeliveryForm(true);
  }

  function openRevertDelivery(row: DeliveryRow) {
    setDeliveryForm({
      id: row.id,
      userId: row.userId,
      menu: row.menu,
      address: row.address,
      deliveryDate: new Date(row.deliveryDate).toISOString().slice(0, 16),
      status: row.status === "DELIVERED" ? "SHIPPED" : row.status,
    });
    setShowDeliveryForm(true);
  }

  function openCreateDelivery() {
    setDeliveryForm({ id: "", userId: "", menu: "", address: "", deliveryDate: "", status: "PREPARING" });
    setShowDeliveryForm(true);
  }

  async function handleSaveDelivery(e: React.FormEvent) {
    e.preventDefault();
    if (!isDeliveryUserIdValid) {
      setError("User ID tidak valid. Pilih user yang terdaftar terlebih dahulu.");
      return;
    }

    setPendingDeliveryAction({ type: "save" });
  }

  async function confirmSaveDelivery() {
    setIsDeliverySubmitting(true);
    setError("");
    try {
      const method = deliveryForm.id ? "PATCH" : "POST";
      const url = deliveryForm.id ? `/api/admin/deliveries/${deliveryForm.id}` : "/api/admin/deliveries";
      const body = {
        userId: deliveryForm.userId,
        menu: deliveryForm.menu,
        address: deliveryForm.address,
        deliveryDate: deliveryForm.deliveryDate ? new Date(deliveryForm.deliveryDate).toISOString() : undefined,
        status: deliveryForm.status,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Gagal menyimpan delivery");
      await fetchDeliveries();
      setShowDeliveryForm(false);
      setDeliveryForm({ id: "", userId: "", menu: "", address: "", deliveryDate: "", status: "PREPARING" });
      setPendingDeliveryAction(null);
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Menyimpan",
        message: "Terjadi kesalahan saat menyimpan data pengiriman (delivery).",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    } finally {
      setIsDeliverySubmitting(false);
    }
  }

  async function confirmDeleteDelivery(id: string) {
    setIsDeletingDeliveryId(id);
    try {
      const res = await fetch(`/api/admin/deliveries/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Gagal menghapus delivery");
      await fetchDeliveries();
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Menghapus",
        message: "Terjadi kesalahan saat menghapus data pengiriman (delivery).",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    } finally {
      setIsDeletingDeliveryId(null);
    }
  }

  async function handleConfirmDeliveryAction() {
    if (!pendingDeliveryAction) {
      return;
    }

    const action = pendingDeliveryAction;
    setPendingDeliveryAction(null);

    if (action.type === "save") {
      await confirmSaveDelivery();
      return;
    }

    if (action.type === "advance") {
      setOpenActionMenu(null);
      await advanceDelivery(action.id);
      return;
    }

    setOpenActionMenu(null);
    await confirmDeleteDelivery(action.id);
  }

  // ── CRUD Nutritionist ───────────────────────────────────────────────────
  async function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = recipeForm.imageUrl;

      if (recipeImageFile) {
        const formData = new FormData();
        formData.append("file", recipeImageFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Gagal mengunggah gambar");
        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }

      const method = recipeForm.id ? "PATCH" : "POST";
      const url = recipeForm.id
        ? `/api/nutritionist/recipes/${recipeForm.id}`
        : "/api/nutritionist/recipes";
      const body = {
        name: recipeForm.name,
        description: recipeForm.description,
        calories: parseInt(recipeForm.calories) || 0,
        protein: parseFloat(recipeForm.protein) || 0,
        servings: parseInt(recipeForm.servings) || 6,
        ...(finalImageUrl ? { imageUrl: finalImageUrl } : {}),
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
      const savedName = recipeForm.name;
      setRecipeForm({ id: "", name: "", description: "", calories: "", protein: "", servings: "6", imageUrl: "" });
      setRecipeImageFile(null);
      setCustomAlert({
        title: "Resep Disimpan",
        message: `Resep "${savedName}" berhasil disimpan ke dalam database.`,
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => { },
      });
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Menyimpan Resep",
        message: "Terjadi kesalahan saat menyimpan data resep. Pastikan semua field sudah diisi dengan benar.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRecipe(id: string) {
    try {
      const res = await fetch(`/api/nutritionist/recipes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Gagal menghapus resep");
      await fetchRecipes();
      setCustomAlert({
        title: "Resep Dihapus",
        message: "Resep berhasil dihapus dari database.",
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => { },
      });
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Menghapus Resep",
        message: "Terjadi kesalahan saat menghapus resep dari database.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    }
  }

  function openEditRecipe(id: string) {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    setRecipeForm({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description || "",
      calories: String(recipe.calories),
      protein: String(recipe.protein),
      servings: String(recipe.servings),
      imageUrl: recipe.imageUrl || "",
    });
    setRecipeImageFile(null);
    setShowRecipeForm(true);
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
      setCustomAlert({
        title: "Menu Ditambahkan",
        message: "Resep berhasil dijadwalkan ke menu mingguan.",
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => { },
      });
    } catch (err) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Menambahkan Menu",
        message: "Terjadi kesalahan saat menambahkan resep ke jadwal menu mingguan.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAutoGenerateNextWeek() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/nutritionist/weekly-menus/auto-generate", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal meng-generate menu");

      setCustomAlert({
        title: "Generasi Berhasil",
        message: data.message || "Berhasil meng-generate menu minggu depan.",
        confirmLabel: "OK",
        variant: "nutritionist",
        hideCancel: true,
        onConfirm: () => { },
      });
      await fetchWeeklyMenus();
    } catch (err: any) {
      console.error(err);
      setCustomAlert({
        title: "Gagal Meng-generate",
        message: err.message || "Terjadi kesalahan saat meng-generate resep untuk minggu depan.",
        confirmLabel: "Tutup",
        variant: "destructive",
        hideCancel: true,
        onConfirm: () => { },
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeleteMenu(id: string) {
    setCustomAlert({
      title: "Hapus Menu Mingguan",
      message: "Apakah Anda yakin ingin menghapus resep ini dari jadwal menu?",
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "destructive",
      hideCancel: false,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/nutritionist/weekly-menus/${id}`, { method: "DELETE", credentials: "include" });
          if (!res.ok) throw new Error("Gagal menghapus menu");
          setGoalEditorMenuId((current) => (current === id ? null : current));
          setGoalOverrides((prev) => {
            if (!(id in prev)) {
              return prev;
            }
            const next = { ...prev };
            delete next[id];
            return next;
          });
          await fetchWeeklyMenus();
          setCustomAlert({
            title: "Menu Dihapus",
            message: "Menu berhasil dihapus dari jadwal mingguan.",
            confirmLabel: "OK",
            variant: "nutritionist",
            hideCancel: true,
            onConfirm: () => { },
          });
        } catch (err) {
          console.error(err);
          setCustomAlert({
            title: "Gagal Menghapus Menu",
            message: "Terjadi kesalahan saat menghapus menu dari jadwal.",
            confirmLabel: "Tutup",
            variant: "destructive",
            hideCancel: true,
            onConfirm: () => { },
          });
        }
      }
    });
  }

  function openEditMenu(menuId: string) {
    // Search through weeks to find the menu and its week
    let foundMenu = null;
    let foundWeekStartDate = "";
    for (const week of weeklyMenus) {
      const menu = week.menus.find((m) => m.id === menuId);
      if (menu) {
        foundMenu = menu;
        foundWeekStartDate = week.weekStartDate;
        break;
      }
    }
    if (!foundMenu) return;
    // Find recipeId by matching the recipeName
    const recipe = recipes.find((r) => r.name === foundMenu.recipeName);
    const recipeId = recipe?.id || "";
    setMenuForm({
      recipeId: recipeId,
      weekStartDate: foundWeekStartDate.slice(0, 10),
    });
    setShowMenuForm(true);
  }

  // Computed KPI values from real data
  const deliveryKpis = useMemo(() => {
    const preparing = deliveries.filter((d) => d.status === "PREPARING").length;
    const shipped = deliveries.filter((d) => d.status === "SHIPPED").length;
    const delivered = deliveries.filter((d) => d.status === "DELIVERED").length;
    return [
      { label: "Menyiapkan", value: String(preparing), delta: "", icon: <ClockIcon /> },
      { label: "Dikirim", value: String(shipped), delta: "", icon: <TruckIcon /> },
      { label: "Terkirim", value: String(delivered), delta: "", icon: <CheckCircleIcon /> },
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
      { label: "Total Pengguna", value: String(total), delta: "", icon: <PeopleIcon /> },
      { label: "Langganan Aktif", value: String(active), delta: "", icon: <CheckCircleIcon /> },
      { label: "Jeda / Batal", value: String(pausedCancelled), delta: "", icon: <AlertIcon /> },
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
      { label: "Kelompok Tujuan", value: String(visibleGoals), delta: "Aktif", icon: <TargetIcon /> },
      { label: "Slot Tervalidasi", value: String(validatedSlots), delta: "Aman", icon: <CheckCircleIcon /> },
      { label: "Menunggu Tinjauan", value: String(pendingReview), delta: "Perlu Tindakan", icon: <AlertIcon /> },
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

  // Filtered & Grouped deliveries by User + Week Monday
  const groupedDeliveries = useMemo(() => {
    const filtered = deliveries.filter((d) => {
      const matchesSearch =
        deliverySearch === "" ||
        d.id.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        d.user.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        d.menu.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        d.address.toLowerCase().includes(deliverySearch.toLowerCase());
      return matchesSearch;
    });

    const groups: Record<string, {
      key: string;
      userId: string;
      user: string;
      address: string;
      weekStart: string;
      weekEnd: string;
      deliveries: DeliveryRow[];
    }> = {};

    filtered.forEach((d) => {
      const date = new Date(d.deliveryDate);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekStartStr = monday.toISOString().split("T")[0];

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const weekEndStr = sunday.toISOString().split("T")[0];

      const groupKey = `${d.userId}_${weekStartStr}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: groupKey,
          userId: d.userId,
          user: d.user,
          address: d.address,
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          deliveries: [],
        };
      }
      groups[groupKey].deliveries.push(d);
    });

    // Sort deliveries within each group by deliveryDate ascending
    Object.values(groups).forEach((g) => {
      g.deliveries.sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
    });

    // Convert to array and sort by weekStart descending, then by user name
    return Object.values(groups).sort((a, b) => {
      const timeDiff = new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.user.localeCompare(b.user);
    });
  }, [deliveries, deliverySearch]);

  const totalDeliveryPages = Math.max(1, Math.ceil(groupedDeliveries.length / deliveryPageSize));

  const paginatedDeliveries = useMemo(() => {
    const startIndex = (deliveryPage - 1) * deliveryPageSize;
    return groupedDeliveries.slice(startIndex, startIndex + deliveryPageSize);
  }, [groupedDeliveries, deliveryPage, deliveryPageSize]);

  useEffect(() => {
    setDeliveryPage(1);
  }, [deliverySearch, deliveryStatusFilter, deliveryAreaFilter, deliveryPageSize]);

  useEffect(() => {
    setDeliveryPage((currentPage) => Math.min(currentPage, totalDeliveryPages));
  }, [totalDeliveryPages]);

  useEffect(() => {
    setOpenActionMenu(null);
  }, [deliveryPage, deliveryPageSize]);

  const isDeliveryUserIdValid = useMemo(() => {
    const normalizedUserId = deliveryForm.userId.trim();
    if (!normalizedUserId) {
      return true;
    }

    return users.some((user) => user.id === normalizedUserId);
  }, [deliveryForm.userId, users]);

  const selectedRecipeAction = useMemo(() => {
    if (!pendingRecipeAction) {
      return null;
    }

    if (pendingRecipeAction.type === "edit") {
      return {
        title: "Konfirmasi Edit Resep",
        message: "Apakah Anda yakin ingin mengedit resep ini?",
        confirmLabel: "Ya, Edit",
        variant: "nutritionist" as const,
      };
    }

    return {
      title: "Konfirmasi Hapus Resep",
      message: "Apakah Anda yakin ingin menghapus resep ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, Hapus",
      variant: "destructive" as const,
    };
  }, [pendingRecipeAction]);

  async function handleConfirmRecipeAction() {
    if (!pendingRecipeAction) {
      return;
    }

    const action = pendingRecipeAction;
    setPendingRecipeAction(null);

    if (action.type === "edit") {
      setOpenRecipeActionMenu(null);
      openEditRecipe(action.id);
      return;
    }

    setOpenRecipeActionMenu(null);
    await handleDeleteRecipe(action.id);
  }

  const selectedDeliveryAction = useMemo(() => {
    if (!pendingDeliveryAction) {
      return null;
    }

    if (pendingDeliveryAction.type === "save") {
      return {
        title: deliveryForm.id ? "Konfirmasi Perubahan Delivery" : "Konfirmasi Delivery Baru",
        message: deliveryForm.id
          ? "Pastikan detail delivery sudah benar sebelum perubahan disimpan."
          : "Pastikan detail delivery sudah benar sebelum delivery baru dibuat.",
        confirmLabel: deliveryForm.id ? "Ya, Simpan" : "Ya, Buat Delivery",
        variant: "admin" as const,
      };
    }

    if (pendingDeliveryAction.type === "advance") {
      return {
        title: "Konfirmasi Advance Status",
        message: "Apakah Anda yakin ingin memajukan status delivery ini?",
        confirmLabel: "Ya, Advance",
        variant: "admin" as const,
      };
    }

    return {
      title: "Konfirmasi Hapus Delivery",
      message: "Apakah Anda yakin ingin menghapus delivery ini? Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, Hapus",
      variant: "destructive" as const,
    };
  }, [deliveryForm.id, pendingDeliveryAction]);

  useEffect(() => {
    if (!openActionMenu) return;

    const handleScroll = () => setOpenActionMenu(null);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [openActionMenu]);

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

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize));

  const paginatedUsers = useMemo(() => {
    const startIndex = (userPage - 1) * userPageSize;
    return filteredUsers.slice(startIndex, startIndex + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userPlanFilter, userStatusFilter, userPageSize]);

  useEffect(() => {
    setUserPage((currentPage) => Math.min(currentPage, totalUserPages));
  }, [totalUserPages]);

  const openActionRow = useMemo(() => {
    if (!openActionMenu) return null;
    return deliveries.find((row) => row.id === openActionMenu.id) || null;
  }, [deliveries, openActionMenu]);

  // Get KPIs based on active tab
  const currentKpis = useMemo(() => {
    if (role === "admin" && activeTab === "dashboard" && adminStats) {
      return [
        { label: "Total Pengguna", value: String(adminStats.totalUsers), delta: "", icon: <PeopleIcon /> },
        { label: "Langganan Aktif", value: String(adminStats.activeSubscriptions), delta: "", icon: <ChartArrowIcon /> },
        { label: "Pengiriman Hari Ini", value: String(adminStats.todayDeliveries), delta: "", icon: <BoxIcon /> },
      ];
    }
    if (role === "admin" && activeTab === "deliveries") return deliveryKpis;
    if (role === "admin" && activeTab === "users") return userKpis;
    if (role === "nutritionist" && activeTab === "dashboard" && nutritionKpis) return nutritionKpis;
    if (role === "nutritionist" && activeTab === "weekly-menu") return weeklyMenuKpis;
    return config.kpis[activeTab] || [];
  }, [role, activeTab, config.kpis, deliveryKpis, userKpis, nutritionKpis, weeklyMenuKpis, adminStats, adminReportData]);

  // Get Activities based on active tab
  const currentActivities = useMemo(() => {
    if (role === "admin" && activeTab === "dashboard") {
      return adminActivities.length > 0 ? adminActivities : config.activities[activeTab] || [];
    }
    if (role === "nutritionist" && activeTab === "dashboard") {
      return nutritionActivities.length > 0 ? nutritionActivities : config.activities[activeTab] || [];
    }
    return config.activities[activeTab] || [];
  }, [role, activeTab, config.activities, adminActivities, nutritionActivities]);

  // These tabs render their own header.
  const showPageHeader = !["ledgers", "reports", "ingredients"].includes(activeTab);

  return (
    <>
      <PortalShell
        title={config.title}
        subtitle={config.subtitle}
        icon={role === "admin" ? ShieldCheck : PulseIcon}
        accent={{ strong: config.accentStrong, mid: config.accentMid, soft: config.accentSoft }}
        tabs={config.tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
            <div className={styles.contentWrap} key={activeTab}>
              {showPageHeader && (
                <>
                  <PageHeader
                    title={config.heroTitle[activeTab]}
                    subtitle={config.heroSubtitle[activeTab]}
                    actions={
                      role === "admin" && activeTab === "deliveries" ? (
                        <button type="button" className={styles.actionCard} onClick={openCreateDelivery}>
                          <Plus aria-hidden="true" />
                          Tambah Pengiriman
                        </button>
                      ) : null
                    }
                  />

                  {error && (
                    <div className={styles.notice} role="alert">
                      <CircleAlert aria-hidden="true" />
                      <p className={styles.noticeTitle}>{error}</p>
                    </div>
                  )}

                  {currentKpis.length > 0 && (
                    <div className={styles.kpiGrid}>
                      {currentKpis.map((kpi) => (
                        <article key={kpi.label} className={styles.kpiCard}>
                          <div className={styles.kpiRow}>
                            <p className={styles.kpiLabel} style={{ margin: 0 }}>{kpi.label}</p>
                            {kpi.icon ? <span className={styles.activityIcon}>{kpi.icon}</span> : null}
                          </div>
                          <p className={styles.kpiValue}>{kpi.value}</p>
                          {kpi.delta ? <p className={styles.deltaBadge}>{kpi.delta}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}

              {isLoading && <div className={styles.emptyState}>Memuat data...</div>}

              {/* ── ADMIN: DELIVERIES TAB ─────────────────────────────────── */}
              {role === "admin" && activeTab === "deliveries" && !deliveriesLoading ? (
                <>
                  {showDeliveryForm && (
                    <form onSubmit={handleSaveDelivery} className={styles.formCard}>
                      <h2 className={styles.formTitle}>{deliveryForm.id ? "Ubah Pengiriman" : "Pengiriman Baru"}</h2>
                      <div className={styles.deliveryFormGrid}>
                        <label className={styles.deliveryField}>
                          <span className={styles.deliveryFieldLabel}>User ID</span>
                          <input
                            className={clsx(styles.input, deliveryForm.userId && !isDeliveryUserIdValid && styles.deliveryFieldInvalidInput)}
                            placeholder="cmoz814qj0007lkw262riq2a0"
                            required
                            value={deliveryForm.userId}
                            onChange={e => setDeliveryForm({ ...deliveryForm, userId: e.target.value })}
                          />
                          {deliveryForm.userId && !isDeliveryUserIdValid && (
                            <span className={styles.deliveryFieldWarning}>User ID tidak ditemukan. Pastikan user sudah terdaftar.</span>
                          )}
                        </label>

                        <label className={styles.deliveryField}>
                          <span className={styles.deliveryFieldLabel}>Menu</span>
                          <input className={styles.input} placeholder="Salmon Bowl Sehat" required value={deliveryForm.menu} onChange={e => setDeliveryForm({ ...deliveryForm, menu: e.target.value })} />
                        </label>

                        <label className={styles.deliveryField}>
                          <span className={styles.deliveryFieldLabel}>Alamat</span>
                          <input className={styles.input} placeholder="Cimahi, Jawa Barat" required value={deliveryForm.address} onChange={e => setDeliveryForm({ ...deliveryForm, address: e.target.value })} />
                        </label>

                        <label className={styles.deliveryField}>
                          <span className={styles.deliveryFieldLabel}>Tanggal Pengiriman</span>
                          <input className={styles.input} type="datetime-local" value={deliveryForm.deliveryDate} onChange={e => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} />
                        </label>

                        <label className={styles.deliveryField}>
                          <span className={styles.deliveryFieldLabel}>Status</span>
                          <select className={styles.select} value={deliveryForm.status} onChange={e => setDeliveryForm({ ...deliveryForm, status: e.target.value })}>
                            <option value="PREPARING">Menyiapkan</option>
                            <option value="SHIPPED">Dikirim</option>
                            <option value="DELIVERED">Terkirim</option>
                          </select>
                        </label>
                      </div>
                      <div className={styles.formActions}>
                        <button type="button" className={styles.tabButton} onClick={() => setShowDeliveryForm(false)}>
                          Batal
                        </button>
                        <button type="submit" className={styles.actionCard} disabled={isDeliverySubmitting}>
                          {isDeliverySubmitting ? "Menyimpan..." : deliveryForm.id ? "Simpan Perubahan" : "Buat Pengiriman"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Search & Filter */}
                  <div className={styles.searchRow}>
                    <input
                      className={styles.input}
                      type="search"
                      aria-label="Cari pengiriman"
                      placeholder="Cari ID, pengguna, atau menu"
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      aria-label="Filter status"
                      value={deliveryStatusFilter}
                      onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                    >
                      <option value="all">Semua status</option>
                      <option value="preparing">Menyiapkan</option>
                      <option value="shipped">Dikirim</option>
                      <option value="delivered">Terkirim</option>
                    </select>
                    <select
                      className={styles.select}
                      aria-label="Filter waktu makan"
                      value={deliveryMealTypeFilter}
                      onChange={(e) => setDeliveryMealTypeFilter(e.target.value)}
                    >
                      <option value="all">Semua waktu makan</option>
                      <option value="lunch">Makan Siang</option>
                      <option value="dinner">Makan Malam</option>
                    </select>
                    <select
                      className={styles.select}
                      aria-label="Filter area"
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

                  {/* Table */}
                  <div className={styles.tableShell}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Pekan</th>
                          <th>Pengguna</th>
                          <th>Menu</th>
                          <th>Alamat</th>
                          <th>Status</th>
                          <th aria-label="Aksi" />
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDeliveries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className={styles.emptyState}>
                              Belum ada data pengiriman.
                            </td>
                          </tr>
                        ) : (
                          paginatedDeliveries.map((row) => {
                            const total = row.deliveries.length;
                            const delivered = row.deliveries.filter(d => d.status === 'DELIVERED').length;
                            const shipped = row.deliveries.filter(d => d.status === 'SHIPPED').length;
                            const preparing = row.deliveries.filter(d => d.status === 'PREPARING').length;

                            let statusText = "Menyiapkan";
                            let statusVariant: "PREPARING" | "SHIPPED" | "DELIVERED" = "PREPARING";
                            if (delivered === total) {
                              statusText = "Terkirim semua";
                              statusVariant = "DELIVERED";
                            } else if (delivered > 0 || shipped > 0) {
                              statusText = `Proses (${delivered}/${total} terkirim)`;
                              statusVariant = "SHIPPED";
                            }

                            const weekLabel = new Date(row.weekStart).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short'
                            }) + " - " + new Date(row.weekEnd).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });

                            const isExpanded = expandedDeliveryKeys.has(row.key);

                            return (
                              <Fragment key={row.key}>
                                <tr style={{ cursor: "pointer" }} onClick={() => toggleExpandDelivery(row.key)}>
                                  <td className={styles.tableKey}>
                                    <span className={clsx(styles.expandToggle, isExpanded && styles.expandToggleOpen)}>
                                      <ChevronRight aria-hidden="true" />
                                      {new Date(row.weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </td>
                                  <td className={styles.tableKey}>{row.user}</td>
                                  <td className={styles.nowrap}>{total} menu</td>
                                  <td>{row.address}</td>
                                  <td>
                                    <span className={clsx(styles.tag, statusClass[statusVariant])}>
                                      {statusText}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className={styles.tabButton}
                                      aria-expanded={isExpanded}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpandDelivery(row.key);
                                      }}
                                    >
                                      {isExpanded ? "Tutup" : "Detail"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className={styles.detailRow}>
                                    <td colSpan={6}>
                                      <div className={styles.detailHead}>
                                        <p className={styles.detailTitle}>Jadwal harian {weekLabel}</p>
                                        <span>
                                          {total} total · {preparing} menyiapkan · {shipped} dikirim · {delivered} terkirim
                                        </span>
                                      </div>
                                      <div className={styles.detailGrid}>
                                        {row.deliveries.map((d) => {
                                          const dateLabel = new Date(d.deliveryDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                                          return (
                                            <div key={d.id} className={styles.detailCard}>
                                              <div>
                                                <div className={styles.detailCardHead}>
                                                  <span>{dateLabel}</span>
                                                  <span className={clsx(styles.tag, statusClass[d.status])}>
                                                    {formatDeliveryStatusLabel(d.status)}
                                                  </span>
                                                </div>
                                                <p className={styles.detailCardTitle}>{d.menu}</p>
                                                <span className={styles.cellSub}>ID {d.id.slice(0, 8)}</span>
                                              </div>
                                              <div className={styles.detailCardActions}>
                                                <button
                                                  type="button"
                                                  className={clsx(styles.tabButton, styles.dangerButton)}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingDeliveryAction({ type: "delete", id: d.id });
                                                  }}
                                                >
                                                  Hapus
                                                </button>
                                                <button
                                                  type="button"
                                                  className={styles.tabButton}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditDelivery(d);
                                                  }}
                                                >
                                                  Ubah
                                                </button>
                                                {d.status !== 'DELIVERED' && (
                                                  <button
                                                    type="button"
                                                    className={styles.actionCard}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setPendingDeliveryAction({ type: "advance", id: d.id });
                                                    }}
                                                  >
                                                    {d.status === 'PREPARING' ? 'Kirim' : 'Selesai'}
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.paginationBar}>
                    <p className={styles.paginationInfo}>
                      {groupedDeliveries.length === 0 ? 0 : (deliveryPage - 1) * deliveryPageSize + 1}
                      -{Math.min(deliveryPage * deliveryPageSize, groupedDeliveries.length)} dari {groupedDeliveries.length} batch mingguan
                    </p>
                    <div className={styles.paginationControls}>
                      <select
                        className={styles.select}
                        aria-label="Baris per halaman"
                        value={deliveryPageSize}
                        onChange={(e) => setDeliveryPageSize(Number(e.target.value))}
                        style={{ width: "auto" }}
                      >
                        <option value="10">10 / halaman</option>
                        <option value="25">25 / halaman</option>
                        <option value="50">50 / halaman</option>
                        <option value="100">100 / halaman</option>
                      </select>
                      <button
                        type="button"
                        className={clsx(styles.tabButton, styles.paginationButton)}
                        onClick={() => setDeliveryPage((currentPage) => Math.max(1, currentPage - 1))}
                        disabled={deliveryPage === 1}
                      >
                        Sebelumnya
                      </button>
                      <span className={styles.paginationPageLabel}>
                        {deliveryPage} / {totalDeliveryPages}
                      </span>
                      <button
                        type="button"
                        className={clsx(styles.tabButton, styles.paginationButton)}
                        onClick={() => setDeliveryPage((currentPage) => Math.min(totalDeliveryPages, currentPage + 1))}
                        disabled={deliveryPage === totalDeliveryPages}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {/* ── ADMIN: USERS TAB ──────────────────────────────────────── */}
              {role === "admin" && activeTab === "users" && !usersLoading ? (
                <>
                  <div className={styles.searchRow}>
                    <input
                      className={styles.input}
                      type="search"
                      aria-label="Cari pengguna"
                      placeholder="Cari nama atau email"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    <select
                      className={styles.select}
                      aria-label="Filter paket"
                      value={userPlanFilter}
                      onChange={(e) => setUserPlanFilter(e.target.value)}
                    >
                      <option value="all">Semua paket</option>
                      <option value="mingguan">Mingguan</option>
                      <option value="bulanan">Bulanan</option>
                      <option value="tahunan">Tahunan</option>
                    </select>
                    <select
                      className={styles.select}
                      aria-label="Filter status"
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                    >
                      <option value="all">Semua status</option>
                      <option value="active">Aktif</option>
                      <option value="paused">Jeda</option>
                      <option value="cancelled">Batal</option>
                    </select>
                  </div>

                  <div className={styles.tableShell}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Pengguna</th>
                          <th>Alamat</th>
                          <th>Paket</th>
                          <th>Status</th>
                          <th>Porsi</th>
                          <th>Pengiriman</th>
                          <th>Bergabung</th>
                          <th>Kirim berikutnya</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className={styles.emptyState}>
                              Tidak ada pengguna yang cocok.
                            </td>
                          </tr>
                        ) : (
                          paginatedUsers.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <span className={styles.tableKey}>{row.name}</span>
                                <span className={styles.cellSub}>{row.email}</span>
                                {row.phoneNumber && <span className={styles.cellSub}>{row.phoneNumber}</span>}
                              </td>
                              <td>{row.address || "-"}</td>
                              <td>
                                {row.plan ? (
                                  <span className={clsx(styles.tag, styles.tagGray)}>{row.plan}</span>
                                ) : "-"}
                              </td>
                              <td>
                                <span className={clsx(styles.tag, statusClass[row.subscriptionStatus || ""])}>
                                  {formatSubscriptionStatusLabel(row.subscriptionStatus)}
                                </span>
                              </td>
                              <td className={styles.nowrap}>{row.servings ?? "-"}</td>
                              <td className={styles.nowrap}>{row.totalDeliveries}</td>
                              <td className={styles.nowrap}>
                                {new Date(row.joinedAt).toLocaleDateString("id-ID")}
                              </td>
                              <td className={styles.nowrap}>
                                {row.nextDelivery
                                  ? new Date(row.nextDelivery).toLocaleDateString("id-ID")
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.paginationBar}>
                    <p className={styles.paginationInfo}>
                      {filteredUsers.length === 0 ? 0 : (userPage - 1) * userPageSize + 1}
                      -{Math.min(userPage * userPageSize, filteredUsers.length)} dari {filteredUsers.length} pengguna
                    </p>
                    <div className={styles.paginationControls}>
                      <select
                        className={styles.select}
                        aria-label="Baris per halaman"
                        value={userPageSize}
                        onChange={(e) => setUserPageSize(Number(e.target.value))}
                        style={{ width: "auto" }}
                      >
                        <option value="10">10 / halaman</option>
                        <option value="25">25 / halaman</option>
                        <option value="50">50 / halaman</option>
                        <option value="100">100 / halaman</option>
                      </select>
                      <button
                        type="button"
                        className={clsx(styles.tabButton, styles.paginationButton)}
                        onClick={() => setUserPage((currentPage) => Math.max(1, currentPage - 1))}
                        disabled={userPage === 1}
                      >
                        Sebelumnya
                      </button>
                      <span className={styles.paginationPageLabel}>
                        {userPage} / {totalUserPages}
                      </span>
                      <button
                        type="button"
                        className={clsx(styles.tabButton, styles.paginationButton)}
                        onClick={() => setUserPage((currentPage) => Math.min(totalUserPages, currentPage + 1))}
                        disabled={userPage === totalUserPages}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {role === "admin" && activeTab === "reports" ? <ForecastingPage /> : null}

              {role === "admin" && activeTab === "ledgers" ? <AdminPencatatanTab /> : null}

              {role === "admin" && activeTab === "ingredients" ? <AdminIngredientsTab /> : null}

              {/* ── DASHBOARD TAB: Activities ────────────────────────────── */}
              {activeTab === "dashboard" ? (
                <section className={styles.activityCard}>
                  <h2 className={styles.activityHeader}>Aktivitas Terkini</h2>
                  {currentActivities.length === 0 ? (
                    <p className={styles.emptyState}>Belum ada aktivitas.</p>
                  ) : (
                    <ul className={styles.activityList}>
                      {currentActivities.map((activity, index) => (
                        <li key={`${activity.text}-${index}`} className={styles.activityItem}>
                          <span className={styles.activityIcon}>{activity.icon}</span>
                          <div>
                            <p className={styles.activityText}>{activity.text}</p>
                            {activity.time ? <p className={styles.activityTime}>{activity.time}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>
      </PortalShell>
      {openActionMenu && openActionRow
        ? createPortal(
          <div
            id={`actions-${openActionMenu.id}`}
            className={styles.actionDropdownFloating}
            role="menu"
            style={{ top: `${openActionMenu.top}px`, left: `${openActionMenu.left}px` }}
          >
            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemAdvance)}
              onClick={() => {
                setOpenActionMenu(null);
                if (openActionRow.status === "DELIVERED") {
                  openRevertDelivery(openActionRow);
                  return;
                }

                setPendingDeliveryAction({ type: "advance", id: openActionRow.id });
              }}
              disabled={advancingId === openActionRow.id}
            >
              {advancingId === openActionRow.id ? "Memproses..." : openActionRow.status === "DELIVERED" ? "Batalkan" : "Advance"}
            </button>

            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemEdit)}
              onClick={() => {
                setOpenActionMenu(null);
                openEditDelivery(openActionRow);
              }}
            >
              Ubah
            </button>

            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemDelete)}
              onClick={() => {
                setOpenActionMenu(null);
                setPendingDeliveryAction({ type: "delete", id: openActionRow.id });
              }}
            >
              Hapus
            </button>
          </div>,
          document.body,
        )
        : null}
      {openRecipeActionMenu && recipes.find(r => r.id === openRecipeActionMenu.id)
        ? createPortal(
          <div
            id={`recipe-actions-${openRecipeActionMenu.id}`}
            className={styles.actionDropdownFloating}
            role="menu"
            style={{ top: `${openRecipeActionMenu.top}px`, left: `${openRecipeActionMenu.left}px` }}
          >
            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemEdit)}
              onClick={() => {
                setPendingRecipeAction({ type: "edit", id: openRecipeActionMenu.id });
              }}
            >
              Ubah
            </button>

            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemDelete)}
              onClick={() => {
                setPendingRecipeAction({ type: "delete", id: openRecipeActionMenu.id });
              }}
            >
              Hapus
            </button>
          </div>,
          document.body,
        )
        : null}
      {openMenuActionMenu && weeklyMenus.some(week => week.menus.some(m => m.id === openMenuActionMenu.id))
        ? createPortal(
          <div
            id={`menu-actions-${openMenuActionMenu.id}`}
            className={styles.actionDropdownFloating}
            role="menu"
            style={{ top: `${openMenuActionMenu.top}px`, left: `${openMenuActionMenu.left}px` }}
          >
            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemEdit)}
              onClick={() => {
                setOpenMenuActionMenu(null);
                openEditMenu(openMenuActionMenu.id);
              }}
            >
              Ubah
            </button>

            <button
              type="button"
              className={clsx(styles.actionDropdownItem, styles.actionDropdownItemDelete)}
              onClick={() => {
                setOpenMenuActionMenu(null);
                handleDeleteMenu(openMenuActionMenu.id);
              }}
            >
              Hapus
            </button>
          </div>,
          document.body,
        )
        : null}
      <ConfirmDialog
        isOpen={Boolean(selectedRecipeAction)}
        title={selectedRecipeAction?.title ?? ""}
        message={selectedRecipeAction?.message ?? ""}
        confirmLabel={selectedRecipeAction?.confirmLabel ?? ""}
        cancelLabel="Batal"
        variant={selectedRecipeAction?.variant}
        isConfirming={isSubmitting}
        onCancel={() => setPendingRecipeAction(null)}
        onConfirm={() => {
          void handleConfirmRecipeAction();
        }}
      />
      <ConfirmDialog
        isOpen={Boolean(selectedDeliveryAction)}
        title={selectedDeliveryAction?.title ?? ""}
        message={selectedDeliveryAction?.message ?? ""}
        confirmLabel={selectedDeliveryAction?.confirmLabel ?? ""}
        cancelLabel="Batal"
        variant={selectedDeliveryAction?.variant}
        isConfirming={isDeliverySubmitting || Boolean(advancingId) || Boolean(isDeletingDeliveryId)}
        onCancel={() => setPendingDeliveryAction(null)}
        onConfirm={() => {
          void handleConfirmDeliveryAction();
        }}
      />
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
