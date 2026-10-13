import prisma from '@/lib/prisma';
import { POST as postIngredient } from '@/app/api/admin/ingredients/route';
import { PATCH as patchIngredient, DELETE as deleteIngredient } from '@/app/api/admin/ingredients/[id]/route';
import { POST as bulkImport } from '@/app/api/admin/ingredients/bulk-stock-import/route';
import { NextRequest } from 'next/server';

// Mock session helper
jest.mock('@/lib/session', () => ({
  getSessionUserId: jest.fn(),
}));

import { getSessionUserId } from '@/lib/session';

describe('Admin Ingredients CRUD & Import with Format Synchronization', () => {
  let adminUser: any;
  const mockGetSession = getSessionUserId as jest.Mock;

  beforeAll(async () => {
    // Cleanup prior test artifacts
    await prisma.ingredient.deleteMany({
      where: {
        name: { in: ['Beras Merah Test Admin', 'Kacang Merah Test Admin', 'Imported Wortel Test'] }
      }
    });

    // Create or find admin user
    adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin_ingredients_test@fromfram.test',
          name: 'Admin Test',
          passwordHash: 'dummy',
          role: 'ADMIN',
        },
      });
    }

    mockGetSession.mockResolvedValue({ userId: adminUser.id });
  });

  afterAll(async () => {
    await prisma.ingredient.deleteMany({
      where: {
        name: { in: ['Beras Merah Test Admin', 'Kacang Merah Test Admin', 'Imported Wortel Test'] }
      }
    });
  });

  it('should successfully create a new ingredient via admin POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Beras Merah Test Admin',
        origin: 'Cianjur',
        supplierName: 'Gapoktan Makmur',
        stockKg: 40,
        pricePerKg: 24000,
        isAllergen: false,
      }),
    });

    const res = await postIngredient(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Beras Merah Test Admin');
    expect(body.data.origin).toBe('Cianjur');
    expect(body.data.supplierName).toBe('Gapoktan Makmur');
    expect(body.data.stockKg).toBe(40);
    expect(body.data.pricePerKg).toBe(24000);
  });

  it('should reject creating duplicate ingredient name', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ingredients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Beras Merah Test Admin',
        origin: 'Cianjur',
        supplierName: 'Gapoktan Makmur',
        stockKg: 10,
        pricePerKg: 20000,
      }),
    });

    const res = await postIngredient(req);
    expect(res.status).toBe(409);
  });

  it('should update ingredient details via PATCH', async () => {
    const created = await prisma.ingredient.findUnique({
      where: { name: 'Beras Merah Test Admin' }
    });
    expect(created).toBeTruthy();

    const req = new NextRequest(`http://localhost:3000/api/admin/ingredients/${created!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stockKg: 65,
        pricePerKg: 26000,
        origin: 'Bandung',
      }),
    });

    const res = await patchIngredient(req, { params: Promise.resolve({ id: created!.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.stockKg).toBe(65);
    expect(body.data.pricePerKg).toBe(26000);
    expect(body.data.origin).toBe('Bandung');
  });

  it('should bulk import ingredients creating new ones and updating existing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ingredients/bulk-stock-import', {
      method: 'POST',
      body: JSON.stringify({
        rows: [
          {
            name: 'Beras Merah Test Admin', // Existing: should update
            origin: 'Cianjur Selatan',
            supplierName: 'Koperasi Tani Makmur',
            stockKg: 80,
            pricePerKg: 27000,
          },
          {
            name: 'Imported Wortel Test', // New: should create
            origin: 'Brastagi',
            supplierName: 'Petani Karo',
            stockKg: 25.5,
            pricePerKg: 15000,
          },
        ]
      }),
    });

    const res = await bulkImport(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.createdCount).toBe(1);
    expect(body.summary.updatedCount).toBe(1);
    expect(body.summary.invalidCount).toBe(0);

    const updated = await prisma.ingredient.findUnique({
      where: { name: 'Beras Merah Test Admin' }
    });
    expect(updated?.stockKg).toBe(80);
    expect(updated?.pricePerKg).toBe(27000);

    const created = await prisma.ingredient.findUnique({
      where: { name: 'Imported Wortel Test' }
    });
    expect(created?.stockKg).toBe(25.5);
    expect(created?.pricePerKg).toBe(15000);
    expect(created?.origin).toBe('Brastagi');
    expect(created?.supplierName).toBe('Petani Karo');
  });

  it('should delete an ingredient via DELETE when not tied to recipes', async () => {
    const item = await prisma.ingredient.findUnique({
      where: { name: 'Imported Wortel Test' }
    });
    expect(item).toBeTruthy();

    const req = new NextRequest(`http://localhost:3000/api/admin/ingredients/${item!.id}`, {
      method: 'DELETE',
    });

    const res = await deleteIngredient(req, { params: Promise.resolve({ id: item!.id }) });
    expect(res.status).toBe(200);

    const after = await prisma.ingredient.findUnique({
      where: { name: 'Imported Wortel Test' }
    });
    expect(after).toBeNull();
  });
});
