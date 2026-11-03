import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUserId, getAuthErrorResponse } from '@/lib/session';
import { DayOfWeek, MealType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const schedules = await prisma.addressSchedule.findMany({
      where: { userId: session.userId },
      include: { address: true },
    });
    return NextResponse.json(schedules);
  } catch (err) {
    console.error('[GET /api/address-schedules]', err);
    return NextResponse.json({ error: 'Failed to fetch address schedules' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const body = (await req.json()) as {
      dayOfWeek: DayOfWeek;
      mealType: MealType;
      addressId: string;
    };

    const { dayOfWeek, mealType, addressId } = body;

    if (!dayOfWeek || !mealType || !addressId) {
      return NextResponse.json(
        { error: 'dayOfWeek, mealType, and addressId are required' },
        { status: 400 }
      );
    }

    const validDays = Object.values(DayOfWeek);
    const validMealTypes = Object.values(MealType);

    if (!validDays.includes(dayOfWeek)) {
      return NextResponse.json({ error: 'Invalid dayOfWeek value' }, { status: 400 });
    }
    if (!validMealTypes.includes(mealType)) {
      return NextResponse.json({ error: 'Invalid mealType value' }, { status: 400 });
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: session.userId },
    });
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const schedule = await prisma.addressSchedule.upsert({
      where: {
        userId_dayOfWeek_mealType: {
          userId: session.userId,
          dayOfWeek,
          mealType,
        },
      },
      update: { addressId },
      create: {
        id: crypto.randomUUID(),
        userId: session.userId,
        dayOfWeek,
        mealType,
        addressId,
      },
      include: { address: true },
    });

    return NextResponse.json(schedule);
  } catch (err) {
    console.error('[POST /api/address-schedules]', err);
    return NextResponse.json({ error: 'Failed to save address schedule' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionUserId(req);
  if ('error' in session) return getAuthErrorResponse(session.error);

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const schedule = await prisma.addressSchedule.findFirst({
      where: { id, userId: session.userId },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await prisma.addressSchedule.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/address-schedules]', err);
    return NextResponse.json({ error: 'Failed to delete address schedule' }, { status: 500 });
  }
}
