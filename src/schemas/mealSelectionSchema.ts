import { z } from 'zod';

export const saveMealSelectionSchema = z.object({
  weeklyBoxId: z.string().min(1, 'weeklyBoxId wajib diisi.'),
  selections: z.array(z.object({
    dayOfWeek: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']),
    recipeId: z.string().min(1, 'recipeId wajib diisi.'),
  })).min(1, 'Minimal satu selection harus diisi.'),
});

export type SaveMealSelectionInput = z.infer<typeof saveMealSelectionSchema>;