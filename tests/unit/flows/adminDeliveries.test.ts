const mockPrisma: any = {
  user: { findUnique: jest.fn(), findFirst: jest.fn() },
  address: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  weeklyBox: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  delivery: {
    findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn(),
    create: jest.fn(), createMany: jest.fn(), update: jest.fn(), delete: jest.fn(), upsert: jest.fn(),
  },
  recipe: { findFirst: jest.fn(), create: jest.fn() },
  mealSelection: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('@/lib/session', () => ({ getSessionUserId: jest.fn() })); // jose is ESM-only under jest

import {
  createAdminDelivery,
  updateAdminDelivery,
  advanceDelivery,
  deleteAdminDelivery,
  getAdminDeliveries,
} from '@/controllers/adminController';

// Monday 20:00 UTC = Tuesday 03:00 in Jakarta (UTC+7).
const LATE_MONDAY_UTC = '2026-11-09T20:00:00.000Z';

const SAVED_ADDRESS = {
  id: 'addr-home', userId: 'cust1', recipientName: 'Sari', phoneNumber: '0812',
  label: 'Rumah', street: 'Jl. Melati 1', city: 'Bandung', province: 'Jawa Barat',
  postalCode: '40111', isDefault: true,
};

let roles: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  roles = { admin1: 'ADMIN', cust1: 'USER', nut1: 'NUTRITIONIST' };
  mockPrisma.user.findUnique.mockImplementation(({ where, select }: any) => {
    if (select?.role) return roles[where.id] ? { role: roles[where.id] } : null;
    return where.id === 'cust1' ? { name: 'Sari' } : null;
  });
  mockPrisma.$transaction.mockImplementation((arg: any) =>
    typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg));
  mockPrisma.address.findFirst.mockResolvedValue({ ...SAVED_ADDRESS });
  mockPrisma.address.findUnique.mockResolvedValue({ ...SAVED_ADDRESS });
  mockPrisma.address.create.mockImplementation(({ data }: any) => ({ id: 'addr-new', ...data }));
  mockPrisma.weeklyBox.findFirst.mockResolvedValue({ id: 'box1' });
  mockPrisma.delivery.create.mockImplementation(({ data }: any) => ({ id: 'del1', ...data }));
  mockPrisma.delivery.update.mockImplementation(({ data }: any) => ({ id: 'del1', ...data }));
  mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'rec1', name: 'Nasi Goreng' });
  mockPrisma.mealSelection.findFirst.mockResolvedValue(null);
});

const baseInput = {
  userId: 'cust1', menu: 'Nasi Goreng', address: 'Jl. Melati 1',
  deliveryDate: LATE_MONDAY_UTC, status: 'PREPARING', mealType: 'DINNER',
};

