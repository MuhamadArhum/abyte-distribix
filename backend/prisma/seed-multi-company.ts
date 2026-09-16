import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const START = new Date('2024-01-01');
const END = new Date('2026-08-31');
const N = 10000; // rows per table per company
const BATCH = 1000;
const NUM_COMPANIES = 10; // Company 2 .. Company 11 (Company 1 already exists)

/* ── Helpers ── */
function rDate(s = START, e = END) {
  return new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime()));
}
function rInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rFloat(min: number, max: number, d = 0) {
  const v = Math.random() * (max - min) + min;
  return d ? parseFloat(v.toFixed(d)) : Math.round(v);
}
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid() { return randomUUID().replace(/-/g, '').slice(0, 24); }
function pad(n: number) { return String(n).padStart(5, '0'); }

async function insertBatched<T>(label: string, rows: T[], fn: (chunk: T[]) => Promise<any>) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await fn(rows.slice(i, i + BATCH));
  }
  console.log(`   ✓ ${label}: ${rows.length.toLocaleString()}`);
}

const BUSINESS_PREFIXES = ['Al-Baraka', 'Al-Farooq', 'Al-Noor', 'Al-Rehman', 'Al-Madina', 'Al-Habib', 'Al-Qadir', 'Al-Amin', 'Al-Falah', 'Al-Raza'];
const BUSINESS_TYPES = ['Gas Agency', 'LPG Traders', 'Brothers', 'Gas Service', 'Trading Co', 'Enterprises', 'Distributors', 'Gas Center', 'Petroleum', 'Traders'];
const PERSON_FIRST = ['Muhammad', 'Ahmad', 'Ali', 'Hassan', 'Usman', 'Ibrahim', 'Bilal', 'Hamza', 'Omar', 'Zubair', 'Tariq', 'Imran'];
const PERSON_LAST = ['Khan', 'Malik', 'Sheikh', 'Qureshi', 'Chaudhry', 'Mirza', 'Butt', 'Rana', 'Raja', 'Siddiqui'];
const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];
const PAYMENT_METHODS = ['CASH', 'BANK', 'CHEQUE', 'CREDIT', 'ONLINE'];
const EXPENSE_CATS = ['TRANSPORTATION', 'FUEL', 'SALARIES', 'ELECTRICITY', 'RENT', 'MAINTENANCE', 'LOADING_UNLOADING', 'CYLINDER_REPAIR', 'OFFICE', 'OTHER'];
const CYL_STATUSES = ['FILLED', 'EMPTY', 'WITH_CUSTOMER', 'DAMAGED', 'MAINTENANCE', 'LOST'];
const DELIVERY_STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

function randomName() { return `${pick(PERSON_FIRST)} ${pick(PERSON_LAST)}`; }
function randomBiz() { return `${pick(BUSINESS_PREFIXES)} ${pick(BUSINESS_TYPES)}`; }
function randomPhone() { return `03${rInt(0, 4)}${rInt(1000000, 9999999)}`; }

