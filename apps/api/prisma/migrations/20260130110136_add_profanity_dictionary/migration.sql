-- CreateEnum
CREATE TYPE "ProfanityCategory" AS ENUM ('PROFANITY', 'THREAT', 'HARASSMENT', 'DISCRIMINATION');

-- CreateEnum
CREATE TYPE "ProfanitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "ProfanityWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" "ProfanityCategory" NOT NULL,
    "severity" "ProfanitySeverity" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfanityWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfanityDictVersion" (
    "id" TEXT NOT NULL,
    "version" SERIAL NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfanityDictVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfanityWord_word_key" ON "ProfanityWord"("word");

-- CreateIndex
CREATE INDEX "ProfanityWord_category_idx" ON "ProfanityWord"("category");

-- CreateIndex
CREATE INDEX "ProfanityWord_isActive_idx" ON "ProfanityWord"("isActive");

-- CreateIndex
CREATE INDEX "ProfanityWord_severity_idx" ON "ProfanityWord"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "ProfanityDictVersion_version_key" ON "ProfanityDictVersion"("version");
