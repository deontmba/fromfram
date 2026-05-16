import { z } from 'zod';

export const createTransactionSchema = z.object({
  planType: z.enum(['MINGGUAN', 'BULANAN', 'TAHUNAN']),
  servings: z.number().int().min(1).max(6),
  goalId: z.string().cuid().optional()
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;