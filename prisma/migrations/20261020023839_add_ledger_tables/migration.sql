-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('ADMIN_EDIT', 'USER_PURCHASE');

-- CreateEnum
CREATE TYPE "IngredientLedgerStatus" AS ENUM ('COMPLETED', 'SIAP_PAKAI', 'MENUNGGU_DIKONFIRMASI', 'PREPARING', 'SHIPPED', 'DELIVERED');

-- CreateTable
CREATE TABLE "IngredientLedger" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "status" "IngredientLedgerStatus" NOT NULL DEFAULT 'COMPLETED',
    "code" TEXT,
    "referenceCode" TEXT,
    "adminUserId" TEXT,
    "qtyChangeKg" DOUBLE PRECISION,
    "stockBeforeKg" DOUBLE PRECISION,
    "stockAfterKg" DOUBLE PRECISION,
    "userId" TEXT,
    "weeklyBoxId" TEXT,
    "mealSelectionId" TEXT,
    "qtyUsedKg" DOUBLE PRECISION,
    "menuName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngredientLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'QRIS',
    "code" TEXT,
    "referenceCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientLedger_code_key" ON "IngredientLedger"("code");

-- CreateIndex
CREATE INDEX "IngredientLedger_ingredientId_idx" ON "IngredientLedger"("ingredientId");

-- CreateIndex
CREATE INDEX "IngredientLedger_sourceType_idx" ON "IngredientLedger"("sourceType");

-- CreateIndex
CREATE INDEX "IngredientLedger_createdAt_idx" ON "IngredientLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLedger_code_key" ON "TransactionLedger"("code");

-- CreateIndex
CREATE INDEX "TransactionLedger_userId_idx" ON "TransactionLedger"("userId");

-- CreateIndex
CREATE INDEX "TransactionLedger_createdAt_idx" ON "TransactionLedger"("createdAt");

-- AddForeignKey
ALTER TABLE "IngredientLedger" ADD CONSTRAINT "IngredientLedger_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientLedger" ADD CONSTRAINT "IngredientLedger_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientLedger" ADD CONSTRAINT "IngredientLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientLedger" ADD CONSTRAINT "IngredientLedger_weeklyBoxId_fkey" FOREIGN KEY ("weeklyBoxId") REFERENCES "WeeklyBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
