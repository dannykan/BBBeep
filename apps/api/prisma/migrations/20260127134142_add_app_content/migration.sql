-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'reply';

-- CreateTable
CREATE TABLE "AppContent" (
    "id" TEXT NOT NULL,
    "landingTagline" TEXT NOT NULL DEFAULT '讓路上多一點善意 💙',
    "landingSubtext" TEXT NOT NULL DEFAULT '透過車牌發送善意提醒
讓每一位駕駛更安全',
    "homeHeroTitle" TEXT NOT NULL DEFAULT '讓路上多一點善意 💙',
    "homeHeroSubtitle" TEXT NOT NULL DEFAULT '透過車牌發送善意提醒，讓駕駛更安全',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppContent_pkey" PRIMARY KEY ("id")
);
