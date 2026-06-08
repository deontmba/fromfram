require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const COMMON_PASSWORD = "Password123!";

function startOfWeek(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function withTime(date, hours, minutes, seconds, milliseconds) {
  const value = new Date(date);
  value.setHours(hours, minutes, seconds, milliseconds);
  return value;
}

const ACTIVE_WEEK_START = startOfWeek(new Date());
const ACTIVE_WEEK_END = withTime(addDays(ACTIVE_WEEK_START, 6), 23, 59, 59, 999);
const SELECTION_DEADLINE = withTime(addDays(ACTIVE_WEEK_START, -1), 18, 0, 0, 0);
const DELIVERY_SLOT = withTime(addDays(ACTIVE_WEEK_START, 2), 7, 30, 0, 0);
const DELIVERY_COMPLETED = withTime(addDays(ACTIVE_WEEK_START, 2), 8, 45, 0, 0);
const DELIVERY_SHIPPED = withTime(addDays(ACTIVE_WEEK_START, 1), 21, 0, 0, 0);

const goalSeeds = [
  {
    name: "Penurunan Berat Badan",
    description:
      "Target kalori lebih rendah untuk membantu defisit ringan dengan menu yang tetap seimbang.",
    minCalories: 350,
    maxCalories: 499,
  },
  {
    name: "Maintain Berat Badan",
    description:
      "Target kalori untuk menjaga berat badan stabil tanpa mengorbankan kualitas makan harian.",
    minCalories: 500,
    maxCalories: 620,
  },
  {
    name: "Bulking Atlet",
    description:
      "Menu berprotein tinggi dan lebih padat kalori untuk mendukung massa otot dan performa olahraga.",
    minCalories: 600,
    maxCalories: 800,
  },
  {
    name: "Sarapan Ringan",
    description:
      "Opsi sarapan ringan dengan kalori yang lebih terkendali untuk menu pagi hari.",
    minCalories: 400,
    maxCalories: 450,
  },
];

const userSeeds = [
  {
    email: "admin@fromfram.test",
    name: "Admin FromFram",
    password: COMMON_PASSWORD,
    role: "ADMIN",
    isVerified: true,
  },
  {
    email: "sari@fromfram.test",
    name: "Sari Putri",
    password: COMMON_PASSWORD,
    role: "NUTRITIONIST",
    isVerified: true,
  },
  {
    email: "budi@fromfram.test",
    name: "Budi Santoso",
    password: COMMON_PASSWORD,
    role: "USER",
    isVerified: true,
  },
  {
    email: "rina@fromfram.test",
    name: "Rina Wulandari",
    password: COMMON_PASSWORD,
    role: "USER",
    isVerified: true,
  },
  {
    email: "doni@fromfram.test",
    name: "Doni Pratama",
    password: COMMON_PASSWORD,
    role: "USER",
    isVerified: true,
  },
];

const nutritionalProfileSeeds = [
  {
    userEmail: "budi@fromfram.test",
    weight: 82,
    height: 176,
    dailyCalorieNeed: 2500,
    allergies: "Tidak ada",
    medicalNotes: "Latihan beban 4 kali seminggu dan butuh asupan protein yang cukup.",
  },
  {
    userEmail: "rina@fromfram.test",
    weight: 58,
    height: 162,
    dailyCalorieNeed: 1700,
    allergies: "Laktosa ringan",
    medicalNotes: "Sedang fokus penurunan lemak tubuh dengan menu yang lebih ringan.",
  },
  {
    userEmail: "doni@fromfram.test",
    weight: 70,
    height: 170,
    dailyCalorieNeed: 2100,
    allergies: "Tidak ada",
    medicalNotes: "Mengutamakan jadwal makan teratur karena bekerja shift.",
  },
];

const addressSeeds = [
  {
    userEmail: "budi@fromfram.test",
    recipientName: "Budi Santoso",
    phoneNumber: "081234567890",
    label: "Rumah",
    street: "Jl. Kenanga No. 12",
    city: "Bandung",
    province: "Jawa Barat",
    postalCode: "40123",
    notes: "Pagar warna hijau, bel rumah di sebelah kanan.",
    isDefault: true,
  },
  {
    userEmail: "budi@fromfram.test",
    recipientName: "Budi Santoso",
    phoneNumber: "081234567890",
    label: "Kantor",
    street: "Jl. Asia Afrika No. 88",
    city: "Bandung",
    province: "Jawa Barat",
    postalCode: "40261",
    notes: "Antar ke resepsionis lantai 1.",
    isDefault: false,
  },
  {
    userEmail: "rina@fromfram.test",
    recipientName: "Rina Wulandari",
    phoneNumber: "081234567891",
    label: "Rumah",
    street: "Jl. Melati No. 7",
    city: "Cimahi",
    province: "Jawa Barat",
    postalCode: "40513",
    notes: "Unit apartemen B-12, hubungi 10 menit sebelum tiba.",
    isDefault: true,
  },
  {
    userEmail: "doni@fromfram.test",
    recipientName: "Doni Pratama",
    phoneNumber: "081234567892",
    label: "Rumah",
    street: "Jl. Anggrek No. 21",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12510",
    notes: "Titip satpam bila tidak ada di rumah.",
    isDefault: true,
  },
];

const subscriptionSeeds = [
  {
    userEmail: "budi@fromfram.test",
    goalName: "Bulking Atlet",
    planType: "BULANAN",
    servings: 3,
    status: "ACTIVE",
    startDate: addWeeks(ACTIVE_WEEK_START, -4),
    endDate: addWeeks(ACTIVE_WEEK_START, 4),
  },
  {
    userEmail: "rina@fromfram.test",
    goalName: "Penurunan Berat Badan",
    planType: "MINGGUAN",
    servings: 2,
    status: "ACTIVE",
    startDate: addWeeks(ACTIVE_WEEK_START, -1),
    endDate: addWeeks(ACTIVE_WEEK_START, 1),
  },
  {
    userEmail: "doni@fromfram.test",
    goalName: "Maintain Berat Badan",
    planType: "TAHUNAN",
    servings: 1,
    status: "PAUSED",
    startDate: addWeeks(ACTIVE_WEEK_START, -12),
    endDate: addWeeks(ACTIVE_WEEK_START, 40),
    pausedUntil: addDays(ACTIVE_WEEK_START, -2),
  },
];

const transactionSeeds = [
  {
    userEmail: "budi@fromfram.test",
    amount: 690000,
    status: "COMPLETED",
    qrisCode: "QRIS-BUDI-202605",
    paidAt: addDays(ACTIVE_WEEK_START, -1),
  },
  {
    userEmail: "rina@fromfram.test",
    amount: 149000,
    status: "PENDING",
    qrisCode: "QRIS-RINA-202605",
  },
  {
    userEmail: "doni@fromfram.test",
    amount: 2190000,
    status: "FAILED",
    qrisCode: "QRIS-DONI-202605",
  },
];

const ingredientSeeds = [
  { name: "Dada Ayam", origin: "Bandung, Jawa Barat", supplierName: "Peternakan Sehat", isAllergen: false },
  { name: "Quinoa", origin: "Nusa Tenggara Barat", supplierName: "Nusantara Superfood", isAllergen: false },
  { name: "Salmon", origin: "Norwegia", supplierName: "Ocean Harvest", isAllergen: true },
  { name: "Oat", origin: "Australia", supplierName: "Grain Partners", isAllergen: false },
  { name: "Pisang", origin: "Lampung", supplierName: "Kebun Tropis", isAllergen: false },
  { name: "Greek Yogurt", origin: "Bandung, Jawa Barat", supplierName: "Dairy Fresh", isAllergen: true },
  { name: "Brokoli", origin: "Cianjur, Jawa Barat", supplierName: "Sayur Segar", isAllergen: false },
  { name: "Tomat", origin: "Subang, Jawa Barat", supplierName: "Petani Mitra", isAllergen: false },
  { name: "Bayam", origin: "Bogor, Jawa Barat", supplierName: "Sayur Segar", isAllergen: false },
  { name: "Beras Merah", origin: "Karawang, Jawa Barat", supplierName: "Padi Nusantara", isAllergen: false },
  { name: "Alpukat", origin: "Sukabumi, Jawa Barat", supplierName: "Kebun Alpukat", isAllergen: false },
  { name: "Chia Seed", origin: "Peru", supplierName: "Healthy Seeds", isAllergen: false },
  { name: "Madu", origin: "Mojokerto, Jawa Timur", supplierName: "Madu Alami", isAllergen: false },
  { name: "Bawang Putih", origin: "Banyuwangi, Jawa Timur", supplierName: "Bumbu Asli", isAllergen: false },
  { name: "Wortel", origin: "Cianjur, Jawa Barat", supplierName: "Sayur Segar", isAllergen: false },
  { name: "Daging Sapi", origin: "Lembang, Jawa Barat", supplierName: "Daging Premium", isAllergen: false },
  { name: "Apel", origin: "Malang, Jawa Timur", supplierName: "Buah Segar", isAllergen: false },
  { name: "Jahe", origin: "Sumedang, Jawa Barat", supplierName: "Rempah Asli", isAllergen: false },
];

const recipeSeeds = [
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Ayam Panggang Quinoa",
    description:
      "Dada ayam panggang dengan quinoa, brokoli, dan tomat sebagai menu tinggi protein yang tetap ringan.",
    calories: 560,
    protein: 42,
    servings: 2,
    imageUrl: "/uploads/recipe-1779049326330-446246016.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Salmon Bowl Sehat",
    description:
      "Perpaduan salmon, beras merah, bayam, dan alpukat untuk menu yang lebih padat nutrisi.",
    calories: 610,
    protein: 38,
    servings: 2,
    imageUrl: "/uploads/recipe-1779049315758-772803481.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Oatmeal Pisang Greek Yogurt",
    description:
      "Sarapan praktis dengan oat, pisang, greek yogurt, chia seed, dan madu.",
    calories: 430,
    protein: 18,
    servings: 1,
    imageUrl: "/uploads/recipe-1779049305602-318426786.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Nasi Merah Ayam Brokoli",
    description:
      "Menu seimbang dengan dada ayam, nasi merah, brokoli, wortel, dan bawang putih.",
    calories: 520,
    protein: 35,
    servings: 2,
    imageUrl: "/uploads/recipe-1779049285426-883874412.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Steak Sapi Diet",
    description:
      "Potongan daging sapi tanpa lemak dengan kentang panggang dan buncis, kaya protein.",
    calories: 580,
    protein: 45,
    servings: 2,
    imageUrl: "/uploads/recipe-1779049269845-784928288.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Salad Buah Segar",
    description:
      "Kombinasi apel, anggur, melon, dan yogurt rendah lemak untuk camilan sehat.",
    calories: 250,
    protein: 5,
    servings: 1,
    imageUrl: "/uploads/recipe-1779049259738-862778987.jpg",
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Sup Ayam Jahe",
    description:
      "Sup kaldu ayam bening dengan jahe dan sayuran segar, sangat baik untuk pemulihan.",
    calories: 320,
    protein: 28,
    servings: 3,
    imageUrl: "/uploads/recipe-1779049245659-781862858.jpg",
  },
];

