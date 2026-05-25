import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getNutritionistRecipes, createNutritionistRecipe } from '@/controllers/nutritionistController';
import { validate } from '@/lib/validate';
import { createRecipeSchema } from '@/schemas';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getNutritionistRecipes(session.userId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPES GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch recipes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(createRecipeSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await createNutritionistRecipe(session.userId, parsed.data);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST RECIPES POST ERROR]', error);
    return NextResponse.json({ error: 'Failed to create recipe.' }, { status: 500 });
  }
}