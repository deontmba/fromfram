import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * getDashboard
 * Mengambil semua data yang dibutuhkan halaman /dashboard untuk user yang sedang login.
 *
 * Data yang dikembalikan:
 * - user           : nama & email user
 * - subscription   : status langganan aktif (plan, servings, status, goal)
 * - weeklyBox      : WeeklyBox minggu berjalan + meal selections + status
 * - todayDelivery  : status pengiriman hari ini
 * - deliveries     : riwayat 7 pengiriman terakhir
 */
export const getDashboard = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ambil semua data secara paralel untuk efisiensi
    const [user, subscription, currentWeeklyBox, todayDelivery, recentDeliveries] =
      await Promise.all([
        // 1. Data user dasar
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            nutritionalProfile: {
              select: {
                weight: true,
                height: true,
                dailyCalorieNeed: true,
                allergies: true,
              },
            },
          },
        }),

        // 2. Subscription aktif user
        prisma.subscription.findUnique({
          where: { userId },
          select: {
            id: true,
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
          },
        }),

        // 3. WeeklyBox minggu berjalan (yang mencakup hari ini)
        prisma.weeklyBox.findFirst({
          where: {
            userId,
            weekStartDate: { lte: today },
            weekEndDate: { gte: today },
          },
          select: {
            id: true,
            weekStartDate: true,
            weekEndDate: true,
            selectionDeadline: true,
            isAutoSelected: true,
            status: true,
            mealSelections: {
              select: {
                id: true,
                dayOfWeek: true,
                recipe: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    calories: true,
                    protein: true,
                    imageUrl: true,
                  },
                },
              },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        }),

        // 4. Delivery hari ini
        prisma.delivery.findFirst({
          where: {
            userId,
            deliveryDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          select: {
            id: true,
            deliveryDate: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
            address: {
              select: {
                label: true,
                street: true,
                city: true,
                province: true,
                recipientName: true,
              },
            },
            weeklyBox: {
              select: {
                mealSelections: {
                  where: {
                    // Ambil meal selection untuk hari ini berdasarkan nama hari
                    dayOfWeek: getDayOfWeekEnum(new Date()),
                  },
                  select: {
                    recipe: {
                      select: {
                        name: true,
                        calories: true,
                        imageUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        // 5. Riwayat 7 pengiriman terakhir
        prisma.delivery.findMany({
          where: { userId },
          orderBy: { deliveryDate: 'desc' },
          take: 7,
          select: {
            id: true,
            deliveryDate: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
          },
        }),
      ]);

    if (!user) {
      return NextResponse.json({ message: 'User tidak ditemukan.' }, { status: 404 });
    }

    // Hitung summary meal selections minggu ini
    const totalDays = 7;
    const selectedDays = currentWeeklyBox?.mealSelections?.length ?? 0;
    const remainingDays = Math.max(0, totalDays - selectedDays);

    // Cek apakah deadline pemilihan menu masih bisa dilakukan
    const selectionDeadline = currentWeeklyBox?.selectionDeadline
      ? new Date(currentWeeklyBox.selectionDeadline)
      : null;
    const canSelectMenu =
      currentWeeklyBox?.status === 'PENDING_SELECTION' &&
      selectionDeadline !== null &&
      selectionDeadline > new Date();

    return NextResponse.json({
      status: 'success',
      data: {
        user,
        subscription,
        weeklyBox: currentWeeklyBox
          ? {
              ...currentWeeklyBox,
              summary: {
                totalDays,
                selectedDays,
                remainingDays,
                canSelectMenu,
              },
            }
          : null,
        todayDelivery,
        recentDeliveries,
      },
    });
  } catch (error) {
    console.error('[DASHBOARD GET ERROR]', error);
    return NextResponse.json(
      { message: 'Gagal mengambil data dashboard.' },
      { status: 500 }
    );
  }
};

/**
 * Helper: konversi Date ke enum DayOfWeek sesuai schema Prisma
 */
function getDayOfWeekEnum(date: Date) {
  const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
  return days[date.getDay()];
}