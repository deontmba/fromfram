import { NextResponse } from 'next/server';
import { getNutritionistKPIs } from '@/controllers/nutritionistController';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Find a nutritionist to act as
    const nutritionist = await prisma.user.findFirst({ where: { role: 'NUTRITIONIST' } });
    if (!nutritionist) return NextResponse.json({ error: 'No nutritionist found' }, { status: 404 });

    const result = await getNutritionistKPIs(nutritionist.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
