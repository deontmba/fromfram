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
      select: { id: true, status: true, weekStartDate: true },
    }),
    prisma.weeklyBox.findFirst({
      where: { userId },
      orderBy: { weekStartDate: 'desc' },
      select: { id: true, status: true, weekStartDate: true },
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

  const updatedBox = await prisma.weeklyBox.update({
    where: { id: box.id },
    data: { status: 'LOCKED' },
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