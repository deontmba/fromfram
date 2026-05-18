import { headers } from "next/headers";

export type DeliveryStatusTone = "active" | "scheduled" | "completed";

export type DeliveryTimelineState = "completed" | "current" | "upcoming";

export type DeliveryTimelineStep = {
  id: string;
  label: string;
  timeLabel: string;
  state: DeliveryTimelineState;
};

export type DeliverySummaryItem = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  menuName: string;
  statusLabel: string;
  statusTone: DeliveryStatusTone;
};

export type ActiveDelivery = DeliverySummaryItem & {
  addressLabel: string;
  etaTitle: string;
  etaWindow: string;
  timeline: DeliveryTimelineStep[];
};

export type DeliveryTrackingViewModel = {
  periodLabel: string;
  todayDelivery: ActiveDelivery | null;
  upcomingDeliveries: DeliverySummaryItem[];
  recentDeliveries: DeliverySummaryItem[];
  infoBullets: string[];
  emptyStateTitle: string;
  emptyStateDescription: string;
  errorMessage?: string;
};

export const USE_DELIVERY_MOCK_DATA = process.env.NODE_ENV === "development";

export const DELIVERY_API_ENDPOINTS = {
  deliveries: "/api/deliveries",
  today: "/api/deliveries/today",
  detail: "/api/deliveries/:id",
  dashboard: "/api/dashboard",
} as const;

type DeliveryApiStatus = "PREPARING" | "SHIPPED" | "DELIVERED" | "SCHEDULED" | string;

type DeliveryApiTimelineStep = {
  id?: string;
  label?: string;
  timeLabel?: string;
  state?: DeliveryTimelineState;
};

type DeliveryApiItem = {
  id?: string;
  dayLabel?: string;
  dateLabel?: string;
  deliveryDate?: string | Date | null;
  menuName?: string;
  mealName?: string;
  recipeName?: string;
  recipe?: {
    name?: string | null;
  } | null;
  weeklyBox?: {
    weekStartDate?: string | Date | null;
    weekEndDate?: string | Date | null;
    mealSelections?: Array<{
      dayOfWeek?: string | null;
      recipe?: {
        name?: string | null;
      } | null;
    }> | null;
  } | null;
  address?: string | {
    label?: string | null;
    street?: string | null;
    city?: string | null;
    province?: string | null;
    recipientName?: string | null;
  } | null;
  addressLabel?: string;
  status?: DeliveryApiStatus;
  statusLabel?: string;
  etaTitle?: string;
  etaWindow?: string;
  timeline?: DeliveryApiTimelineStep[];
};

type DeliveryApiResponse = {
  periodLabel?: string;
  todayDelivery?: DeliveryApiItem | null;
  deliveries?: DeliveryApiItem[];
  upcomingDeliveries?: DeliveryApiItem[];
  recentDeliveries?: DeliveryApiItem[];
  infoBullets?: string[];
};

type DeliveryEnvelope = DeliveryApiResponse | {
  data?: DeliveryApiResponse | DeliveryApiItem[] | null;
};

type DashboardMealSelection = {
  id?: string;
  dayOfWeek?: string | null;
  recipe?: {
    name?: string | null;
  } | null;
};

type DashboardWeeklyBox = {
  id?: string;
  weekStartDate?: string | Date | null;
  weekEndDate?: string | Date | null;
  mealSelections?: DashboardMealSelection[] | null;
};

type DashboardDelivery = DeliveryApiItem & {
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
};

type DashboardPayload = {
  weeklyBox?: DashboardWeeklyBox | null;
  currentWeeklyBox?: DashboardWeeklyBox | null;
  nextWeeklyBox?: DashboardWeeklyBox | null;
  todayDelivery?: DashboardDelivery | null;
  recentDeliveries?: DashboardDelivery[] | null;
  user?: {
    address?: DeliveryApiItem["address"];
    profile?: {
      address?: DeliveryApiItem["address"];
    } | null;
  } | null;
};

type DashboardEnvelope = {
  data?: DashboardPayload | null;
};

