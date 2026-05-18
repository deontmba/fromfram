/*
  Warnings:

  - A unique constraint covering the columns `[weeklyBoxId,dayOfWeek,mealType,recipeId]` on the table `MealSelection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MealSelection_weeklyBoxId_dayOfWeek_mealType_key";

-- AlterTable
ALTER TABLE "MealSelection" ADD COLUMN     "serving" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "MealSelection_weeklyBoxId_dayOfWeek_mealType_recipeId_key" ON "MealSelection"("weeklyBoxId", "dayOfWeek", "mealType", "recipeId");
