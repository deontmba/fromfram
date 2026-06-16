import prisma from '../src/lib/prisma.js';

async function main() {
  const box = await prisma.weeklyBox.findUnique({
    where: { id: 'cmq53q0gr000404jmwlhicr77' }
  });
  console.log(`weekStartDate: ${box.weekStartDate.toISOString()}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
