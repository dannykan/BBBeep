-- 初始化数据库脚本
-- 这个脚本包含所有必要的表结构
-- 可以通过 Railway Dashboard 的数据库服务直接运行

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('driver', 'pedestrian');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('car', 'scooter');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('VEHICLE_REMINDER', 'SAFETY_REMINDER', 'PRAISE');

-- CreateEnum
CREATE TYPE "PointHistoryType" AS ENUM ('recharge', 'spend', 'earn', 'bonus');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'resolved');

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT,
    "nickname" TEXT,
    "licensePlate" TEXT,
    "userType" "UserType" NOT NULL,
    "vehicleType" "VehicleType",
    "points" INTEGER NOT NULL DEFAULT 0,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "template" TEXT NOT NULL,
    "customText" TEXT,
    "replyText" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PointHistory" (
    "id" TEXT NOT NULL,
    "type" "PointHistoryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BlockedUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RejectedUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejecterId" TEXT NOT NULL,
    "rejectedId" TEXT NOT NULL,

    CONSTRAINT "RejectedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LicensePlateApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vehicleType" "VehicleType",
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "licenseImage" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "LicensePlateApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MessageReport" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_licensePlate_idx" ON "User"("licensePlate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_receiverId_createdAt_idx" ON "Message"("receiverId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PointHistory_userId_createdAt_idx" ON "PointHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BlockedUser_blockerId_blockedId_key" ON "BlockedUser"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlockedUser_blockerId_idx" ON "BlockedUser"("blockerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RejectedUser_rejecterId_rejectedId_key" ON "RejectedUser"("rejecterId", "rejectedId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RejectedUser_rejecterId_idx" ON "RejectedUser"("rejecterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RejectedUser_rejectedId_idx" ON "RejectedUser"("rejectedId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsageLog_userId_resetDate_idx" ON "AIUsageLog"("userId", "resetDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AIUsageLog_resetDate_idx" ON "AIUsageLog"("resetDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicensePlateApplication_userId_idx" ON "LicensePlateApplication"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicensePlateApplication_licensePlate_idx" ON "LicensePlateApplication"("licensePlate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LicensePlateApplication_status_idx" ON "LicensePlateApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MessageReport_messageId_reporterId_key" ON "MessageReport"("messageId", "reporterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MessageReport_messageId_idx" ON "MessageReport"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MessageReport_reporterId_idx" ON "MessageReport"("reporterId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MessageReport_status_idx" ON "MessageReport"("status");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Message_senderId_fkey'
    ) THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Message_receiverId_fkey'
    ) THEN
        ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" 
        FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'PointHistory_userId_fkey'
    ) THEN
        ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BlockedUser_blockerId_fkey'
    ) THEN
        ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockerId_fkey" 
        FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'BlockedUser_blockedId_fkey'
    ) THEN
        ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedId_fkey" 
        FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RejectedUser_rejecterId_fkey'
    ) THEN
        ALTER TABLE "RejectedUser" ADD CONSTRAINT "RejectedUser_rejecterId_fkey" 
        FOREIGN KEY ("rejecterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'RejectedUser_rejectedId_fkey'
    ) THEN
        ALTER TABLE "RejectedUser" ADD CONSTRAINT "RejectedUser_rejectedId_fkey" 
        FOREIGN KEY ("rejectedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AIUsageLog_userId_fkey'
    ) THEN
        ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'LicensePlateApplication_userId_fkey'
    ) THEN
        ALTER TABLE "LicensePlateApplication" ADD CONSTRAINT "LicensePlateApplication_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MessageReport_messageId_fkey'
    ) THEN
        ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey" 
        FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MessageReport_reporterId_fkey'
    ) THEN
        ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" 
        FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
