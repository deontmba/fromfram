import prisma from '@/lib/prisma';
import { SaveMealSelectionInput } from '@/schemas';

export async function saveMealSelections(userId: string, input: SaveMealSelectionInput) {
  const { weeklyBoxId, selections } = input;

  if (!weeklyBoxId || !Array.isArray(selections) || selections.length === 0) {
    return { error: 'weeklyBoxId dan selections wajib diisi.', status: 400 };
  }

  const box = await prisma.weeklyBox.findUnique({
    where: { id: weeklyBoxId },
  });

  if (!box) {
    return { error: 'Weekly box tidak ditemukan.', status: 404 };
  }

  if (box.userId !== userId) {
    return { error: 'Forbidden.', status: 403 };
  }

  if (box.status !== 'PENDING_SELECTION') {
    return {
      error: `Tidak bisa mengubah pilihan menu untuk box dengan status "${box.status}".`,
      status: 400,
    };
  }

  const now = new Date();
  if (now > box.selectionDeadline) {
    return { error: 'Batas waktu pemilihan menu sudah lewat.', status: 400 };
  }

  // Validate semua recipe tersedia di menu minggu ini
  const weeklyMenuRecipes = await prisma.weeklyMenu.findMany({
    where: { weekStartDate: box.weekStartDate },
    select: { recipeId: true },
  });
  const availableRecipeIds = new Set(weeklyMenuRecipes.map((wm) => wm.recipeId));

  for (const sel of selections) {
    if (!availableRecipeIds.has(sel.recipeId)) {
      return {
        error: `Resep ${sel.recipeId} tidak tersedia di menu minggu ini.`,
        status: 400,
      };
    }
  }

  // Upsert — one recipe per day per box
  const upserts = selections.map((sel) =>
    prisma.mealSelection.upsert({
      where: {
        weeklyBoxId_dayOfWeek: {
          weeklyBoxId,
          dayOfWeek: sel.dayOfWeek,
        },
      },
      update: { recipeId: sel.recipeId },
      create: {
        weeklyBoxId,
        recipeId: sel.recipeId,
        dayOfWeek: sel.dayOfWeek,
      },
    })
  );

  const results = await prisma.$transaction(upserts);

  return {
    data: { message: 'Pilihan menu berhasil disimpan.', count: results.length, data: results },
    status: 201,
  };
}