import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: 'http://localhost:3005/api',
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (session expired) and 403 (role not permitted)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    if (error.response?.status === 403) {
      toast.error(error.response?.data?.message || "You don't have permission to do that");
    }
    return Promise.reject(error);
  },
);

export default api;

// API helpers
export const authApi = {
  login: (username: string, password: string, companyId?: string) =>
    api.post('/auth/login', { username, password, ...(companyId ? { companyId } : {}) }),
  me: () => api.get('/auth/me'),
  seed: () => api.post('/auth/seed'),
  seedSuperAdmin: () => api.post('/auth/seed-super-admin'),
};

export const companiesApi = {
  getPublic: () => api.get('/companies/public'),
  getAll: () => api.get('/companies'),
  getOne: (id: string) => api.get(`/companies/${id}`),
  create: (data: { name: string; code: string }) => api.post('/companies', data),
  update: (id: string, data: { name?: string; status?: string }) => api.patch(`/companies/${id}`, data),
};

export const customersApi = {
  // No params -> plain array (existing dropdown callers keep working).
  // With page/limit -> { data, total, page, limit }.
  getAll: (params?: { search?: string; customerType?: string; status?: string; balance?: string; page?: number; limit?: number }) =>
    api.get('/customers', { params }),
  getSummary: () => api.get('/customers/summary'),
  getOne: (id: string) => api.get(`/customers/${id}`),
  getLedger: (id: string) => api.get(`/customers/${id}/ledger`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const suppliersApi = {
  // No params -> plain array (existing dropdown callers keep working).
  // With page/limit -> { data, total, page, limit }.
  getAll: (params?: { search?: string; status?: string; balance?: string; paymentTerms?: string; page?: number; limit?: number }) =>
    api.get('/suppliers', { params }),
  getSummary: () => api.get('/suppliers/summary'),
  getOne: (id: string) => api.get(`/suppliers/${id}`),
  getLedger: (id: string) => api.get(`/suppliers/${id}/ledger`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const gasProductsApi = {
  // No params -> plain array (existing dropdown callers keep working).
  // With page/limit -> { data, total, page, limit }.
  getAll: (params?: { search?: string; gasType?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/gas-products', { params }),
  getSummary: () => api.get('/gas-products/summary'),
  getLowStock: () => api.get('/gas-products/low-stock'),
  getOne: (id: string) => api.get(`/gas-products/${id}`),
  create: (data: any) => api.post('/gas-products', data),
  update: (id: string, data: any) => api.patch(`/gas-products/${id}`, data),
  delete: (id: string) => api.delete(`/gas-products/${id}`),
};

export const storageTanksApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array
  // (Dashboard's getAll({ limit: 20 }) keeps working unchanged).
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/storage-tanks', { params }),
  getSummary: () => api.get('/storage-tanks/summary'),
  getOne: (id: string) => api.get(`/storage-tanks/${id}`),
  create: (data: any) => api.post('/storage-tanks', data),
  update: (id: string, data: any) => api.patch(`/storage-tanks/${id}`, data),
  delete: (id: string) => api.delete(`/storage-tanks/${id}`),
};

export const purchasesApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array
  // (GasReceiving/SupplierPayments dropdown callers keep working unchanged).
  getAll: (params?: { search?: string; status?: string; supplierId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/purchases', { params }),
  getSummary: () => api.get('/purchases/summary'),
  getOne: (id: string) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  update: (id: string, data: any) => api.patch(`/purchases/${id}`, data),
  delete: (id: string) => api.delete(`/purchases/${id}`),
};

export const gasReceivingApi = {
  getAll: (params?: { search?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/gas-receiving', { params }),
  getSummary: () => api.get('/gas-receiving/summary'),
  getOne: (id: string) => api.get(`/gas-receiving/${id}`),
  create: (data: any) => api.post('/gas-receiving', data),
  update: (id: string, data: any) => api.patch(`/gas-receiving/${id}`, data),
  delete: (id: string) => api.delete(`/gas-receiving/${id}`),
};

export const inventoryApi = {
  getGasStock: (params?: { search?: string; page?: number; limit?: number }) => api.get('/inventory/gas-stock', { params }),
  getCylinderStock: (params?: { search?: string; page?: number; limit?: number }) => api.get('/inventory/cylinder-stock', { params }),
  getTransactions: (tankId?: string) => api.get('/inventory/transactions', { params: { tankId } }),
  createAdjustment: (data: any) => api.post('/inventory/adjustment', data),
};

export const cylindersApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array
  // (Dashboard/NewSale/NewFilling/CylinderUnits dropdown callers keep working).
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/cylinders', { params }),
  getSummary: () => api.get('/cylinders/summary'),
  getOne: (id: string) => api.get(`/cylinders/${id}`),
  getInventory: () => api.get('/cylinders/inventory'),
  create: (data: any) => api.post('/cylinders', data),
  update: (id: string, data: any) => api.patch(`/cylinders/${id}`, data),
  delete: (id: string) => api.delete(`/cylinders/${id}`),
};

export const fillingApi = {
  getAll: (params?: { search?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/filling', { params }),
  getSummary: () => api.get('/filling/summary'),
  getOne: (id: string) => api.get(`/filling/${id}`),
  create: (data: any) => api.post('/filling', data),
  update: (id: string, data: any) => api.patch(`/filling/${id}`, data),
  delete: (id: string) => api.delete(`/filling/${id}`),
};

export const salesApi = {
  getAll: (params?: { search?: string; status?: string; method?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/sales', { params }),
  getSummary: () => api.get('/sales/summary'),
  getOne: (id: string) => api.get(`/sales/${id}`),
  create: (data: any) => api.post('/sales', data),
  update: (id: string, data: any) => api.patch(`/sales/${id}`, data),
  delete: (id: string) => api.delete(`/sales/${id}`),
};

export const saleReturnsApi = {
  getAll: () => api.get('/sale-returns'),
  getOne: (id: string) => api.get(`/sale-returns/${id}`),
  create: (data: any) => api.post('/sale-returns', data),
};

export const paymentsApi = {
  getCustomerPayments: (params?: { search?: string; method?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/payments/customer', { params }),
  getCustomerPaymentsSummary: () => api.get('/payments/customer/summary'),
  createCustomerPayment: (data: any) => api.post('/payments/customer', data),
  deleteCustomerPayment: (id: string) => api.delete(`/payments/customer/${id}`),
  getSupplierPayments: (params?: { search?: string; method?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/payments/supplier', { params }),
  getSupplierPaymentsSummary: () => api.get('/payments/supplier/summary'),
  createSupplierPayment: (data: any) => api.post('/payments/supplier', data),
  deleteSupplierPayment: (id: string) => api.delete(`/payments/supplier/${id}`),
};

export const expensesApi = {
  getAll: (params?: { search?: string; category?: string; method?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    api.get('/expenses', { params }),
  getOne: (id: string) => api.get(`/expenses/${id}`),
  getSummary: () => api.get('/expenses/summary'),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.patch(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const accountingApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array.
  getCashBook: (params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => api.get('/accounting/cash-book', { params }),
  getBankBook: (params?: { startDate?: string; endDate?: string; page?: number; limit?: number }) => api.get('/accounting/bank-book', { params }),
  getProfitLoss: (params?: any) => api.get('/accounting/profit-loss', { params }),
};

export const reportsApi = {
  getSales: (params?: any) => api.get('/reports/sales', { params }),
  getPurchases: (params?: any) => api.get('/reports/purchases', { params }),
  getReceivables: () => api.get('/reports/receivables'),
  getPayables: () => api.get('/reports/payables'),
  getInventory: () => api.get('/reports/inventory'),
  getProfitLoss: (params?: any) => api.get('/reports/profit-loss', { params }),
  getCylinderMovement: (params?: any) => api.get('/reports/cylinder-movement', { params }),
  getSalesByUser: (params?: any) => api.get('/reports/sales-by-user', { params }),
  getSalesReturns: (params?: any) => api.get('/reports/sales-returns', { params }),
};

export const driversApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array.
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) => api.get('/drivers', { params }),
  getSummary: () => api.get('/drivers/summary'),
  getOne: (id: string) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.patch(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

export const vehiclesApi = {
  // `page` present -> { data, total, page, limit }. No `page` -> plain array.
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) => api.get('/vehicles', { params }),
  getSummary: () => api.get('/vehicles/summary'),
  getOne: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.patch(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

export const deliveriesApi = {
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) => api.get('/deliveries', { params }),
  getSummary: () => api.get('/deliveries/summary'),
  getOne: (id: string) => api.get(`/deliveries/${id}`),
  create: (data: any) => api.post('/deliveries', data),
  update: (id: string, data: any) => api.patch(`/deliveries/${id}`, data),
  delete: (id: string) => api.delete(`/deliveries/${id}`),
};

export const cylinderUnitsApi = {
  getAll: (params?: { status?: string; cylinderTypeId?: string; search?: string; page?: number; limit?: number }) => api.get('/cylinder-units', { params }),
  getSummary: () => api.get('/cylinder-units/summary'),
  getOne: (id: string) => api.get(`/cylinder-units/${id}`),
  getBySerial: (serial: string) => api.get(`/cylinder-units/by-serial/${serial}`),
  create: (data: any) => api.post('/cylinder-units', data),
  update: (id: string, data: any) => api.patch(`/cylinder-units/${id}`, data),
  delete: (id: string) => api.delete(`/cylinder-units/${id}`),
};

export const dashboardApi = {
  getStats: (params?: { range?: string; from?: string; to?: string }) => api.get('/dashboard/stats', { params }),
  getSalesChart: () => api.get('/dashboard/sales-chart'),
  getRecentSales: () => api.get('/dashboard/recent-sales'),
  getPendingPurchases: () => api.get('/dashboard/pending-purchases'),
  getTopDebtors: () => api.get('/dashboard/top-debtors'),
};

export const usersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => api.get('/users', { params }),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const settingsApi = {
  getAll: () => api.get('/settings'),
  upsert: (data: any) => api.post('/settings', data),
  bulkUpsert: (settings: any[]) => api.post('/settings/bulk', { settings }),
};

export const auditLogsApi = {
  getAll: (params?: { module?: string; userId?: string; page?: number; limit?: number }) => api.get('/audit-logs', { params }),
  getOne: (id: string) => api.get(`/audit-logs/${id}`),
  getModules: () => api.get('/audit-logs/modules'),
};

export const rolesApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) => api.get('/roles', { params }),
  getOne: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.patch(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const backupApi = {
  info: () => api.get('/backup/info'),
  list: () => api.get('/backup/list'),
  create: () => api.post('/backup/create'),
  restore: (filename: string) => api.post(`/backup/restore/${filename}`),
  delete: (filename: string) => api.delete(`/backup/${filename}`),
  downloadUrl: (filename: string) => `http://localhost:3005/api/backup/download/${encodeURIComponent(filename)}`,
};
