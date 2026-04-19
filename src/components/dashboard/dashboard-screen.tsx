"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

type DayOfWeek = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU" | "MINGGU";
type PlanType = "MINGGUAN" | "BULANAN" | "TAHUNAN";
type BackendDeliveryStatus = "PREPARING" | "SHIPPED" | "DELIVERED";
type DeliveryStatus = "delivered" | "shipping" | "ready" | "unknown";

type DashboardUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  nutritionalProfile?: {
    weight?: number | null;
    height?: number | null;
    dailyCalorieNeed?: number | null;
    allergies?: string | null;
  } | null;
};

type DashboardSubscription = {
  id?: string;
  planType?: PlanType | string | null;
  servings?: number | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pausedUntil?: string | null;
  goal?: {
    id?: string;
    name?: string | null;
    description?: string | null;
    minCalories?: number | null;
    maxCalories?: number | null;
  } | null;
};

type MealSelection = {
  id?: string;
  dayOfWeek?: DayOfWeek | string | null;
  recipe?: {
    id?: string;
    name?: string | null;
    description?: string | null;
    calories?: number | null;
    protein?: number | null;
    imageUrl?: string | null;
  } | null;
};

type DashboardWeeklyBox = {
  id?: string;
  weekStartDate?: string | null;
  weekEndDate?: string | null;
  selectionDeadline?: string | null;
  isAutoSelected?: boolean | null;
  status?: string | null;
  mealSelections?: MealSelection[] | null;
  summary?: {
    totalDays?: number | null;
    selectedDays?: number | null;
    remainingDays?: number | null;
    canSelectMenu?: boolean | null;
  } | null;
};

type DashboardDelivery = {
  id?: string;
  deliveryDate?: string | null;
  status?: BackendDeliveryStatus | string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  address?: {
    label?: string | null;
    street?: string | null;
    city?: string | null;
    province?: string | null;
    recipientName?: string | null;
  } | null;
  weeklyBox?: {
    mealSelections?: Array<{
      recipe?: {
        name?: string | null;
        calories?: number | null;
        imageUrl?: string | null;
      } | null;
    }> | null;
  } | null;
};

type DashboardPayload = {
  user?: DashboardUser | null;
  subscription?: DashboardSubscription | null;
  weeklyBox?: DashboardWeeklyBox | null;
  todayDelivery?: DashboardDelivery | null;
  recentDeliveries?: DashboardDelivery[] | null;
};

type DashboardApiResponse = {
  status?: string;
  data?: DashboardPayload | null;
  message?: string;
  error?: string;
};

type CurrentWeekItem = {
  day: string;
  menu: string;
  status: DeliveryStatus;
  statusLabel: string;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: "history" | "address" | "payment";
  tone: "green" | "teal" | "red";
};

type DashboardViewModel = {
  subscription: {
    label: string;
    plan: string;
    servings: string;
    status: string;
    nextBilling: string;
    isEmpty: boolean;
  };
  currentWeek: {
    title: string;
    dateRange: string;
    items: CurrentWeekItem[];
    emptyMessage: string | null;
    trackingEnabled: boolean;
    todayDeliveryMessage: string;
  };
  nextWeek: {
    title: string;
    dateRange: string;
    heading: string;
    deadline: string;
    selectedMenu: string;
    reminder: string;
    timeLeft: string;
    canSelectMenu: boolean;
    unavailableMessage: string | null;
  };
  quickActions: QuickAction[];
};

const DASHBOARD_PATH = "/api/dashboard";
const EMPTY_LABEL = "Belum tersedia";
const MENU_NOT_SELECTED_LABEL = "Menu belum dipilih";

const daysOfWeek: Array<{ key: DayOfWeek; label: string }> = [
  { key: "SENIN", label: "Senin" },
  { key: "SELASA", label: "Selasa" },
  { key: "RABU", label: "Rabu" },
  { key: "KAMIS", label: "Kamis" },
  { key: "JUMAT", label: "Jumat" },
  { key: "SABTU", label: "Sabtu" },
  { key: "MINGGU", label: "Minggu" },
];

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const statusStyles: Record<DeliveryStatus, string> = {
  delivered: "bg-[#dff3e9] text-[#118765]",
  shipping: "bg-[#dcfbf5] text-[#0a8c80]",
  ready: "bg-[#fde6e6] text-[#d45b5b]",
  unknown: "bg-neutral-200 text-neutral-600",
};

