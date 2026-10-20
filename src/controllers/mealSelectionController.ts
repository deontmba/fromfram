import prisma from '@/lib/prisma';
import { SaveMealSelectionInput } from '@/schemas/mealSelection';

export async function saveMealSelection(userId: string, input: SaveMealSelectionInput) {
  try {
    const box = await prisma.weeklyBox.findUnique({ where: { id: input.weeklyBoxId } });
    if (!box || box.userId !== userId) {
      return { error: 'Unauthorized access to Weekly Box', status: 403 };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Hapus pilihan sebelumnya untuk box ini
      await tx.mealSelection.deleteMany({ where: { weeklyBoxId: input.weeklyBoxId } });

      return await tx.mealSelection.createMany({
        data: input.selections.map(sel => ({
          weeklyBoxId: input.weeklyBoxId,
          recipeId: sel.recipeId,
          dayOfWeek: sel.dayOfWeek,
          mealType: sel.mealType ?? 'LUNCH',
          date: sel.date ? sel.date : null
        }))
      });
    });

    // Otomatis catat bahan baku dari menu yang dibeli user ke IngredientLedger
    try {
      const selectedRecipes = await prisma.recipe.findMany({
        where: { id: { in: input.selections.map(s => s.recipeId) } },
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      });

      for (const sel of input.selections) {
        const recipe = selectedRecipes.find(r => r.id === sel.recipeId);
        if (!recipe) continue;

        for (const ri of recipe.ingredients) {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const code = `#BB-2026-${String(randomSuffix).padStart(4, '0')}`;
          const refCode = `TIK/OUT/${randomSuffix}`;
          const qtyUsed = ri.quantityInKg || (ri.quantity ? ri.quantity / 1000 : 0.15);

          await prisma.ingredientLedger.create({
            data: {
              ingredientId: ri.ingredientId,
              sourceType: 'USER_PURCHASE',
              status: 'PREPARING',
              code,
              referenceCode: refCode,
              userId,
              weeklyBoxId: input.weeklyBoxId,
              qtyUsedKg: qtyUsed,
              menuName: recipe.name,
              notes: `Alokasi porsi menu konsumen (${sel.dayOfWeek} ${sel.mealType ?? 'LUNCH'})`,
            }
          }).catch(err => console.warn('[INGREDIENT LEDGER USER PURCHASE WARNING]', err));
        }
      }
    } catch (ledgerErr) {
      console.warn('[MEAL SELECTION LEDGER LOGGING WARNING]', ledgerErr);
    }

    return { data: { message: 'Menu berhasil disimpan', count: result.count }, status: 201 };
  } catch (error) {
    console.error('[MealSelection Error]', error);
    return { error: 'Gagal menyimpan menu', status: 500 };
  }
}
