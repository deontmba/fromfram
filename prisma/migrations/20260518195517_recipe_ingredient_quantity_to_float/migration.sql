-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'CANCELLED');

-- AlterTable (Data Conversion for RecipeIngredient)
ALTER TABLE "RecipeIngredient" ADD COLUMN "unit" TEXT NOT NULL DEFAULT '';
ALTER TABLE "RecipeIngredient" ADD COLUMN "quantityInKg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RecipeIngredient" RENAME COLUMN "quantity" TO "old_quantity";
ALTER TABLE "RecipeIngredient" ADD COLUMN "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Extract number and text (unit) from old string. Fallback to 0 if parsing fails.
UPDATE "RecipeIngredient"
SET 
  "quantity" = COALESCE(NULLIF(regexp_replace("old_quantity", '[^\d\.]', '', 'g'), '')::DOUBLE PRECISION, 0),
  "unit" = regexp_replace(lower("old_quantity"), '[\d\.\s]', '', 'g');

-- Convert to Kg based on extracted unit
UPDATE "RecipeIngredient"
SET "quantityInKg" = CASE 
  WHEN "unit" IN ('gr', 'g', 'gram', 'grams') THEN "quantity" / 1000.0
  WHEN "unit" IN ('kg', 'kilogram', 'kilograms') THEN "quantity"
  WHEN "unit" IN ('ml', 'mililiter', 'milliliter') THEN "quantity" / 1000.0
  WHEN "unit" IN ('l', 'liter', 'liters') THEN "quantity"
  ELSE 0
END;

ALTER TABLE "RecipeIngredient" DROP COLUMN "old_quantity";
ALTER TABLE "RecipeIngredient" ALTER COLUMN "unit" DROP DEFAULT;
ALTER TABLE "RecipeIngredient" ALTER COLUMN "quantityInKg" DROP DEFAULT;
ALTER TABLE "RecipeIngredient" ALTER COLUMN "quantity" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Farmer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "region" TEXT NOT NULL,
    "commodityType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerSupplyItem" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "weeklyCapacityKg" DOUBLE PRECISION NOT NULL,
    "minOrderKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FarmerSupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerPurchaseOrder" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "forecastedQtyKg" DOUBLE PRECISION NOT NULL,
    "orderedQtyKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "confidenceScore" DOUBLE PRECISION,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmerPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecastLog" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "activeUserCount" INTEGER NOT NULL,
    "predictedQtyKg" DOUBLE PRECISION NOT NULL,
    "actualQtyUsedKg" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecastLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerSupplyItem_farmerId_ingredientId_key" ON "FarmerSupplyItem"("farmerId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerPurchaseOrder_farmerId_ingredientId_weekStartDate_key" ON "FarmerPurchaseOrder"("farmerId", "ingredientId", "weekStartDate");

-- AddForeignKey
ALTER TABLE "FarmerSupplyItem" ADD CONSTRAINT "FarmerSupplyItem_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerSupplyItem" ADD CONSTRAINT "FarmerSupplyItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerPurchaseOrder" ADD CONSTRAINT "FarmerPurchaseOrder_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerPurchaseOrder" ADD CONSTRAINT "FarmerPurchaseOrder_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecastLog" ADD CONSTRAINT "DemandForecastLog_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;