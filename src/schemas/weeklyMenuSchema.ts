import { z } from 'zod';

export const createWeeklyMenuSchema = z.object({
  recipeId: z.string().min(1, 'recipeId wajib diisi.'),
  weekStartDate: z.string().min(1, 'weekStartDate wajib diisi.'),
});

export const updateWeeklyMenuSchema = z.object({
  recipeId: z.string().min(1).optional(),
  weekStartDate: z.string().min(1).optional(),
}).refine(
  (data) => data.recipeId !== undefined || data.weekStartDate !== undefined,
  { message: 'Minimal satu field harus diisi.' }
);

export const saveMealSelectionsSchema = z.object({
  mealSelections: z.array(z.object({
    day: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']),
    recipeId: z.string().min(1, 'recipeId wajib diisi.'),
  })).min(1, 'Minimal satu meal selection harus diisi.'),
  weekStartDate: z.string().min(1, 'weekStartDate wajib diisi.'),
});

export type CreateWeeklyMenuInput = z.infer<typeof createWeeklyMenuSchema>;
export type UpdateWeeklyMenuInput = z.infer<typeof updateWeeklyMenuSchema>;
export type SaveMealSelectionsInput = z.infer<typeof saveMealSelectionsSchema>;