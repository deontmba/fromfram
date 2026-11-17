import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { getSessionUserId } from '@/lib/session';

/**
 * Verifies that the user with the given ID has the expected role.
 * ADMIN also passes NUTRITIONIST checks (same rule as src/proxy.ts).
 * Returns an error object if verification fails, or null if it passes.
 */
export async function verifyRole(
  userId: string,
  role: 'ADMIN' | 'NUTRITIONIST'
): Promise<{ error: string; status: number } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const allowed = user && (user.role === role || (role === 'NUTRITIONIST' && user.role === 'ADMIN'));
  if (!allowed) {
    return { error: `Forbidden. ${role === 'ADMIN' ? 'Admin' : 'Nutritionist'} access required.`, status: 403 };
  }

  return null;
}

/** Session + role check for route handlers. */
export async function verifyRequestRole(req: NextRequest, role: 'ADMIN' | 'NUTRITIONIST') {
  const session = await getSessionUserId(req);
  if ('error' in session) return { error: session.error };
  if (await verifyRole(session.userId, role)) return { error: 'FORBIDDEN' as const };
  return { userId: session.userId };
}

export const verifyAdminRequest = (req: NextRequest) => verifyRequestRole(req, 'ADMIN');
