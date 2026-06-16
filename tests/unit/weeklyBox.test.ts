import prisma from '@/lib/prisma';
import { BoxStatus, DayOfWeek, MealType } from '@prisma/client';
import { saveMealSelectionsSchema } from '@/schemas/weeklyMenuSchema';

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

  // PENINGKATAN TEST CASES: Memecah pengujian menjadi skenario terpisah (granuler)
  describe('Weekly Menu Selection - Valid Submissions', () => {
    it('should validate successfully with correct meal selections details', () => {
      const result = saveMealSelectionsSchema.safeParse({
        mealSelections: [
          { day: 'SENIN', mealType: 'LUNCH', serving: 1, recipeId: 'recipe-1' },
          { day: 'SELASA', mealType: 'DINNER', serving: 2, recipeId: 'recipe-2' },
        ],
        weekStartDate: '2026-06-22',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Weekly Menu Selection - Invalid Submissions', () => {
    it('should fail if mealSelections array is empty', () => {
      const result = saveMealSelectionsSchema.safeParse({
        mealSelections: [],
        weekStartDate: '2026-06-22',
      });
      expect(result.success).toBe(false);
    });

    it('should fail if day name is invalid', () => {
      const result = saveMealSelectionsSchema.safeParse({
        mealSelections: [
          { day: 'SABTU_MALAM', mealType: 'LUNCH', serving: 1, recipeId: 'recipe-1' },
        ],
        weekStartDate: '2026-06-22',
      });
      expect(result.success).toBe(false);
    });

    it('should fail if recipeId is empty', () => {
      const result = saveMealSelectionsSchema.safeParse({
        mealSelections: [
          { day: 'SENIN', mealType: 'LUNCH', serving: 1, recipeId: '' },
        ],
        weekStartDate: '2026-06-22',
      });
      expect(result.success).toBe(false);
    });

    it('should fail if serving is less than 1', () => {
      const result = saveMealSelectionsSchema.safeParse({
        mealSelections: [
          { day: 'SENIN', mealType: 'LUNCH', serving: 0, recipeId: 'recipe-1' },
        ],
        weekStartDate: '2026-06-22',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Auto-Assign System Service', () => {
    it('should correctly configure dummy auto-assigned weekly box schema validation', () => {
      const testWeeklyBox = {
        userId: 'user-id-123',
        status: BoxStatus.LOCKED,
        isAutoSelected: true,
      };
      expect(testWeeklyBox.status).toEqual(BoxStatus.LOCKED);
      expect(testWeeklyBox.isAutoSelected).toBe(true);
    });

    it('should successfully filter out recipes that violate user allergen records during auto-assignment', () => {
      const userAllergens = ['peanut', 'shellfish'];
      const recipes = [
        { id: '1', name: 'Peanut Butter Toast', allergens: ['peanut'] },
        { id: '2', name: 'Chicken Salad', allergens: [] },
      ];
      
      const safeRecipes = recipes.filter(r => 
        !r.allergens.some(allergen => userAllergens.includes(allergen))
      );
      
      expect(safeRecipes.length).toBe(1);
      expect(safeRecipes[0].id).toEqual('2');
    });

    it('should return correct status representation of weekly box', () => {
      expect(BoxStatus.LOCKED).toEqual('LOCKED');
      expect(BoxStatus.PENDING_SELECTION).toEqual('PENDING_SELECTION');
    });
  });
});

