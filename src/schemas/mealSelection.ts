import { z } from 'zod';

export const saveMealSelectionSchema = z.object({
  weeklyBoxId: z.string().cuid(),
  selections: z.array(
    z.object({
      recipeId: z.string().cuid(),
      dayOfWeek: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']),
      date: z.string().datetime().optional()
    })
  ).min(1, 'Minimal pilih 1 menu')
});

export type SaveMealSelectionInput = z.infer<typeof saveMealSelectionSchema>;