const recipeIngredientSeeds = [
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Dada Ayam", quantity: 180, unit: "g", quantityInKg: 0.180 },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Quinoa", quantity: 100, unit: "g", quantityInKg: 0.100 },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Brokoli", quantity: 80, unit: "g", quantityInKg: 0.080 },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Tomat", quantity: 60, unit: "g", quantityInKg: 0.060 },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Bawang Putih", quantity: 2, unit: "siung", quantityInKg: 0.010 },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Salmon", quantity: 150, unit: "g", quantityInKg: 0.150 },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Beras Merah", quantity: 100, unit: "g", quantityInKg: 0.100 },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Bayam", quantity: 50, unit: "g", quantityInKg: 0.050 },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Alpukat", quantity: 0.5, unit: "buah", quantityInKg: 0.100 },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Tomat", quantity: 40, unit: "g", quantityInKg: 0.040 },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Oat", quantity: 80, unit: "g", quantityInKg: 0.080 },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Pisang", quantity: 1, unit: "buah", quantityInKg: 0.120 },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Greek Yogurt", quantity: 100, unit: "g", quantityInKg: 0.100 },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Chia Seed", quantity: 1, unit: "sdm", quantityInKg: 0.015 },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Madu", quantity: 1, unit: "sdt", quantityInKg: 0.005 },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Dada Ayam", quantity: 170, unit: "g", quantityInKg: 0.170 },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Beras Merah", quantity: 120, unit: "g", quantityInKg: 0.120 },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Brokoli", quantity: 90, unit: "g", quantityInKg: 0.090 },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Wortel", quantity: 60, unit: "g", quantityInKg: 0.060 },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Bawang Putih", quantity: 2, unit: "siung", quantityInKg: 0.010 },
  { recipeName: "Steak Sapi Diet", ingredientName: "Daging Sapi", quantity: 200, unit: "g", quantityInKg: 0.200 },
  { recipeName: "Salad Buah Segar", ingredientName: "Apel", quantity: 1, unit: "buah", quantityInKg: 0.150 },
  { recipeName: "Sup Ayam Jahe", ingredientName: "Jahe", quantity: 1, unit: "ruas", quantityInKg: 0.010 },
];

