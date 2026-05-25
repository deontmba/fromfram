import prisma from '@/lib/prisma';

/**
 * Verifies that the user with the given ID has the expected role.
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

  if (!user || user.role !== role) {
    return { error: `Forbidden. ${role === 'ADMIN' ? 'Admin' : 'Nutritionist'} access required.`, status: 403 };
  }

  return null;
}
