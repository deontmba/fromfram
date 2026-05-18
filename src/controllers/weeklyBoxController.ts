import prisma from '@/lib/prisma';

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

  // Dapatkan hari unik dari meal selections
  const uniqueDays = Array.from(new Set(box.mealSelections.map((sel) => sel.dayOfWeek)));

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
    // 1. Kunci weekly box
    const updated = await tx.weeklyBox.update({
      where: { id: box.id },
      data: { status: 'LOCKED' },
    });

    // 2. Buat delivery untuk masing-masing hari unik
    if (uniqueDays.length > 0) {
      const deliveryData = uniqueDays.map((day) => {
        const offset = dayOffsets[day] ?? 0;
        const deliveryDate = new Date(box.weekStartDate);
        deliveryDate.setDate(deliveryDate.getDate() + offset);
        deliveryDate.setHours(7, 30, 0, 0); // Waktu default pengiriman pagi hari

        return {
          userId,
          weeklyBoxId: box.id,
          addressId: address.id,
          deliveryDate,
          status: 'PREPARING' as const,
        };
      });

      await tx.delivery.createMany({
        data: deliveryData,
      });
    }

    return updated;
  });

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

  const updatedBox = await prisma.weeklyBox.update({
    where: { id: boxId },
    data: { status: 'SKIPPED' },
  });

  return { data: { message: 'Weekly box berhasil di-skip.', data: updatedBox }, status: 200 };
}