import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json({ error: 'Server auth configuration missing.' }, { status: 500 });
  }
  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

/**
 * API Documentation
 * Endpoint   : PATCH /api/v1/admin/deliveries/:id/advance
 * Deskripsi  : Memajukan status pengiriman satu langkah secara manual (force-advance).
 *              PREPARING → SHIPPED → DELIVERED
 *              Jika semua delivery dalam WeeklyBox sudah DELIVERED, box otomatis COMPLETED.
 * Method     : PATCH
 * Auth       : Cookie `token`, role ADMIN
 * Response   :
 * {
 *   "message": "Delivery advanced to SHIPPED",
 *   "data": { "id": "...", "status": "SHIPPED", "shippedAt": "...", "deliveredAt": null }
 * }
 */

type DynamicRouteParams = {
  id: string;
};

interface RouteContext {
  params: Promise<DynamicRouteParams>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  const requestingUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!requestingUser || requestingUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      select: { id: true, status: true, weeklyBoxId: true },
    });

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found.' }, { status: 404 });
    }

    if (delivery.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Delivery is already DELIVERED. Cannot advance further.' },
        { status: 400 }
      );
    }

    const nextStatus = delivery.status === 'PREPARING' ? 'SHIPPED' : 'DELIVERED';
    const now = new Date();

    const updated = await prisma.delivery.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(nextStatus === 'SHIPPED' && { shippedAt: now }),
        ...(nextStatus === 'DELIVERED' && { deliveredAt: now }),
      },
      select: {
        id: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
      },
    });

    // If this delivery just became DELIVERED, check if the whole WeeklyBox is done
    if (nextStatus === 'DELIVERED') {
      const pendingCount = await prisma.delivery.count({
        where: {
          weeklyBoxId: delivery.weeklyBoxId,
          status: { not: 'DELIVERED' },
        },
      });

      if (pendingCount === 0) {
        await prisma.weeklyBox.update({
          where: { id: delivery.weeklyBoxId },
          data: { status: 'COMPLETED' },
        });
      }
    }

    return NextResponse.json({
      message: `Delivery advanced to ${nextStatus}.`,
      data: updated,
    });
  } catch (error) {
    console.error('[ADMIN DELIVERY ADVANCE ERROR]', error);
    return NextResponse.json({ error: 'Gagal memajukan status delivery.' }, { status: 500 });
  }
}