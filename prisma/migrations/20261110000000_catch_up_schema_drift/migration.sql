-- Catch-up for schema changes that were applied to prod with `db push`/scripts
-- but never got a migration. Written idempotently (IF NOT EXISTS) so it is a
-- no-op on the existing prod database and builds a fresh database (CI) correctly.

-- AlterEnum
ALTER TYPE "LedgerSourceType" ADD VALUE IF NOT EXISTS 'PO_FULFILLMENT';

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "carbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "fiber" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "sodium" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "sugar" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "micronutrients" JSONB;

-- AlterTable
ALTER TABLE "FarmerPurchaseOrder" ADD COLUMN IF NOT EXISTS "grossForecastKg" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "currentStockKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "IngredientLedger" ADD COLUMN IF NOT EXISTS "purchaseOrderId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AddressSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "mealType" "MealType" NOT NULL,
    "addressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AddressSchedule_userId_idx" ON "AddressSchedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AddressSchedule_userId_dayOfWeek_mealType_key" ON "AddressSchedule"("userId", "dayOfWeek", "mealType");

-- AddForeignKey (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IngredientLedger_purchaseOrderId_fkey') THEN
    ALTER TABLE "IngredientLedger" ADD CONSTRAINT "IngredientLedger_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "FarmerPurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AddressSchedule_userId_fkey') THEN
    ALTER TABLE "AddressSchedule" ADD CONSTRAINT "AddressSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AddressSchedule_addressId_fkey') THEN
    ALTER TABLE "AddressSchedule" ADD CONSTRAINT "AddressSchedule_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
