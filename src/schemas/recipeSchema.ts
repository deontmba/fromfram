import { z } from 'zod';

export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Nama resep wajib diisi.'),
  description: z.string().min(1, 'Deskripsi wajib diisi.'),
  calories: z.number().int().positive('Kalori harus berupa angka positif.'),
  protein: z.number().positive('Protein harus berupa angka positif.'),
  servings: z.number().int().positive('Servings harus berupa angka positif.'),
  imageUrl: z.string().optional(),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  calories: z.number().int().positive().optional(),
  protein: z.number().positive().optional(),
  servings: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;