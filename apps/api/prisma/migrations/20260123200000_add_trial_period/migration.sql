-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trialEndedProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trialStartDate" TIMESTAMP(3);
