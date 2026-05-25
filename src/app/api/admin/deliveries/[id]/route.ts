import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { updateAdminDelivery, deleteAdminDelivery } from '@/controllers/adminController';


type DynamicRouteParams = { id: string };
interface RouteContext { params: Promise<DynamicRouteParams> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = await req.json();
    const result = await updateAdminDelivery(session.userId, id, body);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN DELIVERY PATCH ERROR]', error);
    return NextResponse.json({ error: 'Gagal memperbarui data delivery.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const result = await deleteAdminDelivery(session.userId, id);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('[ADMIN DELIVERY DELETE ERROR]', error);
    return NextResponse.json({ error: 'Gagal menghapus delivery.' }, { status: 500 });
  }
}
