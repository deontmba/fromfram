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

/**
 * API Documentation
 * Endpoint   : PATCH /api/subscriptions/me/cancel
 * Deskripsi  : Menjadwalkan pembatalan subscription di akhir siklus berjalan.
 * Method     : PATCH
 * Input      : Header auth sesuai helper `getAuthenticatedUser`.
 * Proses     :
 * 1) Validasi user login.
 * 2) Pastikan subscription user ada.
 * 3) Pastikan status saat ini ACTIVE atau PAUSED.
 * 4) Hitung `endDate` berdasarkan planType (mingguan/bulanan/tahunan).
 * 5) Simpan `endDate` pembatalan dan pertahankan status aktif hingga siklus selesai.
 */

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Hanya ACTIVE atau PAUSED yang bisa dicancel
    if (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED") {
      return NextResponse.json({ error: "Cannot cancel a subscription that is not ACTIVE or PAUSED" }, { status: 400 });
    }

     const cycleEndDate = new Date(subscription.startDate);
    if (subscription.planType === "MINGGUAN") {
      cycleEndDate.setDate(cycleEndDate.getDate() + 7);
    } else if (subscription.planType === "BULANAN") {
      cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);
    } else if (subscription.planType === "TAHUNAN") {
      cycleEndDate.setFullYear(cycleEndDate.getFullYear() + 1);
    } else {
      cycleEndDate.setDate(cycleEndDate.getDate() + 7);
    }


    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        endDate: cycleEndDate,
      },
    });

    // TODO: Buatlah atau daftarkan cronJob yang akan memeriksa setiap hari
    // Kapan saatnya `endDate <= todaysDate` dan otomatis merubah `status` jadi `CANCELLED`
    // cron.schedule("0 0 * * *", async () => { /* script */ });

    return NextResponse.json({
      message: "Subscription set for cancellation at the end of cycle",
      subscription: updatedSub,
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
