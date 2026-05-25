import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { validate } from '@/lib/validate';
import { saveMealSelectionSchema } from '@/schemas';
import { saveMealSelection } from '@/controllers/mealSelectionController';
import prisma from '@/lib/prisma';


type DynamicRouteParams = {
  weeklyBoxId: string;
};

interface RouteContext {
  params: Promise<DynamicRouteParams>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { weeklyBoxId } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const box = await prisma.weeklyBox.findUnique({
      where: { id: weeklyBoxId },
    });

    if (!box) {
      return NextResponse.json({ error: 'Weekly box tidak ditemukan.' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (box.userId !== session.userId && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const selections = await prisma.mealSelection.findMany({
      where: { weeklyBoxId },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            description: true,
            calories: true,
            protein: true,
            servings: true,
            imageUrl: true,
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    name: true,
                    origin: true,
                    supplierName: true,
                    isAllergen: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({
      weeklyBoxId,
      weekStartDate: box.weekStartDate,
      status: box.status,
      selectionDeadline: box.selectionDeadline,
      isAutoSelected: box.isAutoSelected,
      data: selections,
    });
  } catch (error) {
    console.error('[MEAL SELECTION GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil pilihan menu.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { weeklyBoxId } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(saveMealSelectionSchema, body);
    if (!parsed.success) return parsed.response;

    if (parsed.data.weeklyBoxId !== weeklyBoxId) {
      return NextResponse.json({ error: 'weeklyBoxId tidak cocok.' }, { status: 400 });
    }

    const result = await saveMealSelection(session.userId, parsed.data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[MEAL SELECTION POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan pilihan menu.' }, { status: 500 });
  }
}