describe('createAdminDelivery', () => {
  it('403 for non-admin callers', async () => {
    for (const who of ['cust1', 'nut1', 'ghost']) {
      expect(((await createAdminDelivery(who, baseInput)) as any).status).toBe(403);
    }
    expect(mockPrisma.delivery.create).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'preparing', '', 'DELIVERED; DROP TABLE'])('400 on invalid status %j', async (status) => {
    const r: any = await createAdminDelivery('admin1', { ...baseInput, status });
    expect(r.status).toBe(400);
    expect(mockPrisma.delivery.create).not.toHaveBeenCalled();
  });

  it('404 when the customer does not exist', async () => {
    expect(((await createAdminDelivery('admin1', { ...baseInput, userId: 'nobody' })) as any).status).toBe(404);
  });

  it('reuses the saved address when the text matches its street', async () => {
    const r: any = await createAdminDelivery('admin1', baseInput);
    expect(r.status).toBe(201);
    expect(mockPrisma.address.create).not.toHaveBeenCalled();
    expect(mockPrisma.delivery.create.mock.calls[0][0].data.addressId).toBe('addr-home');
  });

  it('a different address creates a new non-default Manual Admin row and never updates the saved one', async () => {
    const r: any = await createAdminDelivery('admin1', { ...baseInput, address: 'Jakarta Selatan, DKI Jakarta' });
    expect(r.status).toBe(201);
    expect(mockPrisma.address.update).not.toHaveBeenCalled();
    expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.address.create.mock.calls[0][0].data).toMatchObject({
      userId: 'cust1', label: 'Manual Admin', isDefault: false,
      street: 'Jakarta Selatan, DKI Jakarta', city: 'Jakarta Selatan', province: 'DKI Jakarta',
      recipientName: 'Sari', postalCode: '40111',
    });
    expect(mockPrisma.delivery.create.mock.calls[0][0].data.addressId).toBe('addr-new');
  });

  it('creates a default address when the customer has none', async () => {
    mockPrisma.address.findFirst.mockResolvedValue(null);
    await createAdminDelivery('admin1', { ...baseInput, address: 'Depok, Jawa Barat' });
    expect(mockPrisma.address.create.mock.calls[0][0].data).toMatchObject({
      label: 'Manual Admin', isDefault: true, city: 'Depok', province: 'Jawa Barat',
    });
  });

  it('looks the menu up by exact case-insensitive name, not contains', async () => {
    await createAdminDelivery('admin1', baseInput);
    expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'Nasi Goreng', mode: 'insensitive' } },
    });
    expect(mockPrisma.recipe.create).not.toHaveBeenCalled();
  });

  it('creates the meal selection with the delivery mealType and the Jakarta weekday', async () => {
    await createAdminDelivery('admin1', baseInput);
    expect(mockPrisma.delivery.create.mock.calls[0][0].data.mealType).toBe('DINNER');
    expect(mockPrisma.mealSelection.findFirst).toHaveBeenCalledWith({
      where: { weeklyBoxId: 'box1', dayOfWeek: 'SELASA', mealType: 'DINNER' },
    });
    expect(mockPrisma.mealSelection.create.mock.calls[0][0].data).toMatchObject({
      weeklyBoxId: 'box1', recipeId: 'rec1', dayOfWeek: 'SELASA', mealType: 'DINNER',
    });
  });

  it('updates an existing matching selection instead of creating a duplicate', async () => {
    mockPrisma.mealSelection.findFirst.mockResolvedValue({ id: 'sel1' });
    await createAdminDelivery('admin1', baseInput);
    expect(mockPrisma.mealSelection.update).toHaveBeenCalledWith({ where: { id: 'sel1' }, data: { recipeId: 'rec1' } });
    expect(mockPrisma.mealSelection.create).not.toHaveBeenCalled();
  });

  it('unknown mealType falls back to LUNCH', async () => {
    await createAdminDelivery('admin1', { ...baseInput, mealType: 'BREAKFAST' });
    expect(mockPrisma.delivery.create.mock.calls[0][0].data.mealType).toBe('LUNCH');
  });

  it('skips meal selection for the placeholder menu', async () => {
    await createAdminDelivery('admin1', { ...baseInput, menu: 'Menu tidak tersedia' });
    expect(mockPrisma.recipe.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.mealSelection.create).not.toHaveBeenCalled();
  });
});

