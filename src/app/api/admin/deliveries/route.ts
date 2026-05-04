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
 * Endpoint   : GET /api/v1/admin/deliveries
 * Deskripsi  : Mengambil seluruh record pengiriman lintas pengguna.
 * Method     : GET
 * Auth       : Cookie `token`, role ADMIN
 * Query Params:
 *   status — PREPARING | SHIPPED | DELIVERED (optional)
 *   area   — partial city name, case-insensitive (optional)
 * Response   :
 * {
 *   "data": [{
 *     "id": "DEL-001", "user": "John Doe", "userId": "...",
 *     "menu": "Nasi Goreng Kampung",
 *     "address": "Jakarta Selatan, DKI Jakarta",
 *     "deliveryDate": "...", "status": "SHIPPED",
 *     "shippedAt": "...", "deliveredAt": null
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as
      | 'PREPARING'
      | 'SHIPPED'
      | 'DELIVERED'
      | null;
    const areaFilter = searchParams.get('area');

    const deliveries = await prisma.delivery.findMany({
      where: {
        ...(statusFilter && { status: statusFilter }),
        ...(areaFilter && {
          address: {
            city: { contains: areaFilter, mode: 'insensitive' },
          },
        }),
      },
      select: {
        id: true,
        deliveryDate: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
        user: {
          select: { id: true, name: true },
        },
        address: {
          select: { city: true, province: true },
        },
        weeklyBox: {
          select: {
            mealSelections: {
              select: {
                dayOfWeek: true,
                recipe: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { deliveryDate: 'desc' },
    });

    // Day-of-week map: JS getDay() → DayOfWeek enum
    const jsToEnum: Record<number, string> = {
      0: 'MINGGU',
      1: 'SENIN',
      2: 'SELASA',
      3: 'RABU',
      4: 'KAMIS',
      5: 'JUMAT',
      6: 'SABTU',
    };

    const data = deliveries.map((d) => {
      const dayEnum = jsToEnum[new Date(d.deliveryDate).getDay()];
      const matchedSelection = d.weeklyBox?.mealSelections.find(
        (s) => s.dayOfWeek === dayEnum
      );

      return {
        id: d.id,
        user: d.user.name,
        userId: d.user.id,
        menu: matchedSelection?.recipe?.name ?? 'Menu tidak tersedia',
        address: d.address ? `${d.address.city}, ${d.address.province}` : '-',
        deliveryDate: d.deliveryDate,
        status: d.status,
        shippedAt: d.shippedAt,
        deliveredAt: d.deliveredAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[ADMIN DELIVERIES GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data deliveries.' }, { status: 500 });
  }
}