import prisma from '@/lib/prisma';
import { addDays, atJakartaTime, jakartaDayOfWeek } from '@/lib/week';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long' });

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDayLabel(date: Date) {
  return capitalize(dayFormatter.format(date));
}

function formatDateLabel(date: Date) {
  return dateFormatter.format(date);
}

function getPeriodLabel(weekStartDate: Date, weekEndDate: Date) {
  return `Periode ${formatDateLabel(weekStartDate)}–${formatDateLabel(weekEndDate)}`;
}

/** Delivery slots in Jakarta time (see lockCurrentWeeklyBox). */
function slotTime(mealType: string) {
  return mealType === 'DINNER' ? '17.30' : '11.30';
}

function getEtaInfo(status: string, mealType: string) {
  const slot = slotTime(mealType);
  if (status === 'PREPARING') {
    return { etaTitle: 'Pesanan sedang disiapkan', etaWindow: `Tiba sekitar pukul ${slot} WIB` };
  }
  if (status === 'SHIPPED') {
    return { etaTitle: 'Kurir sedang menuju lokasi', etaWindow: `Tiba sekitar pukul ${slot} WIB` };
  }
  return { etaTitle: 'Pesanan telah diterima', etaWindow: 'Pengiriman selesai' };
}

function buildTimeline(status: string, mealType: string, shippedAt: Date | null, deliveredAt: Date | null) {
  const formatTime = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(date)
      : null;

  return [
    {
      id: 'prepared',
      label: 'Pesanan disiapkan',
      timeLabel: status === 'PREPARING' ? 'Sedang berlangsung' : 'Selesai',
      state: status === 'PREPARING' ? 'current' : 'completed',
    },
    {
      id: 'courier',
      label: 'Dibawa kurir',
      timeLabel: formatTime(shippedAt) ?? (status === 'SHIPPED' ? 'Sedang berlangsung' : 'Menunggu'),
      state: status === 'PREPARING' ? 'upcoming' : status === 'SHIPPED' ? 'current' : 'completed',
    },
    {
      id: 'received',
      label: 'Pesanan diterima',
      timeLabel: formatTime(deliveredAt) ?? `Sekitar ${slotTime(mealType)} WIB`,
      state: status === 'DELIVERED' ? 'completed' : 'upcoming',
    },
  ];
}

function buildAddressLabel(
  address: { label: string | null; street: string | null; city: string | null } | null,
) {
  if (!address) return 'Alamat tidak tersedia';
  const parts = [address.label, address.street, address.city].filter(Boolean);
  return `Menuju: ${parts.join(' - ')}`;
}


const deliverySelect = {
  id: true,
  deliveryDate: true,
  mealType: true,
  status: true,
  shippedAt: true,
  deliveredAt: true,
  address: {
    select: {
      label: true,
      street: true,
      city: true,
      province: true,
      recipientName: true,
    },
  },
  weeklyBox: {
    select: {
      weekStartDate: true,
      weekEndDate: true,
      mealSelections: {
        select: {
          dayOfWeek: true,
          mealType: true,
          recipe: {
            select: { name: true, calories: true, imageUrl: true },
          },
        },
      },
    },
  },
} as const;

const INFO_BULLETS = [
  'Makan siang diantar sekitar pukul 11.30 WIB, makan malam sekitar pukul 17.30 WIB',
  'Jika penerima tidak ada di tempat, kurir akan menghubungi nomor HP di alamat',
  'Status berubah saat pesanan disiapkan, dibawa kurir, dan diterima',
];

type DeliveryRecord = {
  id: string;
  deliveryDate: Date;
  mealType: string;
  status: string;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  address: {
    label: string | null;
    street: string | null;
    city: string | null;
    province: string | null;
    recipientName: string | null;
  } | null;
  weeklyBox: {
    weekStartDate: Date;
    weekEndDate: Date;
    mealSelections: {
      dayOfWeek: string;
      mealType: string;
      recipe: { name: string; calories: number; imageUrl: string | null } | null;
    }[];
  } | null;
};

