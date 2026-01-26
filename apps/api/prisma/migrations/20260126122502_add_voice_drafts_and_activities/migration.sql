-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'SENT', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RECORDING_COMPLETE', 'TEXT_EDIT', 'AI_OPTIMIZE', 'MESSAGE_SENT', 'RECORDING_CANCEL');

-- CreateTable
CREATE TABLE "VoiceDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceUrl" TEXT NOT NULL,
    "voiceDuration" INTEGER NOT NULL,
    "transcript" TEXT,
    "parsedPlates" TEXT[],
    "parsedVehicle" JSONB,
    "parsedEvent" JSONB,
    "suggestedMessage" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "messageText" TEXT,
    "voiceUrl" TEXT,
    "voiceDuration" INTEGER,
    "transcript" TEXT,
    "aiModerationResult" JSONB,
    "targetPlate" TEXT,
    "vehicleType" TEXT,
    "category" TEXT,
    "sendMode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "metadata" JSONB,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceDraft_userId_status_idx" ON "VoiceDraft"("userId", "status");

-- CreateIndex
CREATE INDEX "VoiceDraft_status_expiresAt_idx" ON "VoiceDraft"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "UserActivity_userId_idx" ON "UserActivity"("userId");

-- CreateIndex
CREATE INDEX "UserActivity_type_idx" ON "UserActivity"("type");

-- CreateIndex
CREATE INDEX "UserActivity_createdAt_idx" ON "UserActivity"("createdAt");

-- CreateIndex
CREATE INDEX "UserActivity_isSent_idx" ON "UserActivity"("isSent");

-- AddForeignKey
ALTER TABLE "VoiceDraft" ADD CONSTRAINT "VoiceDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
