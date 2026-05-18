import prisma from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function verifyAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    return { error: 'Forbidden. Admin access required.', status: 403 };
  }

  return null;
}

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return `${diffDays} hari lalu`;
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

export async function getDashboardKpis(userId: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const { start, end } = getTodayRange();

  const [totalUsers, activeSubscriptions, deliveriesToday] = await Promise.all([
    // Total seluruh user dengan role USER
    prisma.user.count({
      where: { role: 'USER' },
    }),

    // User dengan subscription aktif
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),

    // Total delivery entries hari ini (LUNCH + DINNER terhitung terpisah)
    prisma.delivery.count({
      where: {
        deliveryDate: { gte: start, lte: end },
      },
    }),
  ]);

  return {
    data: {
      totalUsers,
      activeSubscriptions,
      deliveriesToday,
    },
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Recent Activities — derived dari data existing, tanpa tabel log terpisah
// ---------------------------------------------------------------------------

export async function getRecentActivities(userId: string, limit = 10) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  // Ambil data paralel: user terbaru, subscription terbaru, delivery update terbaru
  const [recentUsers, recentSubscriptions, recentDelivered, recentShipped] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { name: true, email: true, createdAt: true },
      }),

      prisma.subscription.findMany({
        orderBy: { startDate: 'desc' },
        take: limit,
        select: {
          startDate: true,
          planType: true,
          status: true,
          user: { select: { name: true } },
        },
      }),

      prisma.delivery.findMany({
        where: { status: 'DELIVERED', deliveredAt: { not: null } },
        orderBy: { deliveredAt: 'desc' },
        take: limit,
        select: {
          deliveredAt: true,
          mealType: true,
          user: { select: { name: true } },
        },
      }),

      prisma.delivery.findMany({
        where: { status: 'SHIPPED', shippedAt: { not: null } },
        orderBy: { shippedAt: 'desc' },
        take: limit,
        select: {
          shippedAt: true,
          mealType: true,
          user: { select: { name: true } },
        },
      }),
    ]);

  type RawActivity = {
    text: string;
    type: 'user' | 'subscription' | 'delivered' | 'shipped';
    timestamp: Date;
  };

  const raw: RawActivity[] = [
    ...recentUsers.map((u) => ({
      text: `User baru mendaftar: ${u.name} (${u.email})`,
      type: 'user' as const,
      timestamp: u.createdAt,
    })),

    ...recentSubscriptions.map((s) => ({
      text: `Subscription ${s.planType} baru: ${s.user.name} — status ${s.status}`,
      type: 'subscription' as const,
      timestamp: s.startDate,
    })),

    ...recentDelivered.map((d) => ({
      text: `Delivery ${d.mealType === 'LUNCH' ? 'Makan Siang' : 'Makan Malam'} selesai: ${d.user.name}`,
      type: 'delivered' as const,
      timestamp: d.deliveredAt!,
    })),

    ...recentShipped.map((d) => ({
      text: `Delivery ${d.mealType === 'LUNCH' ? 'Makan Siang' : 'Makan Malam'} dikirim: ${d.user.name}`,
      type: 'shipped' as const,
      timestamp: d.shippedAt!,
    })),
  ];

  // Sort semua aktivitas by timestamp terbaru, ambil limit teratas
  const sorted = raw
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  const activities = sorted.map((item) => ({
    text: item.text,
    type: item.type,
    time: timeAgo(item.timestamp),
    timestamp: item.timestamp.toISOString(),
  }));

  return { data: { activities }, status: 200 };
}

// ---------------------------------------------------------------------------
// Admin Users — dengan search, pagination, filter status, total deliveries
// ---------------------------------------------------------------------------

