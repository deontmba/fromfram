import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRequestRole } from '@/lib/auth';

const verifyNutritionist = (req: NextRequest) => verifyRequestRole(req, 'NUTRITIONIST');

export async function GET(req: NextRequest) {
  const auth = await verifyNutritionist(req);
  if ('error' in auth) return auth.error === 'FORBIDDEN'
    ? NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    : NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const ingredients = await prisma.ingredient.findMany({
      select: { id: true, name: true, origin: true, supplierName: true, isAllergen: true, stockKg: true, pricePerKg: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: ingredients });
  } catch (error) {
    console.error('[NUTRITIONIST INGREDIENTS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch ingredients.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyNutritionist(req);
  if ('error' in auth) return auth.error === 'FORBIDDEN'
    ? NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    : NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const body = await req.json();
    const { name, origin, supplierName, isAllergen, stockKg, pricePerKg } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 400 });

    const ingredient = await prisma.ingredient.create({
      data: {
        name: name.trim(),
        origin: origin?.trim() || '-',
        supplierName: supplierName?.trim() || '-',
        isAllergen: Boolean(isAllergen),
        stockKg: Number(stockKg) || 0,
        pricePerKg: Number(pricePerKg) || 0,
      },
    });
    return NextResponse.json({ data: ingredient }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Nama bahan baku sudah ada.' }, { status: 409 });
    console.error('[NUTRITIONIST INGREDIENTS POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create ingredient.' }, { status: 500 });
  }
}
