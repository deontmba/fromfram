import prisma from '@/lib/prisma';
import { PlanType } from '@prisma/client';
import { setCache, deleteCache } from '@/lib/cache';
import { DAYS_OF_WEEK, DayKey, getEndOfWeek, getNextWeekStart, getStartOfWeek } from '@/lib/week';
import { CreateSubscriptionInput } from '@/schemas';

const subscriptionSelect = {
  id: true,
  userId: true,
  goalId: true,
  planType: true,
  servings: true,
  status: true,
  startDate: true,
  endDate: true,
  pausedUntil: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  goal: {
    select: {
      id: true,
      name: true,
      description: true,
      minCalories: true,
      maxCalories: true,
    },
  },
};

const subscriptionSelectMe = {
  id: true,
  userId: true,
  goalId: true,
  planType: true,
  servings: true,
  status: true,
  startDate: true,
  endDate: true,
  pausedUntil: true,
  goal: {
    select: {
      id: true,
      name: true,
      description: true,
      minCalories: true,
      maxCalories: true,
    },
  },
};

type AllowedPlanType = 'MINGGUAN' | 'BULANAN' | 'TAHUNAN';
const allowedPlanTypes = new Set<AllowedPlanType>(['MINGGUAN', 'BULANAN', 'TAHUNAN']);
function isAllowedPlanType(value: unknown): value is AllowedPlanType {
  return typeof value === 'string' && allowedPlanTypes.has(value as AllowedPlanType);
}

function buildWeeklyBoxDates(weekStart: Date) {
  const weekEndDate = getEndOfWeek(weekStart);
  const selectionDeadline = new Date(weekStart);
  selectionDeadline.setDate(selectionDeadline.getDate() - 1);
  selectionDeadline.setHours(18, 0, 0, 0);
  return { weekEndDate, selectionDeadline };
}

export async function getAllSubscriptions() {
  const [subscriptions, goals] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: [{ startDate: 'desc' }],
      select: subscriptionSelect,
    }),
    prisma.goal.findMany({
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  return { data: { status: 'success', data: subscriptions, goals }, status: 200 };
}

export async function createSubscription(
  sessionUserId: string,
  input: CreateSubscriptionInput
) {
  const { goalId, planType, servings, userId } = input;

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, role: true },
  });

  if (!user) {
    return { error: 'Not authenticated.', status: 401 };
  }

  const targetUserId =
    user.role === 'ADMIN' && typeof userId === 'string' && userId.trim().length > 0
      ? userId.trim()
      : sessionUserId;

  if (!goalId || !planType || !servings || servings < 1 || servings > 6) {
    return { error: 'Invalid payload', status: 400 };
  }

  // Validasi planType adalah nilai enum yang valid
  const validPlanTypes = Object.values(PlanType);
  if (!validPlanTypes.includes(planType as PlanType)) {
    return { error: 'Invalid planType', status: 400 };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });

  if (!targetUser) {
    return { error: 'Target user not found', status: 404 };
  }

  const existingSub = await prisma.subscription.findFirst({
    where: { userId: targetUserId, status: { not: 'CANCELLED' } },
  });

  if (existingSub) {
    return { error: 'User already has an active subscription', status: 400 };
  }

  const newSubscription = await prisma.subscription.create({
    data: {
      userId: targetUserId,
      goalId,
      planType: planType as PlanType, // cast setelah validasi di atas
      servings,
      status: 'UNPAID',
    },
    select: subscriptionSelect,
  });

  return { data: newSubscription, status: 201 };
}

export async function getMySubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    select: subscriptionSelectMe,
  });

  if (!subscription) {
    return { error: 'Subscription not found', status: 404 };
  }

  // Fetch upcoming weekly boxes for skip feature
  const now = new Date();
  const weeklyBoxes = await prisma.weeklyBox.findMany({
    where: {
      userId,
      weekStartDate: { gte: getStartOfWeek(now) },
      status: { in: ['PENDING_SELECTION', 'LOCKED'] },
    },
    orderBy: { weekStartDate: 'asc' },
    take: 2,
    select: { id: true, status: true, weekStartDate: true },
  });

  return {
    data: { ...subscription, weeklyBoxes },
    status: 200,
  };
}

export async function updateMySubscription(
  userId: string,
  input: { goalId: unknown; planType: unknown; servings: unknown }
) {
  const { goalId, planType, servings } = input;

  if (
    typeof goalId !== 'string' ||
    !goalId.trim() ||
    !isAllowedPlanType(planType) ||
    !Number.isInteger(servings) ||
    (servings as number) < 1 ||
    (servings as number) > 6
  ) {
    return { error: 'Invalid payload', status: 400 };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!subscription) {
    return { error: 'Subscription not found', status: 404 };
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId.trim() },
    select: { id: true },
  });

  if (!goal) {
    return { error: 'Goal not found', status: 404 };
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      goalId: goal.id,
      planType: planType as PlanType,
      servings: servings as number,
    },
    select: subscriptionSelectMe,
  });

  return { data: updatedSubscription, status: 200 };
}

