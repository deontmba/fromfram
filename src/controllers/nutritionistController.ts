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
      select: { weekStartDate: true },
    }),
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
  ]);

  const weeklyMenusCount = new Set(
    weeklyMenuWeeks.map((menu) => getStartOfWeek(menu.weekStartDate).toISOString())
  ).size;

  return {
    data: { data: { totalRecipes, weeklyMenusCount, activeUsers } },
    status: 200,
  };
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

  const { name, description, calories, protein, servings } = input;

  const recipe = await prisma.recipe.create({
    data: {
      name,
      description: description ?? '',
      calories,
      protein,
      servings,
      nutritionistId: userId,
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

  const [weeklyMenus, goals] = await Promise.all([
    prisma.weeklyMenu.findMany({
      include: { recipe: true },
      orderBy: { weekStartDate: 'desc' },
    }),
    prisma.goal.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const goalOptions = goals.map((goal) => ({ id: goal.id, name: goal.name }));
  const currentWeekStart = getStartOfWeek(new Date());

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
      return b.weekStartDate.getTime() - a.weekStartDate.getTime();
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