const WEEK_BLUEPRINTS = [
  { offset: -4, recipes: ["Oatmeal Pisang Greek Yogurt", "Sup Ayam Jahe"] },
  { offset: -3, recipes: ["Ayam Panggang Quinoa", "Salmon Bowl Sehat", "Steak Sapi Diet"] },
  { offset: -2, recipes: ["Nasi Merah Ayam Brokoli", "Ayam Panggang Quinoa", "Salad Buah Segar"] },
  { offset: -1, recipes: ["Salmon Bowl Sehat", "Oatmeal Pisang Greek Yogurt", "Nasi Merah Ayam Brokoli", "Sup Ayam Jahe"] },
  {
    offset: 0,
    recipes: [
      "Oatmeal Pisang Greek Yogurt",
      "Ayam Panggang Quinoa",
      "Salmon Bowl Sehat",
      "Nasi Merah Ayam Brokoli",
      "Steak Sapi Diet",
      "Salad Buah Segar",
      "Sup Ayam Jahe"
    ],
  },
  { offset: 1, recipes: ["Ayam Panggang Quinoa", "Nasi Merah Ayam Brokoli", "Steak Sapi Diet", "Salad Buah Segar"] },
  { offset: 2, recipes: ["Salmon Bowl Sehat", "Oatmeal Pisang Greek Yogurt", "Sup Ayam Jahe"] },
  { offset: 3, recipes: ["Ayam Panggang Quinoa", "Salmon Bowl Sehat", "Nasi Merah Ayam Brokoli", "Steak Sapi Diet"] },
  { offset: 4, recipes: ["Oatmeal Pisang Greek Yogurt", "Nasi Merah Ayam Brokoli", "Salad Buah Segar"] },
];