export async function pauseSubscription(userId: string, resumeDate: unknown) {
  if (!resumeDate) {
    return { error: 'Missing resumeDate', status: 400 };
  }

  const maxResumeDateAllowed = new Date();
  maxResumeDateAllowed.setDate(maxResumeDateAllowed.getDate() + 28);
  const parsedResumeDate = new Date(resumeDate as string);

  if (isNaN(parsedResumeDate.getTime())) {
    return { error: 'Invalid resumeDate format', status: 400 };
  }

  if (parsedResumeDate > maxResumeDateAllowed) {
    return { error: 'resumeDate cannot exceed 4 weeks from today', status: 400 };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
  });

  if (!subscription) {
    return { error: 'Subscription not found', status: 404 };
  }

  if (subscription.status !== 'ACTIVE') {
    return { error: 'Current status MUST be ACTIVE to pause', status: 400 };
  }

  setCache(`pause_resume_${subscription.id}`, parsedResumeDate.toISOString());

  const updatedSub = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAUSED', pausedUntil: parsedResumeDate },
  });

  return {
    data: {
      message: 'Subscription paused successfully',
      subscription: updatedSub,
      resumeDate: parsedResumeDate.toISOString(),
    },
    status: 200,
  };
}

export async function resumeSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
  });

  if (!subscription) {
    return { error: 'Subscription not found', status: 404 };
  }

  if (subscription.status !== 'PAUSED') {
    return { error: 'Current status MUST be PAUSED to resume', status: 400 };
  }

  deleteCache(`pause_resume_${subscription.id}`);

  const updatedSub = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'ACTIVE', pausedUntil: null },
  });

  return {
    data: { message: 'Subscription resumed successfully', subscription: updatedSub },
    status: 200,
  };
}

export async function cancelSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
  });

  if (!subscription) {
    return { error: 'Subscription not found', status: 404 };
  }

  if (subscription.status !== 'ACTIVE' && subscription.status !== 'PAUSED') {
    return { error: 'Cannot cancel a subscription that is not ACTIVE or PAUSED', status: 400 };
  }

  const cycleEndDate = new Date(subscription.startDate);
  if (subscription.planType === 'MINGGUAN') {
    cycleEndDate.setDate(cycleEndDate.getDate() + 7);
  } else if (subscription.planType === 'BULANAN') {
    cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
  } else if (subscription.planType === 'TAHUNAN') {
    cycleEndDate.setFullYear(cycleEndDate.getFullYear() + 1);
  } else {
    cycleEndDate.setDate(cycleEndDate.getDate() + 7);
  }

  const updatedSub = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELLED', endDate: cycleEndDate, pausedUntil: null },
  });

  return {
    data: {
      message: 'Subscription set for cancellation at the end of cycle',
      subscription: updatedSub,
    },
    status: 200,
  };
}

