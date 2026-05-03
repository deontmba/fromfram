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

type AllowedPlanType = "MINGGUAN" | "BULANAN" | "TAHUNAN";

const allowedPlanTypes = new Set<AllowedPlanType>(["MINGGUAN", "BULANAN", "TAHUNAN"]);

function isAllowedPlanType(value: unknown): value is AllowedPlanType {
  return typeof value === "string" && allowedPlanTypes.has(value as AllowedPlanType);
}

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

/**
 * API Documentation
 * Endpoint   : PATCH /api/subscriptions/me
 * Deskripsi  : Memperbarui subscription milik user yang sedang login.
 * Method     : PATCH
 * Input      : Cookie `token` dari sesi login dan JSON body
 *              { goalId: string, planType: string, servings: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const body = await req.json();
    const { goalId, planType, servings } = body;

    if (
      typeof goalId !== "string" ||
      !goalId.trim() ||
      !isAllowedPlanType(planType) ||
      !Number.isInteger(servings) ||
      servings < 1 ||
      servings > 6
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.userId },
      select: { id: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId.trim() },
      select: { id: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        goalId: goal.id,
        planType,
        servings,
      },
      select: subscriptionSelect,
    });

    return NextResponse.json(updatedSubscription, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
