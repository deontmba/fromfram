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

// POST new ingredient (for admin)
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, origin, supplierName, isAllergen, stockKg, pricePerKg } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama bahan baku wajib diisi.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await prisma.ingredient.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Nama bahan baku sudah terdaftar di sistem.' }, { status: 409 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name: trimmedName,
        origin: origin && typeof origin === 'string' && origin.trim() ? origin.trim() : '-',
        supplierName: supplierName && typeof supplierName === 'string' && supplierName.trim() ? supplierName.trim() : '-',
        isAllergen: Boolean(isAllergen),
        stockKg: Math.max(0, Number(stockKg) || 0),
        pricePerKg: Math.max(0, Number(pricePerKg) || 0),
      },
    });

    return NextResponse.json({ data: ingredient }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Nama bahan baku sudah terdaftar di sistem.' }, { status: 409 });
    }
    console.error('[ADMIN INGREDIENTS POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menambahkan bahan baku.' }, { status: 500 });
  }
}
