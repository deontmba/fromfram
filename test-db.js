const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Recipes:', await prisma.recipe.count());
  console.log('Weekly Menus:', await prisma.weeklyMenu.findMany({ select: { weekStartDate: true } }));
  console.log('Active Subs:', await prisma.subscription.count({ where: { status: 'ACTIVE' } }));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