const actionIconStyles: Record<QuickAction["tone"], string> = {
  green: "bg-[#e1f6ee] text-[#11a67d]",
  teal: "bg-[#d7f7ef] text-[#11a994]",
  red: "bg-[#ffe4e2] text-[#ee6a68]",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return null;
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return dateValue;
}

function formatDateLabel(value: unknown, fallback = EMPTY_LABEL) {
  const dateValue = parseDate(value);

  if (!dateValue) {
    return fallback;
  }

  return dateFormatter.format(dateValue);
}

function formatDateRange(startValue: unknown, endValue: unknown) {
  const startLabel = formatDateLabel(startValue);
  const endLabel = formatDateLabel(endValue);

  if (startLabel === EMPTY_LABEL && endLabel === EMPTY_LABEL) {
    return EMPTY_LABEL;
  }

  return `${startLabel} - ${endLabel}`;
}

function toDateKey(value: unknown) {
  const dateValue = parseDate(value);

  if (!dateValue) {
    return null;
  }

  return dateValue.toISOString().slice(0, 10);
}

function addDays(dateValue: Date, days: number) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function normalizeDayOfWeek(value: unknown): DayOfWeek | null {
  const normalizedValue = pickString(value)?.toUpperCase();

  if (!normalizedValue) {
    return null;
  }

  return daysOfWeek.some((day) => day.key === normalizedValue)
    ? (normalizedValue as DayOfWeek)
    : null;
}

function getPlanLabel(value: unknown) {
  const normalizedValue = pickString(value)?.toUpperCase();

  if (normalizedValue === "MINGGUAN") {
    return "Mingguan Plan";
  }

  if (normalizedValue === "BULANAN") {
    return "Bulanan Plan";
  }

  if (normalizedValue === "TAHUNAN") {
    return "Tahunan Plan";
  }

  return EMPTY_LABEL;
}

function mapDeliveryStatus(value: unknown): { status: DeliveryStatus; label: string } {
  const normalizedValue = pickString(value)?.toUpperCase();

  if (normalizedValue === "PREPARING") {
    return { status: "ready", label: "Disiapkan" };
  }

  if (normalizedValue === "SHIPPED") {
    return { status: "shipping", label: "Dikirim" };
  }

  if (normalizedValue === "DELIVERED") {
    return { status: "delivered", label: "Terkirim" };
  }

  return { status: "unknown", label: EMPTY_LABEL };
}

function getTimeLeftLabel(value: unknown) {
  const deadline = parseDate(value);

  if (!deadline) {
    return EMPTY_LABEL;
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Deadline sudah lewat";
  }

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return "hari ini";
  }

  return `${diffDays} hari lagi`;
}

function getDeliveryStatusByDate(
  todayDelivery: DashboardDelivery | null | undefined,
  recentDeliveries: DashboardDelivery[],
) {
  const statusByDate = new Map<string, unknown>();

  for (const delivery of recentDeliveries) {
    const dateKey = toDateKey(delivery.deliveryDate);

    if (dateKey) {
      statusByDate.set(dateKey, delivery.status);
    }
  }

  const todayDateKey = toDateKey(todayDelivery?.deliveryDate);

  if (todayDateKey) {
    statusByDate.set(todayDateKey, todayDelivery?.status);
  }

  return statusByDate;
}

function buildCurrentWeekItems(
  weeklyBox: DashboardWeeklyBox,
  todayDelivery: DashboardDelivery | null | undefined,
  recentDeliveries: DashboardDelivery[],
) {
  const selectionsByDay = new Map<DayOfWeek, MealSelection>();
  const mealSelections = Array.isArray(weeklyBox.mealSelections) ? weeklyBox.mealSelections : [];
  const statusByDate = getDeliveryStatusByDate(todayDelivery, recentDeliveries);
  const weekStartDate = parseDate(weeklyBox.weekStartDate);

  for (const selection of mealSelections) {
    const day = normalizeDayOfWeek(selection.dayOfWeek);

    if (day) {
      selectionsByDay.set(day, selection);
    }
  }

  return daysOfWeek.map((day, index) => {
    const selection = selectionsByDay.get(day.key);
    const dayDate = weekStartDate ? addDays(weekStartDate, index) : null;
    const deliveryStatus = dayDate ? statusByDate.get(toDateKey(dayDate) ?? "") : null;
    const mappedStatus = mapDeliveryStatus(deliveryStatus);

    return {
      day: day.label,
      menu: pickString(selection?.recipe?.name) ?? MENU_NOT_SELECTED_LABEL,
      status: mappedStatus.status,
      statusLabel: mappedStatus.label,
    };
  });
}

