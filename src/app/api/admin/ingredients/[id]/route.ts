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

// PATCH /api/admin/ingredients/[id] - Edit bahan baku
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, origin, supplierName, isAllergen, stockKg, pricePerKg } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Nama bahan baku tidak boleh kosong.' }, { status: 400 });
      }
      data.name = trimmed;
    }
    if (origin !== undefined) {
      data.origin = String(origin).trim() || '-';
    }
    if (supplierName !== undefined) {
      data.supplierName = String(supplierName).trim() || '-';
    }
    if (isAllergen !== undefined) {
      data.isAllergen = Boolean(isAllergen);
    }
    if (stockKg !== undefined) {
      data.stockKg = Math.max(0, Number(stockKg) || 0);
    }
    if (pricePerKg !== undefined) {
      data.pricePerKg = Math.max(0, Number(pricePerKg) || 0);
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: ingredient });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Nama bahan baku sudah digunakan.' }, { status: 409 });
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Bahan baku tidak ditemukan.' }, { status: 404 });
    }
    console.error('[ADMIN INGREDIENT PATCH ERROR]', error);
    return NextResponse.json({ error: 'Gagal memperbarui bahan baku.' }, { status: 500 });
  }
}

// DELETE /api/admin/ingredients/[id] - Hapus bahan baku
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { id } = await params;

  try {
    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: id } });
    if (recipeCount > 0) {
      return NextResponse.json(
        { error: `Bahan baku tidak dapat dihapus karena masih digunakan dalam ${recipeCount} resep menu.` },
        { status: 409 }
      );
    }

    const supplyCount = await prisma.farmerSupplyItem.count({ where: { ingredientId: id } });
    if (supplyCount > 0) {
      return NextResponse.json(
        { error: `Bahan baku tidak dapat dihapus karena masih terhubung dengan ${supplyCount} pasokan petani.` },
        { status: 409 }
      );
    }

    const poCount = await prisma.farmerPurchaseOrder.count({ where: { ingredientId: id } });
    if (poCount > 0) {
      return NextResponse.json(
        { error: `Bahan baku tidak dapat dihapus karena masih memiliki ${poCount} Purchase Order petani.` },
        { status: 409 }
      );
    }

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Bahan baku tidak ditemukan.' }, { status: 404 });
    }
    if (error?.code === 'P2003') {
      return NextResponse.json({ error: 'Bahan baku masih terikat dengan data relasi lain, tidak bisa dihapus.' }, { status: 409 });
    }
    console.error('[ADMIN INGREDIENT DELETE ERROR]', error);
    return NextResponse.json({ error: 'Gagal menghapus bahan baku.' }, { status: 500 });
  }
}
