-- CreateIndex
CREATE INDEX "audit_logs_companyId_createdAt_idx" ON "audit_logs"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_module_idx" ON "audit_logs"("companyId", "module");

-- CreateIndex
CREATE INDEX "bank_transactions_companyId_createdAt_idx" ON "bank_transactions"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_transactions_companyId_createdAt_idx" ON "cash_transactions"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_cylinder_balances_companyId_idx" ON "customer_cylinder_balances"("companyId");

-- CreateIndex
CREATE INDEX "customer_payments_companyId_paymentDate_idx" ON "customer_payments"("companyId", "paymentDate");

-- CreateIndex
CREATE INDEX "customer_payments_customerId_idx" ON "customer_payments"("customerId");

-- CreateIndex
CREATE INDEX "customers_companyId_status_idx" ON "customers"("companyId", "status");

-- CreateIndex
CREATE INDEX "cylinder_inventory_companyId_idx" ON "cylinder_inventory"("companyId");

-- CreateIndex
CREATE INDEX "cylinder_transactions_companyId_idx" ON "cylinder_transactions"("companyId");

-- CreateIndex
CREATE INDEX "cylinder_transactions_cylinderTypeId_idx" ON "cylinder_transactions"("cylinderTypeId");

-- CreateIndex
CREATE INDEX "cylinder_types_companyId_status_idx" ON "cylinder_types"("companyId", "status");

-- CreateIndex
CREATE INDEX "cylinder_units_companyId_status_idx" ON "cylinder_units"("companyId", "status");

-- CreateIndex
CREATE INDEX "deliveries_companyId_status_idx" ON "deliveries"("companyId", "status");

-- CreateIndex
CREATE INDEX "deliveries_customerId_idx" ON "deliveries"("customerId");

-- CreateIndex
CREATE INDEX "drivers_companyId_status_idx" ON "drivers"("companyId", "status");

-- CreateIndex
CREATE INDEX "expenses_companyId_expenseDate_idx" ON "expenses"("companyId", "expenseDate");

-- CreateIndex
CREATE INDEX "expenses_companyId_category_idx" ON "expenses"("companyId", "category");

-- CreateIndex
CREATE INDEX "filling_batches_companyId_fillingDate_idx" ON "filling_batches"("companyId", "fillingDate");

-- CreateIndex
CREATE INDEX "filling_batches_companyId_status_idx" ON "filling_batches"("companyId", "status");

-- CreateIndex
CREATE INDEX "gas_inventory_transactions_companyId_idx" ON "gas_inventory_transactions"("companyId");

-- CreateIndex
CREATE INDEX "gas_inventory_transactions_tankId_idx" ON "gas_inventory_transactions"("tankId");

-- CreateIndex
CREATE INDEX "gas_products_companyId_status_idx" ON "gas_products"("companyId", "status");

-- CreateIndex
CREATE INDEX "gas_receivings_companyId_receivingDate_idx" ON "gas_receivings"("companyId", "receivingDate");

-- CreateIndex
CREATE INDEX "purchases_companyId_purchaseDate_idx" ON "purchases"("companyId", "purchaseDate");

-- CreateIndex
CREATE INDEX "purchases_companyId_paymentStatus_idx" ON "purchases"("companyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "sale_items_companyId_idx" ON "sale_items"("companyId");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_return_items_companyId_idx" ON "sale_return_items"("companyId");

-- CreateIndex
CREATE INDEX "sale_return_items_saleReturnId_idx" ON "sale_return_items"("saleReturnId");

-- CreateIndex
CREATE INDEX "sale_returns_companyId_returnDate_idx" ON "sale_returns"("companyId", "returnDate");

-- CreateIndex
CREATE INDEX "sale_returns_saleId_idx" ON "sale_returns"("saleId");

-- CreateIndex
CREATE INDEX "sales_companyId_saleDate_idx" ON "sales"("companyId", "saleDate");

-- CreateIndex
CREATE INDEX "sales_companyId_paymentStatus_idx" ON "sales"("companyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "sales_customerId_idx" ON "sales"("customerId");

-- CreateIndex
CREATE INDEX "storage_tanks_companyId_status_idx" ON "storage_tanks"("companyId", "status");

-- CreateIndex
CREATE INDEX "supplier_payments_companyId_paymentDate_idx" ON "supplier_payments"("companyId", "paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX "suppliers_companyId_status_idx" ON "suppliers"("companyId", "status");

-- CreateIndex
CREATE INDEX "vehicles_companyId_status_idx" ON "vehicles"("companyId", "status");
