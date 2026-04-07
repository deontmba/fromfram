import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const getProfile = async (req: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        nutritionalProfile: true, 
        addresses: { orderBy: { isDefault: 'desc' } } 
      }
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    return NextResponse.json({ status: "success", data: user });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching profile" }, { status: 500 });
  }
};

export const updateProfile = async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        nutritionalProfile: {
          upsert: {
            create: {
              weight: body.weight,
              height: body.height,
              dailyCalorieNeed: body.dailyCalorieNeed || 0,
              allergies: body.allergies,
            },
            update: {
              weight: body.weight,
              height: body.height,
              dailyCalorieNeed: body.dailyCalorieNeed,
              allergies: body.allergies,
            },
          },
        },
      },
      include: { nutritionalProfile: true }
    });
    return NextResponse.json({ status: "success", data: updated });
  } catch (error) {
    return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
  }
};

export const manageAddress = {
  add: async (req: NextRequest, userId: string) => {
    try {
      const body = await req.json();
      const address = await prisma.address.create({
        data: { ...body, userId }
      });
      return NextResponse.json({ status: "success", data: address });
    } catch (error) {
      return NextResponse.json({ message: "Gagal menambah alamat" }, { status: 500 });
    }
  },

  update: async (req: NextRequest, addressId: string) => {
    try {
      const body = await req.json();
      const updated = await prisma.address.update({
        where: { id: addressId },
        data: { ...body }
      });
      return NextResponse.json({ status: "success", data: updated });
    } catch (error) {
      return NextResponse.json({ message: "Gagal update alamat" }, { status: 500 });
    }
  },

  setDefault: async (req: NextRequest, userId: string, addressId: string) => {
    try {
      await prisma.$transaction([
        prisma.address.updateMany({ 
          where: { userId }, 
          data: { isDefault: false } 
        }),
        prisma.address.update({ 
          where: { id: addressId }, 
          data: { isDefault: true } 
        })
      ]);
      return NextResponse.json({ status: "success", message: "Alamat utama diperbarui" });
    } catch (error) {
      return NextResponse.json({ message: "Gagal set alamat utama" }, { status: 500 });
    }
  }
};