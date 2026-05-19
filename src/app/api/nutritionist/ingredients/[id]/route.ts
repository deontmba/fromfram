import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

async function verifyNutritionist(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return { error: session.error };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (!user || user.role !== 'NUTRITIONIST') return { error: 'UNAUTHENTICATED' as const };
  return { userId: session.userId };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyNutritionist(req);
  if ('error' in auth) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, origin, supplierName, isAllergen, stockKg, pricePerKg } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (origin !== undefined) data.origin = String(origin).trim() || '-';
    if (supplierName !== undefined) data.supplierName = String(supplierName).trim() || '-';
    if (isAllergen !== undefined) data.isAllergen = Boolean(isAllergen);
    if (stockKg !== undefined) data.stockKg = Math.max(0, Number(stockKg) || 0);
    if (pricePerKg !== undefined) data.pricePerKg = Math.max(0, Number(pricePerKg) || 0);

    const ingredient = await prisma.ingredient.update({ where: { id }, data });
    return NextResponse.json({ data: ingredient });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Nama bahan baku sudah ada.' }, { status: 409 });
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Ingredient tidak ditemukan.' }, { status: 404 });
    console.error('[NUTRITIONIST INGREDIENT PATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to update ingredient.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyNutritionist(req);
  if ('error' in auth) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'Ingredient tidak ditemukan.' }, { status: 404 });
    if (error?.code === 'P2003') return NextResponse.json({ error: 'Bahan baku masih digunakan di resep atau data lain, tidak bisa dihapus.' }, { status: 409 });
    console.error('[NUTRITIONIST INGREDIENT DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete ingredient.' }, { status: 500 });
  }
}
