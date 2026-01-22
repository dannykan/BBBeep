-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedByAdminAt" TIMESTAMP(3),
ADD COLUMN     "blockedByAdminReason" TEXT,
ADD COLUMN     "isBlockedByAdmin" BOOLEAN NOT NULL DEFAULT false;
