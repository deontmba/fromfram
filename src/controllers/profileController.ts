import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { AddAddressInput, UpdateProfileInput, UpdateHealthInput } from '@/schemas';
import { NutritionalProfileData } from '@/types';

const addressSelect = {
  id: true,
  label: true,
  recipientName: true,
  phoneNumber: true,
  street: true,
  city: true,
  province: true,
  postalCode: true,
  notes: true,
  isDefault: true,
};

const profileSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  nutritionalProfile: {
    select: {
      id: true,
      weight: true,
      height: true,
      dailyCalorieNeed: true,
      allergies: true,
      medicalNotes: true,
    },
  },
  addresses: {
    orderBy: [{ isDefault: 'desc' as const }, { label: 'asc' as const }],
    select: addressSelect,
  },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const getAddresses = async (userId: string) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' as const }, { label: 'asc' as const }],
      select: addressSelect,
    });

    return NextResponse.json({ status: 'success', data: addresses });
  } catch (error) {
    console.error('[ADDRESS GET ERROR]', error);
    return NextResponse.json({ message: 'Gagal mengambil alamat' }, { status: 500 });
  }
};

export const getProfile = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
    return NextResponse.json({ status: 'success', data: user });
  } catch (error) {
    console.error('[PROFILE GET ERROR]', error);
    return NextResponse.json({ message: 'Error fetching profile' }, { status: 500 });
  }
};

export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  try {
    const updateData: Record<string, unknown> = {};

    if (isNonEmptyString(input.name)) {
      updateData.name = input.name.trim();
    }

    const hasNutritionalPayload = (
      input.weight !== undefined ||
      input.height !== undefined ||
      input.dailyCalorieNeed !== undefined ||
      input.allergies !== undefined ||
      input.medicalNotes !== undefined
    );

    if (hasNutritionalPayload) {
      const weight = Number(input.weight);
      const height = Number(input.height);
      const dailyCalorieNeed = Number(input.dailyCalorieNeed);

      if (!Number.isFinite(weight) || !Number.isFinite(height) || !Number.isFinite(dailyCalorieNeed)) {
        return NextResponse.json(
          { message: 'weight, height, dan dailyCalorieNeed harus berupa angka valid.' },
          { status: 400 }
        );
      }

      const nutritionalData: Omit<NutritionalProfileData, 'id'> = {
        weight,
        height,
        dailyCalorieNeed,
        allergies: typeof input.allergies === 'string' ? input.allergies : null,
        medicalNotes: typeof input.medicalNotes === 'string' ? input.medicalNotes : null,
      };

      updateData.nutritionalProfile = {
        upsert: {
          create: nutritionalData,
          update: nutritionalData,
        },
      };
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada data valid untuk diperbarui.' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: profileSelect,
    });

    return NextResponse.json({ status: 'success', data: updated });
  } catch (error) {
    console.error('[PROFILE UPDATE ERROR]', error);
    return NextResponse.json({ message: 'Error updating profile' }, { status: 500 });
  }
};

export const getHealthProfile = async (userId: string) => {
  try {
    const nutritionalProfile = await prisma.nutritionalProfile.findUnique({
      where: { userId },
      select: {
        weight: true,
        height: true,
        dailyCalorieNeed: true,
        allergies: true,
        medicalNotes: true,
      },
    });

    return NextResponse.json({ profile: nutritionalProfile ?? null });
  } catch (error) {
    console.error('[HEALTH GET ERROR]', error);
    return NextResponse.json({ error: 'Gagal mengambil health profile.' }, { status: 500 });
  }
};