async function seedCompany(companyNum: number, sharedPasswordHash: string) {
  const label = `Company ${companyNum}`;
  console.log(`\n════ Seeding ${label} ════`);

  const company = await prisma.company.create({
    data: { name: label, code: `company-${companyNum}`, status: 'ACTIVE' },
  });
  const companyId = company.id;

  /* 1. Gas Products */
  const gasProducts = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, productCode: `GP-${pad(i + 1)}`,
    productName: `Gas Product ${i + 1}`, gasType: 'LPG', unit: 'KG',
    defaultPurchaseRate: rFloat(190, 240), defaultSellingRate: rFloat(250, 320),
    minStockLevel: rInt(200, 2000), status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
  }));
  await insertBatched('Gas Products', gasProducts, (c) => prisma.gasProduct.createMany({ data: c }));

  /* 2. Storage Tanks */
  const storageTanks = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, tankNumber: `TANK-${pad(i + 1)}`,
    tankName: `Tank ${i + 1}`, gasProductId: pick(gasProducts).id,
    capacity: rInt(5000, 30000), currentQuantity: rInt(500, 15000),
    location: `${pick(CITIES)} Yard`, status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'MAINTENANCE']),
  }));
  await insertBatched('Storage Tanks', storageTanks, (c) => prisma.storageTank.createMany({ data: c }));

  /* 3. Cylinder Types */
  const cylinderTypes = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, cylinderSize: `${rFloat(2, 50, 1)} KG`,
    gasCapacity: rFloat(2, 50, 1), emptyWeight: rFloat(5, 65, 1),
    depositAmount: rInt(1000, 18000), status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
    sellingPrices: JSON.stringify([{ priceType: 'RETAIL', price: rInt(600, 11000) }]),
  }));
  await insertBatched('Cylinder Types', cylinderTypes, (c) => prisma.cylinderType.createMany({ data: c }));

  /* 4. Cylinder Inventory (1:1 with cylinder types => trivially unique) */
  const cylinderInventory = cylinderTypes.map((ct) => ({
    id: uid(), companyId, cylinderTypeId: ct.id,
    status: pick(CYL_STATUSES), quantity: rInt(0, 800),
  }));
  await insertBatched('Cylinder Inventory', cylinderInventory, (c) => prisma.cylinderInventory.createMany({ data: c }));

  /* 5. Suppliers */
  const suppliers = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, supplierCode: `SUP-${pad(i + 1)}`,
    supplierName: `${randomBiz()} ${i + 1}`, contactPerson: randomName(), phone: randomPhone(),
    email: `supplier${i + 1}@c${companyNum}.test`, address: `${rInt(1, 500)} ${pick(CITIES)} Road`,
    taxNtn: `${rInt(1000000, 9999999)}-${rInt(1, 9)}`,
    openingBalance: rInt(0, 500000), currentBalance: rInt(0, 1000000),
    paymentTerms: pick([7, 15, 30, 45, 60]), status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
  }));
  await insertBatched('Suppliers', suppliers, (c) => prisma.supplier.createMany({ data: c }));

  /* 6. Customers */
  const custTypes = ['RETAIL', 'RETAIL', 'RETAIL', 'DEALER', 'DEALER', 'COMMERCIAL', 'INDIVIDUAL'] as const;
  const customers = Array.from({ length: N }, (_, i) => {
    const type = pick(custTypes);
    return {
      id: uid(), companyId, customerCode: `CUST-${pad(i + 1)}`,
      businessName: type === 'INDIVIDUAL' ? randomName() : randomBiz(),
      contactPerson: randomName(), phone: randomPhone(),
      email: `customer${i + 1}@c${companyNum}.test`, address: `${rInt(1, 999)} ${pick(CITIES)} Street`,
      customerType: type,
      creditLimit: type === 'RETAIL' ? rInt(50000, 200000) : type === 'DEALER' ? rInt(200000, 500000) : rInt(100000, 1000000),
      openingBalance: rInt(0, 100000), currentBalance: rInt(0, 300000),
      paymentTerms: pick([0, 7, 15, 30, 60]),
      status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
    };
  });
  await insertBatched('Customers', customers, (c) => prisma.customer.createMany({ data: c }));

  /* 7. Roles */
  const roles = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, name: `Role-${pad(i + 1)}`,
    description: `Auto-generated role ${i + 1}`, permissions: '[]',
  }));
  await insertBatched('Roles', roles, (c) => prisma.role.createMany({ data: c }));

  /* 8. Settings */
  const settings = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, key: `setting_${pad(i + 1)}`,
    value: `value_${i + 1}`, description: null,
  }));
  await insertBatched('Settings', settings, (c) => prisma.setting.createMany({ data: c }));

  /* 9. Drivers */
  const drivers = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, driverCode: `DRV-${pad(i + 1)}`,
    fullName: randomName(), phone: randomPhone(),
    licenseNumber: `LIC-${rInt(100000, 999999)}`, address: `${pick(CITIES)}`,
    status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
  }));
  await insertBatched('Drivers', drivers, (c) => prisma.driver.createMany({ data: c }));

  /* 10. Vehicles */
  const vehicles = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, vehicleCode: `VEH-${pad(i + 1)}`,
    vehicleNumber: `TRK-${pad(i + 1)}`, vehicleType: pick(['TRUCK', 'PICKUP', 'VAN']),
    capacity: rInt(500, 8000), status: pick(['ACTIVE', 'ACTIVE', 'ACTIVE', 'MAINTENANCE']),
  }));
  await insertBatched('Vehicles', vehicles, (c) => prisma.vehicle.createMany({ data: c }));

  /* 11. Users (single shared password hash — dummy seed accounts, not real logins) */
  const users = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, username: `user${i + 1}`,
    email: `user${i + 1}@c${companyNum}.test`, passwordHash: sharedPasswordHash,
    fullName: randomName(), role: pick(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE', 'SALES']),
    isActive: true,
  }));
  await insertBatched('Users', users, (c) => prisma.user.createMany({ data: c }));

  /* 12. Purchases */
  const purchases = Array.from({ length: N }, (_, i) => {
    const supplier = pick(suppliers);
    const product = pick(gasProducts);
    const qty = rFloat(2000, 15000);
    const rate = rFloat(190, 250);
    const gasAmt = Math.round(qty * rate);
    const transport = rInt(5000, 50000);
    const other = rInt(0, 10000);
    const discount = rInt(0, 5000);
    const gross = gasAmt + transport + other;
    const net = gross - discount;
    const paid = pick([0, 0, Math.round(net * 0.5), Math.round(net * 0.75), net]);
    const remaining = net - paid;
    return {
      id: uid(), companyId, purchaseNumber: `PUR-${pad(i + 1)}`,
      supplierId: supplier.id, gasProductId: product.id,
      purchaseDate: rDate(), quantity: qty, unit: 'KG',
      purchaseRate: rate, gasAmount: gasAmt, transportation: transport, otherCharges: other,
      discount, grossAmount: gross, netAmount: net, paidAmount: paid, remainingAmount: remaining,
      paymentStatus: remaining === 0 ? 'PAID' : paid === 0 ? 'UNPAID' : 'PARTIAL',
      supplierInvoiceNumber: `SI-${rInt(10000, 99999)}`, status: 'ACTIVE',
    };
  });
  await insertBatched('Purchases', purchases, (c) => prisma.purchase.createMany({ data: c }));

  /* 13. Gas Receivings */
  const gasReceivings = Array.from({ length: N }, (_, i) => {
    const pur = pick(purchases);
    const tank = pick(storageTanks);
    const exp = rFloat(1000, 10000);
    const rec = rFloat(exp * 0.95, exp * 1.02);
    return {
      id: uid(), companyId, receivingNumber: `RCV-${pad(i + 1)}`,
      purchaseId: pur.id, supplierId: pur.supplierId,
      receivingDate: rDate(), expectedQuantity: exp,
      receivedQuantity: parseFloat(rec.toFixed(1)), variance: parseFloat((rec - exp).toFixed(1)),
      unit: 'KG', tankId: tank.id, receivedById: pick(users).id,
    };
  });
  await insertBatched('Gas Receivings', gasReceivings, (c) => prisma.gasReceiving.createMany({ data: c }));

  /* 14. Gas Inventory Transactions */
  const gasInventoryTransactions = Array.from({ length: N }, (_, i) => {
    const tank = pick(storageTanks);
    return {
      id: uid(), companyId, transactionType: pick(['PURCHASE', 'RECEIVING', 'FILLING', 'ADJUSTMENT', 'LOSS']),
      tankId: tank.id, gasProductId: tank.gasProductId, quantity: rFloat(-500, 500),
      previousStock: rInt(0, 20000), newStock: rInt(0, 20000), createdById: pick(users).id,
    };
  });
  await insertBatched('Gas Inventory Transactions', gasInventoryTransactions, (c) => prisma.gasInventoryTransaction.createMany({ data: c }));

  /* 15. Filling Batches */
  const fillStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'PENDING'];
  const fillingBatches = Array.from({ length: N }, (_, i) => {
    const tank = pick(storageTanks);
    const cylTyp = pick(cylinderTypes);
    const numCyl = rInt(20, 200);
    const expGas = parseFloat((numCyl * cylTyp.gasCapacity).toFixed(1));
    const status = pick(fillStatuses);
    const actGas = status === 'COMPLETED' ? parseFloat((expGas * rFloat(0.97, 1.02, 4)).toFixed(1)) : 0;
    return {
      id: uid(), companyId, batchNumber: `FILL-${pad(i + 1)}`,
      fillingDate: rDate(), tankId: tank.id, cylinderTypeId: cylTyp.id,
      numberOfCylinders: numCyl, expectedGasQty: expGas, actualGasQty: actGas,
      gasVariance: parseFloat((actGas - expGas).toFixed(1)),
      operatorId: pick(users).id, fillingStation: `Station ${pick(['A', 'B', 'C', 'D'])}`, status,
    };
  });
  await insertBatched('Filling Batches', fillingBatches, (c) => prisma.fillingBatch.createMany({ data: c }));

  /* 16. Cylinder Transactions */
  const cylinderTransactions = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, transactionType: pick(['FILLING', 'SALE', 'SALE_RETURN', 'ADJUSTMENT']),
    cylinderTypeId: pick(cylinderTypes).id, quantity: rInt(1, 200),
    fromStatus: pick(CYL_STATUSES), toStatus: pick(CYL_STATUSES),
    customerId: Math.random() < 0.5 ? pick(customers).id : null, createdById: pick(users).id,
  }));
  await insertBatched('Cylinder Transactions', cylinderTransactions, (c) => prisma.cylinderTransaction.createMany({ data: c }));

  /* 17. Sales */
  const sales = Array.from({ length: N }, (_, i) => {
    const cust = pick(customers);
    const method = pick(PAYMENT_METHODS);
    const subtotal = rInt(1000, 60000);
    const discount = rInt(0, 1000);
    const net = Math.max(subtotal - discount, 0);
    const paid = method === 'CASH' ? net : pick([0, 0, Math.round(net * 0.5), Math.round(net * 0.75), net]);
    const remaining = net - paid;
    return {
      id: uid(), companyId, invoiceNumber: `INV-${pad(i + 1)}`,
      customerId: cust.id, saleDate: rDate(), subtotal, discount, netTotal: net,
      paidAmount: paid, remainingAmount: remaining, paymentMethod: method,
      paymentStatus: remaining === 0 ? 'PAID' : paid === 0 ? 'UNPAID' : 'PARTIAL',
      createdById: pick(users).id,
    };
  });
  await insertBatched('Sales', sales, (c) => prisma.sale.createMany({ data: c }));

  /* 18. Sale Items (1:1 with sales) */
  const saleItems = sales.map((s) => {
    const ct = pick(cylinderTypes);
    const qty = rInt(1, 30);
    const unitPrice = rInt(600, 11000);
    const discount = rInt(0, 200);
    return {
      id: uid(), companyId, saleId: s.id, cylinderTypeId: ct.id,
      quantity: qty, unitPrice, discount, totalPrice: Math.max(qty * unitPrice - discount, 0),
    };
  });
  await insertBatched('Sale Items', saleItems, (c) => prisma.saleItem.createMany({ data: c }));

  /* 19. Sale Returns (1:1 with sales) */
  const saleReturns = sales.map((s, i) => ({
    id: uid(), companyId, returnNumber: `RET-${pad(i + 1)}`,
    saleId: s.id, customerId: s.customerId, returnDate: rDate(),
    reason: pick(['Damaged', 'Wrong item', 'Customer changed mind', 'Leakage']),
    totalAmount: rInt(0, 5000),
  }));
  await insertBatched('Sale Returns', saleReturns, (c) => prisma.saleReturn.createMany({ data: c }));

  /* 20. Sale Return Items (1:1 with sale returns / sale items) */
  const saleReturnItems = saleReturns.map((sr, i) => {
    const si = saleItems[i];
    const qty = rInt(1, si.quantity);
    return {
      id: uid(), companyId, saleReturnId: sr.id, saleItemId: si.id, cylinderTypeId: si.cylinderTypeId,
      quantity: qty, unitPrice: si.unitPrice, totalPrice: qty * si.unitPrice,
    };
  });
  await insertBatched('Sale Return Items', saleReturnItems, (c) => prisma.saleReturnItem.createMany({ data: c }));

  /* 21. Customer Cylinder Balances (deterministic 1:1 pairing => unique) */
  const customerCylinderBalances = customers.map((cust, i) => {
    const ct = cylinderTypes[i];
    const filled = rInt(0, 20);
    const empty = rInt(0, 20);
    return {
      id: uid(), companyId, customerId: cust.id, cylinderTypeId: ct.id,
      filledQty: filled, emptyQty: empty, totalQty: filled + empty,
    };
  });
  await insertBatched('Customer Cylinder Balances', customerCylinderBalances, (c) => prisma.customerCylinderBalance.createMany({ data: c }));

  /* 22. Customer Payments */
  const customerPayments = Array.from({ length: N }, (_, i) => {
    const sale = Math.random() < 0.7 ? pick(sales) : null;
    const cust = sale ? customers.find((c) => c.id === sale.customerId)! : pick(customers);
    return {
      id: uid(), companyId, paymentNumber: `CPY-${pad(i + 1)}`,
      customerId: cust.id, saleId: sale?.id ?? null, paymentDate: rDate(),
      amount: rInt(1000, 100000), paymentMethod: pick(['CASH', 'BANK', 'CHEQUE']),
      reference: pick([null, null, `CHQ-${rInt(10000, 99999)}`]), createdById: pick(users).id,
    };
  });
  await insertBatched('Customer Payments', customerPayments, (c) => prisma.customerPayment.createMany({ data: c }));

  /* 23. Supplier Payments */
  const supplierPayments = Array.from({ length: N }, (_, i) => {
    const pur = Math.random() < 0.7 ? pick(purchases) : null;
    const supplier = pur ? suppliers.find((s) => s.id === pur.supplierId)! : pick(suppliers);
    return {
      id: uid(), companyId, paymentNumber: `SPY-${pad(i + 1)}`,
      supplierId: supplier.id, purchaseId: pur?.id ?? null, paymentDate: rDate(),
      amount: rInt(50000, 500000), paymentMethod: pick(['CASH', 'BANK', 'CHEQUE']),
      reference: pick([null, `CHQ-${rInt(10000, 99999)}`, `TT-${rInt(100000, 999999)}`]), createdById: pick(users).id,
    };
  });
  await insertBatched('Supplier Payments', supplierPayments, (c) => prisma.supplierPayment.createMany({ data: c }));

  /* 24. Expenses */
  const expenses = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, expenseNumber: `EXP-${pad(i + 1)}`,
    category: pick(EXPENSE_CATS), expenseDate: rDate(), amount: rInt(500, 150000),
    paymentMethod: pick(['CASH', 'BANK', 'CHEQUE']), description: `Expense ${i + 1}`,
    createdById: pick(users).id,
  }));
  await insertBatched('Expenses', expenses, (c) => prisma.expense.createMany({ data: c }));

  /* 25. Cash Transactions */
  const cashTransactions = Array.from({ length: N }, (_, i) => {
    const direction = pick(['IN', 'OUT']);
    const amount = rInt(500, 100000);
    return {
      id: uid(), companyId, transactionType: pick(['SALE', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE', 'ADJUSTMENT']),
      amount, direction, balance: rInt(-50000, 500000),
      description: `Cash entry ${i + 1}`,
    };
  });
  await insertBatched('Cash Transactions', cashTransactions, (c) => prisma.cashTransaction.createMany({ data: c }));

  /* 26. Bank Transactions */
  const bankTransactions = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, transactionType: pick(['SALE', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE', 'ADJUSTMENT']),
    amount: rInt(500, 100000), direction: pick(['IN', 'OUT']), balance: rInt(-50000, 500000),
    bankName: pick(['HBL', 'UBL', 'MCB', 'Meezan', 'Allied']), accountNumber: `PK${rInt(10, 99)}-${rInt(1000000000, 2147483647)}`,
    description: `Bank entry ${i + 1}`,
  }));
  await insertBatched('Bank Transactions', bankTransactions, (c) => prisma.bankTransaction.createMany({ data: c }));

  /* 27. Deliveries */
  const deliveries = Array.from({ length: N }, (_, i) => {
    const sale = Math.random() < 0.6 ? pick(sales) : null;
    const cust = sale ? customers.find((c) => c.id === sale.customerId)! : pick(customers);
    return {
      id: uid(), companyId, deliveryNumber: `DEL-${pad(i + 1)}`,
      customerId: cust.id, saleId: sale?.id ?? null,
      driverId: Math.random() < 0.8 ? pick(drivers).id : null,
      vehicleId: Math.random() < 0.8 ? pick(vehicles).id : null,
      deliveryDate: rDate(), status: pick(DELIVERY_STATUSES),
      address: `${rInt(1, 999)} ${pick(CITIES)} Street`,
    };
  });
  await insertBatched('Deliveries', deliveries, (c) => prisma.delivery.createMany({ data: c }));

  /* 28. Cylinder Units */
  const cylinderUnits = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, serialNumber: `SN-${pad(i + 1)}`, qrCode: `QR-${pad(i + 1)}`,
    cylinderTypeId: pick(cylinderTypes).id, status: pick(CYL_STATUSES),
    customerId: Math.random() < 0.4 ? pick(customers).id : null,
    purchaseDate: rDate(),
  }));
  await insertBatched('Cylinder Units', cylinderUnits, (c) => prisma.cylinderUnit.createMany({ data: c }));

  /* 29. Audit Logs */
  const auditLogs = Array.from({ length: N }, (_, i) => ({
    id: uid(), companyId, userId: pick(users).id,
    action: pick(['CREATE', 'UPDATE', 'DELETE']), module: pick(['Sales', 'Purchases', 'Customers', 'Expenses', 'Payments']),
    recordId: uid(), ipAddress: '127.0.0.1',
  }));
  await insertBatched('Audit Logs', auditLogs, (c) => prisma.auditLog.createMany({ data: c }));

  console.log(`✅ ${label} complete.`);
}

async function main() {
  console.log('🌱 Seeding 10 new companies with ~10,000 rows per table each...');
  const sharedPasswordHash = await argon2.hash('seeduser123');

  const existing = await prisma.company.count();
  console.log(`Existing companies before seeding: ${existing}`);

  for (let i = 2; i <= NUM_COMPANIES + 1; i++) {
    await seedCompany(i, sharedPasswordHash);
  }

  const totalCompanies = await prisma.company.count();
  console.log(`\n🎉 All done. Total companies now: ${totalCompanies}`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
