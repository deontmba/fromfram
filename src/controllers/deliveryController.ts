import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ============================================================
// HELPERS
// ============================================================

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

function getEtaInfo(status: string) {
  if (status === 'PREPARING') {
    return {
      etaTitle: 'Pesanan sedang disiapkan di warehouse',
      etaWindow: 'Estimasi dikirim pukul 06:00–08:00',
    };
  }
  if (status === 'SHIPPED') {
    return {
      etaTitle: 'Kurir sedang menuju lokasi',
      etaWindow: 'Estimasi tiba 10:00–12:00',
    };
  }
  return {
    etaTitle: 'Pesanan telah diterima',
    etaWindow: 'Pengiriman selesai',
  };
}

function buildTimeline(
  status: string,
  shippedAt: Date | null,
  deliveredAt: Date | null,
) {
  const formatTime = (date: Date | null) =>
    date
      ? new Intl.DateTimeFormat('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      : null;

  return [
    {
      id: 'prepared',
      label: 'Pesanan Disiapkan',
      timeLabel: '06:00',
      state: status === 'PREPARING' ? 'current' : 'completed',
    },
    {
      id: 'courier',
      label: 'Pesanan Dibawa Kurir',
      timeLabel:
        formatTime(shippedAt) ??
        (status === 'SHIPPED' ? 'Sedang berlangsung' : 'Estimasi 08:00'),
      state:
        status === 'PREPARING'
          ? 'upcoming'
          : status === 'SHIPPED'
            ? 'current'
            : 'completed',
    },
    {
      id: 'received',
      label: 'Pesanan Diterima',
      timeLabel: formatTime(deliveredAt) ?? 'Estimasi 10:00–12:00',
      state: status === 'DELIVERED' ? 'completed' : 'upcoming',
    },
  ];
}

function buildAddressLabel(
  address: {
    label: string | null;
    street: string | null;
    city: string | null;
  } | null,
) {
  if (!address) return 'Alamat tidak tersedia';
  const parts = [address.label, address.street, address.city].filter(Boolean);
  return `Menuju: ${parts.join(' - ')}`;
}

function getDayOfWeekEnum(date: Date) {
  const days = [
    'MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU',
  ] as const;
  return days[date.getDay()];
}

// ============================================================
// SELECT QUERY
// ============================================================

const deliverySelect = {
  id: true,
  deliveryDate: true,
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
          recipe: {
            select: {
              name: true,
              calories: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  },
} as const;

const INFO_BULLETS = [
  'Pengiriman dilakukan setiap hari pukul 06:00 - 12:00',
  'Meal kit sudah dikemas dalam cooler box untuk menjaga kesegaran',
  'Jika tidak ada di rumah, kurir akan menghubungi via telepon',
  'Status akan update otomatis real-time',
];

// ============================================================
// MAPPER
// ============================================================

type DeliveryRecord = {
  id: string;
  deliveryDate: Date;
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
      recipe: {
        name: string;
        calories: number;
        imageUrl: string | null;
      } | null;
    }[];
  } | null;
};

function mapDeliveryToItem(delivery: DeliveryRecord) {
  const dayDate = new Date(delivery.deliveryDate);
  const todayDayKey = getDayOfWeekEnum(dayDate);
  const menuName =
    delivery.weeklyBox?.mealSelections?.find(
      (s) => s.dayOfWeek === todayDayKey,
    )?.recipe?.name ?? 'Menu belum tersedia';

  const eta = getEtaInfo(delivery.status);
  const timeline = buildTimeline(delivery.status, delivery.shippedAt, delivery.deliveredAt);
  const addressLabel = buildAddressLabel(delivery.address);

  return {
    id: delivery.id,
    dayLabel: formatDayLabel(dayDate),
    dateLabel: formatDateLabel(dayDate),
    menuName,
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

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * GET /api/deliveries
 * Mengambil semua delivery dalam WeeklyBox minggu berjalan.
 * Response dipisah menjadi todayDelivery, upcomingDeliveries, recentDeliveries.
 */
export const getDeliveries = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deliveries = await prisma.delivery.findMany({
      where: {
        userId,
        weeklyBox: {
          weekStartDate: { lte: today },
          weekEndDate: { gte: today },
        },
      },
      orderBy: { deliveryDate: 'asc' },
      select: deliverySelect,
    });

    if (deliveries.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: {
          periodLabel: 'Tidak ada pengiriman minggu ini',
          todayDelivery: null,
          upcomingDeliveries: [],
          recentDeliveries: [],
          infoBullets: INFO_BULLETS,
        },
      });
    }

    const todayDelivery = deliveries.find((d) => {
      const date = new Date(d.deliveryDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    });

    const upcomingDeliveries = deliveries.filter((d) => {
      const date = new Date(d.deliveryDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() > today.getTime();
    });

    const recentDeliveries = deliveries.filter((d) => {
      const date = new Date(d.deliveryDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() < today.getTime();
    });

    const firstDelivery = deliveries[0];
    const periodLabel = firstDelivery?.weeklyBox
      ? getPeriodLabel(
          new Date(firstDelivery.weeklyBox.weekStartDate),
          new Date(firstDelivery.weeklyBox.weekEndDate),
        )
      : 'Periode minggu ini';

    return NextResponse.json({
      status: 'success',
      data: {
        periodLabel,
        todayDelivery: todayDelivery ? mapDeliveryToItem(todayDelivery) : null,
        upcomingDeliveries: upcomingDeliveries.map(mapDeliveryToItem),
        recentDeliveries: recentDeliveries.map(mapDeliveryToItem),
        infoBullets: INFO_BULLETS,
      },
    });
  } catch (error) {
    console.error('[DELIVERIES GET ERROR]', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data pengiriman.' },
      { status: 500 },
    );
  }
};

/**
 * GET /api/deliveries/today
 * Mengambil delivery hari ini milik user.
 */
export const getTodayDelivery = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const delivery = await prisma.delivery.findFirst({
      where: {
        userId,
        deliveryDate: { gte: today, lt: tomorrow },
      },
      select: deliverySelect,
    });

    if (!delivery) {
      return NextResponse.json({
        status: 'success',
        data: { todayDelivery: null },
      });
    }

    return NextResponse.json({
      status: 'success',
      data: { todayDelivery: mapDeliveryToItem(delivery) },
    });
  } catch (error) {
    console.error('[TODAY DELIVERY GET ERROR]', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data pengiriman hari ini.' },
      { status: 500 },
    );
  }
};

/**
 * GET /api/deliveries/:id
 * Mengambil detail satu delivery berdasarkan ID.
 */
export const getDeliveryById = async (userId: string, deliveryId: string) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, userId },
      select: deliverySelect,
    });

    if (!delivery) {
      return NextResponse.json(
        { message: 'Data pengiriman tidak ditemukan.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: 'success',
      data: mapDeliveryToItem(delivery),
    });
  } catch (error) {
    console.error('[DELIVERY DETAIL GET ERROR]', error);
    return NextResponse.json(
      { message: 'Gagal mengambil detail pengiriman.' },
      { status: 500 },
    );
  }
};