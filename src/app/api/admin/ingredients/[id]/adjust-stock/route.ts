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

// PATCH /api/admin/ingredients/[id]/adjust-stock
// Body: { deltaKg: number }  — bisa positif (tambah) atau negatif (kurang)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const deltaKg = Number(body.deltaKg);

    if (isNaN(deltaKg) || deltaKg === 0) {
      return NextResponse.json({ error: 'deltaKg harus berupa angka bukan nol.' }, { status: 400 });
    }

    const existing = await prisma.ingredient.findUnique({ where: { id }, select: { stockKg: true } });
    if (!existing) return NextResponse.json({ error: 'Bahan baku tidak ditemukan.' }, { status: 404 });

    const newStock = existing.stockKg + deltaKg;
    if (newStock < 0) {
      return NextResponse.json({ error: `Stok tidak cukup. Stok saat ini: ${existing.stockKg.toFixed(2)} kg.` }, { status: 400 });
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: { stockKg: newStock },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[ADMIN INGREDIENT ADJUST STOCK ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengubah stok.' }, { status: 500 });
  }
}
