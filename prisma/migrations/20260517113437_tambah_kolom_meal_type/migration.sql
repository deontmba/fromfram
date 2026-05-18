/*
  Warnings:

  - A unique constraint covering the columns `[weeklyBoxId,dayOfWeek,mealType]` on the table `MealSelection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mealType` to the `Delivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mealType` to the `MealSelection` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('LUNCH', 'DINNER');

-- DropIndex
DROP INDEX "MealSelection_weeklyBoxId_dayOfWeek_key";

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "mealType" "MealType" NOT NULL;

-- AlterTable
ALTER TABLE "MealSelection" ADD COLUMN     "mealType" "MealType" NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MealSelection_weeklyBoxId_dayOfWeek_mealType_key" ON "MealSelection"("weeklyBoxId", "dayOfWeek", "mealType");
