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
 * Endpoint   : GET /api/v1/admin/users
 * Deskripsi  : Mengambil daftar semua pengguna beserta status langganan dan next delivery.
 * Method     : GET
 * Auth       : Cookie `token`, role ADMIN
 * Response   :
 * {
 *   "data": [{
 *     "id": "...", "name": "...", "email": "...", "joinedAt": "...",
 *     "address": "Jl. Sudirman No. 123, Jakarta", "phoneNumber": "...",
 *     "plan": "BULANAN", "servings": 2, "subscriptionStatus": "ACTIVE",
 *     "goal": "Atlet", "nextDelivery": "2026-05-05T00:00:00.000Z"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) {
    return getAuthErrorResponse(session.error);
  }

  // Verify the requesting user is ADMIN
  const requestingUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  if (!requestingUser || requestingUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        addresses: {
          where: { isDefault: true },
          select: {
            street: true,
            city: true,
            phoneNumber: true,
          },
          take: 1,
        },
        subscriptions: {
          select: {
            planType: true,
            servings: true,
            status: true,
            startDate: true,
            goal: {
              select: { name: true },
            },
          },
          take: 1,
        },
        weeklyBoxes: {
          where: {
            status: { in: ['PENDING_SELECTION', 'LOCKED'] },
          },
          select: {
            deliveries: {
              where: { status: { not: 'DELIVERED' } },
              orderBy: { deliveryDate: 'asc' },
              select: { deliveryDate: true },
              take: 1,
            },
          },
          orderBy: { weekStartDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((u) => {
      const sub = u.subscriptions[0] ?? null;
      const box = u.weeklyBoxes[0] ?? null;
      const defaultAddress = u.addresses[0] ?? null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        joinedAt: u.createdAt,
        address: defaultAddress
          ? `${defaultAddress.street}, ${defaultAddress.city}`
          : null,
        phoneNumber: defaultAddress?.phoneNumber ?? null,
        plan: sub?.planType ?? null,
        servings: sub?.servings ?? null,
        subscriptionStatus: sub?.status ?? null,
        goal: sub?.goal?.name ?? null,
        nextDelivery: box?.deliveries[0]?.deliveryDate ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[ADMIN USERS GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil data users.' }, { status: 500 });
  }
}