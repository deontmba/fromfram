import prisma from '@/lib/prisma';
import { getEndOfWeek, getStartOfWeek } from '@/lib/week';
import { CreateRecipeInput, UpdateRecipeInput } from '@/schemas';

async function verifyNutritionist(userId: string): Promise<{ error: string; status: number } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'NUTRITIONIST') {
    return { error: 'Forbidden. Nutritionist access required.', status: 403 };
  }

  return null;
}

export async function getNutritionistKPIs(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const [totalRecipes, weeklyMenuWeeks, activeUsers] = await prisma.$transaction([
    prisma.recipe.count(),
    prisma.weeklyMenu.findMany({
      select: { createdAt: true },
    }),
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
  ]);

  const weeklyMenusCount = new Set(
    weeklyMenuWeeks.map((menu) => getStartOfWeek(menu.createdAt).toISOString())
  ).size;

  return {
    data: { data: { totalRecipes, weeklyMenusCount, activeUsers } },
    status: 200,
  };
}

export async function getNutritionistActivities(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const [recentRecipes, recentMenus] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { id: 'desc' },
      take: 5,
    }),
    prisma.weeklyMenu.findMany({
      include: { recipe: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const activities: Array<{ type: string; text: string; time: string }> = [];

  for (const recipe of recentRecipes) {
    activities.push({
      type: 'recipe',
      text: `Resep ditambahkan: ${recipe.name}`,
      time: new Date().toISOString(),
    });
  }

  for (const menu of recentMenus) {
    activities.push({
      type: 'menu',
      text: `Menu mingguan diatur: ${menu.recipe.name} (${getStartOfWeek(menu.weekStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})`,
      time: menu.createdAt.toISOString(),
    });
  }

  activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const result = activities.slice(0, 5).map((a) => ({
    type: a.type,
    text: a.text,
    time: formatRelativeTime(new Date(a.time)),
  }));

  return { data: { data: result }, status: 200 };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} hari lalu`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} minggu lalu`;
}

export async function getNutritionistRecipes(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      calories: true,
      protein: true,
      servings: true,
      imageUrl: true,
    },
    orderBy: { id: 'desc' },
  });

  return { data: { data: recipes }, status: 200 };
}

export async function getNutritionistRecipeById(userId: string, recipeId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      name: true,
      description: true,
      calories: true,
      protein: true,
      servings: true,
      imageUrl: true,
    },
  });

  if (!recipe) return { error: 'Recipe not found.', status: 404 };

  return { data: { data: recipe }, status: 200 };
}

export async function createNutritionistRecipe(userId: string, input: CreateRecipeInput) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const { name, description, calories, protein, servings, imageUrl } = input;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      description: description ?? '',
      calories,
      protein,
      servings,
      nutritionistId: userId,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  return { data: { data: recipe }, status: 201 };
}

export async function updateNutritionistRecipe(userId: string, recipeId: string, input: UpdateRecipeInput) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const { name, description, calories, protein, servings, imageUrl } = input;

  const updatedRecipe = await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(calories !== undefined && { calories }),
      ...(protein !== undefined && { protein }),
      ...(servings !== undefined && { servings }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });

  return { data: { data: updatedRecipe }, status: 200 };
}

export async function deleteNutritionistRecipe(userId: string, recipeId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  await prisma.recipe.delete({ where: { id: recipeId } });

  return { data: { success: true, message: 'Recipe deleted.' }, status: 200 };
}

