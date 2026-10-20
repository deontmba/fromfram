const { Client } = require('pg');

const connectionString = 'postgresql://postgres.knsuarluopssgsxhbvwo:FromFram123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  const sql = `
    DO $$ BEGIN
      CREATE TYPE "LedgerSourceType" AS ENUM ('ADMIN_EDIT', 'USER_PURCHASE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "IngredientLedgerStatus" AS ENUM ('COMPLETED', 'SIAP_PAKAI', 'MENUNGGU_DIKONFIRMASI', 'PREPARING', 'SHIPPED', 'DELIVERED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "IngredientLedger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ingredientId" TEXT NOT NULL REFERENCES "Ingredient"("id") ON DELETE CASCADE,
      "sourceType" "LedgerSourceType" NOT NULL,
      "status" "IngredientLedgerStatus" NOT NULL DEFAULT 'COMPLETED',
      "code" TEXT UNIQUE,
      "referenceCode" TEXT,
      "adminUserId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "qtyChangeKg" DOUBLE PRECISION,
      "stockBeforeKg" DOUBLE PRECISION,
      "stockAfterKg" DOUBLE PRECISION,
      "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
      "weeklyBoxId" TEXT REFERENCES "WeeklyBox"("id") ON DELETE SET NULL,
      "mealSelectionId" TEXT,
      "qtyUsedKg" DOUBLE PRECISION,
      "menuName" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "IngredientLedger_ingredientId_idx" ON "IngredientLedger"("ingredientId");
    CREATE INDEX IF NOT EXISTS "IngredientLedger_sourceType_idx" ON "IngredientLedger"("sourceType");
    CREATE INDEX IF NOT EXISTS "IngredientLedger_createdAt_idx" ON "IngredientLedger"("createdAt");

    CREATE TABLE IF NOT EXISTS "TransactionLedger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "transactionId" TEXT NOT NULL REFERENCES "Transaction"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "amount" DOUBLE PRECISION NOT NULL,
      "status" "TransactionStatus" NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'QRIS',
      "code" TEXT UNIQUE,
      "referenceCode" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS "TransactionLedger_userId_idx" ON "TransactionLedger"("userId");
    CREATE INDEX IF NOT EXISTS "TransactionLedger_createdAt_idx" ON "TransactionLedger"("createdAt");
  `;

  await client.query(sql);
  console.log('Tables and types created successfully!');

  const check = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('IngredientLedger', 'TransactionLedger');
  `);
  console.log('Verified tables in Supabase:', check.rows);

  await client.end();
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
