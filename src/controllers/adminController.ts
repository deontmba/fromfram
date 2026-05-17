import prisma from '@/lib/prisma';

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

export async function getAdminUsers(userId: string) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      addresses: {
        where: { isDefault: true },
        select: {
          street: true,
          city: true,
          phoneNumber: true,
        },
        take: 1,
      },
      subscriptions: {
        select: {
          planType: true,
          servings: true,
          status: true,
          startDate: true,
          goal: {
            select: { name: true },
          },
        },
        take: 1,
      },
      weeklyBoxes: {
        where: {
          status: { in: ['PENDING_SELECTION', 'LOCKED'] },
        },
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
    },
    orderBy: { createdAt: 'desc' },
  });

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
    };
  });

  return { data: { data }, status: 200 };
}

export async function getAdminDeliveries(
  userId: string,
  filters: { status?: string | null; area?: string | null }
) {
  const authError = await verifyAdmin(userId);
  if (authError) return authError;

  const { status: statusFilter, area: areaFilter } = filters;

  const deliveries = await prisma.delivery.findMany({
    where: {
      ...(statusFilter && {
        status: statusFilter as 'PREPARING' | 'SHIPPED' | 'DELIVERED',
      }),
      ...(areaFilter && {
        address: {
          city: { contains: areaFilter, mode: 'insensitive' },
        },
      }),
    },
    select: {
      id: true,
      deliveryDate: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
      user: {
        select: { id: true, name: true },
      },
      address: {
        select: { city: true, province: true },
      },
      weeklyBox: {
        select: {
          mealSelections: {
            select: {
              dayOfWeek: true,
              recipe: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { deliveryDate: 'desc' },
  });

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
    const matchedSelection = d.weeklyBox?.mealSelections.find(
      (s) => s.dayOfWeek === dayEnum
    );

    return {
      id: d.id,
      user: d.user.name,
      userId: d.user.id,
      menu: matchedSelection?.recipe?.name ?? 'Menu tidak tersedia',
      address: d.address ? `${d.address.city}, ${d.address.province}` : '-',
      deliveryDate: d.deliveryDate,
      status: d.status,
      shippedAt: d.shippedAt,
      deliveredAt: d.deliveredAt,
    };
  });

  return { data: { data }, status: 200 };
}

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

  // Jika semua delivery dalam WeeklyBox sudah DELIVERED, box jadi COMPLETED
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
    data: { message: `Delivery advanced to ${nextStatus}.`, data: updated },
    status: 200,
  };
}