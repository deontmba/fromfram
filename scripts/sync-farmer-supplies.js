/**
 * sync-farmer-supplies.js
 * ============================================================
 * Mendaftarkan seluruh Ingredient di database ke FarmerSupplyItem
 * dengan mitra/supplier aslinya masing-masing, sehingga query Python lama
 * maupun baru 100% membaca SEMUA bahan baku di Supabase!
 *
 * Jalankan:
 *   node --env-file=.env scripts/sync-farmer-supplies.js
 * ============================================================
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log('🔄 Menghubungkan seluruh Bahan Baku ke Mitra Tani (FarmerSupplyItem)...\n');

  const ingredients = await prisma.ingredient.findMany();
  console.log(`📦 Ditemukan ${ingredients.length} total bahan baku di database.\n`);

  let addedCount = 0;

  for (const ing of ingredients) {
    const supplierName = ing.supplierName && ing.supplierName !== '-' ? ing.supplierName : 'Mitra Mandiri';
    const region = ing.origin && ing.origin !== '-' ? ing.origin : 'Jawa Barat';
    const farmerId = `farmer_${ing.id.replace(/[^a-zA-Z0-9]/g, '_').slice(-16)}`;

    // 1. Pastikan Farmer ada
    await prisma.farmer.upsert({
      where: { id: farmerId },
      update: {
        name: supplierName,
        region: region,
      },
      create: {
        id: farmerId,
        name: supplierName,
        region: region,
        commodityType: 'Komoditas Pangan',
        isActive: true,
      },
    });

    // 2. Pastikan FarmerSupplyItem ada untuk bahan ini
    const existingSupply = await prisma.farmerSupplyItem.findFirst({
      where: {
        ingredientId: ing.id,
      },
    });

    if (!existingSupply) {
      await prisma.farmerSupplyItem.create({
        data: {
          farmerId: farmerId,
          ingredientId: ing.id,
          pricePerKg: ing.pricePerKg > 0 ? ing.pricePerKg : 15000,
          minOrderKg: 5.0,
          weeklyCapacityKg: 500.0,
        },
      });
      console.log(`   ✅ Didaftarkan ke mitra: ${ing.name} → ${supplierName} (${region})`);
      addedCount++;
    } else {
      console.log(`   ⏭️  Sudah terdaftar: ${ing.name}`);
    }
  }

  const totalSupplies = await prisma.farmerSupplyItem.count();
  console.log(`\n🎉 SELESAI: ${addedCount} supply item baru ditambahkan.`);
  console.log(`📊 Total bahan baku yang terhubung ke mitra sekarang: ${totalSupplies} item.\n`);
}

main()
  .catch((e) => {
    console.error('❌ Gagal sinkronisasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
