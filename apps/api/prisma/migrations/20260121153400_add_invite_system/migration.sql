-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'completed', 'expired');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "invitedById" TEXT,
ADD COLUMN "customInviterReward" INTEGER,
ADD COLUMN "customInviteeReward" INTEGER;

-- CreateTable
CREATE TABLE "InviteSettings" (
    "id" TEXT NOT NULL,
    "defaultInviterReward" INTEGER NOT NULL DEFAULT 5,
    "defaultInviteeReward" INTEGER NOT NULL DEFAULT 3,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteHistory" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "inviterReward" INTEGER NOT NULL,
    "inviteeReward" INTEGER NOT NULL,
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "InviteHistory_inviteeId_key" ON "InviteHistory"("inviteeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteHistory" ADD CONSTRAINT "InviteHistory_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteHistory" ADD CONSTRAINT "InviteHistory_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
