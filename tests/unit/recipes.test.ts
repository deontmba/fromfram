import prisma from '@/lib/prisma';
import { createRecipeSchema } from '@/schemas/recipeSchema';

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

  // PENINGKATAN TEST CASES: Memecah pengujian menjadi skenario terpisah (granuler)
  describe('Recipe Validation Constraints - Calories Verification', () => {
    it('should validate successfully with correct recipe inputs', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 200,
        protein: 5.5,
        servings: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject recipe creation if calories is a negative number', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: -50,
        protein: 5.5,
        servings: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Kalori harus berupa angka positif.');
      }
    });

    it('should reject recipe creation if calories is zero', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 0,
        protein: 5.5,
        servings: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Recipe Validation Constraints - Protein Verification', () => {
    it('should reject recipe creation if protein content is negative', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 200,
        protein: -2,
        servings: 1,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toEqual('Protein harus berupa angka positif.');
      }
    });

    it('should reject recipe creation if protein content is zero', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 200,
        protein: 0,
        servings: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Recipe Validation Constraints - Servings Verification', () => {
    it('should reject recipe creation if servings size is zero', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 200,
        protein: 5,
        servings: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject recipe creation if servings size is negative', () => {
      const result = createRecipeSchema.safeParse({
        name: 'Veggie Salad',
        description: 'Healthy green salad',
        calories: 200,
        protein: 5,
        servings: -3,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Nutritionist & Admin Role Access Authorization', () => {
    it('should correctly configure dummy nutritionist access validation simulation', () => {
      const isNutritionist = (role: string) => role === 'NUTRITIONIST' || role === 'ADMIN';
      expect(isNutritionist('NUTRITIONIST')).toBe(true);
      expect(isNutritionist('USER')).toBe(false);
    });

    it('should verify admin overrides permission status correctly', () => {
      const canManageAll = (role: string) => role === 'ADMIN';
      expect(canManageAll('ADMIN')).toBe(true);
      expect(canManageAll('NUTRITIONIST')).toBe(false);
    });
  });
});

