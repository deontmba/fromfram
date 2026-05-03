import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma"; // asumsi prisma instance diexport dari sini
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
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  goal: {
  /**
   * API Documentation
   * Endpoint   : GET /api/subscriptions
   * Deskripsi  : Mengambil semua data subscription yang tersimpan.
   * Method     : GET
   * Input      : Cookie `token` dari sesi login.
   * Proses     :
   * 1) Validasi sesi user dari cookie JWT.
   * 2) Ambil seluruh subscription beserta relasi user dan goal.
   * 3) Kembalikan daftar subscription dengan urutan terbaru terlebih dahulu.
   */
    select: {
      id: true,
      name: true,
      description: true,
      minCalories: true,
      maxCalories: true,
    },
  },
};



export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const [subscriptions, goals] = await Promise.all([
      prisma.subscription.findMany({
        orderBy: [{ startDate: "desc" }],
        select: subscriptionSelect,
      }),
      prisma.goal.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    return NextResponse.json({ status: "success", data: subscriptions, goals }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * API Documentation
 * Endpoint   : POST /api/subscriptions
 * Deskripsi  : Membuat subscription baru untuk user yang sedang terautentikasi.
 * Method     : POST
 * Input      :
 * - Header auth sesuai helper `getAuthenticatedUser`
 * - JSON body { goalId: string, planType: string, servings: number }
 * Proses     :
 * 1) Validasi user login.
 * 2) Validasi payload (goalId, planType, servings 1..6).
 * 3) Cek apakah user masih punya subscription aktif/non-cancelled.
 * 4) Jika belum ada, buat subscription baru dengan status ACTIVE.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();
    const { goalId, planType, servings, userId } = body;

    const targetUserId = user.role === "ADMIN" && typeof userId === "string" && userId.trim().length > 0
      ? userId.trim()
      : session.userId;

    if (!goalId || !planType || !servings || servings < 1 || servings > 6) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Cek apakah user sudah punya subscription aktif
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: targetUserId, status: { not: "CANCELLED" } }
    });

    if (existingSub) {
      return NextResponse.json({ error: "User already has an active subscription" }, { status: 400 });
    }

    const newSubscription = await prisma.subscription.create({
      data: {
        userId: targetUserId,
        goalId: goalId,
        planType,
        servings,
        status: "ACTIVE",
      },
      select: subscriptionSelect,
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
