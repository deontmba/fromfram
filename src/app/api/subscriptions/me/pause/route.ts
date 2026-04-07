import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { setCache } from "@/lib/cache";

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
 * Endpoint   : PATCH /api/subscriptions/me/pause
 * Deskripsi  : Menjeda subscription aktif sampai tanggal resume tertentu.
 * Method     : PATCH
 * Input      :
 * - Header auth sesuai helper `getAuthenticatedUser`
 * - JSON body { resumeDate: string (ISO date) }
 * Proses     :
 * 1) Validasi user login.
 * 2) Validasi `resumeDate` wajib ada dan maksimal 4 minggu dari hari ini.
 * 3) Pastikan subscription user ada dan status saat ini ACTIVE.
 * 4) Simpan resumeDate sementara ke cache.
 * 5) Update status subscription menjadi PAUSED.
 */

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUserId(req);
    if ('error' in session) {
      return getAuthErrorResponse(session.error);
    }

    const body = await req.json();
    const { resumeDate } = body;

    // Validasi payload
    if (!resumeDate) {
      return NextResponse.json({ error: "Missing resumeDate" }, { status: 400 });
    }

    const maxResumeDateAllowed = new Date();
    maxResumeDateAllowed.setDate(maxResumeDateAllowed.getDate() + 28); // 4 minggu dari hari ini
    const parsedResumeDate = new Date(resumeDate);

    if (parsedResumeDate > maxResumeDateAllowed) {
      return NextResponse.json({ error: "resumeDate cannot exceed 4 weeks from today" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status !== "ACTIVE") {
      return NextResponse.json({ error: "Current status MUST be ACTIVE to pause" }, { status: 400 });
    }

    // Set Cache for resume date
    // Sebagai alternatif yang lebih baik, tambahkan kolom ke DB melalui prisma migrate pada iterasi berikutnya
    // Jika tidak ini bisa hilang saat server restart. Set value redis/in memory.
    setCache(`pause_resume_${subscription.id}`, parsedResumeDate.toISOString());

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "PAUSED" },
    });

    return NextResponse.json({
      message: "Subscription paused successfully",
      subscription: updatedSub,
      resumeDate: parsedResumeDate.toISOString(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
