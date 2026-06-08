import prisma from '@/lib/prisma';
import { DeliveryStatus, POStatus } from '@prisma/client';

describe('Admin Operations, Forecasting & Delivery Status (White Box Testing)', () => {
  let testFarmer: any;
  let testIngredient: any;
  let testPO: any;
  let testUser: any;
  let testWeeklyBox: any;
  let testDelivery: any;
  let testAddress: any;

  beforeAll(async () => {
    // Cleanup any leftovers from previous failed runs first
    await prisma.delivery.deleteMany({
      where: { user: { email: 'delivery_recipient@fromfram.test' } }
    });
    await prisma.address.deleteMany({
      where: { user: { email: 'delivery_recipient@fromfram.test' } }
    });
    await prisma.weeklyBox.deleteMany({
      where: { user: { email: 'delivery_recipient@fromfram.test' } }
    });
    await prisma.user.deleteMany({
      where: { email: 'delivery_recipient@fromfram.test' }
    });
    await prisma.farmerPurchaseOrder.deleteMany({
      where: { farmer: { name: 'Pak Budi Test Farmer' } }
    });
    await prisma.ingredient.deleteMany({
      where: { name: 'Lada Hitam Test' }
    });
    await prisma.farmer.deleteMany({
      where: { name: 'Pak Budi Test Farmer' }
    });

    // Setup test farmer
    testFarmer = await prisma.farmer.create({
      data: {
        name: 'Pak Budi Test Farmer',
        region: 'Lembang, Jawa Barat',
        commodityType: 'Sayuran',
      },
    });

    // Setup test ingredient
    testIngredient = await prisma.ingredient.create({
      data: {
        name: 'Lada Hitam Test',
        origin: 'Lembang',
        supplierName: 'Pak Budi Test Farmer',
        stockKg: 10,
        pricePerKg: 45000,
      },
    });

    // Setup test user & weekly box for delivery
    testUser = await prisma.user.create({
      data: {
        email: 'delivery_recipient@fromfram.test',
        name: 'Delivery Recipient',
        role: 'USER',
      },
    });

    const today = new Date();
    testWeeklyBox = await prisma.weeklyBox.create({
      data: {
        userId: testUser.id,
        weekStartDate: today,
        weekEndDate: today,
        selectionDeadline: today,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testDelivery) {
      await prisma.delivery.delete({ where: { id: testDelivery.id } });
    }
    if (testAddress) {
      await prisma.address.delete({ where: { id: testAddress.id } });
    }
    await prisma.weeklyBox.delete({ where: { id: testWeeklyBox.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    if (testPO) {
      await prisma.farmerPurchaseOrder.delete({ where: { id: testPO.id } });
    }
    await prisma.ingredient.delete({ where: { id: testIngredient.id } });
    await prisma.farmer.delete({ where: { id: testFarmer.id } });
  });

  it('should calculate demand forecast accurately', () => {
    // White Box logic test: Forecasting algorithm
    const calculateForecast = (activeUserCount: number, kgPerUser: number) => {
      const baseDemand = activeUserCount * kgPerUser;
      const safetyStock = baseDemand * 0.1; // 10% safety stock
      return parseFloat((baseDemand + safetyStock).toFixed(2));
    };

    const forecastValue = calculateForecast(100, 0.15); // 100 users, 150g per user
    expect(forecastValue).toEqual(16.5); // (100 * 0.15) = 15 + 1.5 = 16.5
  });

  it('should successfully create a Purchase Order for a farmer', async () => {
    const today = new Date();
    testPO = await prisma.farmerPurchaseOrder.create({
      data: {
        farmerId: testFarmer.id,
        ingredientId: testIngredient.id,
        weekStartDate: today,
        forecastedQtyKg: 50.0,
        orderedQtyKg: 50.0,
        pricePerKg: testIngredient.pricePerKg,
        totalPrice: 50.0 * testIngredient.pricePerKg,
        status: POStatus.DRAFT,
      },
    });

    expect(testPO).toBeDefined();
    expect(testPO.status).toEqual(POStatus.DRAFT);
    expect(testPO.totalPrice).toEqual(2250000); // 50kg * 45000/kg
  });

  it('should manage and update Delivery status path', async () => {
    // Create Address first
    testAddress = await prisma.address.create({
      data: {
        userId: testUser.id,
        label: 'Rumah',
        street: 'Jl. Test No. 1',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40123',
      },
    });

    // Create Delivery
    testDelivery = await prisma.delivery.create({
      data: {
        userId: testUser.id,
        weeklyBoxId: testWeeklyBox.id,
        addressId: testAddress.id,
        deliveryDate: new Date(),
        mealType: 'LUNCH',
        status: DeliveryStatus.PREPARING,
      },
    });

    expect(testDelivery.status).toEqual(DeliveryStatus.PREPARING);

    // Update to SHIPPED
    const shippedDelivery = await prisma.delivery.update({
      where: { id: testDelivery.id },
      data: {
        status: DeliveryStatus.SHIPPED,
        shippedAt: new Date(),
      },
    });
    expect(shippedDelivery.status).toEqual(DeliveryStatus.SHIPPED);

    // Update to DELIVERED
    const deliveredDelivery = await prisma.delivery.update({
      where: { id: testDelivery.id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });
    expect(deliveredDelivery.status).toEqual(DeliveryStatus.DELIVERED);
  });
});