describe('updateAdminDelivery', () => {
  const DELIVERY = {
    id: 'del1', userId: 'cust1', addressId: 'addr-home', weeklyBoxId: 'box1',
    mealType: 'LUNCH', deliveryDate: new Date(LATE_MONDAY_UTC), status: 'PREPARING',
  };
  beforeEach(() => mockPrisma.delivery.findUnique.mockResolvedValue({ ...DELIVERY }));

  it('403 for non-admin', async () => {
    expect(((await updateAdminDelivery('cust1', 'del1', { status: 'SHIPPED' })) as any).status).toBe(403);
    expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
  });

  it('404 when delivery is missing', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue(null);
    expect(((await updateAdminDelivery('admin1', 'x', {})) as any).status).toBe(404);
  });

  it('400 on invalid status', async () => {
    const r: any = await updateAdminDelivery('admin1', 'del1', { status: 'LOST' });
    expect(r.status).toBe(400);
    expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
  });

  it('sets shippedAt / deliveredAt with the status', async () => {
    await updateAdminDelivery('admin1', 'del1', { status: 'SHIPPED' });
    expect(mockPrisma.delivery.update.mock.calls[0][0].data.shippedAt).toBeInstanceOf(Date);
    await updateAdminDelivery('admin1', 'del1', { status: 'DELIVERED' });
    expect(mockPrisma.delivery.update.mock.calls[1][0].data.deliveredAt).toBeInstanceOf(Date);
  });

  it('address edit creates a new row and never overwrites the customer address (regression)', async () => {
    await updateAdminDelivery('admin1', 'del1', { address: 'Bekasi, Jawa Barat' });
    expect(mockPrisma.address.update).not.toHaveBeenCalled();
    expect(mockPrisma.address.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.address.create.mock.calls[0][0].data).toMatchObject({
      userId: 'cust1', label: 'Manual Admin', isDefault: false, street: 'Bekasi, Jawa Barat',
      city: 'Bekasi', province: 'Jawa Barat', recipientName: 'Sari', phoneNumber: '0812', postalCode: '40111',
    });
    expect(mockPrisma.delivery.update.mock.calls[0][0].data.addressId).toBe('addr-new');
  });

  it('menu edit matches the selection by delivery mealType and Jakarta weekday', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ ...DELIVERY, mealType: 'DINNER' });
    mockPrisma.mealSelection.findFirst.mockResolvedValue({ id: 'sel9' });
    await updateAdminDelivery('admin1', 'del1', { menu: 'nasi goreng' });
    expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'nasi goreng', mode: 'insensitive' } },
    });
    expect(mockPrisma.mealSelection.findFirst).toHaveBeenCalledWith({
      where: { weeklyBoxId: 'box1', dayOfWeek: 'SELASA', mealType: 'DINNER' },
    });
    expect(mockPrisma.mealSelection.update).toHaveBeenCalledWith({ where: { id: 'sel9' }, data: { recipeId: 'rec1' } });
  });

  it('unknown menu creates a recipe owned by a nutritionist', async () => {
    mockPrisma.recipe.findFirst.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'nut1' });
    mockPrisma.recipe.create.mockResolvedValue({ id: 'rec-new' });
    await updateAdminDelivery('admin1', 'del1', { menu: 'Soto Ayam' });
    expect(mockPrisma.recipe.create.mock.calls[0][0].data).toMatchObject({ name: 'Soto Ayam', nutritionistId: 'nut1' });
    expect(mockPrisma.mealSelection.create.mock.calls[0][0].data).toMatchObject({ recipeId: 'rec-new', mealType: 'LUNCH' });
  });
});

describe('advanceDelivery', () => {
  it('PREPARING -> SHIPPED with shippedAt', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd', status: 'PREPARING', weeklyBoxId: 'box1' });
    const r: any = await advanceDelivery('admin1', 'd');
    expect(r.status).toBe(200);
    expect(mockPrisma.delivery.update.mock.calls[0][0].data).toMatchObject({ status: 'SHIPPED', shippedAt: expect.any(Date) });
    expect(mockPrisma.weeklyBox.update).not.toHaveBeenCalled();
  });

  it('SHIPPED -> DELIVERED completes the box when nothing is pending', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd', status: 'SHIPPED', weeklyBoxId: 'box1' });
    mockPrisma.delivery.count.mockResolvedValue(0);
    await advanceDelivery('admin1', 'd');
    expect(mockPrisma.weeklyBox.update).toHaveBeenCalledWith({ where: { id: 'box1' }, data: { status: 'COMPLETED' } });
  });

  it('does not complete the box while other deliveries are pending', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd', status: 'SHIPPED', weeklyBoxId: 'box1' });
    mockPrisma.delivery.count.mockResolvedValue(2);
    await advanceDelivery('admin1', 'd');
    expect(mockPrisma.weeklyBox.update).not.toHaveBeenCalled();
  });

  it('400 when already DELIVERED, 404 when missing, 403 for non-admin', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd', status: 'DELIVERED', weeklyBoxId: 'b' });
    expect(((await advanceDelivery('admin1', 'd')) as any).status).toBe(400);
    mockPrisma.delivery.findUnique.mockResolvedValue(null);
    expect(((await advanceDelivery('admin1', 'd')) as any).status).toBe(404);
    expect(((await advanceDelivery('cust1', 'd')) as any).status).toBe(403);
    expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
  });
});

