import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getNutritionistWeeklyMenus, createNutritionistWeeklyMenu, deleteNutritionistWeeklyMenuByWeek } from '@/controllers/nutritionistController';
import { validate } from '@/lib/validate';
import { createWeeklyMenuSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getNutritionistWeeklyMenus(session.userId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch weekly menus.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(createWeeklyMenuSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await createNutritionistWeeklyMenu(session.userId, parsed.data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create weekly menu.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const { searchParams } = new URL(req.url);
    const weekStartDate = searchParams.get('weekStartDate');
    if (!weekStartDate) {
      return NextResponse.json({ error: 'weekStartDate parameter is required.' }, { status: 400 });
    }

    const result = await deleteNutritionistWeeklyMenuByWeek(session.userId, weekStartDate);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENUS DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete weekly menus.' }, { status: 500 });
  }
}