export async function getWeeklyMenu() {
  const currentWeekStart = getStartOfWeek(new Date());
  // The user should always select menus for the NEXT week, not the current week.
  const targetWeekStart = getNextWeekStart(currentWeekStart);
  const nextTargetWeekStart = getNextWeekStart(targetWeekStart);

  const weeklyMenus = await prisma.weeklyMenu.findMany({
    where: {
      weekStartDate: { gte: targetWeekStart, lt: nextTargetWeekStart },
    },
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
          ingredients: {
            select: {
              quantity: true,
              unit: true,
              ingredient: {
                select: { name: true, isAllergen: true },
              },
            },
          },
        },
      },
    },
  });

  if (weeklyMenus.length === 0) {
    return { error: 'Ahli gizi kamu belum menyiapkan menu untuk minggu depan.', status: 404 };
  }

  const recipes = Array.from(
    new Map(
      weeklyMenus.map((wm) => [
        wm.recipe.id,
        {
          id: wm.recipe.id,
          name: wm.recipe.name,
          description: wm.recipe.description ?? undefined,
          calories: wm.recipe.calories,
          protein: wm.recipe.protein,
          servings: wm.recipe.servings,
          imageUrl: wm.recipe.imageUrl ?? undefined,
          ingredients: wm.recipe.ingredients.map((ing) => ({
            name: ing.ingredient.name,
            isAllergen: ing.ingredient.isAllergen,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        },
      ])
    ).values()
  );

  const weekEndDate = getEndOfWeek(targetWeekStart);

  const menu = DAYS_OF_WEEK.map((day, idx) => {
    const date = new Date(targetWeekStart);
    date.setDate(targetWeekStart.getDate() + idx);
    return { day, date: date.toISOString(), recipes };
  });

  return {
    data: {
      weekStartDate: targetWeekStart.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      menu,
    },
    status: 200,
  };
}

export async function saveWeeklyMenuSelections(
  userId: string,
  input: { mealSelections: { day: DayKey; mealType: 'LUNCH' | 'DINNER'; serving?: number; recipeId: string }[]; weekStartDate: string | Date }
) {
  const { mealSelections, weekStartDate } = input;

  if (!mealSelections?.length || !weekStartDate) {
    return { error: 'mealSelections and weekStartDate are required.', status: 400 };
  }

  const requestedWeekStart = new Date(weekStartDate);
  if (isNaN(requestedWeekStart.getTime())) {
    return { error: 'Invalid weekStartDate format.', status: 400 };
  }

  const weekStart = getStartOfWeek(requestedWeekStart);
  const nextWeekStart = getNextWeekStart(weekStart);

  const weeklyMenuRecipes = await prisma.weeklyMenu.findMany({
    where: { weekStartDate: { gte: weekStart, lt: nextWeekStart } },
    select: { recipeId: true },
  });

  const availableRecipeIds = new Set(weeklyMenuRecipes.map((m) => m.recipeId));

  if (availableRecipeIds.size === 0) {
    return { error: 'Weekly menu belum tersedia untuk minggu ini.', status: 404 };
  }

  for (const selection of mealSelections) {
    if (!availableRecipeIds.has(selection.recipeId)) {
      return {
        error: `Resep ${selection.recipeId} tidak tersedia di weekly menu minggu ini.`,
        status: 400,
      };
    }
  }

  const existingWeeklyBox = await prisma.weeklyBox.findFirst({
    where: { userId, weekStartDate: { gte: weekStart, lt: nextWeekStart } },
    select: { id: true, status: true },
  });

  let weeklyBoxId = existingWeeklyBox?.id;

  if (existingWeeklyBox && existingWeeklyBox.status !== 'PENDING_SELECTION') {
    return {
      error: `WeeklyBox untuk minggu ini sudah berstatus ${existingWeeklyBox.status}. Pilihan menu tidak bisa diubah.`,
      status: 400,
    };
  }

  if (!weeklyBoxId) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      select: { id: true, status: true, pausedUntil: true },
    });

    if (!subscription) {
      return { error: 'Subscription tidak ditemukan. Silakan pilih plan terlebih dahulu.', status: 404 };
    }

    if (subscription.status === 'CANCELLED') {
      return { error: 'Subscription kamu sudah CANCELLED. Aktifkan subscription untuk memilih menu.', status: 400 };
    }

    if (subscription.status === 'PAUSED') {
      const pausedUntil = subscription.pausedUntil ? new Date(subscription.pausedUntil) : null;
      if (!pausedUntil || pausedUntil >= weekStart) {
        return { error: 'Subscription sedang PAUSED untuk minggu ini, sehingga belum bisa pilih menu.', status: 400 };
      }
    }

    const { weekEndDate, selectionDeadline } = buildWeeklyBoxDates(weekStart);

    const createdWeeklyBox = await prisma.weeklyBox.create({
      data: {
        userId,
        weekStartDate: weekStart,
        weekEndDate,
        selectionDeadline,
        status: 'PENDING_SELECTION',
        isAutoSelected: false,
      },
      select: { id: true },
    });

    weeklyBoxId = createdWeeklyBox.id;
  }

  if (!weeklyBoxId) {
    return { error: 'WeeklyBox gagal dipersiapkan untuk penyimpanan menu.', status: 500 };
  }

  // Group selections by (day, mealType) for efficient delete+recreate
  const dayMealKeys = [...new Set(
    mealSelections.map(({ day, mealType }) => `${day}:${mealType}`)
  )];

  await prisma.$transaction(async (tx) => {
    // Delete existing selections for each (day, mealType) being submitted
    for (const key of dayMealKeys) {
      const [day, mealType] = key.split(':') as [string, string];
      await tx.mealSelection.deleteMany({
        where: { weeklyBoxId: weeklyBoxId!, dayOfWeek: day as never, mealType: mealType as never },
      });
    }

    // Create all new selections with serving counts
    await tx.mealSelection.createMany({
      data: mealSelections.map(({ day, mealType, recipeId, serving }) => ({
        weeklyBoxId: weeklyBoxId!,
        recipeId,
        dayOfWeek: day as never,
        mealType: mealType as never,
        serving: serving ?? 1,
      })),
    });
  });

  return { data: { success: true }, status: 200 };
}