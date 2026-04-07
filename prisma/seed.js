require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const COMMON_PASSWORD = "Password123!";
const WEEK_START = new Date("2026-04-06T00:00:00.000Z");
const WEEK_END = new Date("2026-04-12T23:59:59.999Z");
const SELECTION_DEADLINE = new Date("2026-04-05T18:00:00.000Z");
const DELIVERY_SLOT = new Date("2026-04-07T07:30:00.000Z");
const DELIVERY_COMPLETED = new Date("2026-04-07T08:45:00.000Z");
const DELIVERY_SHIPPED = new Date("2026-04-06T21:00:00.000Z");

const goalSeeds = [
  {
    name: "Penurunan Berat Badan",
    description:
      "Target kalori lebih rendah untuk membantu defisit ringan dengan menu yang tetap seimbang.",
    minCalories: 1500,
    maxCalories: 1800,
  },
  {
    name: "Maintain Berat Badan",
    description:
      "Target kalori untuk menjaga berat badan stabil tanpa mengorbankan kualitas makan harian.",
    minCalories: 1800,
    maxCalories: 2200,
  },
  {
    name: "Bulking Atlet",
    description:
      "Menu berprotein tinggi dan lebih padat kalori untuk mendukung massa otot dan performa olahraga.",
    minCalories: 2400,
    maxCalories: 3000,
  },
];

const userSeeds = [
  {
    email: "admin@fromfram.test",
    name: "Admin FromFram",
    password: COMMON_PASSWORD,
    role: "ADMIN",
  },
  {
    email: "sari@fromfram.test",
    name: "Sari Putri",
    password: COMMON_PASSWORD,
    role: "NUTRITIONIST",
  },
  {
    email: "budi@fromfram.test",
    name: "Budi Santoso",
    password: COMMON_PASSWORD,
    role: "USER",
  },
  {
    email: "rina@fromfram.test",
    name: "Rina Wulandari",
    password: COMMON_PASSWORD,
    role: "USER",
  },
  {
    email: "doni@fromfram.test",
    name: "Doni Pratama",
    password: COMMON_PASSWORD,
    role: "USER",
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
    startDate: new Date("2026-04-01T00:00:00.000Z"),
    endDate: new Date("2026-05-01T00:00:00.000Z"),
  },
  {
    userEmail: "rina@fromfram.test",
    goalName: "Penurunan Berat Badan",
    planType: "MINGGUAN",
    servings: 2,
    status: "ACTIVE",
    startDate: new Date("2026-04-06T00:00:00.000Z"),
    endDate: new Date("2026-04-13T00:00:00.000Z"),
  },
  {
    userEmail: "doni@fromfram.test",
    goalName: "Maintain Berat Badan",
    planType: "TAHUNAN",
    servings: 1,
    status: "PAUSED",
    startDate: new Date("2026-01-10T00:00:00.000Z"),
    endDate: new Date("2027-01-10T00:00:00.000Z"),
    pausedUntil: new Date("2026-04-20T00:00:00.000Z"),
  },
];

const transactionSeeds = [
  {
    userEmail: "budi@fromfram.test",
    amount: 690000,
    status: "COMPLETED",
    qrisCode: "QRIS-BUDI-202604",
    paidAt: new Date("2026-04-01T10:15:00.000Z"),
  },
  {
    userEmail: "rina@fromfram.test",
    amount: 149000,
    status: "PENDING",
    qrisCode: "QRIS-RINA-202604",
  },
  {
    userEmail: "doni@fromfram.test",
    amount: 2190000,
    status: "FAILED",
    qrisCode: "QRIS-DONI-202604",
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
    imageUrl: null,
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Salmon Bowl Sehat",
    description:
      "Perpaduan salmon, beras merah, bayam, dan alpukat untuk menu yang lebih padat nutrisi.",
    calories: 610,
    protein: 38,
    servings: 2,
    imageUrl: null,
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Oatmeal Pisang Greek Yogurt",
    description:
      "Sarapan praktis dengan oat, pisang, greek yogurt, chia seed, dan madu.",
    calories: 430,
    protein: 18,
    servings: 1,
    imageUrl: null,
  },
  {
    nutritionistEmail: "sari@fromfram.test",
    name: "Nasi Merah Ayam Brokoli",
    description:
      "Menu seimbang dengan dada ayam, nasi merah, brokoli, wortel, dan bawang putih.",
    calories: 520,
    protein: 35,
    servings: 2,
    imageUrl: null,
  },
];

