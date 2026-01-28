-- CreateTable
CREATE TABLE "SavedPlate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'car',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPlate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedPlate_userId_idx" ON "SavedPlate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPlate_userId_licensePlate_key" ON "SavedPlate"("userId", "licensePlate");

-- AddForeignKey
ALTER TABLE "SavedPlate" ADD CONSTRAINT "SavedPlate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
