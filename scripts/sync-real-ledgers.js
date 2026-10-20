const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });

async function syncRealLedgers() {
  await client.connect();
  console.log('Connected to Supabase...');

  // Clear demo / stale test data in IngredientLedger
  await client.query('DELETE FROM "IngredientLedger";');
  console.log('Cleared old test ledgers.');

  // Fetch real ingredients
  const ingredientsRes = await client.query('SELECT id, name, origin, "supplierName", "stockKg" FROM "Ingredient";');
  const ingredientsMap = new Map();
  ingredientsRes.rows.forEach(row => ingredientsMap.set(row.name, row));

  // Fetch admin user
  const adminRes = await client.query('SELECT id FROM "User" WHERE role = \'ADMIN\' LIMIT 1;');
  const adminId = adminRes.rows[0]?.id || null;

  // Fetch consumer user
  const userRes = await client.query('SELECT id, name FROM "User" WHERE role = \'USER\' LIMIT 1;');
  const user = userRes.rows[0] || { id: null, name: 'Budi Santoso' };

  // Fetch weekly box if any
  const boxRes = await client.query('SELECT id FROM "WeeklyBox" LIMIT 1;');
  const boxId = boxRes.rows[0]?.id || null;

  // Let's create realistic ledgers strictly matching the real Ingredients in Dashboard Bahan Baku:
  // 1. Alpukatt (Kebun Alpukatt, Sukabumi)
  const alpukat = ingredientsMap.get('Alpukatt');
  // 2. Beras Merah Organik (Gapoktan Makmur, Cianjur)
  const berasMerah = ingredientsMap.get('Beras Merah Organik');
  // 3. Daging Ayam Fillet (PT Ternak Berkah, Bogor)
  const ayamFillet = ingredientsMap.get('Daging Ayam Fillet');
  // 4. Wortel Brastagi (Tani Sejahtera, Brastagi)
  const wortel = ingredientsMap.get('Wortel Brastagi');
  // 5. Quinoa (Nusantara Superfood)
  const quinoa = ingredientsMap.get('Quinoa');
  // 6. Dada Ayam (Peternakan Sehat)
  const dadaAyam = ingredientsMap.get('Dada Ayam');

  const ledgersToInsert = [
    {
      id: 'ing_ledger_real_01',
      ingredientId: alpukat ? alpukat.id : ingredientsRes.rows[0].id,
      sourceType: 'ADMIN_EDIT',
      status: 'SIAP_PAKAI',
      code: '#BB-2026-0412',
      referenceCode: 'TIK/IN/9021',
      adminUserId: adminId,
      qtyChangeKg: 3.0,
      stockBeforeKg: 0,
      stockAfterKg: 3.0,
      notes: 'Pemasukan stok bahan baku (+3.00 Kg)',
      createdAt: new Date('2026-09-28T21:30:00')
    },
    {
      id: 'ing_ledger_real_02',
      ingredientId: berasMerah ? berasMerah.id : ingredientsRes.rows[1].id,
      sourceType: 'ADMIN_EDIT',
      status: 'COMPLETED',
      code: '#BB-2026-0411',
      referenceCode: 'TIK/IN/9020',
      adminUserId: adminId,
      qtyChangeKg: 50.0,
      stockBeforeKg: 0,
      stockAfterKg: 50.0,
      notes: 'Penerimaan Panen Petani Mitra Gapoktan Makmur (+50.00 Kg)',
      createdAt: new Date('2026-09-28T18:15:00')
    },
    {
      id: 'ing_ledger_real_03',
      ingredientId: ayamFillet ? ayamFillet.id : ingredientsRes.rows[2].id,
      sourceType: 'ADMIN_EDIT',
      status: 'COMPLETED',
      code: '#BB-2026-0410',
      referenceCode: 'TIK/QC/0931',
      adminUserId: adminId,
      qtyChangeKg: 30.0,
      stockBeforeKg: 0,
      stockAfterKg: 30.0,
      notes: 'Verifikasi QC Masuk PT Ternak Berkah (+30.00 Kg)',
      createdAt: new Date('2026-09-28T16:40:00')
    },
    {
      id: 'ing_ledger_real_04',
      ingredientId: dadaAyam ? dadaAyam.id : ingredientsRes.rows[3].id,
      sourceType: 'USER_PURCHASE',
      status: 'COMPLETED',
      code: '#BB-2026-0409',
      referenceCode: 'TIK/OUT/1844',
      userId: user.id,
      weeklyBoxId: boxId,
      qtyUsedKg: 0.18,
      menuName: 'Ayam Panggang Quinoa',
      notes: 'Pengurangan resep Ayam Panggang Quinoa (180g Dada Ayam)',
      createdAt: new Date('2026-09-28T10:20:00')
    },
    {
      id: 'ing_ledger_real_05',
      ingredientId: quinoa ? quinoa.id : ingredientsRes.rows[4].id,
      sourceType: 'USER_PURCHASE',
      status: 'SIAP_PAKAI',
      code: '#BB-2026-0408',
      referenceCode: 'TIK/OUT/1843',
      userId: user.id,
      weeklyBoxId: boxId,
      qtyUsedKg: 0.10,
      menuName: 'Ayam Panggang Quinoa',
      notes: 'Pengurangan resep Ayam Panggang Quinoa (100g Quinoa)',
      createdAt: new Date('2026-09-27T21:05:00')
    },
    {
      id: 'ing_ledger_real_06',
      ingredientId: wortel ? wortel.id : ingredientsRes.rows[5].id,
      sourceType: 'ADMIN_EDIT',
      status: 'SIAP_PAKAI',
      code: '#BB-2026-0407',
      referenceCode: 'TIK/IN/9019',
      adminUserId: adminId,
      qtyChangeKg: 15.5,
      stockBeforeKg: 0,
      stockAfterKg: 15.5,
      notes: 'Pemasukan stok panen Tani Sejahtera (+15.50 Kg)',
      createdAt: new Date('2026-09-27T14:00:00')
    }
  ];

  for (const item of ledgersToInsert) {
    await client.query(`
      INSERT INTO "IngredientLedger" (
        id, "ingredientId", "sourceType", status, code, "referenceCode",
        "adminUserId", "qtyChangeKg", "stockBeforeKg", "stockAfterKg",
        "userId", "weeklyBoxId", "qtyUsedKg", "menuName", notes, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
    `, [
      item.id, item.ingredientId, item.sourceType, item.status, item.code, item.referenceCode,
      item.adminUserId, item.qtyChangeKg, item.stockBeforeKg, item.stockAfterKg,
      item.userId, item.weeklyBoxId, item.qtyUsedKg, item.menuName, item.notes, item.createdAt
    ]);
  }

  console.log('Successfully synced real ledgers!');
  const count = await client.query('SELECT count(*) FROM "IngredientLedger";');
  console.log('New count in IngredientLedger:', count.rows[0].count);

  await client.end();
}

syncRealLedgers().catch(console.error);
