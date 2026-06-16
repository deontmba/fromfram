import prisma from '../src/lib/prisma.js';

async function main() {
  const deliveries = await prisma.delivery.findMany({
    where: { status: 'DELIVERED' },
    include: {
      weeklyBox: {
        include: {
          mealSelections: {
            include: {
              recipe: true
            }
          }
        }
      }
    }
  });

  console.log(`Delivered Deliveries count: ${deliveries.length}`);
  for (const d of deliveries) {
    console.log(`ID: ${d.id}, Date: ${d.deliveryDate.toISOString()}, Status: ${d.status}, MealType: ${d.mealType}`);
    console.log(`WeeklyBox ID: ${d.weeklyBoxId}`);
    console.log("Meal selections in weekly box:");
    for (const sel of d.weeklyBox.mealSelections) {
      console.log(`  Day: ${sel.dayOfWeek}, Meal: ${sel.mealType}, Recipe: ${sel.recipe.name}`);
    }
    console.log("------------------------------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
