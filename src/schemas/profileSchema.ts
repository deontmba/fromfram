import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').optional(),
  avatarUrl: z.string().optional(),
  phoneNumber: z.string()
    .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +')
    .min(9, 'Nomor telepon minimal 9 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .optional(),
  gender: z.string().min(1, 'Gender wajib diisi').optional(),
  age: z.number().int().positive('Usia tidak boleh 0 atau negatif').optional(),
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