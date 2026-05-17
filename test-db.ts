import { getNutritionistKPIs } from './src/controllers/nutritionistController';
import prisma from './src/lib/prisma';

async function main() {
  const nutritionist = await prisma.user.findFirst({ where: { role: 'NUTRITIONIST' } });
  if (!nutritionist) {
    console.error('No nutritionist found');
    return;
  }
  
  try {
    const result = await getNutritionistKPIs(nutritionist.id);
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

main().finally(() => prisma.$disconnect());
