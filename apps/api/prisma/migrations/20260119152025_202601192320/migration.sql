-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "LicensePlateApplication" (
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

-- CreateIndex
CREATE INDEX "LicensePlateApplication_userId_idx" ON "LicensePlateApplication"("userId");

-- CreateIndex
CREATE INDEX "LicensePlateApplication_licensePlate_idx" ON "LicensePlateApplication"("licensePlate");

-- CreateIndex
CREATE INDEX "LicensePlateApplication_status_idx" ON "LicensePlateApplication"("status");

-- AddForeignKey
ALTER TABLE "LicensePlateApplication" ADD CONSTRAINT "LicensePlateApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
