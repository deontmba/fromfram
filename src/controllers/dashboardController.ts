import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const getDashboard = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ambil semua data secara paralel untuk efisiensi
    const [
      user,
      subscription,
      currentWeeklyBox,
      nextWeeklyBox,
      futureWeeklyBox,
      upcomingWeeklyMenus,
      latestWeeklyBox,
      todayDelivery,
      recentDeliveries,
    ] = await Promise.all([
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
              mealType: true,
              serving: true,
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  calories: true,
                  protein: true,
                  imageUrl: true,
                  ingredients: {
                    select: {
                      quantity: true,
                      unit: true,
                      ingredient: {
                        select: { name: true }
                      }
                    }
                  }
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
          },
        },
      }),

      // 3b. WeeklyBox terdekat ke depan kalau minggu berjalan belum ada
      prisma.weeklyBox.findFirst({
        where: {
          userId,
          weekStartDate: { gt: today },
        },
        orderBy: { weekStartDate: 'asc' },
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
              mealType: true,
              serving: true,
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  calories: true,
                  protein: true,
                  imageUrl: true,
                  ingredients: {
                    select: {
                      quantity: true,
                      unit: true,
                      ingredient: { select: { name: true } }
                    }
                  }
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
          },
        },
      }),

      // 3d. WeeklyBox minggu setelah minggu depan (skip 1)
      prisma.weeklyBox.findFirst({
        where: {
          userId,
          weekStartDate: { gt: today },
        },
        orderBy: { weekStartDate: 'asc' },
        skip: 1,
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
              mealType: true,
              serving: true,
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  calories: true,
                  protein: true,
                  imageUrl: true,
                  ingredients: {
                    select: {
                      quantity: true,
                      unit: true,
                      ingredient: { select: { name: true } }
                    }
                  }
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
          },
        },
      }),

      // 3e. Menu katalog minggu depan dan berikutnya (untuk space kosong kanan)
      prisma.weeklyMenu.findMany({
        where: {
          weekStartDate: { gt: today },
        },
        select: {
          weekStartDate: true,
          recipe: {
            select: {
              id: true,
              name: true,
              description: true,
              calories: true,
              protein: true,
              imageUrl: true,
              ingredients: {
                select: {
                  quantity: true,
                  unit: true,
                  ingredient: { select: { name: true, isAllergen: true } }
                }
              }
            }
          }
        }
      }),

      // 3c. WeeklyBox terbaru sebagai fallback terakhir agar box locked tetap tampil
      prisma.weeklyBox.findFirst({
        where: { userId },
        orderBy: { weekStartDate: 'desc' },
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
              mealType: true,
              serving: true,
              recipe: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  calories: true,
                  protein: true,
                  imageUrl: true,
                  ingredients: {
                    select: {
                      quantity: true,
                      unit: true,
                      ingredient: { select: { name: true } }
                    }
                  }
                },
              },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }],
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
                      ingredients: {
                        select: {
                          quantity: true,
                          unit: true,
                          ingredient: { select: { name: true } }
                        }
                      }
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

    const totalDays = 7;
    const calculateSummary = (box: typeof currentWeeklyBox) => {
      if (!box) return null;
      const uniqueDays = new Set(box.mealSelections?.map(m => m.dayOfWeek));
      const selectedDays = uniqueDays.size;
      const remainingDays = Math.max(0, totalDays - selectedDays);
      const selectionDeadline = box.selectionDeadline ? new Date(box.selectionDeadline) : null;
      const canSelectMenu = box.status === 'PENDING_SELECTION' && selectionDeadline !== null && selectionDeadline > new Date();
      return { totalDays, selectedDays, remainingDays, canSelectMenu };
    };

    const currentBox = currentWeeklyBox ?? (latestWeeklyBox && latestWeeklyBox.weekEndDate < today ? latestWeeklyBox : null);

    return NextResponse.json({
      status: 'success',
      data: {
        user,
        subscription,
        currentWeeklyBox: currentBox
          ? { ...currentBox, summary: calculateSummary(currentBox) }
          : null,
        nextWeeklyBox: nextWeeklyBox
          ? { ...nextWeeklyBox, summary: calculateSummary(nextWeeklyBox) }
          : null,
        futureWeeklyBox: futureWeeklyBox
          ? { ...futureWeeklyBox, summary: calculateSummary(futureWeeklyBox) }
          : null,
        upcomingWeeklyMenus: upcomingWeeklyMenus ?? [],
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

function getDayOfWeekEnum(date: Date) {
  const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
  return days[date.getDay()];
}