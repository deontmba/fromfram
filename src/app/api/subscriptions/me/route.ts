import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

function getAuthErrorResponse(error: 'CONFIG_MISSING' | 'UNAUTHENTICATED') {
  if (error === 'CONFIG_MISSING') {
    return NextResponse.json(
      { error: 'Server auth configuration missing.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

const subscriptionSelect = {
  id: true,
  userId: true,
  goalId: true,
  planType: true,
  servings: true,
  status: true,
  startDate: true,
  endDate: true,
  pausedUntil: true,
  goal: {
    select: {
      id: true,
      name: true,
      description: true,
      minCalories: true,
      maxCalories: true,
    },
  },
};

/**
 * API Documentation
 * Endpoint   : GET /api/subscriptions/me
 * Deskripsi  : Mengambil subscription milik user yang sedang login.
 * Method     : GET
 * Input      : Cookie `token` dari sesi login.
 * Proses     :
 * 1) Validasi user login dari cookie JWT.
 * 2) Cari subscription pertama berdasarkan `userId`.
 * 3) Jika ditemukan, kembalikan data subscription.
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.userId },
      select: subscriptionSelect,
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json(subscription, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