function buildQuickActions(recentDeliveries: DashboardDelivery[]): QuickAction[] {
  return [
    {
      title: "Riwayat Pesanan",
      description:
        recentDeliveries.length > 0
          ? `${recentDeliveries.length} pengiriman terakhir`
          : "Belum ada riwayat pengiriman",
      href: "/dashboard/order-history",
      icon: "history",
      tone: "green",
    },
    {
      title: "Alamat Pengiriman",
      description: "Kelola alamat Anda",
      href: "/profile/address",
      icon: "address",
      tone: "teal",
    },
    {
      title: "Payment History",
      description: EMPTY_LABEL,
      href: "/dashboard/payment-history",
      icon: "payment",
      tone: "red",
    },
  ];
}

function mapDashboardPayloadToViewModel(payload: DashboardPayload): DashboardViewModel {
  const subscription = payload.subscription ?? null;
  const weeklyBox = payload.weeklyBox ?? null;
  const todayDelivery = payload.todayDelivery ?? null;
  const recentDeliveries = Array.isArray(payload.recentDeliveries)
    ? payload.recentDeliveries
    : [];
  const selectedDays = pickNumber(weeklyBox?.summary?.selectedDays) ?? 0;
  const totalDays = pickNumber(weeklyBox?.summary?.totalDays) ?? daysOfWeek.length;
  const canSelectMenu = weeklyBox?.summary?.canSelectMenu === true;

  return {
    subscription: subscription
      ? {
          label: "Subscription",
          plan: getPlanLabel(subscription.planType),
          servings:
            typeof subscription.servings === "number" && Number.isFinite(subscription.servings)
              ? `${subscription.servings} orang`
              : EMPTY_LABEL,
          status: pickString(subscription.status) ?? EMPTY_LABEL,
          nextBilling: EMPTY_LABEL,
          isEmpty: false,
        }
      : {
          label: "Subscription",
          plan: "Belum ada subscription aktif",
          servings: EMPTY_LABEL,
          status: EMPTY_LABEL,
          nextBilling: EMPTY_LABEL,
          isEmpty: true,
        },
    currentWeek: weeklyBox
      ? {
          title: "Minggu Ini",
          dateRange: formatDateRange(weeklyBox.weekStartDate, weeklyBox.weekEndDate),
          items: buildCurrentWeekItems(weeklyBox, todayDelivery, recentDeliveries),
          emptyMessage: null,
          trackingEnabled: Boolean(todayDelivery?.id || weeklyBox.id),
          todayDeliveryMessage: todayDelivery
            ? `Pengiriman hari ini: ${mapDeliveryStatus(todayDelivery.status).label}`
            : "Belum ada pengiriman hari ini",
        }
      : {
          title: "Minggu Ini",
          dateRange: EMPTY_LABEL,
          items: [],
          emptyMessage: "Menu minggu ini belum tersedia",
          trackingEnabled: false,
          todayDeliveryMessage: "Belum ada pengiriman hari ini",
        },
    nextWeek: weeklyBox
      ? {
          title: "Minggu Depan",
          dateRange: formatDateRange(weeklyBox.weekStartDate, weeklyBox.weekEndDate),
          heading: canSelectMenu ? "Pilih Menu Sekarang" : "Menu belum bisa dipilih",
          deadline: formatDateLabel(weeklyBox.selectionDeadline),
          selectedMenu: `${selectedDays}/${totalDays} hari`,
          reminder: canSelectMenu
            ? "Jika tidak memilih sebelum deadline, sistem akan otomatis memilihkan menu."
            : "Menu minggu ini / minggu depan belum tersedia untuk dipilih.",
          timeLeft: getTimeLeftLabel(weeklyBox.selectionDeadline),
          canSelectMenu,
          unavailableMessage: canSelectMenu ? null : "Pilih Menu Sekarang belum tersedia",
        }
      : {
          title: "Minggu Depan",
          dateRange: EMPTY_LABEL,
          heading: "Menu minggu depan belum tersedia",
          deadline: EMPTY_LABEL,
          selectedMenu: EMPTY_LABEL,
          reminder: "Menu minggu ini / minggu depan belum tersedia.",
          timeLeft: EMPTY_LABEL,
          canSelectMenu: false,
          unavailableMessage: "Pilih Menu Sekarang belum tersedia",
        },
    quickActions: buildQuickActions(recentDeliveries),
  };
}