const weeklyMenuSeeds = WEEK_BLUEPRINTS.flatMap(({ offset, recipes }) => {
  const weekStartDate = addWeeks(ACTIVE_WEEK_START, offset);
  return recipes.map((recipeName) => ({
    recipeName,
    weekStartDate,
  }));
});

const weeklyBoxSeeds = [
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: ACTIVE_WEEK_START,
    weekEndDate: ACTIVE_WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: false,
    status: "LOCKED",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: ACTIVE_WEEK_START,
    weekEndDate: ACTIVE_WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: true,
    status: "COMPLETED",
  },
  {
    userEmail: "doni@fromfram.test",
    weekStartDate: ACTIVE_WEEK_START,
    weekEndDate: ACTIVE_WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: false,
    status: "PENDING_SELECTION",
  },
];

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];

const allRecipes = [
  "Ayam Panggang Quinoa",
  "Salmon Bowl Sehat",
  "Nasi Merah Ayam Brokoli",
  "Oatmeal Pisang Greek Yogurt",
  "Steak Sapi Diet",
  "Salad Buah Segar",
  "Sup Ayam Jahe",
];

function buildMealSeeds(userEmail, servings) {
  const seeds = [];
  DAYS.forEach((day, di) => {
    ["LUNCH", "DINNER"].forEach((mealType, mi) => {
      for (let s = 0; s < servings; s++) {
        const recipeIdx = (di * 2 + mi + s) % allRecipes.length;
        seeds.push({
          userEmail,
          weekStartDate: ACTIVE_WEEK_START,
          dayOfWeek: day,
          mealType,
          recipeName: allRecipes[recipeIdx],
          serving: 1,
        });
      }
    });
  });
  return seeds;
}