export const updateHealthProfile = async (userId: string, input: UpdateHealthInput) => {
  try {
    const weight = Number(input.weight);
    const height = Number(input.height);

    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json(
        { error: 'Berat badan (weight) harus berupa angka positif.' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json(
        { error: 'Tinggi badan (height) harus berupa angka positif.' },
        { status: 400 }
      );
    }

    const existingProfile = await prisma.nutritionalProfile.findUnique({
      where: { userId },
      select: { dailyCalorieNeed: true },
    });

    const dailyCalorieNeed =
      input.dailyCalorieNeed !== undefined &&
      Number.isFinite(Number(input.dailyCalorieNeed)) &&
      Number(input.dailyCalorieNeed) > 0
        ? Number(input.dailyCalorieNeed)
        : (existingProfile?.dailyCalorieNeed ??
            Math.round(10 * weight + 6.25 * height - 5 * 25 + 5));

    const allergies = typeof input.allergies === 'string' ? input.allergies : null;
    const medicalNotes = typeof input.medicalNotes === 'string' ? input.medicalNotes : null;

    const updatedProfile = await prisma.nutritionalProfile.upsert({
      where: { userId },
      create: { userId, weight, height, dailyCalorieNeed, allergies, medicalNotes },
      update: { weight, height, dailyCalorieNeed, allergies, medicalNotes },
      select: {
        weight: true,
        height: true,
        dailyCalorieNeed: true,
        allergies: true,
        medicalNotes: true,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('[HEALTH PUT ERROR]', error);
    return NextResponse.json({ error: 'Gagal menyimpan health profile.' }, { status: 500 });
  }
};

export const manageAddress = {
  add: async (userId: string, body: AddAddressInput) => {
    try {
      if (
        !isNonEmptyString(body.recipientName) ||
        !isNonEmptyString(body.phoneNumber) ||
        !isNonEmptyString(body.label) ||
        !isNonEmptyString(body.street) ||
        !isNonEmptyString(body.city) ||
        !isNonEmptyString(body.province) ||
        !isNonEmptyString(body.postalCode)
      ) {
        return NextResponse.json(
          { message: 'recipientName, phoneNumber, label, street, city, province, dan postalCode wajib diisi.' },
          { status: 400 }
        );
      }

      const payload = {
        recipientName: body.recipientName.trim(),
        phoneNumber: body.phoneNumber.trim(),
        label: body.label.trim(),
        street: body.street.trim(),
        city: body.city.trim(),
        province: body.province.trim(),
        postalCode: body.postalCode.trim(),
        notes: typeof body.notes === 'string' ? body.notes : null,
      };

      const requestedDefault = body.isDefault === true;
      const totalAddress = await prisma.address.count({ where: { userId } });
      const shouldBeDefault = requestedDefault || totalAddress === 0;

      let address;
      if (shouldBeDefault) {
        const [, createdAddress] = await prisma.$transaction([
          prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          }),
          prisma.address.create({
            data: { ...payload, userId, isDefault: true },
            select: addressSelect,
          }),
        ]);
        address = createdAddress;
      } else {
        address = await prisma.address.create({
          data: { ...payload, userId, isDefault: false },
          select: addressSelect,
        });
      }

      return NextResponse.json({ status: 'success', data: address });
    } catch (error) {
      console.error('[ADDRESS ADD ERROR]', error);
      return NextResponse.json({ message: 'Gagal menambah alamat' }, { status: 500 });
    }
  },

  update: async (userId: string, addressId: string, body: Partial<AddAddressInput>) => {
    try {
      const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true },
      });

      if (!existing) {
        return NextResponse.json({ message: 'Alamat tidak ditemukan' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      if (isNonEmptyString(body.recipientName)) updateData.recipientName = body.recipientName.trim();
      if (isNonEmptyString(body.phoneNumber)) updateData.phoneNumber = body.phoneNumber.trim();
      if (isNonEmptyString(body.label)) updateData.label = body.label.trim();
      if (isNonEmptyString(body.street)) updateData.street = body.street.trim();
      if (isNonEmptyString(body.city)) updateData.city = body.city.trim();
      if (isNonEmptyString(body.province)) updateData.province = body.province.trim();
      if (isNonEmptyString(body.postalCode)) updateData.postalCode = body.postalCode.trim();
      if (typeof body.notes === 'string' || body.notes === null) updateData.notes = body.notes;

      const wantsDefault = body.isDefault === true;
      if (!wantsDefault && Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { message: 'Tidak ada data alamat valid untuk diperbarui.' },
          { status: 400 }
        );
      }

      let updated;
      if (wantsDefault) {
        const [, updatedAddress] = await prisma.$transaction([
          prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          }),
          prisma.address.update({
            where: { id: addressId },
            data: { ...updateData, isDefault: true },
            select: addressSelect,
          }),
        ]);
        updated = updatedAddress;
      } else {
        updated = await prisma.address.update({
          where: { id: addressId },
          data: updateData,
          select: addressSelect,
        });
      }

      return NextResponse.json({ status: 'success', data: updated });
    } catch (error) {
      console.error('[ADDRESS UPDATE ERROR]', error);
      return NextResponse.json({ message: 'Gagal update alamat' }, { status: 500 });
    }
  },

  setDefault: async (userId: string, addressId: string) => {
    try {
      const targetAddress = await prisma.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true },
      });

      if (!targetAddress) {
        return NextResponse.json({ message: 'Alamat tidak ditemukan' }, { status: 404 });
      }

      const [, updatedAddress] = await prisma.$transaction([
        prisma.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        }),
        prisma.address.update({
          where: { id: addressId },
          data: { isDefault: true },
          select: addressSelect,
        }),
      ]);

      return NextResponse.json({
        status: 'success',
        message: 'Alamat utama diperbarui',
        data: updatedAddress,
      });
    } catch (error) {
      console.error('[ADDRESS DEFAULT ERROR]', error);
      return NextResponse.json({ message: 'Gagal set alamat utama' }, { status: 500 });
    }
  },

  delete: async (userId: string, addressId: string) => {
    try {
      const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true },
      });

      if (!existing) {
        return NextResponse.json({ message: 'Alamat tidak ditemukan' }, { status: 404 });
      }

      const wasDefault = existing.isDefault;

      await prisma.address.delete({ where: { id: addressId } });

      if (wasDefault) {
        const nextAddress = await prisma.address.findFirst({
          where: { userId },
          orderBy: { label: 'asc' },
          select: { id: true },
        });

        if (nextAddress) {
          await prisma.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }

      return NextResponse.json({ status: 'success', message: 'Alamat berhasil dihapus' });
    } catch (error) {
      console.error('[ADDRESS DELETE ERROR]', error);
      return NextResponse.json({ message: 'Gagal menghapus alamat' }, { status: 500 });
    }
  },
};