const recipeIngredientSeeds = [
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Dada Ayam", quantity: "180 g" },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Quinoa", quantity: "100 g" },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Brokoli", quantity: "80 g" },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Tomat", quantity: "60 g" },
  { recipeName: "Ayam Panggang Quinoa", ingredientName: "Bawang Putih", quantity: "2 siung" },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Salmon", quantity: "150 g" },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Beras Merah", quantity: "100 g" },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Bayam", quantity: "50 g" },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Alpukat", quantity: "1/2 buah" },
  { recipeName: "Salmon Bowl Sehat", ingredientName: "Tomat", quantity: "40 g" },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Oat", quantity: "80 g" },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Pisang", quantity: "1 buah" },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Greek Yogurt", quantity: "100 g" },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Chia Seed", quantity: "1 sdm" },
  { recipeName: "Oatmeal Pisang Greek Yogurt", ingredientName: "Madu", quantity: "1 sdt" },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Dada Ayam", quantity: "170 g" },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Beras Merah", quantity: "120 g" },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Brokoli", quantity: "90 g" },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Wortel", quantity: "60 g" },
  { recipeName: "Nasi Merah Ayam Brokoli", ingredientName: "Bawang Putih", quantity: "2 siung" },
];

const weeklyMenuSeeds = recipeSeeds.map((recipe) => ({
  recipeName: recipe.name,
  weekStartDate: WEEK_START,
}));

const weeklyBoxSeeds = [
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    weekEndDate: WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: false,
    status: "LOCKED",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    weekEndDate: WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: true,
    status: "COMPLETED",
  },
  {
    userEmail: "doni@fromfram.test",
    weekStartDate: WEEK_START,
    weekEndDate: WEEK_END,
    selectionDeadline: SELECTION_DEADLINE,
    isAutoSelected: false,
    status: "PENDING_SELECTION",
  },
];

const mealSelectionSeeds = [
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SENIN",
    recipeName: "Ayam Panggang Quinoa",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SELASA",
    recipeName: "Nasi Merah Ayam Brokoli",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "RABU",
    recipeName: "Salmon Bowl Sehat",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "KAMIS",
    recipeName: "Ayam Panggang Quinoa",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "JUMAT",
    recipeName: "Nasi Merah Ayam Brokoli",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SABTU",
    recipeName: "Salmon Bowl Sehat",
  },
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "MINGGU",
    recipeName: "Oatmeal Pisang Greek Yogurt",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SENIN",
    recipeName: "Oatmeal Pisang Greek Yogurt",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SELASA",
    recipeName: "Salmon Bowl Sehat",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "RABU",
    recipeName: "Ayam Panggang Quinoa",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "KAMIS",
    recipeName: "Oatmeal Pisang Greek Yogurt",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "JUMAT",
    recipeName: "Salmon Bowl Sehat",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "SABTU",
    recipeName: "Ayam Panggang Quinoa",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    dayOfWeek: "MINGGU",
    recipeName: "Oatmeal Pisang Greek Yogurt",
  },
];

const deliverySeeds = [
  {
    userEmail: "budi@fromfram.test",
    weekStartDate: WEEK_START,
    addressLabel: "Rumah",
    deliveryDate: DELIVERY_SLOT,
    status: "PREPARING",
  },
  {
    userEmail: "rina@fromfram.test",
    weekStartDate: WEEK_START,
    addressLabel: "Rumah",
    deliveryDate: DELIVERY_SLOT,
    status: "DELIVERED",
    shippedAt: DELIVERY_SHIPPED,
    deliveredAt: DELIVERY_COMPLETED,
  },
];