const deliveryTrackingMockData = {
  periodLabel: "Periode 6–12 Mar 2026",
  todayDelivery: {
    id: "delivery-today-2026-03-08",
    dayLabel: "Rabu",
    dateLabel: "8 Mar",
    menuName: "Spaghetti Carbonara",
    addressLabel: "Menuju: Rumah - Jl. Kenanga No. 12",
    statusLabel: "Dalam Perjalanan",
    statusTone: "active",
    etaTitle: "Kurir sedang menuju lokasi",
    etaWindow: "Estimasi tiba 10:00-11:00",
    timeline: [
      {
        id: "prepared",
        label: "Pesanan Disiapkan",
        timeLabel: "06:00",
        state: "completed",
      },
      {
        id: "courier",
        label: "Pesanan Dibawa Kurir",
        timeLabel: "08:20",
        state: "current",
      },
      {
        id: "received",
        label: "Pesanan Diterima",
        timeLabel: "Estimasi 10:00-11:00",
        state: "upcoming",
      },
    ],
  },
  upcomingDeliveries: [
    {
      id: "delivery-2026-03-09",
      dayLabel: "Kamis",
      dateLabel: "9 Mar",
      menuName: "Nasi Hainan",
      statusLabel: "Menunggu",
      statusTone: "scheduled",
    },
    {
      id: "delivery-2026-03-10",
      dayLabel: "Jumat",
      dateLabel: "10 Mar",
      menuName: "Beef Bulgogi",
      statusLabel: "Menunggu",
      statusTone: "scheduled",
    },
    {
      id: "delivery-2026-03-11",
      dayLabel: "Sabtu",
      dateLabel: "11 Mar",
      menuName: "Salmon Teriyaki",
      statusLabel: "Menunggu",
      statusTone: "scheduled",
    },
    {
      id: "delivery-2026-03-12",
      dayLabel: "Minggu",
      dateLabel: "12 Mar",
      menuName: "Chicken Pesto Pasta",
      statusLabel: "Menunggu",
      statusTone: "scheduled",
    },
  ],
  recentDeliveries: [
    {
      id: "delivery-2026-03-06",
      dayLabel: "Senin",
      dateLabel: "6 Mar",
      menuName: "Nasi Goreng Kampung",
      statusLabel: "Selesai",
      statusTone: "completed",
    },
    {
      id: "delivery-2026-03-07",
      dayLabel: "Selasa",
      dateLabel: "7 Mar",
      menuName: "Ayam Teriyaki Bowl",
      statusLabel: "Selesai",
      statusTone: "completed",
    },
  ],
  infoBullets: [
    "Pengiriman dilakukan setiap hari pukul 06:00 - 12:00",
    "Meal kit sudah dikemas dalam cooler box untuk menjaga kesegaran",
    "Jika tidak ada di rumah, kurir akan menghubungi via telepon",
    "Status akan update otomatis real-time",
  ],
  emptyStateTitle: "Belum ada data pengiriman untuk minggu ini.",
  emptyStateDescription: "Pengiriman akan muncul setelah menu mingguan dikunci.",
} satisfies DeliveryTrackingViewModel;

const emptyDeliveryTrackingData: DeliveryTrackingViewModel = {
  periodLabel: "Tidak ada pengiriman minggu ini",
  todayDelivery: null,
  upcomingDeliveries: [],
  recentDeliveries: [],
  infoBullets: deliveryTrackingMockData.infoBullets,
  emptyStateTitle: "Belum ada data pengiriman untuk minggu ini.",
  emptyStateDescription: "Pengiriman akan muncul setelah menu mingguan dikunci.",
};

function pickString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseDate(value: unknown) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayOfWeekKey(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return undefined;
  }

  const keys = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return keys[date.getDay()];
}

