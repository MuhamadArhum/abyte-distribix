import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { GasProductsModule } from './modules/gas-products/gas-products.module';
import { StorageTanksModule } from './modules/storage-tanks/storage-tanks.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { GasReceivingModule } from './modules/gas-receiving/gas-receiving.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CylindersModule } from './modules/cylinders/cylinders.module';
import { FillingModule } from './modules/filling/filling.module';
import { SalesModule } from './modules/sales/sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { BackupModule } from './modules/backup/backup.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DashboardModule,
    CustomersModule,
    SuppliersModule,
    GasProductsModule,
    StorageTanksModule,
    PurchasesModule,
    GasReceivingModule,
    InventoryModule,
    CylindersModule,
    FillingModule,
    SalesModule,
    PaymentsModule,
    ExpensesModule,
    AccountingModule,
    ReportsModule,
    SettingsModule,
    AuditLogsModule,
    BackupModule,
  ],
})
export class AppModule {}
