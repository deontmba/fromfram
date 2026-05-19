import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

async function verifyAdmin(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return { error: session.error };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== 'ADMIN') return { error: 'FORBIDDEN' as const };
  return { userId: session.userId };
}

// GET all ingredients with stock info (for admin)
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  try {
    const ingredients = await prisma.ingredient.findMany({
      select: { id: true, name: true, origin: true, supplierName: true, isAllergen: true, stockKg: true, pricePerKg: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: ingredients });
  } catch (error) {
    console.error('[ADMIN INGREDIENTS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch ingredients.' }, { status: 500 });
  }
}
