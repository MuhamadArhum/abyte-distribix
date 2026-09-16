/*
  Warnings:

  - Added the required column `companyId` to the `bank_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `cash_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `customer_cylinder_balances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `customer_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `cylinder_inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `cylinder_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `cylinder_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `cylinder_units` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `deliveries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `drivers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `filling_batches` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `gas_inventory_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `gas_products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `gas_receivings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `sale_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `sale_return_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `sale_returns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `storage_tanks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `supplier_payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `suppliers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `vehicles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Seed the default company that all pre-existing (single-tenant) data belongs to
INSERT INTO "companies" ("id", "name", "code", "status", "createdAt", "updatedAt")
VALUES ('cmp_default', 'Company 1', 'company-1', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "createdAt", "id", "ipAddress", "module", "newValue", "previousValue", "recordId", "userId", "companyId") SELECT "action", "createdAt", "id", "ipAddress", "module", "newValue", "previousValue", "recordId", "userId", 'cmp_default' FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE TABLE "new_bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "amount" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bank_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_bank_transactions" ("accountNumber", "amount", "balance", "bankName", "createdAt", "description", "direction", "id", "referenceId", "referenceType", "transactionType", "companyId") SELECT "accountNumber", "amount", "balance", "bankName", "createdAt", "description", "direction", "id", "referenceId", "referenceType", "transactionType", 'cmp_default' FROM "bank_transactions";
DROP TABLE "bank_transactions";
ALTER TABLE "new_bank_transactions" RENAME TO "bank_transactions";
CREATE TABLE "new_cash_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "amount" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cash_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_cash_transactions" ("amount", "balance", "createdAt", "description", "direction", "id", "referenceId", "referenceType", "transactionType", "companyId") SELECT "amount", "balance", "createdAt", "description", "direction", "id", "referenceId", "referenceType", "transactionType", 'cmp_default' FROM "cash_transactions";
DROP TABLE "cash_transactions";
ALTER TABLE "new_cash_transactions" RENAME TO "cash_transactions";
CREATE TABLE "new_customer_cylinder_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "filledQty" INTEGER NOT NULL DEFAULT 0,
    "emptyQty" INTEGER NOT NULL DEFAULT 0,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "customer_cylinder_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_cylinder_balances_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_cylinder_balances_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_customer_cylinder_balances" ("customerId", "cylinderTypeId", "emptyQty", "filledQty", "id", "totalQty", "updatedAt", "companyId") SELECT "customerId", "cylinderTypeId", "emptyQty", "filledQty", "id", "totalQty", "updatedAt", 'cmp_default' FROM "customer_cylinder_balances";
DROP TABLE "customer_cylinder_balances";
ALTER TABLE "new_customer_cylinder_balances" RENAME TO "customer_cylinder_balances";
CREATE UNIQUE INDEX "customer_cylinder_balances_customerId_cylinderTypeId_key" ON "customer_cylinder_balances"("customerId", "cylinderTypeId");
CREATE TABLE "new_customer_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "customer_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "customer_payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "customer_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_customer_payments" ("amount", "createdAt", "createdById", "customerId", "id", "notes", "paymentDate", "paymentMethod", "paymentNumber", "reference", "saleId", "companyId") SELECT "amount", "createdAt", "createdById", "customerId", "id", "notes", "paymentDate", "paymentMethod", "paymentNumber", "reference", "saleId", 'cmp_default' FROM "customer_payments";
DROP TABLE "customer_payments";
ALTER TABLE "new_customer_payments" RENAME TO "customer_payments";
CREATE UNIQUE INDEX "customer_payments_companyId_paymentNumber_key" ON "customer_payments"("companyId", "paymentNumber");
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'RETAIL',
    "creditLimit" REAL NOT NULL DEFAULT 0,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_customers" ("address", "businessName", "contactPerson", "createdAt", "creditLimit", "currentBalance", "customerCode", "customerType", "email", "id", "notes", "openingBalance", "paymentTerms", "phone", "status", "updatedAt", "companyId") SELECT "address", "businessName", "contactPerson", "createdAt", "creditLimit", "currentBalance", "customerCode", "customerType", "email", "id", "notes", "openingBalance", "paymentTerms", "phone", "status", "updatedAt", 'cmp_default' FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
CREATE UNIQUE INDEX "customers_companyId_customerCode_key" ON "customers"("companyId", "customerCode");
CREATE TABLE "new_cylinder_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cylinder_inventory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_inventory_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_cylinder_inventory" ("cylinderTypeId", "id", "quantity", "status", "updatedAt", "companyId") SELECT "cylinderTypeId", "id", "quantity", "status", "updatedAt", 'cmp_default' FROM "cylinder_inventory";
DROP TABLE "cylinder_inventory";
ALTER TABLE "new_cylinder_inventory" RENAME TO "cylinder_inventory";
CREATE UNIQUE INDEX "cylinder_inventory_cylinderTypeId_status_key" ON "cylinder_inventory"("cylinderTypeId", "status");
CREATE TABLE "new_cylinder_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "cylinderTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "customerId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "cylinder_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_transactions_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "cylinder_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cylinder_transactions" ("createdAt", "createdById", "customerId", "cylinderTypeId", "fromStatus", "id", "notes", "quantity", "referenceId", "toStatus", "transactionType", "companyId") SELECT "createdAt", "createdById", "customerId", "cylinderTypeId", "fromStatus", "id", "notes", "quantity", "referenceId", "toStatus", "transactionType", 'cmp_default' FROM "cylinder_transactions";
DROP TABLE "cylinder_transactions";
ALTER TABLE "new_cylinder_transactions" RENAME TO "cylinder_transactions";
CREATE TABLE "new_cylinder_types" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "cylinderSize" TEXT NOT NULL,
    "gasCapacity" REAL NOT NULL,
    "emptyWeight" REAL NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sellingPrices" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "cylinder_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_cylinder_types" ("cylinderSize", "depositAmount", "emptyWeight", "gasCapacity", "id", "sellingPrices", "status", "companyId") SELECT "cylinderSize", "depositAmount", "emptyWeight", "gasCapacity", "id", "sellingPrices", "status", 'cmp_default' FROM "cylinder_types";
DROP TABLE "cylinder_types";
ALTER TABLE "new_cylinder_types" RENAME TO "cylinder_types";
CREATE TABLE "new_cylinder_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EMPTY',
    "customerId" TEXT,
    "purchaseDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cylinder_units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_units_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cylinder_units_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_cylinder_units" ("createdAt", "customerId", "cylinderTypeId", "id", "notes", "purchaseDate", "qrCode", "serialNumber", "status", "updatedAt", "companyId") SELECT "createdAt", "customerId", "cylinderTypeId", "id", "notes", "purchaseDate", "qrCode", "serialNumber", "status", "updatedAt", 'cmp_default' FROM "cylinder_units";
DROP TABLE "cylinder_units";
ALTER TABLE "new_cylinder_units" RENAME TO "cylinder_units";
CREATE UNIQUE INDEX "cylinder_units_companyId_serialNumber_key" ON "cylinder_units"("companyId", "serialNumber");
CREATE UNIQUE INDEX "cylinder_units_companyId_qrCode_key" ON "cylinder_units"("companyId", "qrCode");
CREATE TABLE "new_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
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
    CONSTRAINT "deliveries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deliveries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "deliveries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "deliveries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_deliveries" ("address", "createdAt", "customerId", "deliveryDate", "deliveryNumber", "driverId", "id", "notes", "saleId", "status", "updatedAt", "vehicleId", "companyId") SELECT "address", "createdAt", "customerId", "deliveryDate", "deliveryNumber", "driverId", "id", "notes", "saleId", "status", "updatedAt", "vehicleId", 'cmp_default' FROM "deliveries";
DROP TABLE "deliveries";
ALTER TABLE "new_deliveries" RENAME TO "deliveries";
CREATE UNIQUE INDEX "deliveries_companyId_deliveryNumber_key" ON "deliveries"("companyId", "deliveryNumber");
CREATE TABLE "new_drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "driverCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "drivers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_drivers" ("address", "createdAt", "driverCode", "fullName", "id", "licenseNumber", "phone", "status", "updatedAt", "companyId") SELECT "address", "createdAt", "driverCode", "fullName", "id", "licenseNumber", "phone", "status", "updatedAt", 'cmp_default' FROM "drivers";
DROP TABLE "drivers";
ALTER TABLE "new_drivers" RENAME TO "drivers";
CREATE UNIQUE INDEX "drivers_companyId_driverCode_key" ON "drivers"("companyId", "driverCode");
CREATE TABLE "new_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "description" TEXT,
    "attachment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_expenses" ("amount", "attachment", "category", "createdAt", "createdById", "description", "expenseDate", "expenseNumber", "id", "paymentMethod", "companyId") SELECT "amount", "attachment", "category", "createdAt", "createdById", "description", "expenseDate", "expenseNumber", "id", "paymentMethod", 'cmp_default' FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
CREATE UNIQUE INDEX "expenses_companyId_expenseNumber_key" ON "expenses"("companyId", "expenseNumber");
CREATE TABLE "new_filling_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "fillingDate" DATETIME NOT NULL,
    "tankId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "numberOfCylinders" INTEGER NOT NULL,
    "expectedGasQty" REAL NOT NULL,
    "actualGasQty" REAL NOT NULL DEFAULT 0,
    "gasVariance" REAL NOT NULL DEFAULT 0,
    "operatorId" TEXT,
    "fillingStation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "filling_batches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "filling_batches_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "storage_tanks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "filling_batches_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "filling_batches_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_filling_batches" ("actualGasQty", "batchNumber", "createdAt", "cylinderTypeId", "expectedGasQty", "fillingDate", "fillingStation", "gasVariance", "id", "notes", "numberOfCylinders", "operatorId", "status", "tankId", "companyId") SELECT "actualGasQty", "batchNumber", "createdAt", "cylinderTypeId", "expectedGasQty", "fillingDate", "fillingStation", "gasVariance", "id", "notes", "numberOfCylinders", "operatorId", "status", "tankId", 'cmp_default' FROM "filling_batches";
DROP TABLE "filling_batches";
ALTER TABLE "new_filling_batches" RENAME TO "filling_batches";
CREATE UNIQUE INDEX "filling_batches_companyId_batchNumber_key" ON "filling_batches"("companyId", "batchNumber");
CREATE TABLE "new_gas_inventory_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "tankId" TEXT NOT NULL,
    "gasProductId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "previousStock" REAL NOT NULL,
    "newStock" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "gas_inventory_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_inventory_transactions_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "storage_tanks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_inventory_transactions_gasProductId_fkey" FOREIGN KEY ("gasProductId") REFERENCES "gas_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_inventory_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_gas_inventory_transactions" ("createdAt", "createdById", "gasProductId", "id", "newStock", "notes", "previousStock", "quantity", "referenceId", "referenceType", "tankId", "transactionType", "companyId") SELECT "createdAt", "createdById", "gasProductId", "id", "newStock", "notes", "previousStock", "quantity", "referenceId", "referenceType", "tankId", "transactionType", 'cmp_default' FROM "gas_inventory_transactions";
DROP TABLE "gas_inventory_transactions";
ALTER TABLE "new_gas_inventory_transactions" RENAME TO "gas_inventory_transactions";
CREATE TABLE "new_gas_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "gasType" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "defaultPurchaseRate" REAL NOT NULL DEFAULT 0,
    "defaultSellingRate" REAL NOT NULL DEFAULT 0,
    "minStockLevel" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "gas_products_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_gas_products" ("defaultPurchaseRate", "defaultSellingRate", "gasType", "id", "minStockLevel", "productCode", "productName", "status", "unit", "companyId") SELECT "defaultPurchaseRate", "defaultSellingRate", "gasType", "id", "minStockLevel", "productCode", "productName", "status", "unit", 'cmp_default' FROM "gas_products";
DROP TABLE "gas_products";
ALTER TABLE "new_gas_products" RENAME TO "gas_products";
CREATE UNIQUE INDEX "gas_products_companyId_productCode_key" ON "gas_products"("companyId", "productCode");
CREATE TABLE "new_gas_receivings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "receivingNumber" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "receivingDate" DATETIME NOT NULL,
    "expectedQuantity" REAL NOT NULL,
    "receivedQuantity" REAL NOT NULL,
    "variance" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "tankId" TEXT NOT NULL,
    "receivedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gas_receivings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_receivings_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_receivings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_receivings_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "storage_tanks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "gas_receivings_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_gas_receivings" ("createdAt", "expectedQuantity", "id", "notes", "purchaseId", "receivedById", "receivedQuantity", "receivingDate", "receivingNumber", "supplierId", "tankId", "unit", "variance", "companyId") SELECT "createdAt", "expectedQuantity", "id", "notes", "purchaseId", "receivedById", "receivedQuantity", "receivingDate", "receivingNumber", "supplierId", "tankId", "unit", "variance", 'cmp_default' FROM "gas_receivings";
DROP TABLE "gas_receivings";
ALTER TABLE "new_gas_receivings" RENAME TO "gas_receivings";
CREATE UNIQUE INDEX "gas_receivings_companyId_receivingNumber_key" ON "gas_receivings"("companyId", "receivingNumber");
CREATE TABLE "new_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "gasProductId" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'KG',
    "purchaseRate" REAL NOT NULL,
    "gasAmount" REAL NOT NULL,
    "transportation" REAL NOT NULL DEFAULT 0,
    "otherCharges" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL,
    "netAmount" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "remainingAmount" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "supplierInvoiceNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchases_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchases_gasProductId_fkey" FOREIGN KEY ("gasProductId") REFERENCES "gas_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchases" ("createdAt", "discount", "gasAmount", "gasProductId", "grossAmount", "id", "netAmount", "notes", "otherCharges", "paidAmount", "paymentStatus", "purchaseDate", "purchaseNumber", "purchaseRate", "quantity", "remainingAmount", "status", "supplierId", "supplierInvoiceNumber", "transportation", "unit", "updatedAt", "companyId") SELECT "createdAt", "discount", "gasAmount", "gasProductId", "grossAmount", "id", "netAmount", "notes", "otherCharges", "paidAmount", "paymentStatus", "purchaseDate", "purchaseNumber", "purchaseRate", "quantity", "remainingAmount", "status", "supplierId", "supplierInvoiceNumber", "transportation", "unit", "updatedAt", 'cmp_default' FROM "purchases";
DROP TABLE "purchases";
ALTER TABLE "new_purchases" RENAME TO "purchases";
CREATE UNIQUE INDEX "purchases_companyId_purchaseNumber_key" ON "purchases"("companyId", "purchaseNumber");
CREATE TABLE "new_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_roles" ("description", "id", "name", "permissions", "companyId") SELECT "description", "id", "name", "permissions", 'cmp_default' FROM "roles";
DROP TABLE "roles";
ALTER TABLE "new_roles" RENAME TO "roles";
CREATE UNIQUE INDEX "roles_companyId_name_key" ON "roles"("companyId", "name");
CREATE TABLE "new_sale_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    CONSTRAINT "sale_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_items_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_items" ("cylinderTypeId", "discount", "id", "quantity", "saleId", "totalPrice", "unitPrice", "companyId") SELECT "cylinderTypeId", "discount", "id", "quantity", "saleId", "totalPrice", "unitPrice", 'cmp_default' FROM "sale_items";
DROP TABLE "sale_items";
ALTER TABLE "new_sale_items" RENAME TO "sale_items";
CREATE TABLE "new_sale_return_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "saleReturnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "cylinderTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    CONSTRAINT "sale_return_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_return_items_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "sale_returns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sale_return_items_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_return_items_cylinderTypeId_fkey" FOREIGN KEY ("cylinderTypeId") REFERENCES "cylinder_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_return_items" ("cylinderTypeId", "id", "quantity", "saleItemId", "saleReturnId", "totalPrice", "unitPrice", "companyId") SELECT "cylinderTypeId", "id", "quantity", "saleItemId", "saleReturnId", "totalPrice", "unitPrice", 'cmp_default' FROM "sale_return_items";
DROP TABLE "sale_return_items";
ALTER TABLE "new_sale_return_items" RENAME TO "sale_return_items";
CREATE TABLE "new_sale_returns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "returnDate" DATETIME NOT NULL,
    "reason" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_returns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_returns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sale_returns" ("createdAt", "customerId", "id", "notes", "reason", "returnDate", "returnNumber", "saleId", "totalAmount", "companyId") SELECT "createdAt", "customerId", "id", "notes", "reason", "returnDate", "returnNumber", "saleId", "totalAmount", 'cmp_default' FROM "sale_returns";
DROP TABLE "sale_returns";
ALTER TABLE "new_sale_returns" RENAME TO "sale_returns";
CREATE UNIQUE INDEX "sale_returns_companyId_returnNumber_key" ON "sale_returns"("companyId", "returnNumber");
CREATE TABLE "new_sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "netTotal" REAL NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "remainingAmount" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sales" ("createdAt", "createdById", "customerId", "discount", "id", "invoiceNumber", "netTotal", "notes", "paidAmount", "paymentMethod", "paymentStatus", "remainingAmount", "saleDate", "subtotal", "updatedAt", "companyId") SELECT "createdAt", "createdById", "customerId", "discount", "id", "invoiceNumber", "netTotal", "notes", "paidAmount", "paymentMethod", "paymentStatus", "remainingAmount", "saleDate", "subtotal", "updatedAt", 'cmp_default' FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE UNIQUE INDEX "sales_companyId_invoiceNumber_key" ON "sales"("companyId", "invoiceNumber");
CREATE TABLE "new_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("description", "id", "key", "updatedAt", "value", "companyId") SELECT "description", "id", "key", "updatedAt", "value", 'cmp_default' FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE UNIQUE INDEX "settings_companyId_key_key" ON "settings"("companyId", "key");
CREATE TABLE "new_storage_tanks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tankNumber" TEXT NOT NULL,
    "tankName" TEXT NOT NULL,
    "gasProductId" TEXT NOT NULL,
    "capacity" REAL NOT NULL,
    "currentQuantity" REAL NOT NULL DEFAULT 0,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "storage_tanks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "storage_tanks_gasProductId_fkey" FOREIGN KEY ("gasProductId") REFERENCES "gas_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_storage_tanks" ("capacity", "currentQuantity", "gasProductId", "id", "location", "status", "tankName", "tankNumber", "companyId") SELECT "capacity", "currentQuantity", "gasProductId", "id", "location", "status", "tankName", "tankNumber", 'cmp_default' FROM "storage_tanks";
DROP TABLE "storage_tanks";
ALTER TABLE "new_storage_tanks" RENAME TO "storage_tanks";
CREATE UNIQUE INDEX "storage_tanks_companyId_tankNumber_key" ON "storage_tanks"("companyId", "tankNumber");
CREATE TABLE "new_supplier_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "paymentDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "supplier_payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "supplier_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "supplier_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_supplier_payments" ("amount", "createdAt", "createdById", "id", "notes", "paymentDate", "paymentMethod", "paymentNumber", "purchaseId", "reference", "supplierId", "companyId") SELECT "amount", "createdAt", "createdById", "id", "notes", "paymentDate", "paymentMethod", "paymentNumber", "purchaseId", "reference", "supplierId", 'cmp_default' FROM "supplier_payments";
DROP TABLE "supplier_payments";
ALTER TABLE "new_supplier_payments" RENAME TO "supplier_payments";
CREATE UNIQUE INDEX "supplier_payments_companyId_paymentNumber_key" ON "supplier_payments"("companyId", "paymentNumber");
CREATE TABLE "new_suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "taxNtn" TEXT,
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "currentBalance" REAL NOT NULL DEFAULT 0,
    "paymentTerms" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_suppliers" ("address", "contactPerson", "createdAt", "currentBalance", "email", "id", "notes", "openingBalance", "paymentTerms", "phone", "status", "supplierCode", "supplierName", "taxNtn", "updatedAt", "companyId") SELECT "address", "contactPerson", "createdAt", "currentBalance", "email", "id", "notes", "openingBalance", "paymentTerms", "phone", "status", "supplierCode", "supplierName", "taxNtn", "updatedAt", 'cmp_default' FROM "suppliers";
DROP TABLE "suppliers";
ALTER TABLE "new_suppliers" RENAME TO "suppliers";
CREATE UNIQUE INDEX "suppliers_companyId_supplierCode_key" ON "suppliers"("companyId", "supplierCode");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "email", "fullName", "id", "isActive", "passwordHash", "role", "updatedAt", "username", "companyId") SELECT "createdAt", "email", "fullName", "id", "isActive", "passwordHash", "role", "updatedAt", "username", 'cmp_default' FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_companyId_username_key" ON "users"("companyId", "username");
CREATE UNIQUE INDEX "users_companyId_email_key" ON "users"("companyId", "email");
CREATE TABLE "new_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "vehicleCode" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'TRUCK',
    "capacity" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_vehicles" ("capacity", "createdAt", "id", "status", "updatedAt", "vehicleCode", "vehicleNumber", "vehicleType", "companyId") SELECT "capacity", "createdAt", "id", "status", "updatedAt", "vehicleCode", "vehicleNumber", "vehicleType", 'cmp_default' FROM "vehicles";
DROP TABLE "vehicles";
ALTER TABLE "new_vehicles" RENAME TO "vehicles";
CREATE UNIQUE INDEX "vehicles_companyId_vehicleCode_key" ON "vehicles"("companyId", "vehicleCode");
CREATE UNIQUE INDEX "vehicles_companyId_vehicleNumber_key" ON "vehicles"("companyId", "vehicleNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
