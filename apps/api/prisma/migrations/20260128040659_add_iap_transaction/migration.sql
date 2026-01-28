-- CreateEnum
CREATE TYPE "IAPPlatform" AS ENUM ('ios', 'android');

-- CreateTable
CREATE TABLE "IAPTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "platform" "IAPPlatform" NOT NULL,
    "productId" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "receiptData" TEXT,
    "environment" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IAPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IAPTransaction_transactionId_key" ON "IAPTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "IAPTransaction_userId_idx" ON "IAPTransaction"("userId");

-- CreateIndex
CREATE INDEX "IAPTransaction_transactionId_idx" ON "IAPTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "IAPTransaction_verifiedAt_idx" ON "IAPTransaction"("verifiedAt");
