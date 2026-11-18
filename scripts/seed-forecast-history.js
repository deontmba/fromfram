// Run with: node --env-file=.env scripts/seed-forecast-history.js
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addWeeks(date, weeks) {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

// Random float in [min, max] rounded to 2 decimal places
function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// ─── Seed Data Definitions ──────────────────────────────────────────────────

const INGREDIENTS = [
  { name: 'Brokoli',      origin: 'Lembang, Jawa Barat',    supplierName: 'Mitra Sayur Lembang',    isAllergen: false, stockKg: 45,  pricePerKg: 18000, factor: 0.18 },
  { name: 'Tomat',        origin: 'Cianjur, Jawa Barat',    supplierName: 'Kebun Tomat Cianjur',    isAllergen: false, stockKg: 60,  pricePerKg: 10000, factor: 0.20 },
  { name: 'Bayam',        origin: 'Bogor, Jawa Barat',      supplierName: 'Petani Sayuran Bogor',   isAllergen: false, stockKg: 30,  pricePerKg: 12000, factor: 0.12 },
  { name: 'Wortel',       origin: 'Garut, Jawa Barat',      supplierName: 'Kebun Wortel Garut',     isAllergen: false, stockKg: 55,  pricePerKg: 9500,  factor: 0.15 },
  { name: 'Dada Ayam',    origin: 'Jawa Tengah',            supplierName: 'Peternakan Ayam Jateng', isAllergen: false, stockKg: 80,  pricePerKg: 42000, factor: 0.25 },
  { name: 'Daging Sapi',  origin: 'Jawa Timur',             supplierName: 'Peternakan Sapi Jatim',  isAllergen: false, stockKg: 40,  pricePerKg: 130000,factor: 0.20 },
  { name: 'Tempe',        origin: 'Jawa Tengah',            supplierName: 'Pabrik Tempe Lokal',     isAllergen: false, stockKg: 50,  pricePerKg: 14000, factor: 0.22 },
  { name: 'Tahu',         origin: 'Jawa Barat',             supplierName: 'Pabrik Tahu Organik',    isAllergen: false, stockKg: 45,  pricePerKg: 12000, factor: 0.20 },
  { name: 'Beras Merah',  origin: 'Cianjur, Jawa Barat',    supplierName: 'Sawah Organik Cianjur',  isAllergen: false, stockKg: 100, pricePerKg: 22000, factor: 0.30 },
  { name: 'Salmon',       origin: 'Sumatera Utara',         supplierName: 'Tambak Salmon Sumatera', isAllergen: true,  stockKg: 25,  pricePerKg: 95000, factor: 0.15 },
  { name: 'Bawang Putih', origin: 'Jawa Tengah',            supplierName: 'Kebun Bawang Jateng',    isAllergen: false, stockKg: 20,  pricePerKg: 32000, factor: 0.05 },
  { name: 'Bawang Merah', origin: 'Brebes, Jawa Tengah',    supplierName: 'Petani Bawang Brebes',   isAllergen: false, stockKg: 25,  pricePerKg: 28000, factor: 0.06 },
  { name: 'Cabai',        origin: 'Jawa Timur',             supplierName: 'Kebun Cabai Jatim',      isAllergen: false, stockKg: 15,  pricePerKg: 45000, factor: 0.04 },
  { name: 'Jahe',         origin: 'Sumatera Barat',         supplierName: 'Kebun Rempah Sumbar',    isAllergen: false, stockKg: 10,  pricePerKg: 24000, factor: 0.03 },
  { name: 'Kunyit',       origin: 'Jawa Tengah',            supplierName: 'Rempah Nusantara Jateng',isAllergen: false, stockKg: 8,   pricePerKg: 20000, factor: 0.02 },
];

const FARMERS = [
  {
    id: 'farmer_seed_01',
    name: 'Bu Sri Wahyuni',
    phoneNumber: '081234567001',
    region: 'Cianjur, Jawa Barat',
    commodityType: 'Sayuran Hijau',
    isActive: true,
    ingredients: ['Brokoli', 'Bayam', 'Tomat'],
  },
  {
    id: 'farmer_seed_02',
    name: 'Pak Agus Santoso',
    phoneNumber: '081234567002',
    region: 'Lembang, Jawa Barat',
    commodityType: 'Protein Hewani',
    isActive: true,
    ingredients: ['Dada Ayam', 'Daging Sapi'],
  },
  {
    id: 'farmer_seed_03',
    name: 'Pak Hendra Wijaya',
    phoneNumber: '081234567003',
    region: 'Garut, Jawa Barat',
    commodityType: 'Umbi & Rempah',
    isActive: true,
    ingredients: ['Wortel', 'Jahe', 'Kunyit'],
  },
  {
    id: 'farmer_seed_04',
    name: 'Pak Bambang Susilo',
    phoneNumber: '081234567004',
    region: 'Brebes, Jawa Tengah',
    commodityType: 'Rempah & Bumbu',
    isActive: true,
    ingredients: ['Bawang Putih', 'Bawang Merah', 'Cabai'],
  },
  {
    id: 'farmer_seed_05',
    name: 'Bu Dewi Rahayu',
    phoneNumber: '081234567005',
    region: 'Cianjur, Jawa Barat',
    commodityType: 'Biji-bijian & Kacang',
    isActive: true,
    ingredients: ['Beras Merah', 'Tempe', 'Tahu'],
  },
  {
    id: 'farmer_seed_06',
    name: 'Pak Joko Prayitno',
    phoneNumber: '081234567006',
    region: 'Medan, Sumatera Utara',
    commodityType: 'Perikanan Segar',
    isActive: true,
    ingredients: ['Salmon'],
  },
];

const GOALS = [
  {
    id: 'goal_seed_01',
    name: 'Penurunan Berat Badan',
    description: 'Program makan sehat rendah kalori untuk membantu mencapai berat badan ideal.',
    minCalories: 1200,
    maxCalories: 1600,
  },
  {
    id: 'goal_seed_02',
    name: 'Hidup Sehat & Aktif',
    description: 'Menu seimbang untuk mendukung gaya hidup aktif dan menjaga kesehatan optimal.',
    minCalories: 1600,
    maxCalories: 2200,
  },
  {
    id: 'goal_seed_03',
    name: 'Bulking Massa Otot',
    description: 'Paket tinggi protein dan kalori untuk mendukung pembentukan massa otot.',
    minCalories: 2200,
    maxCalories: 3000,
  },
  {
    id: 'goal_seed_04',
    name: 'Vegetarian',
    description: 'Menu nabati lengkap tanpa daging, kaya serat dan nutrisi dari sayuran segar.',
    minCalories: 1400,
    maxCalories: 2000,
  },
  {
    id: 'goal_seed_05',
    name: 'Diet Diabetes Friendly',
    description: 'Menu rendah gula dan indeks glikemik rendah untuk manajemen gula darah.',
    minCalories: 1300,
    maxCalories: 1800,
  },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to database.');

  // ── 1. Goals ────────────────────────────────────────────────────────────
  console.log('\n[1/5] Seeding Goals...');
  for (const g of GOALS) {
    await client.query(
      `INSERT INTO "Goal" (id, name, description, "minCalories", "maxCalories")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO NOTHING;`,
      [g.id, g.name, g.description, g.minCalories, g.maxCalories]
    );
  }
  console.log(`  → ${GOALS.length} goal(s) upserted (ON CONFLICT DO NOTHING).`);

  // ── 2. Ingredients ──────────────────────────────────────────────────────
  console.log('\n[2/5] Seeding Ingredients...');
  const ingredientMap = {}; // name → id
  for (const ing of INGREDIENTS) {
    // Check if already exists
    const existing = await client.query(
      `SELECT id FROM "Ingredient" WHERE name = $1 LIMIT 1;`,
      [ing.name]
    );
    if (existing.rows.length > 0) {
      ingredientMap[ing.name] = existing.rows[0].id;
      console.log(`  → "${ing.name}" already exists (id=${existing.rows[0].id}), skipping insert.`);
    } else {
      const cuid = `ing_seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await client.query(
        `INSERT INTO "Ingredient" (id, name, origin, "supplierName", "isAllergen", "stockKg", "pricePerKg")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name) DO NOTHING;`,
        [cuid, ing.name, ing.origin, ing.supplierName, ing.isAllergen, ing.stockKg, ing.pricePerKg]
      );
      // Re-fetch to get actual id (cuid or existing)
      const fetched = await client.query(`SELECT id FROM "Ingredient" WHERE name = $1 LIMIT 1;`, [ing.name]);
      ingredientMap[ing.name] = fetched.rows[0]?.id ?? cuid;
      console.log(`  → "${ing.name}" inserted.`);
    }
  }
  console.log(`  → Ingredient map built for ${Object.keys(ingredientMap).length} ingredients.`);

  // ── 3. Farmers ──────────────────────────────────────────────────────────
  console.log('\n[3/5] Seeding Farmers...');
  for (const f of FARMERS) {
    await client.query(
      `INSERT INTO "Farmer" (id, name, "phoneNumber", region, "commodityType", "isActive", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO NOTHING;`,
      [f.id, f.name, f.phoneNumber, f.region, f.commodityType, f.isActive]
    );
    console.log(`  → Farmer "${f.name}" upserted.`);
  }

  // ── 4. FarmerSupplyItems ─────────────────────────────────────────────────
  console.log('\n[4/5] Seeding FarmerSupplyItems...');
  const supplyPricingMap = {
    'Brokoli':      { weekly: 200, min: 10, price: 16000 },
    'Tomat':        { weekly: 250, min: 15, price:  8500 },
    'Bayam':        { weekly: 150, min:  8, price: 10000 },
    'Wortel':       { weekly: 300, min: 20, price:  8000 },
    'Dada Ayam':    { weekly: 400, min: 25, price: 38000 },
    'Daging Sapi':  { weekly: 200, min: 10, price:120000 },
    'Tempe':        { weekly: 250, min: 15, price: 12000 },
    'Tahu':         { weekly: 300, min: 20, price: 10000 },
    'Beras Merah':  { weekly: 500, min: 30, price: 20000 },
    'Salmon':       { weekly: 100, min:  5, price: 88000 },
    'Bawang Putih': { weekly: 100, min:  5, price: 29000 },
    'Bawang Merah': { weekly: 150, min: 10, price: 25000 },
    'Cabai':        { weekly:  80, min:  5, price: 40000 },
    'Jahe':         { weekly:  60, min:  3, price: 21000 },
    'Kunyit':       { weekly:  50, min:  3, price: 18000 },
  };

  let supplyCount = 0;
  for (const f of FARMERS) {
    for (const ingName of f.ingredients) {
      const ingId = ingredientMap[ingName];
      if (!ingId) { console.warn(`  ⚠ No ID found for ingredient "${ingName}", skipping.`); continue; }
      const p = supplyPricingMap[ingName] || { weekly: 100, min: 5, price: 15000 };
      const supplyId = `fsi_seed_${f.id}_${ingName.replace(/\s/g, '_').toLowerCase()}`;
      await client.query(
        `INSERT INTO "FarmerSupplyItem" (id, "farmerId", "ingredientId", "weeklyCapacityKg", "minOrderKg", "pricePerKg")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ("farmerId", "ingredientId") DO NOTHING;`,
        [supplyId, f.id, ingId, p.weekly, p.min, p.price]
      );
      supplyCount++;
      console.log(`  → FarmerSupplyItem: ${f.name} → ${ingName}`);
    }
  }
  console.log(`  → ${supplyCount} supply item(s) upserted.`);

  // ── 5. DemandForecastLog (12 weeks historical) ───────────────────────────
  console.log('\n[5/5] Seeding DemandForecastLog (12 weeks historical)...');

  // Start from Monday 12 weeks ago
  const thisMonday = getMondayOf(new Date());
  const startMonday = addWeeks(thisMonday, -12);

  let forecastCount = 0;
  for (const ing of INGREDIENTS) {
    const ingId = ingredientMap[ing.name];
    if (!ingId) continue;

    for (let w = 0; w < 12; w++) {
      const weekStart = addWeeks(startMonday, w);
      // Active users grow gradually: starts 15, adds ~2-3 per week, capped ~50
      const activeUserCount = Math.min(50, Math.round(15 + w * 2.8 + rand(-1, 2)));
      // Predicted qty based on users * ingredient factor
      const predictedQtyKg = Math.round((activeUserCount * ing.factor + rand(-0.5, 0.5)) * 10) / 10;
      // Actual differs ±10-20%
      const delta = rand(0.80, 1.20);
      const actualQtyUsedKg = Math.round(predictedQtyKg * delta * 10) / 10;
      // Confidence grows over time: 0.60 → 0.95
      const confidenceScore = Math.round((0.60 + (w / 11) * 0.35 + rand(-0.02, 0.02)) * 100) / 100;
      const clampedConf = Math.min(0.97, Math.max(0.55, confidenceScore));

      // ID: deterministic so we can re-run safely
      const logId = `dfl_seed_${ingId.slice(-8)}_w${String(w).padStart(2, '0')}`;

      await client.query(
        `INSERT INTO "DemandForecastLog"
           (id, "ingredientId", "weekStartDate", "activeUserCount", "predictedQtyKg", "actualQtyUsedKg", "confidenceScore", "modelVersion", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING;`,
        [
          logId,
          ingId,
          weekStart.toISOString(),
          activeUserCount,
          predictedQtyKg,
          actualQtyUsedKg,
          clampedConf,
          'ridge-v1',
          weekStart.toISOString(),
        ]
      );
      forecastCount++;
    }
    console.log(`  → 12 forecast logs seeded for "${ing.name}".`);
  }
  console.log(`  → Total: ${forecastCount} DemandForecastLog rows upserted.`);

  // ── Summary ─────────────────────────────────────────────────────────────
  const [gCount, ingCount, farmerCount, fsiCount, dflCount] = await Promise.all([
    client.query('SELECT count(*) FROM "Goal";'),
    client.query('SELECT count(*) FROM "Ingredient";'),
    client.query('SELECT count(*) FROM "Farmer";'),
    client.query('SELECT count(*) FROM "FarmerSupplyItem";'),
    client.query('SELECT count(*) FROM "DemandForecastLog";'),
  ]);
  console.log('\n── Final DB row counts ──────────────────────────────');
  console.log(`  Goal              : ${gCount.rows[0].count}`);
  console.log(`  Ingredient        : ${ingCount.rows[0].count}`);
  console.log(`  Farmer            : ${farmerCount.rows[0].count}`);
  console.log(`  FarmerSupplyItem  : ${fsiCount.rows[0].count}`);
  console.log(`  DemandForecastLog : ${dflCount.rows[0].count}`);
  console.log('────────────────────────────────────────────────────\n');

  await client.end();
  console.log('Done. Connection closed.');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
