-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freePoints" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "lastFreePointsReset" TIMESTAMP(3);