export async function getAdminUsers(
  userId: string,
  filters: {
    search?: string | null;
    status?: string | null;
    plan?: string | null;
    page?: number;
    limit?: number;
  } = {}
) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const { search, status, plan, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where = {
    role: 'USER' as const,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && {
      subscriptions: {
        some: {
          status: status as 'UNPAID' | 'ACTIVE' | 'PAUSED' | 'CANCELLED',
        },
      },
    }),
    ...(plan && {
      subscriptions: {
        some: {
          planType: plan as 'MINGGUAN' | 'BULANAN' | 'TAHUNAN',
        },
      },
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        addresses: {
          where: { isDefault: true },
          select: { street: true, city: true, phoneNumber: true },
          take: 1,
        },
        subscriptions: {
          select: {
            planType: true,
            servings: true,
            status: true,
            startDate: true,
            goal: { select: { name: true } },
          },
          take: 1,
        },
        weeklyBoxes: {
          where: { status: { in: ['PENDING_SELECTION', 'LOCKED'] } },
          select: {
            deliveries: {
              where: { status: { not: 'DELIVERED' } },
              orderBy: { deliveryDate: 'asc' },
              select: { deliveryDate: true },
              take: 1,
            },
          },
          orderBy: { weekStartDate: 'desc' },
          take: 1,
        },
        // Hitung total delivery per user
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),

    prisma.user.count({ where }),
  ]);

  const data = users.map((u) => {
    const sub = u.subscriptions[0] ?? null;
    const box = u.weeklyBoxes[0] ?? null;
    const defaultAddress = u.addresses[0] ?? null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      joinedAt: u.createdAt,
      address: defaultAddress
        ? `${defaultAddress.street}, ${defaultAddress.city}`
        : null,
      phoneNumber: defaultAddress?.phoneNumber ?? null,
      plan: sub?.planType ?? null,
      servings: sub?.servings ?? null,
      subscriptionStatus: sub?.status ?? null,
      goal: sub?.goal?.name ?? null,
      nextDelivery: box?.deliveries[0]?.deliveryDate ?? null,
      totalDeliveries: u._count.deliveries,
    };
  });

  return {
    data: {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Admin Deliveries — dengan search, filter date, filter mealType, pagination
// ---------------------------------------------------------------------------

export async function getAdminDeliveries(
  userId: string,
  filters: {
    status?: string | null;
    area?: string | null;
    date?: string | null;
    mealType?: string | null;
    search?: string | null;
    page?: number;
    limit?: number;
  } = {}
) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const { status: statusFilter, area: areaFilter, date, mealType, search, page = 1, limit = 50 } = filters;
  const skip = (page - 1) * limit;

  // Bangun filter tanggal
  let dateFilter: { gte: Date; lte: Date } | undefined;
  if (date) {
    const parsed = new Date(date);
    const dayStart = new Date(parsed);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed);
    dayEnd.setHours(23, 59, 59, 999);
    dateFilter = { gte: dayStart, lte: dayEnd };
  }

  const where = {
    ...(statusFilter && {
      status: statusFilter as 'PREPARING' | 'SHIPPED' | 'DELIVERED',
    }),
    ...(areaFilter && {
      address: {
        city: { contains: areaFilter, mode: 'insensitive' as const },
      },
    }),
    ...(dateFilter && { deliveryDate: dateFilter }),
    ...(mealType && {
      mealType: mealType as 'LUNCH' | 'DINNER',
    }),
    ...(search && {
      user: {
        name: { contains: search, mode: 'insensitive' as const },
      },
    }),
  };

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      select: {
        id: true,
        deliveryDate: true,
        mealType: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
        user: {
          select: {
            id: true,
            name: true,
            subscriptions: {
              select: { planType: true },
              take: 1,
            },
          },
        },
        address: {
          select: { street: true, city: true, province: true },
        },
        weeklyBox: {
          select: {
            mealSelections: {
              select: {
                dayOfWeek: true,
                mealType: true,
                recipe: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { deliveryDate: 'desc' },
      skip,
      take: limit,
    }),

    prisma.delivery.count({ where }),
  ]);

  const jsToEnum: Record<number, string> = {
    0: 'MINGGU',
    1: 'SENIN',
    2: 'SELASA',
    3: 'RABU',
    4: 'KAMIS',
    5: 'JUMAT',
    6: 'SABTU',
  };

  const data = deliveries.map((d) => {
    const dayEnum = jsToEnum[new Date(d.deliveryDate).getDay()];

    // Match selection by dayOfWeek DAN mealType sekaligus
    const matchedSelection = d.weeklyBox?.mealSelections.find(
      (s) => s.dayOfWeek === dayEnum && s.mealType === d.mealType
    );

    return {
      id: d.id,
      user: d.user.name,
      userId: d.user.id,
      mealType: d.mealType,
      menu: matchedSelection?.recipe?.name ?? 'Menu tidak tersedia',
      address: d.address
        ? `${d.address.street}, ${d.address.city}, ${d.address.province}`
        : '-',
      plan: d.user.subscriptions[0]?.planType ?? null,
      deliveryDate: d.deliveryDate,
      status: d.status,
      shippedAt: d.shippedAt,
      deliveredAt: d.deliveredAt,
    };
  });

  return {
    data: {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Advance Delivery Status
// ---------------------------------------------------------------------------

export async function advanceDelivery(userId: string, deliveryId: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, status: true, weeklyBoxId: true },
  });

  if (!delivery) {
    return { error: 'Delivery not found.', status: 404 };
  }

  if (delivery.status === 'DELIVERED') {
    return {
      error: 'Delivery is already DELIVERED. Cannot advance further.',
      status: 400,
    };
  }

  const nextStatus = delivery.status === 'PREPARING' ? 'SHIPPED' : 'DELIVERED';
  const now = new Date();

  const updated = await prisma.delivery.update({
    where: { id: deliveryId },
    data: {
      status: nextStatus,
      ...(nextStatus === 'SHIPPED' && { shippedAt: now }),
      ...(nextStatus === 'DELIVERED' && { deliveredAt: now }),
    },
    select: {
      id: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
    },
  });

  // Jika semua delivery dalam WeeklyBox sudah DELIVERED, set box ke COMPLETED
  if (nextStatus === 'DELIVERED') {
    const pendingCount = await prisma.delivery.count({
      where: {
        weeklyBoxId: delivery.weeklyBoxId,
        status: { not: 'DELIVERED' },
      },
    });

    if (pendingCount === 0) {
      await prisma.weeklyBox.update({
        where: { id: delivery.weeklyBoxId },
        data: { status: 'COMPLETED' },
      });
    }
  }

  return {
    data: {
      message: `Delivery advanced to ${nextStatus}.`,
      data: updated,
    },
    status: 200,
  };
}