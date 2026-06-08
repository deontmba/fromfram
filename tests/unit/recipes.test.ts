import prisma from '@/lib/prisma';

describe('Nutritionist Recipe & Weekly Menu Logic (White Box Testing)', () => {
  let testNutritionist: any;
  let testRecipe: any;
  let testWeeklyMenu: any;

  beforeAll(async () => {
    // Setup test nutritionist
    testNutritionist = await prisma.user.upsert({
      where: { email: 'test_nutritionist@fromfram.test' },
      update: {},
      create: {
        email: 'test_nutritionist@fromfram.test',
        name: 'Test Nutritionist',
        role: 'NUTRITIONIST',
        isVerified: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testWeeklyMenu) {
      await prisma.weeklyMenu.delete({
        where: { id: testWeeklyMenu.id },
      });
    }
    if (testRecipe) {
      await prisma.recipe.delete({
        where: { id: testRecipe.id },
      });
    }
    await prisma.user.delete({
      where: { id: testNutritionist.id },
    });
  });

  it('should successfully create a new healthy recipe', async () => {
    testRecipe = await prisma.recipe.create({
      data: {
        name: 'Super Veggie Wrap',
        description: 'High fiber veggie wrap with avocado dressing.',
        calories: 380,
        protein: 12,
        servings: 1,
        nutritionistId: testNutritionist.id,
        goalTags: ['Penurunan Berat Badan'],
        dietaryTags: ['Vegetarian'],
      },
    });

    expect(testRecipe).toBeDefined();
    expect(testRecipe.name).toEqual('Super Veggie Wrap');
    expect(testRecipe.nutritionistId).toEqual(testNutritionist.id);
  });

  it('should publish a recipe to the Weekly Menu', async () => {
    const today = new Date();
    // Monday next week
    const weekStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (8 - today.getDay()));

    testWeeklyMenu = await prisma.weeklyMenu.create({
      data: {
        recipeId: testRecipe.id,
        weekStartDate,
      },
    });

    expect(testWeeklyMenu).toBeDefined();
    expect(testWeeklyMenu.recipeId).toEqual(testRecipe.id);
    expect(testWeeklyMenu.weekStartDate).toEqual(weekStartDate);
  });
});
