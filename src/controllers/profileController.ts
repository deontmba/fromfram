import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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

export const getProfile = async (req: NextRequest, userId: string) => {
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

export const updateProfile = async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (isNonEmptyString(body.name)) {
      updateData.name = body.name.trim();
    }

    const hasNutritionalPayload = ['weight', 'height', 'dailyCalorieNeed', 'allergies', 'medicalNotes']
      .some((key) => Object.prototype.hasOwnProperty.call(body, key));

    if (hasNutritionalPayload) {
      const weight = Number(body.weight);
      const height = Number(body.height);
      const dailyCalorieNeed = Number(body.dailyCalorieNeed);

      if (!Number.isFinite(weight) || !Number.isFinite(height) || !Number.isFinite(dailyCalorieNeed)) {
        return NextResponse.json(
          { message: 'weight, height, dan dailyCalorieNeed harus berupa angka valid.' },
          { status: 400 }
        );
      }

      updateData.nutritionalProfile = {
        upsert: {
          create: {
            weight,
            height,
            dailyCalorieNeed,
            allergies: typeof body.allergies === 'string' ? body.allergies : null,
            medicalNotes: typeof body.medicalNotes === 'string' ? body.medicalNotes : null,
          },
          update: {
            weight,
            height,
            dailyCalorieNeed,
            allergies: typeof body.allergies === 'string' ? body.allergies : null,
            medicalNotes: typeof body.medicalNotes === 'string' ? body.medicalNotes : null,
          },
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

export const manageAddress = {
  add: async (req: NextRequest, userId: string) => {
    try {
      const body = await req.json();

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

  update: async (req: NextRequest, userId: string, addressId: string) => {
    try {
      const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true },
      });

      if (!existing) {
        return NextResponse.json({ message: 'Alamat tidak ditemukan' }, { status: 404 });
      }

      const body = await req.json();

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

  setDefault: async (req: NextRequest, userId: string, addressId: string) => {
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

  /**
   * DELETE /api/profile/address?id={addressId}
   * Menghapus alamat pengiriman milik user.
   * Jika alamat yang dihapus adalah default dan masih ada alamat lain,
   * otomatis set alamat pertama (label asc) sebagai default baru.
   */
  delete: async (req: NextRequest, userId: string, addressId: string) => {
    try {
      // Cek alamat milik user yang bersangkutan
      const existing = await prisma.address.findFirst({
        where: { id: addressId, userId },
        select: { id: true, isDefault: true },
      });

      if (!existing) {
        return NextResponse.json({ message: 'Alamat tidak ditemukan' }, { status: 404 });
      }

      const wasDefault = existing.isDefault;

      // Hapus alamat
      await prisma.address.delete({ where: { id: addressId } });

      // Jika yang dihapus adalah default, otomatis assign default ke alamat berikutnya
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

      return NextResponse.json({
        status: 'success',
        message: 'Alamat berhasil dihapus',
      });
    } catch (error) {
      console.error('[ADDRESS DELETE ERROR]', error);
      return NextResponse.json({ message: 'Gagal menghapus alamat' }, { status: 500 });
    }
  },
};