function getErrorMessage(payload: unknown, fallbackMessage: string) {
  if (!isRecord(payload)) {
    return fallbackMessage;
  }

  return pickString(payload.error, payload.message) ?? fallbackMessage;
}

async function fetchDashboard(signal?: AbortSignal) {
  const response = await fetch(DASHBOARD_PATH, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json().catch(() => null)) as DashboardApiResponse | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Gagal memuat dashboard (${response.status}).`));
  }

  return mapDashboardPayloadToViewModel(payload?.data ?? {});
}

function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <Image src="/icons/leaf-logo.svg" alt="FromFram logo" width={34} height={34} />
      <span className="text-[1.55rem] font-bold tracking-[-0.03em] text-[#13a981]">
        FromFram
      </span>
    </Link>
  );
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BoxIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m4 7.5 8 4.5 8-4.5M12 12v9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 3v4M16 3v4M4 10h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChefHatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 11.5a4 4 0 0 1 6-5.1 4 4 0 0 1 6 5.1V19H6v-7.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v6M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 4v6h6M5 13a7 7 0 1 0 2-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M3 10h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function QuickActionIcon({ icon }: { icon: QuickAction["icon"] }) {
  if (icon === "history") {
    return <HistoryIcon className="h-5 w-5" />;
  }

  if (icon === "address") {
    return <PinIcon className="h-5 w-5" />;
  }

  return <CardIcon className="h-5 w-5" />;
}

function WeekHeader({
  icon,
  title,
  dateRange,
}: {
  icon: "box" | "calendar";
  title: string;
  dateRange: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#dff7ee] text-[#14af84]">
          {icon === "box" ? <BoxIcon /> : <CalendarIcon />}
        </span>
        <h2 className="text-[0.98rem] font-bold text-neutral-950">{title}</h2>
      </div>
      <p className="text-sm text-neutral-500">{dateRange}</p>
    </div>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandMark />
          <Link
            href="/profile"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#12b886] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(18,184,134,0.18)] transition hover:bg-[#0fa878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
          >
            <UserIcon />
            Profil
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}

export function DashboardScreen() {
  const [dashboard, setDashboard] = useState<DashboardViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const mappedDashboard = await fetchDashboard(signal);
      setDashboard(mappedDashboard);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError(
        loadError instanceof Error ? loadError.message : "Gagal memuat dashboard.",
      );
      setDashboard(null);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void loadDashboard(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <DashboardShell>
        <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[1080px] place-items-center px-5 py-12">
          <div className="rounded-lg border border-neutral-200 bg-white px-6 py-5 text-center shadow-[0_3px_12px_rgba(15,23,42,0.13)]">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#12b886]/20 border-t-[#12b886]" />
            <p className="text-sm font-semibold text-neutral-700">Memuat dashboard...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-[1080px] place-items-center px-5 py-12">
          <div className="max-w-md rounded-lg border border-[#fecdd3] bg-white px-6 py-5 text-center shadow-[0_3px_12px_rgba(15,23,42,0.13)]">
            <p className="text-sm font-bold text-[#be123c]">Dashboard belum bisa dimuat</p>
            <p className="mt-2 text-sm text-neutral-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#12b886] px-5 text-sm font-bold text-white transition hover:bg-[#0fa878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-[1080px] px-5 py-5">
        <section className="rounded-lg bg-[#07a982] px-5 py-5 text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">
                {dashboard.subscription.label}
              </p>
              <h1 className="mt-1 text-[1.35rem] font-bold leading-tight tracking-[-0.02em]">
                {dashboard.subscription.plan}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white">
                <span>{dashboard.subscription.servings}</span>
                <span className="h-1 w-1 rounded-full bg-white" />
                <span>{dashboard.subscription.status}</span>
              </div>
              {dashboard.subscription.isEmpty ? (
                <p className="mt-3 max-w-xl text-sm text-white/80">
                  Buat subscription dulu untuk mulai menerima weekly box.
                </p>
              ) : null}
            </div>

            <div className="w-fit rounded-lg bg-white/12 px-4 py-3 text-right">
              <p className="text-xs font-semibold text-white/65">Next Billing</p>
              <p className="mt-1 text-[1.2rem] font-bold leading-none">
                {dashboard.subscription.nextBilling}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-[0_3px_12px_rgba(15,23,42,0.13)]">
            <WeekHeader
              icon="box"
              title={dashboard.currentWeek.title}
              dateRange={dashboard.currentWeek.dateRange}
            />

            <p className="mt-4 rounded-lg border border-neutral-200 bg-[#f8f8f7] px-4 py-3 text-sm text-neutral-600">
              {dashboard.currentWeek.todayDeliveryMessage}
            </p>

            <div className="mt-6 space-y-3">
              {dashboard.currentWeek.emptyMessage ? (
                <div className="rounded-lg border border-dashed border-neutral-300 bg-[#f8f8f7] px-4 py-8 text-center text-sm text-neutral-500">
                  {dashboard.currentWeek.emptyMessage}
                </div>
              ) : (
                dashboard.currentWeek.items.map((item) => (
                  <article
                    key={item.day}
                    className="flex min-h-14 items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-[#f3f3f2] px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#14af84]">
                        <ChefHatIcon />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-neutral-950">{item.day}</h3>
                        <p className="truncate text-sm text-neutral-500">{item.menu}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-3 py-1 text-xs font-bold ${statusStyles[item.status]}`}
                    >
                      {item.statusLabel}
                    </span>
                  </article>
                ))
              )}
            </div>

            {dashboard.currentWeek.trackingEnabled ? (
              <Link
                href="/dashboard/tracking"
                className="mt-7 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#12b886] px-4 text-sm font-bold text-white shadow-[0_8px_16px_rgba(18,184,134,0.25)] transition hover:bg-[#0fa878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
              >
                Lihat Detail Tracking
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-7 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-lg bg-neutral-200 px-4 text-sm font-bold text-neutral-500"
              >
                Tracking belum tersedia
              </button>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white px-5 py-5 shadow-[0_3px_12px_rgba(15,23,42,0.13)] lg:min-h-[588px]">
            <WeekHeader
              icon="calendar"
              title={dashboard.nextWeek.title}
              dateRange={dashboard.nextWeek.dateRange}
            />

            <div className="mt-6 rounded-lg border border-[#ffc6c3] bg-[#fff1f1] p-4">
              <div className="flex gap-3">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6767]" />
                <div>
                  <h3 className="text-sm font-bold text-neutral-950">
                    {dashboard.nextWeek.heading}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    Deadline:{" "}
                    <span className="font-medium text-[#ff6767]">
                      {dashboard.nextWeek.deadline}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Menu: {dashboard.nextWeek.selectedMenu}
                  </p>
                  {dashboard.nextWeek.unavailableMessage ? (
                    <p className="mt-2 text-sm font-medium text-[#d45b5b]">
                      {dashboard.nextWeek.unavailableMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-[#ade5dc] bg-[#eafffb] p-4">
              <div className="flex gap-3">
                <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#0a8c80]" />
                <div>
                  <p className="text-sm leading-6 text-neutral-800">
                    {dashboard.nextWeek.reminder}
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#08a77d]">
                    Sisa waktu: {dashboard.nextWeek.timeLeft}
                  </p>
                </div>
              </div>
            </div>

            {dashboard.nextWeek.canSelectMenu ? (
              <Link
                href="/subscription/weekly-menu"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#ff666d] px-4 text-sm font-bold text-white shadow-[0_8px_16px_rgba(255,102,109,0.24)] transition hover:bg-[#f05a61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb0b4]"
              >
                Pilih Menu Sekarang
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-lg bg-neutral-200 px-4 text-sm font-bold text-neutral-500"
              >
                Pilih Menu Sekarang
              </button>
            )}
          </section>
        </div>

        <section aria-label="Aksi cepat" className="mt-5 grid gap-5 md:grid-cols-3">
          {dashboard.quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex min-h-16 items-center gap-4 rounded-lg border border-neutral-200 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#a7dec9] hover:shadow-[0_8px_16px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79d9bc]"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${actionIconStyles[action.tone]}`}
              >
                <QuickActionIcon icon={action.icon} />
              </span>
              <span>
                <span className="block text-sm font-bold text-neutral-950">{action.title}</span>
                <span className="mt-1 block text-sm text-neutral-500">{action.description}</span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
