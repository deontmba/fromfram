import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import { saveMealSelections } from '@/controllers/mealSelectionController';
import { validate } from '@/lib/validate';
import { saveMealSelectionSchema } from '@/schemas';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING')
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const parsed = validate(saveMealSelectionSchema, body);
    if (!parsed.success) return parsed.response;

    const result = await saveMealSelections(session.userId, parsed.data);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[MEAL SELECTION POST ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan pilihan menu.' }, { status: 500 });
  }
}