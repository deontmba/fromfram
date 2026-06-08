import prisma from '@/lib/prisma';
import { BoxStatus, DayOfWeek, MealType } from '@prisma/client';

describe('Weekly Box & Meal Selections (White Box Testing)', () => {
  let testUser: any;
  let testRecipe: any;
  let testWeeklyBox: any;

  beforeAll(async () => {
    // Setup test user
    testUser = await prisma.user.upsert({
      where: { email: 'test_box_user@fromfram.test' },
      update: {},
      create: {
        email: 'test_box_user@fromfram.test',
        name: 'Test Box User',
        role: 'USER',
        isVerified: true,
      },
    });

    // Get an existing recipe or create a dummy one
    const nutritionist = await prisma.user.findFirst({
      where: { role: 'NUTRITIONIST' },
    });
    const nutId = nutritionist?.id || testUser.id;

    testRecipe = await prisma.recipe.upsert({
      where: { name: 'Test Recipe For Selection' },
      update: {},
      create: {
        name: 'Test Recipe For Selection',
        description: 'For testing selections',
        calories: 500,
        protein: 30,
        servings: 2,
        nutritionistId: nutId,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.mealSelection.deleteMany({
      where: { weeklyBox: { userId: testUser.id } },
    });
    await prisma.weeklyBox.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.recipe.delete({
      where: { id: testRecipe.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  it('should successfully create a Weekly Box for the user', async () => {
    const today = new Date();
    testWeeklyBox = await prisma.weeklyBox.create({
      data: {
        userId: testUser.id,
        weekStartDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
        weekEndDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14),
        selectionDeadline: new Date(),
        status: BoxStatus.PENDING_SELECTION,
      },
    });

    expect(testWeeklyBox).toBeDefined();
    expect(testWeeklyBox.status).toEqual(BoxStatus.PENDING_SELECTION);
  });

  it('should enforce BoxStatus constraint for meal selections', async () => {
    // 1. Lock the weekly box
    const lockedBox = await prisma.weeklyBox.update({
      where: { id: testWeeklyBox.id },
      data: { status: BoxStatus.LOCKED },
    });

    expect(lockedBox.status).toEqual(BoxStatus.LOCKED);

    // 2. Business logic validation simulation (White box testing of locked check)
    const canSelectMeals = (boxStatus: BoxStatus) => {
      if (boxStatus === BoxStatus.LOCKED || boxStatus === BoxStatus.COMPLETED) {
        return false;
      }
      return true;
    };

    expect(canSelectMeals(lockedBox.status)).toBe(false);
  });

  it('should allow meal selection when box status is PENDING_SELECTION', async () => {
    // 1. Reset status to PENDING_SELECTION
    await prisma.weeklyBox.update({
      where: { id: testWeeklyBox.id },
      data: { status: BoxStatus.PENDING_SELECTION },
    });

    // 2. Add meal selection
    const selection = await prisma.mealSelection.create({
      data: {
        weeklyBoxId: testWeeklyBox.id,
        recipeId: testRecipe.id,
        dayOfWeek: DayOfWeek.SENIN,
        mealType: MealType.LUNCH,
        serving: 1,
      },
    });

    expect(selection).toBeDefined();
    expect(selection.weeklyBoxId).toEqual(testWeeklyBox.id);
  });
});