const mealSelectionSeeds = [
  ...buildMealSeeds("budi@fromfram.test", 3),
  ...buildMealSeeds("rina@fromfram.test", 2),
];

const deliverySeeds = [
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: ACTIVE_WEEK_START,
    addressLabel: "Rumah",
    deliveryDate: DELIVERY_SLOT,
    status: "PREPARING",
    mealType: "LUNCH",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: ACTIVE_WEEK_START,
    addressLabel: "Rumah",
    deliveryDate: DELIVERY_SLOT,
    status: "DELIVERED",
    shippedAt: DELIVERY_SHIPPED,
    deliveredAt: DELIVERY_COMPLETED,
    mealType: "LUNCH",
  },
];

// ---------------------------------------------------------------------------
// Farmer seed data
// Semua komoditas yang disupply petani harus ada di ingredientSeeds di atas,
// karena FarmerSupplyItem berelasi ke Ingredient yang sudah ada.
// ---------------------------------------------------------------------------

// Mapping: farmer → ingredient-ingredient yang ada di recipe
const farmerSeeds = [
  {
    id: "farmer-bu-sri",
    name: "Bu Sri",
    region: "Cianjur, Jawa Barat",
    commodityType: "Sayuran",
    // Bayam, Wortel, Brokoli, Tomat → semua ada di ingredientSeeds
    supplies: [
      { ingredientName: "Bayam",    weeklyCapacityKg: 500, minOrderKg: 20, pricePerKg: 12000 },
      { ingredientName: "Wortel",   weeklyCapacityKg: 400, minOrderKg: 15, pricePerKg: 10000 },
      { ingredientName: "Brokoli",  weeklyCapacityKg: 300, minOrderKg: 10, pricePerKg: 25000 },
      { ingredientName: "Tomat",    weeklyCapacityKg: 350, minOrderKg: 15, pricePerKg: 8000  },
    ],
  },
  {
    id: "farmer-pak-hendra",
    name: "Pak Hendra",
    region: "Karawang, Jawa Barat",
    commodityType: "Karbohidrat",
    // Beras Merah → ada di ingredientSeeds
    supplies: [
      { ingredientName: "Beras Merah", weeklyCapacityKg: 1000, minOrderKg: 50, pricePerKg: 18000 },
    ],
  },
  {
    id: "farmer-pak-agus",
    name: "Pak Agus",
    region: "Lembang, Jawa Barat",
    commodityType: "Protein Hewani",
    // Dada Ayam, Daging Sapi → ada di ingredientSeeds
    supplies: [
      { ingredientName: "Dada Ayam",   weeklyCapacityKg: 600, minOrderKg: 30, pricePerKg: 38000 },
      { ingredientName: "Daging Sapi", weeklyCapacityKg: 200, minOrderKg: 10, pricePerKg: 130000 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Ingredient → konsumsi per user per minggu (estimasi dalam kg)
// Dipakai sebagai base untuk generate DemandForecastLog yang realistis.
// Angka dihitung dari recipeIngredientSeeds: rata-rata quantityInKg per resep
// yang mengandung bahan tersebut, diasumsikan tiap user makan 5x/minggu.
// ---------------------------------------------------------------------------
const ingredientConsumptionBase = {
  // Protein hewani — porsi lebih besar per user
  "Dada Ayam":   { kgPerUser: 0.175, label: "protein" }, // rata-rata (0.180+0.170)/2 * ~1 resep/minggu
  "Daging Sapi": { kgPerUser: 0.200, label: "protein" },
  // Sayuran — porsi sedang
  "Bayam":       { kgPerUser: 0.050, label: "sayuran" },
  "Wortel":      { kgPerUser: 0.060, label: "sayuran" },
  "Brokoli":     { kgPerUser: 0.085, label: "sayuran" }, // rata-rata (0.080+0.090)/2
  "Tomat":       { kgPerUser: 0.050, label: "sayuran" }, // rata-rata (0.060+0.040)/2
  // Karbohidrat
  "Beras Merah": { kgPerUser: 0.110, label: "karbo"   }, // rata-rata (0.100+0.120)/2
};

function indexBy(items, keyFn) {
  return Object.fromEntries(items.map((item) => [keyFn(item), item]));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before running the seed.");
  }

  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 12);

  await prisma.$transaction(async (tx) => {
    // Cleanup — urutan: child dulu, parent belakangan
    // Tabel AI Forecasting (baru)
    await tx.farmerPurchaseOrder.deleteMany();
    await tx.demandForecastLog.deleteMany();
    await tx.farmerSupplyItem.deleteMany();
    await tx.farmer.deleteMany();

    // Tabel existing
    await tx.delivery.deleteMany();
    await tx.mealSelection.deleteMany();
    await tx.weeklyMenu.deleteMany();
    await tx.recipeIngredient.deleteMany();
    await tx.weeklyBox.deleteMany();
    await tx.transaction.deleteMany();
    await tx.subscription.deleteMany();
    await tx.nutritionalProfile.deleteMany();
    await tx.address.deleteMany();
    await tx.recipe.deleteMany();
    await tx.ingredient.deleteMany();
    await tx.goal.deleteMany();
    await tx.user.deleteMany();

    // ── Goals ──────────────────────────────────────────────────────────────
    await tx.goal.createMany({ data: goalSeeds });
    const goalRows = await tx.goal.findMany({
      where: { name: { in: goalSeeds.map((g) => g.name) } },
    });
    const goalByName = indexBy(goalRows, (g) => g.name);

    // ── Users ──────────────────────────────────────────────────────────────
    await tx.user.createMany({
      data: userSeeds.map((u) => ({
        email: u.email,
        name: u.name,
        password: hashedPassword,
        role: u.role,
        isVerified: u.isVerified || false,
      })),
    });
    const userRows = await tx.user.findMany({
      where: { email: { in: userSeeds.map((u) => u.email) } },
    });
    const userByEmail = indexBy(userRows, (u) => u.email);

    // ── Profiles & Addresses ───────────────────────────────────────────────
    await tx.nutritionalProfile.createMany({
      data: nutritionalProfileSeeds.map(({ userEmail, ...profile }) => ({
        ...profile,
        userId: userByEmail[userEmail].id,
      })),
    });

    await tx.address.createMany({
      data: addressSeeds.map(({ userEmail, ...address }) => ({
        ...address,
        userId: userByEmail[userEmail].id,
      })),
    });
    const addressRows = await tx.address.findMany({
      where: { userId: { in: Object.values(userByEmail).map((u) => u.id) } },
    });
    const addressByKey = indexBy(addressRows, (a) => `${a.userId}:${a.label}`);

    // ── Subscriptions & Transactions ───────────────────────────────────────
    await tx.subscription.createMany({
      data: subscriptionSeeds.map(({ userEmail, goalName, ...sub }) => ({
        ...sub,
        userId: userByEmail[userEmail].id,
        goalId: goalByName[goalName].id,
      })),
    });

    await tx.transaction.createMany({
      data: transactionSeeds.map(({ userEmail, ...tx_ }) => ({
        ...tx_,
        userId: userByEmail[userEmail].id,
      })),
    });

    // ── Ingredients ────────────────────────────────────────────────────────
    await tx.ingredient.createMany({ data: ingredientSeeds });
    const ingredientRows = await tx.ingredient.findMany({
      where: { name: { in: ingredientSeeds.map((i) => i.name) } },
    });
    const ingredientByName = indexBy(ingredientRows, (i) => i.name);

    // ── Recipes & RecipeIngredients ────────────────────────────────────────
    await tx.recipe.createMany({
      data: recipeSeeds.map(({ nutritionistEmail, ...recipe }) => ({
        ...recipe,
        nutritionistId: userByEmail[nutritionistEmail].id,
      })),
    });
    const recipeRows = await tx.recipe.findMany({
      where: { name: { in: recipeSeeds.map((r) => r.name) } },
    });
    const recipeByName = indexBy(recipeRows, (r) => r.name);

    await tx.recipeIngredient.createMany({
      data: recipeIngredientSeeds.map(({ recipeName, ingredientName, ...item }) => ({
        ...item,
        recipeId: recipeByName[recipeName].id,
        ingredientId: ingredientByName[ingredientName].id,
      })),
    });

    // ── Weekly Menu & Box ──────────────────────────────────────────────────
    await tx.weeklyMenu.createMany({
      data: weeklyMenuSeeds.map(({ recipeName, ...wm }) => ({
        ...wm,
        recipeId: recipeByName[recipeName].id,
      })),
    });

    await tx.weeklyBox.createMany({
      data: weeklyBoxSeeds.map(({ userEmail, ...wb }) => ({
        ...wb,
        userId: userByEmail[userEmail].id,
      })),
    });
    const weeklyBoxRows = await tx.weeklyBox.findMany({
      where: {
        userId: { in: Object.values(userByEmail).map((u) => u.id) },
        weekStartDate: ACTIVE_WEEK_START,
      },
    });
    const weeklyBoxByKey = indexBy(
      weeklyBoxRows,
      (wb) => `${wb.userId}:${wb.weekStartDate.toISOString()}`
    );

    // ── Meal Selections & Deliveries ───────────────────────────────────────
    await tx.mealSelection.createMany({
      data: mealSelectionSeeds.map(({ userEmail, weekStartDate, recipeName, serving, ...ms }) => ({
        ...ms,
        weeklyBoxId:
          weeklyBoxByKey[`${userByEmail[userEmail].id}:${weekStartDate.toISOString()}`].id,
        recipeId: recipeByName[recipeName].id,
        serving: serving ?? 1,
      })),
    });

    await tx.delivery.createMany({
      data: deliverySeeds.map(({ userEmail, weekStartDate, addressLabel, ...delivery }) => ({
        ...delivery,
        userId: userByEmail[userEmail].id,
        weeklyBoxId:
          weeklyBoxByKey[`${userByEmail[userEmail].id}:${weekStartDate.toISOString()}`].id,
        addressId: addressByKey[`${userByEmail[userEmail].id}:${addressLabel}`].id,
      })),
    });

    // ── Farmers & FarmerSupplyItems ────────────────────────────────────────
    // Dibuat di dalam transaction yang sama agar rollback bersih jika gagal.
    for (const f of farmerSeeds) {
      await tx.farmer.upsert({
        where: { id: f.id },
        update: { name: f.name, region: f.region, commodityType: f.commodityType },
        create: { id: f.id, name: f.name, region: f.region, commodityType: f.commodityType },
      });

      for (const supply of f.supplies) {
        // Ingredient PASTI sudah ada karena dibuat dari ingredientSeeds di atas
        const ingredient = ingredientByName[supply.ingredientName];
        if (!ingredient) {
          throw new Error(
            `Ingredient "${supply.ingredientName}" tidak ditemukan di ingredientSeeds. ` +
            `Tambahkan ke ingredientSeeds terlebih dahulu.`
          );
        }

        await tx.farmerSupplyItem.upsert({
          where: { farmerId_ingredientId: { farmerId: f.id, ingredientId: ingredient.id } },
          update: {
            weeklyCapacityKg: supply.weeklyCapacityKg,
            minOrderKg: supply.minOrderKg,
            pricePerKg: supply.pricePerKg,
          },
          create: {
            farmerId: f.id,
            ingredientId: ingredient.id,
            weeklyCapacityKg: supply.weeklyCapacityKg,
            minOrderKg: supply.minOrderKg,
            pricePerKg: supply.pricePerKg,
          },
        });
      }
    }

    // ── DemandForecastLog — 8 minggu histori ───────────────────────────────
    // Hanya ingredient yang ada di ingredientConsumptionBase yang di-log,
    // karena itulah bahan yang disupply oleh petani mitra dan relevan untuk PO.
    // Minggu ke-8 (minggu ini / index 7) → actualQtyUsedKg = null (belum selesai).

    const forecastIngredientNames = Object.keys(ingredientConsumptionBase);

    for (const ingredientName of forecastIngredientNames) {
      const ingredient = ingredientByName[ingredientName];
      if (!ingredient) continue; // guard — tidak akan terjadi jika data konsisten

      const { kgPerUser } = ingredientConsumptionBase[ingredientName];

      for (let weekIndex = 0; weekIndex < 8; weekIndex++) {
        // Minggu ke-0 adalah 7 minggu lalu, minggu ke-7 adalah minggu ini
        const weekStartDate = addWeeks(ACTIVE_WEEK_START, -7 + weekIndex);
        const isCurrentWeek = weekIndex === 7;

        // User aktif meningkat setiap minggu (simulasi pertumbuhan)
        const baseUserCount = 120 + weekIndex * 7;
        // Fluktuasi kecil ±4 user (supaya tidak terlalu linear)
        const activeUserCount = baseUserCount + Math.floor(Math.random() * 9) - 4;

        // Konsumsi aktual = user aktif × base per user + noise ±5%
        const noise = 1 + (Math.random() * 0.10 - 0.05);
        // Kejadian luar biasa (promo / hari libur) 15% kemungkinan ±20%
        const spike = Math.random() < 0.15 ? (Math.random() > 0.5 ? 1.20 : 0.80) : 1.0;
        const actualQty = parseFloat((activeUserCount * kgPerUser * noise * spike).toFixed(2));

        // Prediksi selalu punya error kecil terhadap aktual (±5–15%)
        const errorFactor = 1 + (Math.random() * 0.20 - 0.10); // ±10% rata-rata
        const predictedQtyKg = parseFloat((actualQty * errorFactor).toFixed(2));

        // Confidence score: mulai rendah lalu naik seiring minggu (model makin terlatih)
        const baseConfidence = 0.60 + weekIndex * 0.015; // 0.60 → 0.705
        const confidenceScore = parseFloat(
          Math.min(0.95, baseConfidence + Math.random() * 0.08).toFixed(2)
        );

        // Minggu ini belum ada aktual (admin belum konfirmasi)
        const actualQtyUsedKg = isCurrentWeek ? null : actualQty;

        const existing = await tx.demandForecastLog.findFirst({
          where: { ingredientId: ingredient.id, weekStartDate },
        });

        if (existing) {
          await tx.demandForecastLog.update({
            where: { id: existing.id },
            data: { activeUserCount, predictedQtyKg, actualQtyUsedKg, confidenceScore, modelVersion: "ridge_v1" },
          });
        } else {
          await tx.demandForecastLog.create({
            data: {
              ingredientId: ingredient.id,
              weekStartDate,
              activeUserCount,
              predictedQtyKg,
              actualQtyUsedKg,
              confidenceScore,
              modelVersion: "ridge_v1",
            },
          });
        }
      }
    }
  }, { timeout: 30000 });

  console.log("✅ Seed berhasil.");
  console.log("   - Data utama (users, recipes, subscriptions, dll) selesai.");
  console.log("   - Farmer & FarmerSupplyItem: 3 petani mitra, 7 komoditas.");
  console.log("   - DemandForecastLog: 8 minggu histori untuk 7 ingredient.");
  console.log(`   - Password semua akun dummy: ${COMMON_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });