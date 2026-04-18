require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const menus = await prisma.weeklyMenu.findMany({
    select: { weekStartDate: true },
  });
  console.log("WeeklyMenu weekStartDate values in DB:");
  menus.forEach((m) => console.log(" ->", m.weekStartDate.toISOString()));

  // Also show what the route calculates as "next Monday"
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const day = now.getDay();
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  console.log("\nRoute calculates next Monday as:", nextMonday.toISOString());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());