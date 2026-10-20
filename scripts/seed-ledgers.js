const { Client } = require('pg');

const connectionString = 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function seedLedgers() {
  const client = new Client({ connectionString });
  await client.connect();

  const txCountRes = await client.query('SELECT count(*) FROM "TransactionLedger";');
  const ingCountRes = await client.query('SELECT count(*) FROM "IngredientLedger";');

  console.log('Current ledger counts:', {
    transactionLedgers: txCountRes.rows[0].count,
    ingredientLedgers: ingCountRes.rows[0].count,
  });

  // Check existing transactions
  const txs = await client.query(`
    SELECT t.id, t."userId", t.amount, t.status, t."createdAt", u.name 
    FROM "Transaction" t
    JOIN "User" u ON u.id = t."userId"
    ORDER BY t."createdAt" DESC
    LIMIT 20;
  `);
  console.log(`Found ${txs.rows.length} existing transactions to sync into TransactionLedger.`);

  for (let i = 0; i < txs.rows.length; i++) {
    const row = txs.rows[i];
    const code = `#TRX-2026-${String(891 - i).padStart(4, '0')}`;
    const refCode = `INV/FF/260${String(891 - i).slice(-3)}`;
    
    await client.query(`
      INSERT INTO "TransactionLedger" (id, "transactionId", "userId", amount, status, "paymentMethod", code, "referenceCode", metadata, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
    `, [
      `tx_ledger_${row.id}`,
      row.id,
      row.userId,
      row.amount,
      row.status,
      'QRIS Midtrans',
      code,
      refCode,
      JSON.stringify({ volume: '1 Paket Mingguan', category: 'Meal Kit Organik' }),
      row.createdAt
    ]);
  }

  // Check ingredients
  const ingredients = await client.query('SELECT id, name, "stockKg" FROM "Ingredient" LIMIT 10;');
  console.log(`Found ${ingredients.rows.length} ingredients.`);

  // Admin user
  const admin = await client.query('SELECT id FROM "User" WHERE role = \'ADMIN\' LIMIT 1;');
  const adminId = admin.rows[0]?.id || null;

  // Users with weekly box
  const userBoxes = await client.query(`
    SELECT wb.id as "weeklyBoxId", wb."userId", ms.id as "mealSelectionId", r.name as "recipeName"
    FROM "WeeklyBox" wb
    JOIN "MealSelection" ms ON ms."weeklyBoxId" = wb.id
    JOIN "Recipe" r ON r.id = ms."recipeId"
    LIMIT 10;
  `);

  if (parseInt(ingCountRes.rows[0].count) === 0 && ingredients.rows.length > 0) {
    console.log('Seeding initial ingredient ledgers for UI verification...');
    
    const sampleLedgers = [
      {
        id: 'ing_ledger_01',
        ingredientId: ingredients.rows[0].id,
        sourceType: 'ADMIN_EDIT',
        status: 'COMPLETED',
        code: '#BB-2026-0412',
        referenceCode: 'TIK/IN/9021',
        adminUserId: adminId,
        qtyChangeKg: 25.0,
        stockBeforeKg: ingredients.rows[0].stockKg,
        stockAfterKg: ingredients.rows[0].stockKg + 25.0,
        notes: 'Penerimaan Verifikasi QC Panen Petani Mitra',
        createdAt: new Date('2026-09-28T14:30:00')
      },
      {
        id: 'ing_ledger_02',
        ingredientId: ingredients.rows[1]?.id || ingredients.rows[0].id,
        sourceType: 'ADMIN_EDIT',
        status: 'SIAP_PAKAI',
        code: '#BB-2026-0411',
        referenceCode: 'TIK/OUT/1844',
        adminUserId: adminId,
        qtyChangeKg: -12.5,
        stockBeforeKg: (ingredients.rows[1]?.stockKg || 100),
        stockAfterKg: (ingredients.rows[1]?.stockKg || 100) - 12.5,
        notes: 'Disalurkan ke Line Sortir & Pack',
        createdAt: new Date('2026-09-28T11:15:00')
      },
      {
        id: 'ing_ledger_03',
        ingredientId: ingredients.rows[2]?.id || ingredients.rows[0].id,
        sourceType: 'ADMIN_EDIT',
        status: 'MENUNGGU_DIKONFIRMASI',
        code: '#BB-2026-0410',
        referenceCode: 'TIK/QC/0931',
        adminUserId: adminId,
        qtyChangeKg: 50.0,
        stockBeforeKg: (ingredients.rows[2]?.stockKg || 50),
        stockAfterKg: (ingredients.rows[2]?.stockKg || 50) + 50.0,
        notes: 'Menunggu Konfirmasi Inspeksi Mutu',
        createdAt: new Date('2026-09-28T09:40:00')
      },
      {
        id: 'ing_ledger_04',
        ingredientId: ingredients.rows[0].id,
        sourceType: 'USER_PURCHASE',
        status: 'COMPLETED',
        code: '#BB-2026-0409',
        referenceCode: 'TIK/IN/9020',
        userId: userBoxes.rows[0]?.userId || null,
        weeklyBoxId: userBoxes.rows[0]?.weeklyBoxId || null,
        mealSelectionId: userBoxes.rows[0]?.mealSelectionId || null,
        qtyUsedKg: 0.15,
        menuName: userBoxes.rows[0]?.recipeName || 'Ayam Bakar Madu Quinoa',
        notes: 'Alokasi Porsi Meal Kit Konsumen',
        createdAt: new Date('2026-09-27T17:20:00')
      },
      {
        id: 'ing_ledger_05',
        ingredientId: ingredients.rows[1]?.id || ingredients.rows[0].id,
        sourceType: 'USER_PURCHASE',
        status: 'SIAP_PAKAI',
        code: '#BB-2026-0408',
        referenceCode: 'TIK/OUT/1843',
        userId: userBoxes.rows[1]?.userId || null,
        weeklyBoxId: userBoxes.rows[1]?.weeklyBoxId || null,
        mealSelectionId: userBoxes.rows[1]?.mealSelectionId || null,
        qtyUsedKg: 0.20,
        menuName: userBoxes.rows[1]?.recipeName || 'Salmon Panggang Saus Dill',
        notes: 'Alokasi Porsi Meal Kit Konsumen',
        createdAt: new Date('2026-09-27T14:05:00')
      }
    ];

    for (const item of sampleLedgers) {
      await client.query(`
        INSERT INTO "IngredientLedger" (
          id, "ingredientId", "sourceType", status, code, "referenceCode",
          "adminUserId", "qtyChangeKg", "stockBeforeKg", "stockAfterKg",
          "userId", "weeklyBoxId", "mealSelectionId", "qtyUsedKg", "menuName", notes, "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING;
      `, [
        item.id, item.ingredientId, item.sourceType, item.status, item.code, item.referenceCode,
        item.adminUserId, item.qtyChangeKg, item.stockBeforeKg, item.stockAfterKg,
        item.userId, item.weeklyBoxId, item.mealSelectionId, item.qtyUsedKg, item.menuName, item.notes, item.createdAt
      ]);
    }
  }

  const finalTx = await client.query('SELECT count(*) FROM "TransactionLedger";');
  const finalIng = await client.query('SELECT count(*) FROM "IngredientLedger";');
  console.log('Final counts in DB:', {
    transactionLedgers: finalTx.rows[0].count,
    ingredientLedgers: finalIng.rows[0].count
  });

  await client.end();
}

seedLedgers().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