describe('deleteAdminDelivery', () => {
  it('deletes for admin, 404 when missing, 403 for non-admin', async () => {
    mockPrisma.delivery.findUnique.mockResolvedValue({ id: 'd' });
    expect(((await deleteAdminDelivery('admin1', 'd')) as any).status).toBe(200);
    expect(mockPrisma.delivery.delete).toHaveBeenCalledWith({ where: { id: 'd' } });
    mockPrisma.delivery.findUnique.mockResolvedValue(null);
    expect(((await deleteAdminDelivery('admin1', 'd')) as any).status).toBe(404);
    expect(((await deleteAdminDelivery('nut1', 'd')) as any).status).toBe(403);
    expect(mockPrisma.delivery.delete).toHaveBeenCalledTimes(1);
  });
});

describe('getAdminDeliveries', () => {
  const row = {
    id: 'd1', deliveryDate: new Date(LATE_MONDAY_UTC), mealType: 'DINNER', status: 'PREPARING',
    shippedAt: null, deliveredAt: null,
    user: { id: 'cust1', name: 'Sari', subscriptions: [{ planType: 'WEEKLY' }] },
    address: { street: 'Jl. Melati 1', city: 'Bandung', province: 'Jawa Barat' },
    weeklyBox: {
      mealSelections: [
        { dayOfWeek: 'SELASA', mealType: 'LUNCH', recipe: { name: 'Wrong Meal' } },
        { dayOfWeek: 'SENIN', mealType: 'DINNER', recipe: { name: 'Wrong Day' } },
        { dayOfWeek: 'SELASA', mealType: 'DINNER', recipe: { name: 'Soto' } },
      ],
    },
  };

  it('is read-only: never creates deliveries, boxes, addresses or selections', async () => {
    mockPrisma.delivery.findMany.mockResolvedValue([row]);
    mockPrisma.delivery.count.mockResolvedValue(1);
    const r: any = await getAdminDeliveries('admin1');
    expect(r.status).toBe(200);
    for (const fn of [
      mockPrisma.delivery.create, mockPrisma.delivery.createMany, mockPrisma.delivery.upsert,
      mockPrisma.delivery.update, mockPrisma.weeklyBox.create, mockPrisma.address.create, mockPrisma.mealSelection.create,
    ]) expect(fn).not.toHaveBeenCalled();
  });

  it('matches the menu by Jakarta weekday AND mealType', async () => {
    mockPrisma.delivery.findMany.mockResolvedValue([row]);
    mockPrisma.delivery.count.mockResolvedValue(1);
    const r: any = await getAdminDeliveries('admin1');
    expect(r.data.data[0]).toMatchObject({ menu: 'Soto', plan: 'WEEKLY', address: 'Jl. Melati 1, Bandung, Jawa Barat' });
  });

  it('builds filters and pagination', async () => {
    mockPrisma.delivery.findMany.mockResolvedValue([]);
    mockPrisma.delivery.count.mockResolvedValue(25);
    const r: any = await getAdminDeliveries('admin1', { status: 'SHIPPED', mealType: 'LUNCH', search: 'sar', page: 3, limit: 10 });
    const args = mockPrisma.delivery.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ status: 'SHIPPED', mealType: 'LUNCH', user: { name: { contains: 'sar', mode: 'insensitive' } } });
    expect(args.skip).toBe(20);
    expect(r.data.pagination).toEqual({ total: 25, page: 3, limit: 10, totalPages: 3 });
  });

  it('403 for non-admin', async () => {
    expect(((await getAdminDeliveries('cust1')) as any).status).toBe(403);
    expect(mockPrisma.delivery.findMany).not.toHaveBeenCalled();
  });
});
