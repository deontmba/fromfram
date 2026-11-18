import prisma from '@/lib/prisma';
import { addDays, atJakartaTime } from '@/lib/week';
import { refreshSubscriptionStatus } from '@/controllers/subscriptionController';

export async function getAllWeeklyBoxes(userId: string) {
  const boxes = await prisma.weeklyBox.findMany({
    where: { userId },
    orderBy: { weekStartDate: 'desc' },
    include: {
      mealSelections: {
        include: {
          recipe: {
            select: {
              id: true,
              name: true,
              calories: true,
              protein: true,
              imageUrl: true,
            },
          },
        },
      },
      deliveries: {
        select: {
          id: true,
          deliveryDate: true,
          status: true,
          shippedAt: true,
          deliveredAt: true,
        },
      },
    },
  });

  return { data: boxes, status: 200 };
}

export async function getCurrentWeeklyBox(userId: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const includeOptions = {
    mealSelections: {
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            description: true,
            calories: true,
            protein: true,
            servings: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' as const },
    },
    deliveries: {
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
      },
      orderBy: { deliveryDate: 'asc' as const },
    },
  };

  const [currentBoxResult, nextBoxResult] = await Promise.all([
    prisma.weeklyBox.findFirst({
      where: {
        userId,
        weekStartDate: { lte: now },
        weekEndDate: { gte: now },
      },
      include: includeOptions,
    }),
    prisma.weeklyBox.findFirst({
      where: {
        userId,
        weekStartDate: { gt: now },
      },
      orderBy: { weekStartDate: 'asc' },
      include: includeOptions,
    }),
  ]);

  const currentBox = currentBoxResult ?? nextBoxResult;

  if (!currentBox) {
    return { error: 'Tidak ada weekly box aktif untuk minggu ini.', status: 404 };
  }

  const isDeadlinePassed = now > currentBox.selectionDeadline;

  return { data: { ...currentBox, isDeadlinePassed }, status: 200 };
}

export async function lockCurrentWeeklyBox(userId: string) {
  // Deliveries are only created for paid subscriptions.
  await refreshSubscriptionStatus(userId);
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (subscription?.status !== 'ACTIVE') {
    return { error: 'Subscription belum aktif. Selesaikan pembayaran terlebih dahulu.', status: 402 };
  }

  const [pendingBoxResult, latestBoxResult] = await Promise.all([
    prisma.weeklyBox.findFirst({
      where: { userId, status: 'PENDING_SELECTION' },
      orderBy: { weekStartDate: 'desc' },
      include: {
        mealSelections: true,
      },
    }),
    prisma.weeklyBox.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' },
      include: {
        mealSelections: true,
      },
    }),
  ]);

  const box = pendingBoxResult ?? latestBoxResult;

  if (!box) {
    return { error: 'Weekly box tidak ditemukan.', status: 404 };
  }

  if (box.status === 'LOCKED' || box.status === 'COMPLETED') {
    return { data: { message: 'Weekly box already finalized.', data: box }, status: 200 };
  }

  if (box.status !== 'PENDING_SELECTION') {
    return {
      error: `Tidak bisa mengunci weekly box dengan status "${box.status}".`,
      status: 400,
    };
  }

  // Cari alamat user untuk pengiriman
  const address = await prisma.address.findFirst({
    where: { userId, isDefault: true },
  }) ?? await prisma.address.findFirst({
    where: { userId },
  });

  if (!address) {
    return {
      error: 'Anda harus menambahkan alamat pengiriman di profil terlebih dahulu sebelum mengunci menu.',
      status: 400,
    };
  }

  // Per-day/meal addresses from multi-address scheduling; default address otherwise.
  const schedules = await prisma.addressSchedule.findMany({
    where: { userId },
    select: { dayOfWeek: true, mealType: true, addressId: true },
  });
  const scheduledAddress = new Map(schedules.map((s) => [`${s.dayOfWeek}:${s.mealType}`, s.addressId]));

  const dayOffsets: Record<string, number> = {
    SENIN: 0,
    SELASA: 1,
    RABU: 2,
    KAMIS: 3,
    JUMAT: 4,
    SABTU: 5,
    MINGGU: 6,
  };

  const updatedBox = await prisma.$transaction(async (tx) => {
    // 1. Kunci weekly box — conditional, so a second concurrent lock creates no duplicate deliveries
    const claimed = await tx.weeklyBox.updateMany({
      where: { id: box.id, status: 'PENDING_SELECTION' },
      data: { status: 'LOCKED' },
    });
    if (claimed.count === 0) return null;

    // 2. Buat delivery untuk masing-masing meal selection
    if (box.mealSelections.length > 0) {
      const deliveryData = box.mealSelections.map((sel) => {
        const offset = dayOffsets[sel.dayOfWeek] ?? 0;
        const isLunch = sel.mealType === 'LUNCH';
        // 11:30 / 17:30 Jakarta time
        const deliveryDate = atJakartaTime(addDays(box.weekStartDate, offset), isLunch ? 11 : 17, 30);

        return {
          userId,
          weeklyBoxId: box.id,
          addressId: scheduledAddress.get(`${sel.dayOfWeek}:${sel.mealType}`) ?? address.id,
          deliveryDate,
          mealType: sel.mealType,
          status: 'PREPARING' as const,
        };
      });

      await tx.delivery.createMany({
        data: deliveryData,
      });
    }

    return tx.weeklyBox.findUnique({ where: { id: box.id } });
  });

  if (!updatedBox) {
    return { data: { message: 'Weekly box already finalized.', data: box }, status: 200 };
  }

  return { data: { message: 'Weekly box berhasil dikunci.', data: updatedBox }, status: 200 };
}

export async function skipWeeklyBox(userId: string, boxId: string) {
  const box = await prisma.weeklyBox.findUnique({
    where: { id: boxId },
  });

  if (!box) {
    return { error: 'Weekly box tidak ditemukan.', status: 404 };
  }

  if (box.userId !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  if (box.status !== 'PENDING_SELECTION') {
    return {
      error: `Tidak bisa skip box dengan status "${box.status}". Hanya PENDING_SELECTION yang bisa di-skip.`,
      status: 400,
    };
  }

  if (box.selectionDeadline < new Date()) {
    return { error: 'Batas waktu skip sudah lewat.', status: 400 };
  }

  // Conditional claim: a lock running at the same time must not be overwritten.
  const { count } = await prisma.weeklyBox.updateMany({
    where: { id: boxId, status: 'PENDING_SELECTION' },
    data: { status: 'SKIPPED' },
  });
  if (count === 0) {
    return { error: 'Weekly box sudah dikunci atau di-skip.', status: 409 };
  }

  return { data: { message: 'Weekly box berhasil di-skip.', data: { ...box, status: 'SKIPPED' } }, status: 200 };
}