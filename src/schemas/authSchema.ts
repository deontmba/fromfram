import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.'),
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(8, 'Password minimal 8 karakter.'),
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token wajib diisi.'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;