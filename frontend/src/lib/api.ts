import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3003/api',
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

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// API helpers
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  seed: () => api.post('/auth/seed'),
};

export const customersApi = {
  getAll: () => api.get('/customers'),
  getOne: (id: string) => api.get(`/customers/${id}`),
  getLedger: (id: string) => api.get(`/customers/${id}/ledger`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const suppliersApi = {
  getAll: () => api.get('/suppliers'),
  getOne: (id: string) => api.get(`/suppliers/${id}`),
  getLedger: (id: string) => api.get(`/suppliers/${id}/ledger`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.patch(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
};

export const gasProductsApi = {
  getAll: () => api.get('/gas-products'),
  getOne: (id: string) => api.get(`/gas-products/${id}`),
  create: (data: any) => api.post('/gas-products', data),
  update: (id: string, data: any) => api.patch(`/gas-products/${id}`, data),
  delete: (id: string) => api.delete(`/gas-products/${id}`),
};

export const storageTanksApi = {
  getAll: () => api.get('/storage-tanks'),
  getOne: (id: string) => api.get(`/storage-tanks/${id}`),
  create: (data: any) => api.post('/storage-tanks', data),
  update: (id: string, data: any) => api.patch(`/storage-tanks/${id}`, data),
  delete: (id: string) => api.delete(`/storage-tanks/${id}`),
};

export const purchasesApi = {
  getAll: () => api.get('/purchases'),
  getOne: (id: string) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  update: (id: string, data: any) => api.patch(`/purchases/${id}`, data),
  delete: (id: string) => api.delete(`/purchases/${id}`),
};

export const gasReceivingApi = {
  getAll: () => api.get('/gas-receiving'),
  getOne: (id: string) => api.get(`/gas-receiving/${id}`),
  create: (data: any) => api.post('/gas-receiving', data),
  update: (id: string, data: any) => api.patch(`/gas-receiving/${id}`, data),
};

export const inventoryApi = {
  getGasStock: () => api.get('/inventory/gas-stock'),
  getCylinderStock: () => api.get('/inventory/cylinder-stock'),
  getTransactions: (tankId?: string) => api.get('/inventory/transactions', { params: { tankId } }),
  createAdjustment: (data: any) => api.post('/inventory/adjustment', data),
};

export const cylindersApi = {
  getAll: () => api.get('/cylinders'),
  getOne: (id: string) => api.get(`/cylinders/${id}`),
  getInventory: () => api.get('/cylinders/inventory'),
  create: (data: any) => api.post('/cylinders', data),
  update: (id: string, data: any) => api.patch(`/cylinders/${id}`, data),
  delete: (id: string) => api.delete(`/cylinders/${id}`),
};

export const fillingApi = {
  getAll: () => api.get('/filling'),
  getOne: (id: string) => api.get(`/filling/${id}`),
  create: (data: any) => api.post('/filling', data),
  update: (id: string, data: any) => api.patch(`/filling/${id}`, data),
  delete: (id: string) => api.delete(`/filling/${id}`),
};

export const salesApi = {
  getAll: () => api.get('/sales'),
  getOne: (id: string) => api.get(`/sales/${id}`),
  create: (data: any) => api.post('/sales', data),
  update: (id: string, data: any) => api.patch(`/sales/${id}`, data),
  delete: (id: string) => api.delete(`/sales/${id}`),
};

export const paymentsApi = {
  getCustomerPayments: () => api.get('/payments/customer'),
  createCustomerPayment: (data: any) => api.post('/payments/customer', data),
  getSupplierPayments: () => api.get('/payments/supplier'),
  createSupplierPayment: (data: any) => api.post('/payments/supplier', data),
};

export const expensesApi = {
  getAll: () => api.get('/expenses'),
  getOne: (id: string) => api.get(`/expenses/${id}`),
  getSummary: () => api.get('/expenses/summary'),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.patch(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const accountingApi = {
  getCashBook: (params?: any) => api.get('/accounting/cash-book', { params }),
  getBankBook: (params?: any) => api.get('/accounting/bank-book', { params }),
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
  getAll: () => api.get('/drivers'),
  getOne: (id: string) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: string, data: any) => api.patch(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

export const vehiclesApi = {
  getAll: () => api.get('/vehicles'),
  getOne: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.patch(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
};

export const deliveriesApi = {
  getAll: () => api.get('/deliveries'),
  getOne: (id: string) => api.get(`/deliveries/${id}`),
  create: (data: any) => api.post('/deliveries', data),
  update: (id: string, data: any) => api.patch(`/deliveries/${id}`, data),
  delete: (id: string) => api.delete(`/deliveries/${id}`),
};

export const cylinderUnitsApi = {
  getAll: (params?: { status?: string; cylinderTypeId?: string }) => api.get('/cylinder-units', { params }),
  getOne: (id: string) => api.get(`/cylinder-units/${id}`),
  getBySerial: (serial: string) => api.get(`/cylinder-units/by-serial/${serial}`),
  create: (data: any) => api.post('/cylinder-units', data),
  update: (id: string, data: any) => api.patch(`/cylinder-units/${id}`, data),
  delete: (id: string) => api.delete(`/cylinder-units/${id}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesChart: () => api.get('/dashboard/sales-chart'),
  getRecentSales: () => api.get('/dashboard/recent-sales'),
  getPendingPurchases: () => api.get('/dashboard/pending-purchases'),
  getTopDebtors: () => api.get('/dashboard/top-debtors'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
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

export const backupApi = {
  info: () => api.get('/backup/info'),
  list: () => api.get('/backup/list'),
  create: () => api.post('/backup/create'),
  restore: (filename: string) => api.post(`/backup/restore/${filename}`),
  delete: (filename: string) => api.delete(`/backup/${filename}`),
  downloadUrl: (filename: string) => `http://localhost:3003/api/backup/download/${encodeURIComponent(filename)}`,
};
