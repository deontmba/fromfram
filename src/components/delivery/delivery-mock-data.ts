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
  todayDelivery: ActiveDelivery;
  upcomingDeliveries: DeliverySummaryItem[];
  recentDeliveries: DeliverySummaryItem[];
  infoBullets: string[];
};

export const USE_DELIVERY_MOCK_DATA = true;

export const DELIVERY_API_ENDPOINTS = {
  deliveries: "/api/deliveries",
  today: "/api/deliveries/today",
  detail: "/api/deliveries/:id",
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
  menuName?: string;
  addressLabel?: string;
  status?: DeliveryApiStatus;
  statusLabel?: string;
  etaTitle?: string;
  etaWindow?: string;
  timeline?: DeliveryApiTimelineStep[];
};

type DeliveryApiResponse = {
  periodLabel?: string;
  todayDelivery?: DeliveryApiItem;
  upcomingDeliveries?: DeliveryApiItem[];
  recentDeliveries?: DeliveryApiItem[];
  infoBullets?: string[];
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
} satisfies DeliveryTrackingViewModel;

function mapApiStatusToBadge(status?: DeliveryApiStatus): {
  statusLabel: string;
  statusTone: DeliveryStatusTone;
} {
  const normalizedStatus = status?.toUpperCase();

  if (normalizedStatus === "SHIPPED") {
    return { statusLabel: "Dalam Perjalanan", statusTone: "active" };
  }

  if (normalizedStatus === "DELIVERED") {
    return { statusLabel: "Selesai", statusTone: "completed" };
  }

  return { statusLabel: "Menunggu", statusTone: "scheduled" };
}

function mapApiDeliverySummary(delivery: DeliveryApiItem): DeliverySummaryItem {
  const status = mapApiStatusToBadge(delivery.status);

  return {
    id: delivery.id ?? "delivery-pending-id",
    dayLabel: delivery.dayLabel ?? "Hari",
    dateLabel: delivery.dateLabel ?? "-",
    menuName: delivery.menuName ?? "Menu belum tersedia",
    statusLabel: delivery.statusLabel ?? status.statusLabel,
    statusTone: status.statusTone,
  };
}

function mapApiTodayDelivery(delivery: DeliveryApiItem | undefined): ActiveDelivery {
  if (!delivery) {
    return deliveryTrackingMockData.todayDelivery;
  }

  return {
    ...mapApiDeliverySummary(delivery),
    addressLabel: delivery.addressLabel ?? "Alamat belum tersedia",
    etaTitle: delivery.etaTitle ?? "Status pengiriman belum tersedia",
    etaWindow: delivery.etaWindow ?? "Estimasi belum tersedia",
    timeline: delivery.timeline?.map((step, index) => ({
      id: step.id ?? `timeline-${index}`,
      label: step.label ?? "Status belum tersedia",
      timeLabel: step.timeLabel ?? "-",
      state: step.state ?? "upcoming",
    })) ?? deliveryTrackingMockData.todayDelivery.timeline,
  };
}

function mapApiResponseToViewModel(payload: DeliveryApiResponse): DeliveryTrackingViewModel {
  return {
    periodLabel: payload.periodLabel ?? deliveryTrackingMockData.periodLabel,
    todayDelivery: mapApiTodayDelivery(payload.todayDelivery),
    upcomingDeliveries: payload.upcomingDeliveries?.map(mapApiDeliverySummary) ?? [],
    recentDeliveries: payload.recentDeliveries?.map(mapApiDeliverySummary) ?? [],
    infoBullets: payload.infoBullets ?? deliveryTrackingMockData.infoBullets,
  };
}

async function fetchDeliveryTrackingViewModel() {
  // TODO: Enable this branch when the delivery backend endpoints are available.
  // The UI should continue consuming DeliveryTrackingViewModel after API data is mapped here.
  const [deliveriesResponse, todayResponse] = await Promise.all([
    fetch(DELIVERY_API_ENDPOINTS.deliveries, { cache: "no-store" }),
    fetch(DELIVERY_API_ENDPOINTS.today, { cache: "no-store" }),
  ]);

  if (!deliveriesResponse.ok || !todayResponse.ok) {
    throw new Error("Gagal memuat data tracking pengiriman.");
  }

  const deliveriesPayload = (await deliveriesResponse.json()) as DeliveryApiResponse;
  const todayPayload = (await todayResponse.json()) as { todayDelivery?: DeliveryApiItem };

  return mapApiResponseToViewModel({
    ...deliveriesPayload,
    todayDelivery: todayPayload.todayDelivery ?? deliveriesPayload.todayDelivery,
  });
}

export function getDeliveryDetailEndpoint(id: string) {
  // TODO: Use this endpoint helper when a delivery detail screen or modal is connected.
  return DELIVERY_API_ENDPOINTS.detail.replace(":id", encodeURIComponent(id));
}

export async function getDeliveryTrackingViewModel() {
  if (USE_DELIVERY_MOCK_DATA) {
    return deliveryTrackingMockData;
  }

  return fetchDeliveryTrackingViewModel();
}
