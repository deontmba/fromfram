import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getNutritionistWeeklyMenuById, updateNutritionistWeeklyMenu, deleteNutritionistWeeklyMenu } from '@/controllers/nutritionistController';
import { validate } from '@/lib/validate';
import { updateWeeklyMenuSchema } from '@/schemas';


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const { id } = await params;
    const result = await getNutritionistWeeklyMenuById(session.userId, id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENU GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch weekly menu.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(updateWeeklyMenuSchema, body);
    if (!parsed.success) return parsed.response;

    const { id } = await params;
    const result = await updateNutritionistWeeklyMenu(session.userId, id, parsed.data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENU PATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to update weekly menu.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const { id } = await params;
    const result = await deleteNutritionistWeeklyMenu(session.userId, id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST WEEKLY MENU DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete weekly menu.' }, { status: 500 });
  }
}