function indexBy(items, keyFn) {
  return Object.fromEntries(items.map((item) => [keyFn(item), item]));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before running the seed.");
  }

  const hashedPassword = await bcrypt.hash(COMMON_PASSWORD, 12);

  await prisma.$transaction(async (tx) => {
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

    await tx.goal.createMany({ data: goalSeeds });
    const goalRows = await tx.goal.findMany({
      where: { name: { in: goalSeeds.map((goal) => goal.name) } },
    });
    const goalByName = indexBy(goalRows, (goal) => goal.name);

    await tx.user.createMany({
      data: userSeeds.map((user) => ({
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
      })),
    });
    const userRows = await tx.user.findMany({
      where: { email: { in: userSeeds.map((user) => user.email) } },
    });
    const userByEmail = indexBy(userRows, (user) => user.email);

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
      where: {
        userId: { in: Object.values(userByEmail).map((user) => user.id) },
      },
    });
    const addressByKey = indexBy(
      addressRows,
      (address) => `${address.userId}:${address.label}`
    );

    await tx.subscription.createMany({
      data: subscriptionSeeds.map(({ userEmail, goalName, ...subscription }) => ({
        ...subscription,
        userId: userByEmail[userEmail].id,
        goalId: goalByName[goalName].id,
      })),
    });

    await tx.transaction.createMany({
      data: transactionSeeds.map(({ userEmail, ...transaction }) => ({
        ...transaction,
        userId: userByEmail[userEmail].id,
      })),
    });

    await tx.ingredient.createMany({ data: ingredientSeeds });
    const ingredientRows = await tx.ingredient.findMany({
      where: { name: { in: ingredientSeeds.map((ingredient) => ingredient.name) } },
    });
    const ingredientByName = indexBy(ingredientRows, (ingredient) => ingredient.name);

    await tx.recipe.createMany({
      data: recipeSeeds.map(({ nutritionistEmail, ...recipe }) => ({
        ...recipe,
        nutritionistId: userByEmail[nutritionistEmail].id,
      })),
    });
    const recipeRows = await tx.recipe.findMany({
      where: { name: { in: recipeSeeds.map((recipe) => recipe.name) } },
    });
    const recipeByName = indexBy(recipeRows, (recipe) => recipe.name);

    await tx.recipeIngredient.createMany({
      data: recipeIngredientSeeds.map(({ recipeName, ingredientName, ...item }) => ({
        ...item,
        recipeId: recipeByName[recipeName].id,
        ingredientId: ingredientByName[ingredientName].id,
      })),
    });

    await tx.weeklyMenu.createMany({
      data: weeklyMenuSeeds.map(({ recipeName, ...weeklyMenu }) => ({
        ...weeklyMenu,
        recipeId: recipeByName[recipeName].id,
      })),
    });

    await tx.weeklyBox.createMany({
      data: weeklyBoxSeeds.map(({ userEmail, ...weeklyBox }) => ({
        ...weeklyBox,
        userId: userByEmail[userEmail].id,
      })),
    });
    const weeklyBoxRows = await tx.weeklyBox.findMany({
      where: {
        userId: { in: Object.values(userByEmail).map((user) => user.id) },
        weekStartDate: WEEK_START,
      },
    });
    const weeklyBoxByKey = indexBy(
      weeklyBoxRows,
      (weeklyBox) => `${weeklyBox.userId}:${weeklyBox.weekStartDate.toISOString()}`
    );

    await tx.mealSelection.createMany({
      data: mealSelectionSeeds.map(({ userEmail, weekStartDate, recipeName, ...mealSelection }) => ({
        ...mealSelection,
        weeklyBoxId: weeklyBoxByKey[
          `${userByEmail[userEmail].id}:${weekStartDate.toISOString()}`
        ].id,
        recipeId: recipeByName[recipeName].id,
      })),
    });

    await tx.delivery.createMany({
      data: deliverySeeds.map(({ userEmail, weekStartDate, addressLabel, ...delivery }) => ({
        ...delivery,
        userId: userByEmail[userEmail].id,
        weeklyBoxId:
          weeklyBoxByKey[
            `${userByEmail[userEmail].id}:${weekStartDate.toISOString()}`
          ].id,
        addressId: addressByKey[`${userByEmail[userEmail].id}:${addressLabel}`].id,
      })),
    });
  });

  console.log("Seed dummy data berhasil dibuat dengan relasi yang saling terhubung.");
  console.log("Akun dummy menggunakan password:", COMMON_PASSWORD);
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });