export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  businessName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  customerType: 'RETAIL' | 'DEALER' | 'COMMERCIAL' | 'INDIVIDUAL';
  creditLimit: number;
  openingBalance: number;
  currentBalance: number;
  paymentTerms: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  supplierCode: string;
  supplierName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNtn?: string;
  openingBalance: number;
  currentBalance: number;
  paymentTerms: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GasProduct {
  id: string;
  productCode: string;
  productName: string;
  gasType: string;
  unit: string;
  defaultPurchaseRate: number;
  defaultSellingRate: number;
  minStockLevel: number;
  status: string;
}

export interface StorageTank {
  id: string;
  tankNumber: string;
  tankName: string;
  gasProductId: string;
  gasProduct?: GasProduct;
  capacity: number;
  currentQuantity: number;
  location?: string;
  status: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier?: Supplier;
  gasProductId: string;
  gasProduct?: GasProduct;
  purchaseDate: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  gasAmount: number;
  transportation: number;
  otherCharges: number;
  discount: number;
  grossAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  supplierInvoiceNumber?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export interface GasReceiving {
  id: string;
  receivingNumber: string;
  purchaseId: string;
  purchase?: Purchase;
  supplierId: string;
  supplier?: Supplier;
  receivingDate: string;
  expectedQuantity: number;
  receivedQuantity: number;
  variance: number;
  unit: string;
  tankId: string;
  tank?: StorageTank;
  notes?: string;
  createdAt: string;
}

export interface CylinderType {
  id: string;
  cylinderSize: string;
  gasCapacity: number;
  emptyWeight: number;
  depositAmount: number;
  status: string;
  sellingPrices: string;
  cylinderInventory?: CylinderInventory[];
}

export interface CylinderInventory {
  id: string;
  cylinderTypeId: string;
  cylinderType?: CylinderType;
  status: string;
  quantity: number;
}

export interface FillingBatch {
  id: string;
  batchNumber: string;
  fillingDate: string;
  tankId: string;
  tank?: StorageTank;
  cylinderTypeId: string;
  cylinderType?: CylinderType;
  numberOfCylinders: number;
  expectedGasQty: number;
  actualGasQty: number;
  gasVariance: number;
  operatorId?: string;
  fillingStation?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  cylinderTypeId: string;
  cylinderType?: CylinderType;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  saleDate: string;
  subtotal: number;
  discount: number;
  netTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
  createdAt: string;
  saleItems?: SaleItem[];
}

export interface CustomerPayment {
  id: string;
  paymentNumber: string;
  customerId: string;
  customer?: Customer;
  saleId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplier?: Supplier;
  purchaseId?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: string;
  expenseDate: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalSuppliers: number;
  todaySales: number;
  todayExpenses: number;
  totalReceivables: number;
  totalPayables: number;
  filledCylinders: number;
  emptyCylinders: number;
}

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type CustomerType = 'RETAIL' | 'DEALER' | 'COMMERCIAL' | 'INDIVIDUAL';

export interface Driver {
  id: string;
  driverCode: string;
  fullName: string;
  phone: string;
  licenseNumber?: string;
  address?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  vehicleCode: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  customerId: string;
  customer?: Customer;
  saleId?: string;
  driverId?: string;
  driver?: Driver;
  vehicleId?: string;
  vehicle?: Vehicle;
  deliveryDate: string;
  status: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CylinderUnit {
  id: string;
  serialNumber: string;
  qrCode: string;
  cylinderTypeId: string;
  cylinderType?: CylinderType;
  status: string;
  customerId?: string;
  customer?: Customer;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
