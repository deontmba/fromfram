import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { getNutritionistRecipeById, updateNutritionistRecipe, deleteNutritionistRecipe } from '@/controllers/nutritionistController';
import { validate } from '@/lib/validate';
import { updateRecipeSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getNutritionistRecipeById(session.userId, params.id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPE GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch recipe.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(updateRecipeSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await updateNutritionistRecipe(session.userId, params.id, parsed.data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPE PATCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to update recipe.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await deleteNutritionistRecipe(session.userId, params.id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPE DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete recipe.' }, { status: 500 });
  }
}