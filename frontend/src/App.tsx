import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/CustomerDetailPage'));
const SuppliersPage = lazy(() => import('@/pages/suppliers/SuppliersPage'));
const SupplierDetailPage = lazy(() => import('@/pages/suppliers/SupplierDetailPage'));
const GasProductsPage = lazy(() => import('@/pages/gas-products/GasProductsPage'));
const StorageTanksPage = lazy(() => import('@/pages/storage-tanks/StorageTanksPage'));
const PurchasesPage = lazy(() => import('@/pages/purchases/PurchasesPage'));
const NewPurchasePage = lazy(() => import('@/pages/purchases/NewPurchasePage'));
const PurchaseDetailPage = lazy(() => import('@/pages/purchases/PurchaseDetailPage'));
const GasReceivingPage = lazy(() => import('@/pages/gas-receiving/GasReceivingPage'));
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage'));
const CylindersPage = lazy(() => import('@/pages/cylinders/CylindersPage'));
const FillingPage = lazy(() => import('@/pages/filling/FillingPage'));
const NewFillingPage = lazy(() => import('@/pages/filling/NewFillingPage'));
const SalesPage = lazy(() => import('@/pages/sales/SalesPage'));
const NewSalePage = lazy(() => import('@/pages/sales/NewSalePage'));
const SaleDetailPage = lazy(() => import('@/pages/sales/SaleDetailPage'));
const CustomerPaymentsPage = lazy(() => import('@/pages/payments/CustomerPaymentsPage'));
const SupplierPaymentsPage = lazy(() => import('@/pages/payments/SupplierPaymentsPage'));
const ExpensesPage = lazy(() => import('@/pages/expenses/ExpensesPage'));
const AccountingPage = lazy(() => import('@/pages/accounting/AccountingPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const UsersPage = lazy(() => import('@/pages/users/UsersPage'));
const DriversPage = lazy(() => import('@/pages/drivers/DriversPage'));
const VehiclesPage = lazy(() => import('@/pages/vehicles/VehiclesPage'));
const DeliveriesPage = lazy(() => import('@/pages/deliveries/DeliveriesPage'));
const CylinderUnitsPage = lazy(() => import('@/pages/cylinder-units/CylinderUnitsPage'));
const AuditLogsPage = lazy(() => import('@/pages/audit-logs/AuditLogsPage'));
const BackupPage = lazy(() => import('@/pages/backup/BackupPage'));
const RolesPage = lazy(() => import('@/pages/roles/RolesPage'));

function LoadingFallback() {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="suppliers/:id" element={<SupplierDetailPage />} />
            <Route path="gas-products" element={<GasProductsPage />} />
            <Route path="storage-tanks" element={<StorageTanksPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/new" element={<NewPurchasePage />} />
            <Route path="purchases/:id" element={<PurchaseDetailPage />} />
            <Route path="gas-receiving" element={<GasReceivingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="cylinders" element={<CylindersPage />} />
            <Route path="filling" element={<FillingPage />} />
            <Route path="filling/new" element={<NewFillingPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/new" element={<NewSalePage />} />
            <Route path="sales/:id" element={<SaleDetailPage />} />
            <Route path="payments/customer" element={<CustomerPaymentsPage />} />
            <Route path="payments/supplier" element={<SupplierPaymentsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="accounting" element={<AccountingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="cylinder-units" element={<CylinderUnitsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="roles" element={<RolesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
