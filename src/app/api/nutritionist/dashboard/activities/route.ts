import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { getNutritionistActivities } from '@/controllers/nutritionistController';


export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await getNutritionistActivities(session.userId);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[NUTRITIONIST ACTIVITIES GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch activities.' }, { status: 500 });
  }
}