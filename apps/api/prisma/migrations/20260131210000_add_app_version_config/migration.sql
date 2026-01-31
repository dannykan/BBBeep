-- CreateTable
CREATE TABLE "AppVersionConfig" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "minVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "currentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "updateUrl" TEXT,
    "updateMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppVersionConfig_platform_key" ON "AppVersionConfig"("platform");