export async function getNutritionistWeeklyMenus(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const currentWeekStart = getStartOfWeek(new Date());

  const [weeklyMenus, goals] = await Promise.all([
    prisma.weeklyMenu.findMany({
      where: {
        weekStartDate: {
          gte: currentWeekStart,
        },
      },
      include: { recipe: true },
      orderBy: { weekStartDate: 'asc' },
    }),
    prisma.goal.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const goalOptions = goals.map((goal) => ({ id: goal.id, name: goal.name }));

  const groupedMenus = new Map<
    string,
    {
      weekStartDate: Date;
      menus: Array<{
        id: string;
        recipeName: string;
        calories: number;
        protein: number;
        suitableGoals: string[];
      }>;
    }
  >();

  for (const menu of weeklyMenus) {
    const weekStartDate = getStartOfWeek(menu.weekStartDate);
    const key = weekStartDate.toISOString();
    const suitableGoals = goals
      .filter(
        (goal) =>
          menu.recipe.calories >= goal.minCalories &&
          menu.recipe.calories <= goal.maxCalories
      )
      .map((goal) => goal.name);

    const group = groupedMenus.get(key) ?? { weekStartDate, menus: [] };
    group.menus.push({
      id: menu.id,
      recipeName: menu.recipe.name,
      calories: menu.recipe.calories,
      protein: menu.recipe.protein,
      suitableGoals,
    });

    groupedMenus.set(key, group);
  }

  const result = Array.from(groupedMenus.values())
    .sort((a, b) => {
      const aIsActive = a.weekStartDate.getTime() === currentWeekStart.getTime();
      const bIsActive = b.weekStartDate.getTime() === currentWeekStart.getTime();
      if (aIsActive !== bIsActive) return aIsActive ? -1 : 1;
      return a.weekStartDate.getTime() - b.weekStartDate.getTime();
    })
    .map((group) => ({
      weekStartDate: group.weekStartDate.toISOString(),
      weekEndDate: getEndOfWeek(group.weekStartDate).toISOString(),
      isActiveWeek: group.weekStartDate.getTime() === currentWeekStart.getTime(),
      menus: group.menus,
    }));

  return { data: { data: result, goals: goalOptions }, status: 200 };
}

export async function getNutritionistWeeklyMenuById(userId: string, menuId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const menu = await prisma.weeklyMenu.findUnique({
    where: { id: menuId },
    include: { recipe: true },
  });

  if (!menu) return { error: 'Weekly menu not found.', status: 404 };

  return { data: { data: menu }, status: 200 };
}

export async function createNutritionistWeeklyMenu(
  userId: string,
  input: { recipeId: string; weekStartDate: string }
) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const { recipeId, weekStartDate } = input;

  const normalizedWeekStart = getStartOfWeek(new Date(weekStartDate));
  const nextWeekStart = new Date(normalizedWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  nextWeekStart.setHours(0, 0, 0, 0);

  const existingMenu = await prisma.weeklyMenu.findFirst({
    where: {
      recipeId,
      weekStartDate: { gte: normalizedWeekStart, lt: nextWeekStart },
    },
    select: { id: true },
  });

  if (existingMenu) {
    return { data: { data: existingMenu }, status: 200 };
  }

  const weeklyMenu = await prisma.weeklyMenu.create({
    data: { recipeId, weekStartDate: normalizedWeekStart },
  });

  return { data: { data: weeklyMenu }, status: 201 };
}

export async function updateNutritionistWeeklyMenu(
  userId: string,
  menuId: string,
  input: { recipeId?: string; weekStartDate?: string }
) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const { recipeId, weekStartDate } = input;
  const normalizedWeekStart = weekStartDate
    ? getStartOfWeek(new Date(weekStartDate))
    : undefined;

  const updatedMenu = await prisma.weeklyMenu.update({
    where: { id: menuId },
    data: {
      ...(recipeId !== undefined && { recipeId }),
      ...(normalizedWeekStart !== undefined && { weekStartDate: normalizedWeekStart }),
    },
  });

  return { data: { data: updatedMenu }, status: 200 };
}

export async function deleteNutritionistWeeklyMenu(userId: string, menuId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  await prisma.weeklyMenu.delete({ where: { id: menuId } });

  return { data: { success: true, message: 'Weekly menu deleted.' }, status: 200 };
}

export async function autoGenerateNutritionistWeeklyMenu(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  // 1. Get the target week (Next Week)
  const currentWeekStart = getStartOfWeek(new Date());
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  nextWeekStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  // 2. Fetch all available recipes
  const allRecipes = await prisma.recipe.findMany({
    select: { id: true },
  });

  if (allRecipes.length === 0) {
    return { error: 'Belum ada resep di database.', status: 400 };
  }

  // 3. Shuffle recipes to get random ones
  const shuffled = allRecipes.sort(() => 0.5 - Math.random());
  const selectedRecipes = shuffled.slice(0, 14); // We want 14 recipes

  // 4. Fetch existing menus for next week to avoid duplicates
  const existingMenus = await prisma.weeklyMenu.findMany({
    where: {
      weekStartDate: { gte: nextWeekStart, lt: nextWeekEnd },
    },
    select: { recipeId: true },
  });

  const existingRecipeIds = new Set(existingMenus.map((m) => m.recipeId));

  // 5. Filter out already existing recipes
  const newRecipesToInsert = selectedRecipes.filter((r) => !existingRecipeIds.has(r.id));

  if (newRecipesToInsert.length === 0) {
    return { data: { success: true, message: 'Menu minggu depan sudah penuh / tidak ada resep baru untuk ditambahkan.' }, status: 200 };
  }

  // 6. Bulk insert new weekly menus
  await prisma.weeklyMenu.createMany({
    data: newRecipesToInsert.map((r) => ({
      recipeId: r.id,
      weekStartDate: nextWeekStart,
    })),
  });

  return { data: { success: true, message: `Berhasil meng-generate ${newRecipesToInsert.length} resep untuk minggu depan.` }, status: 201 };
}

export async function getNutritionistDashboardActivity(userId: string) {
  const authError = await verifyNutritionist(userId);
  if (authError) return authError;

  const [recentRecipes, recentWeeklyMenus] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { id: 'desc' },
      take: 3,
    }),
    prisma.weeklyMenu.findMany({
      orderBy: { weekStartDate: 'desc' },
      take: 3,
      include: { recipe: { select: { name: true } } },
    }),
  ]);

  const activities: Array<{ text: string; time: string; icon: string }> = [];

  recentRecipes.forEach((r, idx) => {
    const times = ["1 jam lalu", "3 jam lalu", "1 hari lalu"];
    activities.push({
      text: `Resep baru ditambahkan: ${r.name}`,
      time: times[idx] || "1 hari lalu",
      icon: "BookIcon",
    });
  });

  recentWeeklyMenus.forEach((wm, idx) => {
    const times = ["2 jam lalu", "5 jam lalu", "2 hari lalu"];
    const dateStr = new Date(wm.weekStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    activities.push({
      text: `Menu mingguan pekan ${dateStr} dipublikasikan: ${wm.recipe.name}`,
      time: times[idx] || "2 hari lalu",
      icon: "CalendarIcon",
    });
  });

  const finalActivities = activities.slice(0, 5);

  return {
    data: { activities: finalActivities },
    status: 200,
  };
}
