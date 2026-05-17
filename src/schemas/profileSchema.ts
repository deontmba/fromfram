import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  weight: z.number().positive('Berat badan harus angka positif.').optional(),
  height: z.number().positive('Tinggi badan harus angka positif.').optional(),
  dailyCalorieNeed: z.number().int().positive().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
});

export const updateHealthSchema = z.object({
  weight: z.number().positive('Berat badan harus berupa angka positif.'),
  height: z.number().positive('Tinggi badan harus berupa angka positif.'),
  dailyCalorieNeed: z.number().int().positive().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateHealthInput = z.infer<typeof updateHealthSchema>;