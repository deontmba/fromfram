const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'tamba1gideon@gmail.com';
  console.log(`=== INSPECTING DB FOR USER: ${email} ===`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      addresses: true,
      subscriptions: true,
    }
  });

  if (!user) {
    console.log('User not found!');
    return;
  }

  console.log('User Record:', {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  console.log('Addresses:', user.addresses);
  console.log('Subscriptions:', user.subscriptions);

  const weeklyBoxes = await prisma.weeklyBox.findMany({
    where: { userId: user.id },
    include: {
      mealSelections: {
        include: { recipe: true }
      }
    },
    orderBy: { weekStartDate: 'asc' }
  });

  console.log('Weekly Boxes Count:', weeklyBoxes.length);
  weeklyBoxes.forEach((box, index) => {
    console.log(`\n--- Weekly Box #${index + 1} ---`);
    console.log({
      id: box.id,
      weekStartDate: box.weekStartDate,
      weekEndDate: box.weekEndDate,
      status: box.status,
      selectionDeadline: box.selectionDeadline,
      mealSelectionsCount: box.mealSelections.length,
    });
    if (box.mealSelections.length > 0) {
      console.log('Meal Selections:');
      box.mealSelections.forEach(sel => {
        console.log(`  - Day: ${sel.dayOfWeek}, Type: ${sel.mealType}, Recipe: ${sel.recipe.name}, Serving: ${sel.serving}`);
      });
    }
  });

  const deliveries = await prisma.delivery.findMany({
    where: { userId: user.id },
    include: {
      address: true,
    }
  });

  console.log('\n=== Deliveries for User ===');
  console.log('Deliveries Count:', deliveries.length);
  console.log(deliveries);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