function normalizeDayOfWeek(value: unknown) {
  const normalizedValue = pickString(value)?.toUpperCase();

  if (!normalizedValue) {
    return undefined;
  }

  const dayMap: Record<string, { englishKey: string; offset: number; label: string }> = {
    MONDAY: { englishKey: "MONDAY", offset: 0, label: "Senin" },
    SENIN: { englishKey: "MONDAY", offset: 0, label: "Senin" },
    TUESDAY: { englishKey: "TUESDAY", offset: 1, label: "Selasa" },
    SELASA: { englishKey: "TUESDAY", offset: 1, label: "Selasa" },
    WEDNESDAY: { englishKey: "WEDNESDAY", offset: 2, label: "Rabu" },
    RABU: { englishKey: "WEDNESDAY", offset: 2, label: "Rabu" },
    THURSDAY: { englishKey: "THURSDAY", offset: 3, label: "Kamis" },
    KAMIS: { englishKey: "THURSDAY", offset: 3, label: "Kamis" },
    FRIDAY: { englishKey: "FRIDAY", offset: 4, label: "Jumat" },
    JUMAT: { englishKey: "FRIDAY", offset: 4, label: "Jumat" },
    SATURDAY: { englishKey: "SATURDAY", offset: 5, label: "Sabtu" },
    SABTU: { englishKey: "SATURDAY", offset: 5, label: "Sabtu" },
    SUNDAY: { englishKey: "SUNDAY", offset: 6, label: "Minggu" },
    MINGGU: { englishKey: "SUNDAY", offset: 6, label: "Minggu" },
  };

  return dayMap[normalizedValue];
}

function parseDateAtLocalNoon(value: unknown) {
  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    12,
    0,
    0,
    0,
  );
}

function addDaysSafe(baseDate: Date, offset: number) {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    12,
    0,
    0,
    0,
  );
  date.setDate(date.getDate() + offset);
  return date;
}

function getDateForWeekday(weekStartDate: unknown, dayOfWeek: unknown) {
  const startDate = parseDateAtLocalNoon(weekStartDate);
  const normalizedDay = normalizeDayOfWeek(dayOfWeek);

  if (!startDate || !normalizedDay) {
    return null;
  }

  return addDaysSafe(startDate, normalizedDay.offset);
}

function getWeekdaySortOrder(value: unknown) {
  const normalizedDay = normalizeDayOfWeek(value);

  if (!normalizedDay) {
    return Number.MAX_SAFE_INTEGER;
  }

  return normalizedDay.offset;
}

function formatDayLabel(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(date);
}

function formatDateLabel(value: unknown) {
  const date = parseDate(value);

  if (!date) {
    return undefined;
  }

  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
}

function formatPeriodLabel(deliveries: DeliveryApiItem[]) {
  const dates = deliveries
    .map((delivery) => parseDate(delivery.deliveryDate))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return undefined;
  }

  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  return `Periode ${formatter.format(dates[0])} - ${formatter.format(dates[dates.length - 1])}`;
}

function formatWeekPeriodLabel(weekStartDate: unknown, weekEndDate: unknown) {
  const startDate = parseDate(weekStartDate);
  const endDate = parseDate(weekEndDate);

  if (!startDate || !endDate) {
    return undefined;
  }

  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  return `Periode ${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function deriveMenuName(delivery: DeliveryApiItem) {
  const directName =
    pickString(delivery.mealName) ??
    pickString(delivery.recipeName) ??
    pickString(delivery.recipe?.name) ??
    pickString(delivery.menuName);

  if (directName) {
    return directName;
  }

  const selections = Array.isArray(delivery.weeklyBox?.mealSelections)
    ? delivery.weeklyBox.mealSelections
    : [];
  const deliveryDay = getDayOfWeekKey(delivery.deliveryDate);
  const matchingSelection = selections.find(
    (selection) => pickString(selection.dayOfWeek)?.toUpperCase() === deliveryDay,
  );

  return (
    pickString(matchingSelection?.recipe?.name) ??
    selections.map((selection) => pickString(selection.recipe?.name)).find(Boolean) ??
    "Menu belum tersedia"
  );
}

function deriveAddressLabel(delivery: DeliveryApiItem) {
  const address = delivery.address;

  if (typeof address === "string") {
    return pickString(address);
  }

  if (address) {
    const label = pickString(address.label);
    const street = pickString(address.street);
    const city = pickString(address.city);
    const province = pickString(address.province);
    const location = [street, city, province].filter(Boolean).join(", ");

    if (label && location) {
      return `Menuju: ${label} - ${location}`;
    }

    return label ?? location;
  }

  return pickString(delivery.addressLabel);
}

function mapApiStatusToBadge(status?: DeliveryApiStatus): {
  statusLabel: string;
  statusTone: DeliveryStatusTone;
} {
  const normalizedStatus = status?.toUpperCase();

  if (normalizedStatus === "PREPARING") {
    return { statusLabel: "Disiapkan", statusTone: "scheduled" };
  }

  if (normalizedStatus === "SHIPPED") {
    return { statusLabel: "Dalam Perjalanan", statusTone: "active" };
  }

  if (normalizedStatus === "DELIVERED") {
    return { statusLabel: "Selesai", statusTone: "completed" };
  }

  return { statusLabel: "Menunggu", statusTone: "scheduled" };
}

function getDeliveryStatus(delivery: DeliveryApiItem | null | undefined) {
  return delivery?.status;
}

function mapApiDeliverySummary(delivery: DeliveryApiItem): DeliverySummaryItem {
  const status = mapApiStatusToBadge(delivery.status);

  return {
    id: delivery.id ?? `delivery-${delivery.deliveryDate ?? "pending-id"}`,
    dayLabel: pickString(delivery.dayLabel) ?? formatDayLabel(delivery.deliveryDate) ?? "Hari",
    dateLabel: pickString(delivery.dateLabel) ?? formatDateLabel(delivery.deliveryDate) ?? "-",
    menuName: deriveMenuName(delivery),
    statusLabel: delivery.statusLabel ?? status.statusLabel,
    statusTone: status.statusTone,
  };
}

function buildDefaultTimeline(delivery: DeliveryApiItem): DeliveryTimelineStep[] {
  const normalizedStatus = delivery.status?.toUpperCase();

  return [
    {
      id: "prepared",
      label: "Pesanan Disiapkan",
      timeLabel: "-",
      state: normalizedStatus === "PREPARING" ? "current" : "completed",
    },
    {
      id: "courier",
      label: "Pesanan Dibawa Kurir",
      timeLabel: "-",
      state:
        normalizedStatus === "SHIPPED"
          ? "current"
          : normalizedStatus === "DELIVERED"
            ? "completed"
            : "upcoming",
    },
    {
      id: "received",
      label: "Pesanan Diterima",
      timeLabel: "-",
      state: normalizedStatus === "DELIVERED" ? "completed" : "upcoming",
    },
  ];
}

function mapApiTodayDelivery(delivery: DeliveryApiItem | null | undefined): ActiveDelivery | null {
  if (!delivery) {
    return null;
  }

  return {
    ...mapApiDeliverySummary(delivery),
    addressLabel: deriveAddressLabel(delivery) ?? "Alamat belum tersedia",
    etaTitle: delivery.etaTitle ?? "Status pengiriman belum tersedia",
    etaWindow: delivery.etaWindow ?? "Estimasi belum tersedia",
    timeline: delivery.timeline?.map((step, index) => ({
      id: step.id ?? `timeline-${index}`,
      label: step.label ?? "Status belum tersedia",
      timeLabel: step.timeLabel ?? "-",
      state: step.state ?? "upcoming",
    })) ?? buildDefaultTimeline(delivery),
  };
}

function isDeliveryApiResponse(value: unknown): value is DeliveryApiResponse {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapDeliveryPayload(payload: unknown): DeliveryApiResponse {
  if (!isDeliveryApiResponse(payload)) {
    return {};
  }

  if ("data" in payload) {
    if (Array.isArray(payload.data)) {
      return { deliveries: payload.data };
    }

    if (isDeliveryApiResponse(payload.data)) {
      return payload.data;
    }
  }

  return payload;
}

function splitDeliveriesByDate(deliveries: DeliveryApiItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayDelivery = deliveries.find((delivery) => {
    const deliveryDate = parseDate(delivery.deliveryDate);

    if (!deliveryDate) {
      return false;
    }

    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() === today.getTime();
  }) ?? null;
  const upcomingDeliveries = deliveries.filter((delivery) => {
    const deliveryDate = parseDate(delivery.deliveryDate);

    if (!deliveryDate) {
      return false;
    }

    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() > today.getTime();
  });
  const recentDeliveries = deliveries.filter((delivery) => {
    const deliveryDate = parseDate(delivery.deliveryDate);

    if (!deliveryDate) {
      return false;
    }

    deliveryDate.setHours(0, 0, 0, 0);
    return deliveryDate.getTime() < today.getTime();
  });

  return { todayDelivery, upcomingDeliveries, recentDeliveries };
}

function mapDeliveriesApiToViewModel(payload: DeliveryApiResponse): DeliveryTrackingViewModel {
  const deliveries = Array.isArray(payload.deliveries) ? payload.deliveries : [];
  const splitDeliveries = splitDeliveriesByDate(deliveries);
  const todayDelivery = payload.todayDelivery ?? splitDeliveries.todayDelivery;
  const upcomingDeliveries = payload.upcomingDeliveries ?? splitDeliveries.upcomingDeliveries;
  const recentDeliveries = payload.recentDeliveries ?? splitDeliveries.recentDeliveries;

  return {
    ...emptyDeliveryTrackingData,
    periodLabel:
      payload.periodLabel ?? formatPeriodLabel(deliveries) ?? emptyDeliveryTrackingData.periodLabel,
    todayDelivery: mapApiTodayDelivery(todayDelivery),
    upcomingDeliveries: upcomingDeliveries.map(mapApiDeliverySummary),
    recentDeliveries: recentDeliveries.map(mapApiDeliverySummary),
    infoBullets: payload.infoBullets ?? deliveryTrackingMockData.infoBullets,
  };
}

function hasRenderableDeliveryData(viewModel: DeliveryTrackingViewModel) {
  return Boolean(
    viewModel.todayDelivery ||
      viewModel.upcomingDeliveries.length > 0 ||
      viewModel.recentDeliveries.length > 0,
  );
}

function getDeliveryDateKey(value: unknown) {
  return parseDate(value)?.toISOString().slice(0, 10);
}

function mapDashboardSelectionToDelivery(
  selection: DashboardMealSelection,
  weeklyBox: DashboardWeeklyBox,
  todayDelivery: DashboardDelivery | null,
): DeliverySummaryItem | null {
  const recipeName = pickString(selection.recipe?.name);
  const normalizedDay = normalizeDayOfWeek(selection.dayOfWeek);

  if (!recipeName || !normalizedDay) {
    return null;
  }

  const deliveryDate = getDateForWeekday(weeklyBox.weekStartDate, selection.dayOfWeek);
  const status = mapApiStatusToBadge(
    getDeliveryDateKey(deliveryDate) === getDeliveryDateKey(todayDelivery?.deliveryDate)
      ? getDeliveryStatus(todayDelivery)
      : undefined,
  );

  return {
    id: selection.id ?? `dashboard-menu-${normalizedDay.englishKey}`,
    dayLabel: normalizedDay.label,
    dateLabel: formatDateLabel(deliveryDate) ?? "-",
    menuName: recipeName,
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
  };
}

function mapDashboardPayloadToDeliveryViewModel(
  payload: DashboardPayload,
): DeliveryTrackingViewModel {
  const weeklyBox = payload.currentWeeklyBox ?? payload.nextWeeklyBox ?? payload.weeklyBox ?? null;
  const mealSelections = Array.isArray(weeklyBox?.mealSelections)
    ? weeklyBox.mealSelections
    : [];
  const todayDelivery = payload.todayDelivery ?? null;
  const todayDeliveryDateKey = getDeliveryDateKey(todayDelivery?.deliveryDate);

  const selectedDeliveries = weeklyBox
    ? [...mealSelections]
        .sort((a, b) => {
          return getWeekdaySortOrder(a.dayOfWeek) - getWeekdaySortOrder(b.dayOfWeek);
        })
        .map((selection) => mapDashboardSelectionToDelivery(selection, weeklyBox, todayDelivery))
        .filter((delivery): delivery is DeliverySummaryItem => Boolean(delivery))
    : [];

  const upcomingDeliveries = selectedDeliveries.filter((delivery) => {
    if (!todayDeliveryDateKey) {
      return true;
    }

    const deliveryDate = getDateForWeekday(weeklyBox?.weekStartDate, delivery.dayLabel);

    if (!deliveryDate) {
      return true;
    }

    return getDeliveryDateKey(deliveryDate) !== todayDeliveryDateKey;
  });
  const recentDeliveries = Array.isArray(payload.recentDeliveries)
    ? payload.recentDeliveries.map(mapApiDeliverySummary)
    : [];

  return {
    ...emptyDeliveryTrackingData,
    periodLabel:
      formatWeekPeriodLabel(weeklyBox?.weekStartDate, weeklyBox?.weekEndDate) ??
      emptyDeliveryTrackingData.periodLabel,
    todayDelivery: mapApiTodayDelivery(
      todayDelivery
        ? {
            ...todayDelivery,
            address:
              todayDelivery.address ?? payload.user?.address ?? payload.user?.profile?.address,
          }
        : null,
    ),
    upcomingDeliveries,
    recentDeliveries,
  };
}

async function getApiFetchInput(endpoint: string) {
  const requestHeaders = await headers();
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const cookie = requestHeaders.get("cookie");
  const url = host ? `${protocol}://${host}${endpoint}` : endpoint;

  return {
    url,
    init: {
      cache: "no-store" as const,
      headers: cookie ? { cookie } : undefined,
    },
  };
}

async function fetchApiJson(endpoint: string) {
  const { url, init } = await getApiFetchInput(endpoint);
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error("Gagal memuat data tracking pengiriman.");
  }

  return response.json() as Promise<unknown>;
}

async function fetchDeliveryTrackingViewModel() {
  const [deliveriesPayload, todayPayload] = await Promise.all([
    fetchApiJson(DELIVERY_API_ENDPOINTS.deliveries),
    fetchApiJson(DELIVERY_API_ENDPOINTS.today),
  ]);

  const deliveriesData = unwrapDeliveryPayload(deliveriesPayload as DeliveryEnvelope);
  const todayData = unwrapDeliveryPayload(todayPayload as DeliveryEnvelope);

  return mapDeliveriesApiToViewModel({
    ...deliveriesData,
    todayDelivery: todayData.todayDelivery ?? deliveriesData.todayDelivery,
  });
}

async function fetchDashboardDeliveryViewModel() {
  const dashboardPayload = await fetchApiJson(DELIVERY_API_ENDPOINTS.dashboard);

  if (!isDeliveryApiResponse(dashboardPayload)) {
    return emptyDeliveryTrackingData;
  }

  const payload = (dashboardPayload as DashboardEnvelope).data;
  return mapDashboardPayloadToDeliveryViewModel(payload ?? {});
}

export function getDeliveryDetailEndpoint(id: string) {
  // TODO: Use this endpoint helper when a delivery detail screen or modal is connected.
  return DELIVERY_API_ENDPOINTS.detail.replace(":id", encodeURIComponent(id));
}

export async function getDeliveryTrackingViewModel() {
  // Fallback order: delivery APIs -> dashboard API -> empty state.
  // Mock data stays available only as isolated fixture data and is not used automatically.
  let deliveryError: unknown;
  let dashboardError: unknown;

  try {
    const deliveryViewModel = await fetchDeliveryTrackingViewModel();

    if (hasRenderableDeliveryData(deliveryViewModel)) {
      return deliveryViewModel;
    }
  } catch (error) {
    deliveryError = error;
  }

  try {
    const dashboardDelivery = await fetchDashboardDeliveryViewModel();

    if (hasRenderableDeliveryData(dashboardDelivery)) {
      return dashboardDelivery;
    }
  } catch (error) {
    dashboardError = error;
    // The empty state below is intentional when no real API source is available.
  }

  const errorMessage =
    deliveryError || dashboardError ? "Gagal memuat data tracking pengiriman." : undefined;

  return {
    ...emptyDeliveryTrackingData,
    ...(errorMessage ? { errorMessage } : {}),
  };
}
