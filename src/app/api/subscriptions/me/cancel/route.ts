import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Hanya ACTIVE atau PAUSED yang bisa dicancel
    if (subscription.status !== "ACTIVE" && subscription.status !== "PAUSED") {
      return NextResponse.json({ error: "Cannot cancel a subscription that is not ACTIVE or PAUSED" }, { status: 400 });
    }

    // Set endDate ke akhir siklus langganan berjalan.
    // Misalnya siklus langganan 1 minggu dari startDate
    const currentEnd = new Date(subscription.startDate);
    currentEnd.setDate(currentEnd.getDate() + 7); // Asumsi sederhana 7 hari, tapi harusnya tergantung planType.
    
    // Asumsi: 
    // Jika planType WEEKLY -> +1 minggu
    // Jika planType MONTHLY -> +1 bulan
    // Jika planType YEARLY -> +1 tahun
    // Di sini kita gunakan startDate + 1 minggu sebagai misal siklus jalan (bisa disesuaikan logic sesuai planType)
    let cycleEndDate = new Date(subscription.startDate);
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
        status: "ACTIVE", // Biarkan aktif (atau kembaikan ke aktif kalau tadi PAUSED) karena kiriman tetap jalan
        endDate: cycleEndDate,
      },
    });

    // TODO: Buatlah atau daftarkan cronJob yang akan memeriksa setiap hari
    // Kapan saatnya `endDate <= todaysDate` dan otomatis merubah `status` jadi `CANCELLED`
    // cron.schedule("0 0 * * *", async () => { /* script */ });

    return NextResponse.json({
      message: "Subscription set for cancellation at the end of cycle",
      subscription: updatedSub,
      note: "Cron job is needed to update status to CANCELLED once endDate passes",
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
