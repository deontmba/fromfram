import { z } from 'zod';
import { NextResponse } from 'next/server';

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message).join(', ');
    return {
      success: false,
      response: NextResponse.json({ error: errors }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}