-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleCode" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'TRUCK',
    "capacity" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "deliveryDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deliveries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deliveries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deliveries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cylinder_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "customerId" TEXT,
    "purchaseDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cylinder_units_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_units_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_driverCode_key" ON "drivers"("driverCode");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicleCode_key" ON "vehicles"("vehicleCode");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicleNumber_key" ON "vehicles"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_deliveryNumber_key" ON "deliveries"("deliveryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cylinder_units_serialNumber_key" ON "cylinder_units"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "cylinder_units_qrCode_key" ON "cylinder_units"("qrCode");
