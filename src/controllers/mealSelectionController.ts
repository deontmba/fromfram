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
            date: sel.date ? sel.date : null
        }))
        });
    });

    return { data: { message: 'Menu berhasil disimpan', count: result.count }, status: 201 };
  } catch (error) {
    console.error('[MealSelection Error]', error);
    return { error: 'Gagal menyimpan menu', status: 500 };
  }
}