function mapDeliveryToItem(delivery: DeliveryRecord) {
  const dayDate = new Date(delivery.deliveryDate);
  const todayDayKey = jakartaDayOfWeek(dayDate);
  const menuName =
    delivery.weeklyBox?.mealSelections?.find(
      (s) => s.dayOfWeek === todayDayKey && s.mealType === delivery.mealType
    )?.recipe?.name ??
    delivery.weeklyBox?.mealSelections?.find((s) => s.dayOfWeek === todayDayKey)?.recipe?.name ??
    'Menu belum tersedia';

  const eta = getEtaInfo(delivery.status, delivery.mealType);
  const timeline = buildTimeline(delivery.status, delivery.mealType, delivery.shippedAt, delivery.deliveredAt);
  const addressLabel = buildAddressLabel(delivery.address);

  return {
    id: delivery.id,
    dayLabel: formatDayLabel(dayDate),
    dateLabel: formatDateLabel(dayDate),
    menuName,
    mealType: delivery.mealType,
    addressLabel,
    status: delivery.status,
    statusLabel:
      delivery.status === 'PREPARING'
        ? 'Disiapkan'
        : delivery.status === 'SHIPPED'
          ? 'Dalam Perjalanan'
          : 'Selesai',
    etaTitle: eta.etaTitle,
    etaWindow: eta.etaWindow,
    timeline,
  };
}

export async function getDeliveries(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Cari active weekly box persis seperti cara dashboard
  const activeBox = await prisma.weeklyBox.findFirst({
    where: {
      userId,
      weekStartDate: { lte: today },
      weekEndDate: { gte: today },
    },
  }) ?? await prisma.weeklyBox.findFirst({
    where: {
      userId,
      weekStartDate: { gt: today },
    },
    orderBy: { weekStartDate: 'asc' },
  }) ?? await prisma.weeklyBox.findFirst({
    where: { userId },
    orderBy: { weekStartDate: 'desc' },
  });

  if (!activeBox) {
    return {
      data: {
        status: 'success',
        data: {
          periodLabel: 'Tidak ada pengiriman minggu ini',
          todayDelivery: null,
          upcomingDeliveries: [],
          recentDeliveries: [],
          infoBullets: INFO_BULLETS,
        },
      },
      status: 200,
    };
  }

  // Deliveries use the Jakarta day; week boxes above still use the server clock (see src/lib/week.ts).
  const dayStart = atJakartaTime(new Date(), 0);

  const deliveries = await prisma.delivery.findMany({
    where: {
      userId,
      OR: [
        { weeklyBoxId: activeBox.id },
        {
          deliveryDate: {
            gte: dayStart,
            lt: addDays(dayStart, 1),
          },
        },
      ],
    },
    orderBy: { deliveryDate: 'asc' },
    select: deliverySelect,
  });

  if (deliveries.length === 0) {
    return {
      data: {
        status: 'success',
        data: {
          periodLabel: 'Tidak ada pengiriman minggu ini',
          todayDelivery: null,
          upcomingDeliveries: [],
          recentDeliveries: [],
          infoBullets: INFO_BULLETS,
        },
      },
      status: 200,
    };
  }

  const dayOf = (d: { deliveryDate: Date }) => atJakartaTime(new Date(d.deliveryDate), 0).getTime();
  const todayDelivery = deliveries.find((d) => dayOf(d) === dayStart.getTime());
  const upcomingDeliveries = deliveries.filter((d) => dayOf(d) > dayStart.getTime());
  const recentDeliveries = deliveries.filter((d) => dayOf(d) < dayStart.getTime());

  const firstDelivery = deliveries[0];
  const periodLabel = firstDelivery?.weeklyBox
    ? getPeriodLabel(
        new Date(firstDelivery.weeklyBox.weekStartDate),
        new Date(firstDelivery.weeklyBox.weekEndDate),
      )
    : 'Periode minggu ini';

  return {
    data: {
      status: 'success',
      data: {
        periodLabel,
        todayDelivery: todayDelivery ? mapDeliveryToItem(todayDelivery as any) : null,
        upcomingDeliveries: upcomingDeliveries.map((d) => mapDeliveryToItem(d as any)),
        recentDeliveries: recentDeliveries.map((d) => mapDeliveryToItem(d as any)),
        infoBullets: INFO_BULLETS,
      },
    },
    status: 200,
  };
}

export async function getTodayDelivery(userId: string) {
  const dayStart = atJakartaTime(new Date(), 0);

  const delivery = await prisma.delivery.findFirst({
    where: { userId, deliveryDate: { gte: dayStart, lt: addDays(dayStart, 1) } },
    orderBy: { deliveryDate: 'asc' },
    select: deliverySelect,
  });

  if (!delivery) {
    return { data: { status: 'success', data: { todayDelivery: null } }, status: 200 };
  }

  return {
    data: { status: 'success', data: { todayDelivery: mapDeliveryToItem(delivery) } },
    status: 200,
  };
}
