/**
 * seed-rich-data.js
 * ============================================================
 * Tambah data ke DB yang sudah ada (idempotent: ON CONFLICT DO NOTHING).
 * Menambahkan:
 *   1. 32 bahan baku baru  → total 50+ Ingredient
 *   2. 15 resep baru       → total 22+ Recipe
 *   3. RecipeIngredient    → setiap bahan baku minimal ada di 1-2 resep
 *   4. WeeklyMenu 12 minggu historis (minggu ke -12 s.d. -1)
 *   5. IngredientLedger USER_PURCHASE historis (terlihat di Pencatatan)
 *   6. DemandForecastLog historis (data latih Ridge Regression)
 *
 * Jalankan:
 *   node --env-file=.env scripts/seed-rich-data.js
 * ============================================================
 */

require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function rand(min, max, decimals = 1) {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

const NOW = new Date();
const THIS_WEEK = startOfWeek(NOW);

// ─── 1. Data bahan baku baru ─────────────────────────────────────────────────
// 18 bahan sudah ada di seed.js (Dada Ayam, Quinoa, Salmon, Oat, Pisang,
// Greek Yogurt, Brokoli, Tomat, Bayam, Beras Merah, Alpukat, Chia Seed,
// Madu, Bawang Putih, Wortel, Daging Sapi, Apel, Jahe)
const NEW_INGREDIENTS = [
  // ── Protein ─────────────────────────────────────────────────────────────
  { name: "Udang Segar",      origin: "Sidoarjo, Jawa Timur",    supplierName: "Tambak Nusantara",   isAllergen: true,  stockKg: 40,  pricePerKg: 65000 },
  { name: "Ikan Nila",        origin: "Sukabumi, Jawa Barat",    supplierName: "Kolam Segar",        isAllergen: false, stockKg: 55,  pricePerKg: 32000 },
  { name: "Ikan Lele",        origin: "Bogor, Jawa Barat",       supplierName: "Budidaya Lele Jaya", isAllergen: false, stockKg: 60,  pricePerKg: 25000 },
  { name: "Tempe",            origin: "Bandung, Jawa Barat",     supplierName: "Pabrik Tempe Murni", isAllergen: false, stockKg: 80,  pricePerKg: 15000 },
  { name: "Tahu Organik",     origin: "Bandung, Jawa Barat",     supplierName: "Pabrik Tahu Organik",isAllergen: false, stockKg: 45,  pricePerKg: 10000 },
  { name: "Telur Ayam",       origin: "Ciamis, Jawa Barat",      supplierName: "Peternakan Barokah", isAllergen: true,  stockKg: 100, pricePerKg: 28000 },
  { name: "Dada Bebek",       origin: "Cirebon, Jawa Barat",     supplierName: "Itik Nusantara",     isAllergen: false, stockKg: 25,  pricePerKg: 55000 },

  // ── Sayuran ──────────────────────────────────────────────────────────────
  { name: "Kangkung",         origin: "Bogor, Jawa Barat",       supplierName: "Sayur Segar",        isAllergen: false, stockKg: 50,  pricePerKg: 8000  },
  { name: "Sawi Hijau",       origin: "Lembang, Jawa Barat",     supplierName: "Sayur Lembang",      isAllergen: false, stockKg: 45,  pricePerKg: 9000  },
  { name: "Paprika Merah",    origin: "Bandung, Jawa Barat",     supplierName: "Sayur Premium",      isAllergen: false, stockKg: 30,  pricePerKg: 35000 },
  { name: "Jagung Manis",     origin: "Malang, Jawa Timur",      supplierName: "Kebun Jagung Manis", isAllergen: false, stockKg: 90,  pricePerKg: 12000 },
  { name: "Labu Kuning",      origin: "Cianjur, Jawa Barat",     supplierName: "Petani Cianjur",     isAllergen: false, stockKg: 70,  pricePerKg: 10000 },
  { name: "Terong Ungu",      origin: "Sukabumi, Jawa Barat",    supplierName: "Sayur Sukabumi",     isAllergen: false, stockKg: 40,  pricePerKg: 12000 },
  { name: "Jamur Tiram",      origin: "Lembang, Jawa Barat",     supplierName: "Budidaya Jamur Lembang", isAllergen: false, stockKg: 30, pricePerKg: 28000 },
  { name: "Selada Keriting",  origin: "Bogor, Jawa Barat",       supplierName: "Sayur Segar",        isAllergen: false, stockKg: 25,  pricePerKg: 18000 },
  { name: "Kol Putih",        origin: "Cianjur, Jawa Barat",     supplierName: "Petani Mitra",       isAllergen: false, stockKg: 60,  pricePerKg: 8000  },
  { name: "Buncis",           origin: "Lembang, Jawa Barat",     supplierName: "Sayur Lembang",      isAllergen: false, stockKg: 35,  pricePerKg: 14000 },
  { name: "Daun Bawang",      origin: "Bogor, Jawa Barat",       supplierName: "Petani Mitra",       isAllergen: false, stockKg: 20,  pricePerKg: 20000 },
  { name: "Seledri",          origin: "Bandung, Jawa Barat",     supplierName: "Sayur Premium",      isAllergen: false, stockKg: 15,  pricePerKg: 22000 },

  // ── Karbohidrat ──────────────────────────────────────────────────────────
  { name: "Kentang",          origin: "Dieng, Jawa Tengah",      supplierName: "Petani Dieng",       isAllergen: false, stockKg: 120, pricePerKg: 15000 },
  { name: "Ubi Ungu",         origin: "Bogor, Jawa Barat",       supplierName: "Kebun Ubi",          isAllergen: false, stockKg: 80,  pricePerKg: 18000 },
  { name: "Singkong",         origin: "Ciamis, Jawa Barat",      supplierName: "Petani Ciamis",      isAllergen: false, stockKg: 70,  pricePerKg: 8000  },
  { name: "Roti Gandum",      origin: "Jakarta, DKI Jakarta",    supplierName: "Bakery Sehat",       isAllergen: false, stockKg: 30,  pricePerKg: 45000 },
  { name: "Pasta Gandum",     origin: "Jakarta, DKI Jakarta",    supplierName: "Impor Mitra",        isAllergen: false, stockKg: 25,  pricePerKg: 38000 },

  // ── Buah ─────────────────────────────────────────────────────────────────
  { name: "Mangga",           origin: "Probolinggo, Jawa Timur", supplierName: "Kebun Mangga Jatim", isAllergen: false, stockKg: 60,  pricePerKg: 20000 },
  { name: "Nanas",            origin: "Subang, Jawa Barat",      supplierName: "Kebun Nanas",        isAllergen: false, stockKg: 50,  pricePerKg: 15000 },
  { name: "Semangka",         origin: "Indramayu, Jawa Barat",   supplierName: "Petani Indramayu",   isAllergen: false, stockKg: 80,  pricePerKg: 10000 },
  { name: "Melon",            origin: "Magelang, Jawa Tengah",   supplierName: "Kebun Melon Jateng", isAllergen: false, stockKg: 55,  pricePerKg: 18000 },
  { name: "Jeruk Siam",       origin: "Pontianak, Kalimantan Barat", supplierName: "Citrus Kalimantan", isAllergen: false, stockKg: 60, pricePerKg: 20000 },

  // ── Rempah & Bumbu ───────────────────────────────────────────────────────
  { name: "Kunyit",           origin: "Sumedang, Jawa Barat",    supplierName: "Rempah Asli",        isAllergen: false, stockKg: 20,  pricePerKg: 20000 },
  { name: "Lengkuas",         origin: "Bogor, Jawa Barat",       supplierName: "Rempah Nusantara",   isAllergen: false, stockKg: 15,  pricePerKg: 18000 },
  { name: "Daun Salam",       origin: "Bogor, Jawa Barat",       supplierName: "Rempah Nusantara",   isAllergen: false, stockKg: 10,  pricePerKg: 15000 },
  { name: "Ketumbar",         origin: "Jombang, Jawa Timur",     supplierName: "Bumbu Asli",         isAllergen: false, stockKg: 10,  pricePerKg: 25000 },
  { name: "Bawang Merah",     origin: "Brebes, Jawa Tengah",     supplierName: "Petani Brebes",      isAllergen: false, stockKg: 50,  pricePerKg: 30000 },
  { name: "Cabai Merah",      origin: "Garut, Jawa Barat",       supplierName: "Petani Garut",       isAllergen: false, stockKg: 25,  pricePerKg: 40000 },
  { name: "Lemon",            origin: "Sukabumi, Jawa Barat",    supplierName: "Kebun Citrus",       isAllergen: false, stockKg: 20,  pricePerKg: 35000 },
  { name: "Minyak Zaitun",    origin: "Import",                  supplierName: "Impor Mitra",        isAllergen: false, stockKg: 15,  pricePerKg: 150000 },
  { name: "Susu Rendah Lemak",origin: "Boyolali, Jawa Tengah",   supplierName: "Dairy Nusantara",    isAllergen: true,  stockKg: 40,  pricePerKg: 20000 },
];

// ─── 2. Resep baru ───────────────────────────────────────────────────────────
const NEW_RECIPES = [
  {
    name: "Tumis Tempe Kangkung",
    description: "Tempe dan kangkung tumis bumbu bawang dengan sedikit cabai, kaya serat dan protein nabati.",
    calories: 380, protein: 22, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Tempe",        qtyKg: 0.200 },
      { name: "Kangkung",     qtyKg: 0.150 },
      { name: "Bawang Putih", qtyKg: 0.020 },
      { name: "Bawang Merah", qtyKg: 0.030 },
      { name: "Cabai Merah",  qtyKg: 0.010 },
    ],
  },
  {
    name: "Sup Jagung Ayam",
    description: "Sup bening jagung manis dengan ayam cincang, daun bawang, dan seledri.",
    calories: 420, protein: 32, servings: 3,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Dada Ayam",    qtyKg: 0.200 },
      { name: "Jagung Manis", qtyKg: 0.150 },
      { name: "Daun Bawang",  qtyKg: 0.030 },
      { name: "Seledri",      qtyKg: 0.020 },
      { name: "Bawang Putih", qtyKg: 0.015 },
    ],
  },
  {
    name: "Udang Goreng Kunyit",
    description: "Udang segar marinasi kunyit dan lengkuas, digoreng kering bersama bawang.",
    calories: 480, protein: 36, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Udang Segar",  qtyKg: 0.250 },
      { name: "Kunyit",       qtyKg: 0.010 },
      { name: "Lengkuas",     qtyKg: 0.010 },
      { name: "Bawang Putih", qtyKg: 0.020 },
      { name: "Bawang Merah", qtyKg: 0.025 },
    ],
  },
  {
    name: "Lele Bakar Sambal",
    description: "Lele segar dibakar dengan sambal tomat segar dan lalapan daun kemangi.",
    calories: 410, protein: 35, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Ikan Lele",    qtyKg: 0.300 },
      { name: "Tomat",        qtyKg: 0.080 },
      { name: "Cabai Merah",  qtyKg: 0.015 },
      { name: "Bawang Merah", qtyKg: 0.020 },
      { name: "Bawang Putih", qtyKg: 0.015 },
    ],
  },
  {
    name: "Nila Kukus Jahe",
    description: "Ikan nila segar dikukus dengan jahe, daun salam dan sedikit minyak zaitun.",
    calories: 350, protein: 30, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Ikan Nila",       qtyKg: 0.300 },
      { name: "Jahe",            qtyKg: 0.020 },
      { name: "Daun Salam",      qtyKg: 0.005 },
      { name: "Minyak Zaitun",   qtyKg: 0.010 },
      { name: "Lemon",           qtyKg: 0.030 },
    ],
  },
  {
    name: "Bebek Panggang Rempah",
    description: "Dada bebek marinasi ketumbar dan kunyit, dipanggang dengan paprika merah.",
    calories: 530, protein: 40, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Dada Bebek",   qtyKg: 0.250 },
      { name: "Ketumbar",     qtyKg: 0.008 },
      { name: "Kunyit",       qtyKg: 0.008 },
      { name: "Paprika Merah",qtyKg: 0.100 },
      { name: "Bawang Putih", qtyKg: 0.020 },
    ],
  },
  {
    name: "Telur Dadar Sayuran",
    description: "Telur dadar isi wortel, daun bawang, dan sawi hijau, cocok untuk sarapan.",
    calories: 280, protein: 18, servings: 1,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Telur Ayam",   qtyKg: 0.120 }, // ~2 butir
      { name: "Wortel",       qtyKg: 0.050 },
      { name: "Daun Bawang",  qtyKg: 0.025 },
      { name: "Sawi Hijau",   qtyKg: 0.060 },
    ],
  },
  {
    name: "Tahu Bakar Lemon",
    description: "Tahu organik dibakar dengan marinasi lemon dan minyak zaitun, ditaburi selada.",
    calories: 310, protein: 20, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Tahu Organik",    qtyKg: 0.300 },
      { name: "Lemon",           qtyKg: 0.040 },
      { name: "Minyak Zaitun",   qtyKg: 0.015 },
      { name: "Selada Keriting", qtyKg: 0.060 },
      { name: "Bawang Putih",    qtyKg: 0.010 },
    ],
  },
  {
    name: "Kentang Panggang Herbs",
    description: "Kentang panggang dengan rosemary, bawang merah, dan lemon, sebagai pengganti nasi.",
    calories: 340, protein: 7, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Kentang",      qtyKg: 0.350 },
      { name: "Bawang Merah", qtyKg: 0.040 },
      { name: "Lemon",        qtyKg: 0.030 },
      { name: "Minyak Zaitun",qtyKg: 0.015 },
    ],
  },
  {
    name: "Sup Labu Kuning",
    description: "Sup krim labu kuning dengan susu rendah lemak dan sedikit kunyit.",
    calories: 290, protein: 10, servings: 3,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Labu Kuning",       qtyKg: 0.400 },
      { name: "Susu Rendah Lemak", qtyKg: 0.200 },
      { name: "Kunyit",            qtyKg: 0.008 },
      { name: "Bawang Putih",      qtyKg: 0.015 },
      { name: "Seledri",           qtyKg: 0.015 },
    ],
  },
  {
    name: "Tumis Jamur Paprika",
    description: "Jamur tiram dan paprika merah tumis bawang, cocok sebagai lauk vegetarian.",
    calories: 220, protein: 12, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Jamur Tiram",  qtyKg: 0.200 },
      { name: "Paprika Merah",qtyKg: 0.100 },
      { name: "Bawang Merah", qtyKg: 0.030 },
      { name: "Bawang Putih", qtyKg: 0.015 },
    ],
  },
  {
    name: "Stir Fry Sawi Tahu",
    description: "Sawi hijau dan tahu organik tumis saus tiram rendah sodium.",
    calories: 260, protein: 16, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Tahu Organik", qtyKg: 0.200 },
      { name: "Sawi Hijau",   qtyKg: 0.200 },
      { name: "Bawang Putih", qtyKg: 0.015 },
      { name: "Jahe",         qtyKg: 0.010 },
    ],
  },
  {
    name: "Smoothie Mangga Susu",
    description: "Minuman pagi segar dari mangga, pisang, dan susu rendah lemak.",
    calories: 240, protein: 8, servings: 1,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Mangga",            qtyKg: 0.150 },
      { name: "Pisang",            qtyKg: 0.120 },
      { name: "Susu Rendah Lemak", qtyKg: 0.200 },
      { name: "Madu",              qtyKg: 0.015 },
    ],
  },
  {
    name: "Salad Semangka Feta",
    description: "Salad semangka segar dengan selada keriting, lemon, dan sedikit minyak zaitun.",
    calories: 180, protein: 4, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Semangka",        qtyKg: 0.300 },
      { name: "Selada Keriting", qtyKg: 0.080 },
      { name: "Lemon",           qtyKg: 0.040 },
      { name: "Minyak Zaitun",   qtyKg: 0.010 },
    ],
  },
  {
    name: "Buncis Tumis Telur",
    description: "Buncis segar tumis dengan telur orak-arik, bawang merah dan bawang putih.",
    calories: 300, protein: 20, servings: 2,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Buncis",       qtyKg: 0.200 },
      { name: "Telur Ayam",   qtyKg: 0.100 },
      { name: "Bawang Merah", qtyKg: 0.030 },
      { name: "Bawang Putih", qtyKg: 0.015 },
    ],
  },
  {
    name: "Ubi Bakar Madu",
    description: "Ubi ungu dipanggang dan disiram madu, sebagai camilan sehat pengganti dessert.",
    calories: 210, protein: 3, servings: 1,
    imageUrl: "/uploads/recipe-default.jpg",
    nutritionistEmail: "sari@fromfram.test",
    ingredients: [
      { name: "Ubi Ungu", qtyKg: 0.250 },
      { name: "Madu",     qtyKg: 0.020 },
    ],
  },
];

