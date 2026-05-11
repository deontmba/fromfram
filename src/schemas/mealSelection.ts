import { z } from 'zod';

export const saveMealSelectionSchema = z.object({
  weeklyBoxId: z.string().cuid('Weekly Box ID tidak valid'),
  selections: z.array(
    z.object({
      recipeId: z.string().cuid('Recipe ID tidak valid'),
      dayOfWeek: z.string().toUpperCase().pipe(
        z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'])
      ),
      date: z.coerce.date().optional() 
    })
  ).min(1, 'Minimal pilih 1 menu')
});

export type SaveMealSelectionInput = z.infer<typeof saveMealSelectionSchema>;