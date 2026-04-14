import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { deleteCache } from "@/lib/cache"; // Fungsi yang kita import jika dari redis/cache layer

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
 * Endpoint   : PATCH /api/subscriptions/me/resume
 * Deskripsi  : Mengaktifkan kembali subscription yang sedang PAUSED.
 * Method     : PATCH
 * Input      : Header auth sesuai helper `getAuthenticatedUser`.
 * Proses     :
 * 1) Validasi user login.
 * 2) Pastikan subscription user ada.
 * 3) Pastikan status saat ini PAUSED.
 * 4) Hapus cache resume sementara.
 * 5) Update status subscription menjadi ACTIVE.
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

    if (subscription.status !== "PAUSED") {
      return NextResponse.json({ error: "Current status MUST be PAUSED to resume" }, { status: 400 });
    }

    deleteCache(`pause_resume_${subscription.id}`);

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE" },
    });

    return NextResponse.json({
      message: "Subscription resumed successfully",
      subscription: updatedSub,
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