// ─── Semua nama bahan yang akan pakai WeeklyMenu historis ─────────────────
// (semua bahan dari resep baru + resep lama yang sudah ada di DB)
const ALL_RECIPE_NAMES_FOR_WEEKLY_MENU = [
  // Resep lama (sudah ada di seed.js)
  "Ayam Panggang Quinoa", "Salmon Bowl Sehat", "Oatmeal Pisang Greek Yogurt",
  "Nasi Merah Ayam Brokoli", "Steak Sapi Diet", "Salad Buah Segar", "Sup Ayam Jahe",
  // Resep baru
  "Tumis Tempe Kangkung", "Sup Jagung Ayam", "Udang Goreng Kunyit",
  "Lele Bakar Sambal", "Nila Kukus Jahe", "Bebek Panggang Rempah",
  "Telur Dadar Sayuran", "Tahu Bakar Lemon", "Kentang Panggang Herbs",
  "Sup Labu Kuning", "Tumis Jamur Paprika", "Stir Fry Sawi Tahu",
  "Smoothie Mangga Susu", "Salad Semangka Feta", "Buncis Tumis Telur", "Ubi Bakar Madu",
];

// ─── Main seed function ─────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seed Rich Data dimulai...\n");

  // ── 1. Tambah bahan baku baru ─────────────────────────────────────────────
  console.log("📦 1. Menambahkan bahan baku baru...");
  let newIngCount = 0;
  for (const ing of NEW_INGREDIENTS) {
    try {
      await prisma.ingredient.create({
        data: {
          name:         ing.name,
          origin:       ing.origin,
          supplierName: ing.supplierName,
          isAllergen:   ing.isAllergen,
          stockKg:      ing.stockKg,
          pricePerKg:   ing.pricePerKg,
        },
      });
      newIngCount++;
      console.log(`   ✅ Ditambahkan: ${ing.name}`);
    } catch (e) {
      if (e.code === "P2002") {
        console.log(`   ⏭️  Sudah ada: ${ing.name}`);
      } else {
        throw e;
      }
    }
  }
  console.log(`   → ${newIngCount} bahan baku baru berhasil ditambahkan\n`);

  // ── 2. Ambil nutritionist user ────────────────────────────────────────────
  const nutritionist = await prisma.user.findFirst({
    where: { email: "sari@fromfram.test" },
  });
  if (!nutritionist) throw new Error("User nutritionist (sari@fromfram.test) tidak ditemukan. Jalankan seed.js dulu.");

  // ── 3. Tambah resep baru ──────────────────────────────────────────────────
  console.log("🍽️  2. Menambahkan resep baru...");
  let newRecipeCount = 0;
  for (const r of NEW_RECIPES) {
    // Cek apakah resep sudah ada
    const existing = await prisma.recipe.findFirst({ where: { name: r.name } });
    if (existing) {
      console.log(`   ⏭️  Sudah ada: ${r.name}`);
      continue;
    }

    // Ambil ingredient IDs
    const ingNames = r.ingredients.map((i) => i.name);
    const ings = await prisma.ingredient.findMany({ where: { name: { in: ingNames } } });
    const ingMap = Object.fromEntries(ings.map((i) => [i.name, i]));

    // Cek apakah semua ingredient tersedia
    const missing = ingNames.filter((n) => !ingMap[n]);
    if (missing.length > 0) {
      console.log(`   ⚠️  Resep "${r.name}" dilewati — ingredient tidak ditemukan: ${missing.join(", ")}`);
      continue;
    }

    // Buat resep + RecipeIngredient
    const recipe = await prisma.recipe.create({
      data: {
        name:        r.name,
        description: r.description,
        calories:    r.calories,
        protein:     r.protein,
        servings:    r.servings,
        imageUrl:    r.imageUrl,
        nutritionistId: nutritionist.id,
        ingredients: {
          create: r.ingredients.map((ing) => ({
            ingredient:  { connect: { id: ingMap[ing.name].id } },
            quantity:    ing.qtyKg * 1000, // konversi ke gram untuk kolom quantity
            quantityInKg: ing.qtyKg,
            unit:        "kg",
          })),
        },
      },
    });

    console.log(`   ✅ Resep baru: ${recipe.name} (${r.ingredients.length} bahan)`);
    newRecipeCount++;
  }
  console.log(`   → ${newRecipeCount} resep baru berhasil ditambahkan\n`);

  // ── 4. Tambah WeeklyMenu historis (12 minggu ke belakang) ────────────────
  console.log("📅 3. Menambahkan WeeklyMenu historis...");

  // Ambil semua resep yang ada
  const allRecipes = await prisma.recipe.findMany({
    where: { name: { in: ALL_RECIPE_NAMES_FOR_WEEKLY_MENU } },
    select: { id: true, name: true },
  });
  const recipeMap = Object.fromEntries(allRecipes.map((r) => [r.name, r.id]));

  let weeklyMenuCount = 0;
  // Buat menu untuk 12 minggu ke belakang (offset -12 s.d. -1)
  for (let w = -12; w <= -1; w++) {
    const weekDate = addWeeks(THIS_WEEK, w);

    // Pilih 8-14 resep acak per minggu untuk variasi
    const shuffled = [...allRecipes].sort(() => Math.random() - 0.5);
    const count = 8 + Math.floor(Math.random() * 7); // 8-14
    const weekRecipes = shuffled.slice(0, Math.min(count, shuffled.length));

    for (const recipe of weekRecipes) {
      try {
        await prisma.weeklyMenu.create({
          data: {
            weekStartDate: weekDate,
            recipeId:      recipe.id,
          },
        });
        weeklyMenuCount++;
      } catch (e) {
        if (e.code === "P2002") {
          // sudah ada, skip
        } else {
          console.error(`   ⚠️  WeeklyMenu error: ${e.message}`);
        }
      }
    }
    console.log(`   📆 Minggu ${w}: ${weekRecipes.length} menu ditambahkan`);
  }
  console.log(`   → Total ${weeklyMenuCount} WeeklyMenu historis ditambahkan\n`);

  // ── 5. Tambah IngredientLedger USER_PURCHASE historis ────────────────────
  console.log("📊 4. Menambahkan IngredientLedger historis (akan muncul di Pencatatan)...");

  // Ambil semua user aktif
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true },
  });
  if (users.length === 0) {
    console.log("   ⚠️  Tidak ada user, skip IngredientLedger");
  } else {
    // Ambil semua ingredient untuk dibuat ledger
    const allIngredients = await prisma.ingredient.findMany({
      select: { id: true, name: true, pricePerKg: true },
    });

    const usedIngredientIds = new Set();
    const recipeIngs = await prisma.recipeIngredient.findMany({
      select: { ingredientId: true, quantityInKg: true },
    });
    recipeIngs.forEach((ri) => usedIngredientIds.add(ri.ingredientId));

    const activeIngredients = allIngredients.filter((i) => usedIngredientIds.has(i.id));
    console.log(`   → ${activeIngredients.length} bahan aktif (ada di resep)`);

    const ledgerBatch = [];
    for (let w = -12; w <= -1; w++) {
      const weekDate = addWeeks(THIS_WEEK, w);
      const shuffledIng = [...activeIngredients].sort(() => Math.random() - 0.5);
      const ingForWeek = shuffledIng.slice(0, Math.min(15, shuffledIng.length));

      for (const user of users) {
        for (const ing of ingForWeek) {
          const qtyUsed = rand(0.1, 0.8, 2);
          const dateInWeek = addDays(weekDate, Math.floor(Math.random() * 5));

          ledgerBatch.push({
            ingredientId: ing.id,
            userId:       user.id,
            sourceType:   "USER_PURCHASE",
            qtyChangeKg:  -qtyUsed,
            qtyUsedKg:    qtyUsed,
            notes:        `Pemakaian menu mingguan oleh ${user.name}`,
            createdAt:    dateInWeek,
          });
        }
      }
    }

    if (ledgerBatch.length > 0) {
      await prisma.ingredientLedger.createMany({
        data: ledgerBatch,
        skipDuplicates: true,
      });
      console.log(`   → ${ledgerBatch.length} entri IngredientLedger historis berhasil dimasukkan seketika\n`);
    }
  }

  // ── 6. Tambah DemandForecastLog historis (data latih Ridge Regression) ───
  console.log("🤖 5. Menambahkan DemandForecastLog historis (data latih AI)...");

  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true },
  });

  const consumptionBase = {
    "Dada Ayam":    0.175, "Daging Sapi":  0.200, "Salmon":       0.150,
    "Udang Segar":  0.120, "Ikan Nila":    0.100, "Ikan Lele":    0.100,
    "Tempe":        0.080, "Tahu Organik": 0.090, "Telur Ayam":   0.120,
    "Dada Bebek":   0.080, "Bayam":        0.050, "Wortel":       0.060,
    "Brokoli":      0.085, "Tomat":        0.070, "Kangkung":     0.060,
    "Sawi Hijau":   0.055, "Paprika Merah":0.045, "Jagung Manis": 0.070,
    "Labu Kuning":  0.090, "Terong Ungu":  0.055, "Jamur Tiram":  0.060,
    "Selada Keriting":0.040,"Kol Putih":   0.060, "Buncis":       0.055,
    "Daun Bawang":  0.025, "Seledri":      0.020, "Kentang":      0.150,
    "Ubi Ungu":     0.100, "Roti Gandum":  0.080, "Mangga":       0.080,
    "Nanas":        0.070, "Semangka":     0.100, "Melon":        0.090,
    "Beras Merah":  0.180, "Oat":          0.070, "Quinoa":       0.090,
    "Kunyit":       0.008, "Jahe":         0.012, "Bawang Putih": 0.015,
    "Bawang Merah": 0.018, "Ketumbar":     0.005,
  };

  const activeUserCount = await prisma.subscription.count({ where: { status: "ACTIVE" } });
  const baseUsers = Math.max(activeUserCount, 3);

  const forecastLogBatch = [];
  for (const ing of allIngredients) {
    const baseKgPerUser = consumptionBase[ing.name] ?? 0.05;

    for (let w = -12; w <= -1; w++) {
      const weekDate = addWeeks(THIS_WEEK, w);
      const usersW = baseUsers + Math.floor(Math.random() * 3 - 1);
      const predicted = parseFloat((baseKgPerUser * usersW * rand(0.9, 1.1, 2)).toFixed(2));
      const actual = parseFloat((predicted * rand(0.85, 1.15, 2)).toFixed(2));

      forecastLogBatch.push({
        ingredientId:     ing.id,
        weekStartDate:    weekDate,
        activeUserCount:  usersW,
        predictedQtyKg:   predicted,
        actualQtyUsedKg:  actual,
        confidenceScore:  rand(0.72, 0.96, 2),
      });
    }
  }

  if (forecastLogBatch.length > 0) {
    await prisma.demandForecastLog.createMany({
      data: forecastLogBatch,
      skipDuplicates: true,
    });
    console.log(`   → ${forecastLogBatch.length} DemandForecastLog historis berhasil dimasukkan seketika\n`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalIngredients = await prisma.ingredient.count();
  const totalRecipes     = await prisma.recipe.count();
  const totalWeeklyMenu  = await prisma.weeklyMenu.count();
  const totalLedger      = await prisma.ingredientLedger.count();
  const totalForecastLog = await prisma.demandForecastLog.count();

  console.log("═══════════════════════════════════════════════════");
  console.log("✅ SEED SELESAI — Ringkasan DB sekarang:");
  console.log(`   🥦 Total Ingredient:        ${totalIngredients}`);
  console.log(`   🍽️  Total Recipe:            ${totalRecipes}`);
  console.log(`   📅 Total WeeklyMenu:        ${totalWeeklyMenu}`);
  console.log(`   📊 Total IngredientLedger:  ${totalLedger}`);
  console.log(`   🤖 Total DemandForecastLog: ${totalForecastLog}`);
  console.log("═══════════════════════════════════════════════════\n");
  console.log("👉 Langkah selanjutnya:");
  console.log("   1. Buka halaman Prediksi AI → klik 'Buat Prediksi'");
  console.log("   2. Semua bahan baku akan muncul (tidak ada double)");
  console.log("   3. Confidence score akan >0.6 karena ada 12 minggu data historis");
  console.log("   4. Halaman Pencatatan → tab Keluar → lihat historis pemakaian\n");
}

main()
  .catch((e) => {
    console.error("❌ SEED GAGAL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
