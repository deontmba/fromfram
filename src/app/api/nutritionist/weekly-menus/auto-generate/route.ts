import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { autoGenerateNutritionistWeeklyMenu } from '@/controllers/nutritionistController';


export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await autoGenerateNutritionistWeeklyMenu(session.userId);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[API Auto-Generate Weekly Menu]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
