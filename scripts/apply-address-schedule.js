const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
async function migrate() {
  await client.connect();
  // First verify DayOfWeek and MealType enums exist
  const enumCheck = await client.query(`SELECT typname FROM pg_type WHERE typname IN ('DayOfWeek', 'MealType')`);
  console.log('Existing enums:', enumCheck.rows);
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS "AddressSchedule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "dayOfWeek" "DayOfWeek" NOT NULL,
      "mealType" "MealType" NOT NULL,
      "addressId" TEXT NOT NULL REFERENCES "Address"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AddressSchedule_userId_dayOfWeek_mealType_key" UNIQUE ("userId", "dayOfWeek", "mealType")
    );
    CREATE INDEX IF NOT EXISTS "AddressSchedule_userId_idx" ON "AddressSchedule"("userId");
  `);
  console.log('AddressSchedule table created!');
  await client.end();
}
migrate().catch(console.error);
