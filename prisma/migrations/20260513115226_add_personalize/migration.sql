-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "allergySafeTags" TEXT[],
ADD COLUMN     "cookingTags" TEXT[],
ADD COLUMN     "dietaryTags" TEXT[],
ADD COLUMN     "goalTags" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPersonalization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goals" TEXT[],
    "dietaryPrefs" TEXT[],
    "allergies" TEXT[],
    "cookingPrefs" TEXT[],
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "age" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPersonalization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonalization_userId_key" ON "UserPersonalization"("userId");

-- AddForeignKey
ALTER TABLE "UserPersonalization" ADD CONSTRAINT "UserPersonalization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
