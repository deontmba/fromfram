import { z } from 'zod';

export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient wajib dipilih.'),
  quantity: z.number().positive('Kuantitas harus positif.'),
  unit: z.string().min(1, 'Satuan wajib diisi.'),
  quantityInKg: z.number().positive('Kuantitas dalam Kg harus positif.'),
});

export const createRecipeSchema = z.object({
  name: z.string().min(1, 'Nama resep wajib diisi.'),
  description: z.string().min(1, 'Deskripsi wajib diisi.'),
  calories: z.number().int().positive('Kalori harus berupa angka positif.'),
  protein: z.number().positive('Protein harus berupa angka positif.'),
  carbs: z.number().min(0, 'Karbohidrat harus berupa angka non-negatif.').optional().default(0),
  fat: z.number().min(0, 'Lemak harus berupa angka non-negatif.').optional().default(0),
  fiber: z.number().min(0, 'Serat harus berupa angka non-negatif.').optional().default(0),
  sodium: z.number().min(0, 'Natrium harus berupa angka non-negatif.').optional().default(0),
  sugar: z.number().min(0, 'Gula harus berupa angka non-negatif.').optional().default(0),
  micronutrients: z.record(z.string(), z.string()).optional().nullable(),
  servings: z.number().int().positive('Servings harus berupa angka positif.'),
  imageUrl: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).optional(),
});

export const updateRecipeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  calories: z.number().int().positive().optional(),
  protein: z.number().positive().optional(),
  carbs: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  micronutrients: z.record(z.string(), z.string()).optional().nullable(),
  servings: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).optional(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;