/*
  Warnings:

  - A unique constraint covering the columns `[appleUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hasVoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "voiceDuration" INTEGER,
ADD COLUMN     "voiceUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appleEmail" TEXT,
ADD COLUMN     "appleUserId" TEXT;

-- CreateIndex
CREATE INDEX "InviteHistory_inviterId_idx" ON "InviteHistory"("inviterId");

-- CreateIndex
CREATE INDEX "InviteHistory_status_idx" ON "InviteHistory"("status");

-- CreateIndex
CREATE INDEX "InviteHistory_createdAt_idx" ON "InviteHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_appleUserId_key" ON "User"("appleUserId");

-- CreateIndex
CREATE INDEX "User_appleUserId_idx" ON "User"("appleUserId");
