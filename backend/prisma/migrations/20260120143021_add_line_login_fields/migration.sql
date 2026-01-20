/*
  Warnings:

  - A unique constraint covering the columns `[lineUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lineDisplayName" TEXT,
ADD COLUMN     "linePictureUrl" TEXT,
ADD COLUMN     "lineUserId" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AIPrompt" (
    "id" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "category" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIPrompt_vehicleType_category_isActive_idx" ON "AIPrompt"("vehicleType", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIPrompt_vehicleType_category_key" ON "AIPrompt"("vehicleType", "category");

-- CreateIndex
CREATE UNIQUE INDEX "User_lineUserId_key" ON "User"("lineUserId");

-- CreateIndex
CREATE INDEX "User_lineUserId_idx" ON "User"("lineUserId");
