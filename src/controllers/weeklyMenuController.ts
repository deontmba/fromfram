import prisma from '@/lib/prisma';

export async function setWeeklyMenu(
  userId: string,
  input: { weekStartDate: string; recipeIds: string[] }
) {
  const { weekStartDate, recipeIds } = input;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'NUTRITIONIST') {
    return { error: 'Forbidden. Only nutritionists can set weekly menus.', status: 403 };
  }

  if (!weekStartDate || !Array.isArray(recipeIds) || recipeIds.length < 7) {
    return { error: 'weekStartDate and at least 7 recipeIds are required.', status: 400 };
  }

  const weekStart = new Date(weekStartDate);
  if (isNaN(weekStart.getTime())) {
    return { error: 'Invalid weekStartDate format. Use YYYY-MM-DD.', status: 400 };
  }

  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true },
  });

  if (recipes.length !== recipeIds.length) {
    return { error: 'One or more recipeIds are invalid.', status: 400 };
  }

  const upserts = recipeIds.map((recipeId) =>
    prisma.weeklyMenu.upsert({
      where: { recipeId_weekStartDate: { recipeId, weekStartDate: weekStart } },
      update: {},
      create: { recipeId, weekStartDate: weekStart },
    })
  );

  const results = await prisma.$transaction(upserts);

  return {
    data: {
      message: 'Weekly menu set successfully.',
      weekStartDate: weekStart,
      count: results.length,
    },
    status: 201,
  };
}

export async function getWeeklyMenuByWeekStart(weekStartParam: string) {
  const weekStart = new Date(weekStartParam);
  if (isNaN(weekStart.getTime())) {
    return { error: 'Invalid weekStart format. Use YYYY-MM-DD.', status: 400 };
  }

  const weeklyMenus = await prisma.weeklyMenu.findMany({
    where: { weekStartDate: weekStart },
    include: {
      recipe: {
        include: {
          nutritionist: {
            select: { id: true, name: true },
          },
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  origin: true,
                  supplierName: true,
                  isAllergen: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (weeklyMenus.length === 0) {
    return { data: { message: 'No menu available for this week.', data: [] }, status: 200 };
  }

  const data = weeklyMenus.map((wm) => ({
    weeklyMenuId: wm.id,
    weekStartDate: wm.weekStartDate,
    recipe: {
      id: wm.recipe.id,
      name: wm.recipe.name,
      description: wm.recipe.description,
      calories: wm.recipe.calories,
      protein: wm.recipe.protein,
      servings: wm.recipe.servings,
      imageUrl: wm.recipe.imageUrl,
      nutritionist: wm.recipe.nutritionist,
      ingredients: wm.recipe.ingredients.map((ri) => ({
        quantity: ri.quantity,
        ingredient: ri.ingredient,
      })),
    },
  }));

  return { data: { weekStartDate: weekStart, data }, status: 200 };
}