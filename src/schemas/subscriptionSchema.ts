import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  goalId: z.string().min(1, 'goalId wajib diisi.'),
  planType: z.enum(['MINGGUAN', 'BULANAN', 'TAHUNAN'], {
    message: 'planType tidak valid.',
  }),
  servings: z.number().int().min(1).max(6, 'Servings maksimal 6.'),
  userId: z.string().optional(),
});

export const updateSubscriptionSchema = z.object({
  goalId: z.string().min(1, 'goalId wajib diisi.'),
  planType: z.enum(['MINGGUAN', 'BULANAN', 'TAHUNAN'], {
    message: 'planType tidak valid.', 
  }),
  servings: z.number().int().min(1).max(6, 'Servings maksimal 6.'),
});

export const pauseSubscriptionSchema = z.object({
  resumeDate: z.string().min(1, 'resumeDate wajib diisi.'),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type PauseSubscriptionInput = z.infer<typeof pauseSubscriptionSchema>;