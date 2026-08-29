import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const START = new Date('2024-01-01');
const END   = new Date('2026-08-31');

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
function sortByDate<T extends { date: Date }>(arr: T[]) { return arr.sort((a, b) => a.date.getTime() - b.date.getTime()); }

/* ── Pakistani Data ── */
const BUSINESS_PREFIXES = ['Al-Baraka','Al-Farooq','Al-Noor','Al-Rehman','Al-Madina','Al-Habib','Al-Qadir','Al-Amin','Al-Falah','Al-Raza'];
const BUSINESS_TYPES    = ['Gas Agency','LPG Traders','Brothers','Gas Service','Trading Co','Enterprises','Distributors','Gas Center','Petroleum','Traders'];
const PERSON_FIRST      = ['Muhammad','Ahmad','Ali','Hassan','Usman','Ibrahim','Bilal','Hamza','Omar','Zubair','Tariq','Imran','Asad','Waqar','Naeem','Kashif','Fahad','Shoaib','Adnan','Rizwan'];
const PERSON_LAST       = ['Khan','Malik','Sheikh','Qureshi','Chaudhry','Mirza','Butt','Rana','Raja','Siddiqui','Ansari','Hashmi','Abbasi','Afridi','Baig','Raza','Shah','Hussain','Ahmed','Ali'];
const CITIES            = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Sialkot','Gujranwala','Hyderabad','Bahawalpur','Sargodha','Sukkur','Mardan'];
const PAYMENT_METHODS   = ['CASH','BANK','CHEQUE','CREDIT','ONLINE'];
const EXPENSE_CATS      = ['TRANSPORTATION','FUEL','SALARIES','ELECTRICITY','RENT','MAINTENANCE','LOADING_UNLOADING','CYLINDER_REPAIR','OFFICE','OTHER'];
const EXPENSE_DESCS: Record<string,string[]> = {
  TRANSPORTATION: ['Delivery vehicle fuel','Tanker transport','Driver charges','Vehicle rental'],
  FUEL:           ['Diesel for trucks','Petrol for bikes','Fuel for generator'],
  SALARIES:       ['Staff salaries','Driver salary','Helper wages','Loader wages'],
  ELECTRICITY:    ['Monthly electricity bill','Generator fuel cost','Electric pump charges'],
  RENT:           ['Office rent','Godown rent','Yard charges'],
  MAINTENANCE:    ['Vehicle maintenance','Cylinder repair','Equipment service','Pump repair'],
  LOADING_UNLOADING: ['Loading charges','Unloading labor','Crane charges'],
  CYLINDER_REPAIR:['Valve replacement','Cylinder testing','Painting cylinders'],
  OFFICE:         ['Stationery','Printing','Internet bill','Phone bills'],
  OTHER:          ['Miscellaneous charges','Bank charges','Other expenses'],
};

function randomName()   { return `${pick(PERSON_FIRST)} ${pick(PERSON_LAST)}`; }
function randomBiz()    { return `${pick(BUSINESS_PREFIXES)} ${pick(BUSINESS_TYPES)}`; }
function randomPhone()  { return `03${rInt(0,4)}${rInt(1000000,9999999)}`; }
function randomCode(pfx: string, n: number) { return `${pfx}-${String(n).padStart(4,'0')}`; }

async function main() {
  console.log('🌱 Starting large seed — this will take a few minutes...');
  console.log('⚠️  Clearing existing transactional data...');

  // Clear in dependency order
  await prisma.auditLog.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.saleReturn.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.gasInventoryTransaction.deleteMany();
  await prisma.cylinderTransaction.deleteMany();
  await prisma.fillingBatch.deleteMany();
  await prisma.gasReceiving.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.customerCylinderBalance.deleteMany();
  await prisma.cylinderInventory.deleteMany();
  await prisma.cylinderType.deleteMany();
  await prisma.storageTank.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.gasProduct.deleteMany();
  await prisma.expense.deleteMany();

  /* ════════════════════════════════
     1. GAS PRODUCTS (5)
  ════════════════════════════════ */
  console.log('📦 Creating gas products...');
  const gasProducts = [
    { id: uid(), productCode: 'LPG-001', productName: 'LPG Commercial', gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 215, defaultSellingRate: 0, minStockLevel: 1000, status: 'ACTIVE' },
    { id: uid(), productCode: 'LPG-002', productName: 'LPG Domestic',   gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 210, defaultSellingRate: 0, minStockLevel: 500,  status: 'ACTIVE' },
    { id: uid(), productCode: 'LPG-003', productName: 'LPG Industrial', gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 205, defaultSellingRate: 0, minStockLevel: 2000, status: 'ACTIVE' },
    { id: uid(), productCode: 'LPG-004', productName: 'LPG Autogas',    gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 220, defaultSellingRate: 0, minStockLevel: 800,  status: 'ACTIVE' },
    { id: uid(), productCode: 'LPG-005', productName: 'Propane Mix',    gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 230, defaultSellingRate: 0, minStockLevel: 300,  status: 'ACTIVE' },
  ];
  await prisma.gasProduct.createMany({ data: gasProducts });

  /* ════════════════════════════════
     2. STORAGE TANKS (6)
  ════════════════════════════════ */
  console.log('🛢  Creating storage tanks...');
  const tanks = [
    { id: uid(), tankNumber: 'TK-001', tankName: 'Main Tank A',   gasProductId: gasProducts[0].id, capacity: 20000, currentQuantity: 8500, location: 'Plot A, Industrial Zone', status: 'ACTIVE' },
    { id: uid(), tankNumber: 'TK-002', tankName: 'Main Tank B',   gasProductId: gasProducts[0].id, capacity: 15000, currentQuantity: 6200, location: 'Plot B, Industrial Zone', status: 'ACTIVE' },
    { id: uid(), tankNumber: 'TK-003', tankName: 'Domestic Tank', gasProductId: gasProducts[1].id, capacity: 10000, currentQuantity: 3800, location: 'Yard C',                 status: 'ACTIVE' },
    { id: uid(), tankNumber: 'TK-004', tankName: 'Industrial Tank',gasProductId: gasProducts[2].id, capacity: 25000, currentQuantity: 12000,location: 'Plot D, Industrial',   status: 'ACTIVE' },
    { id: uid(), tankNumber: 'TK-005', tankName: 'Reserve Tank',  gasProductId: gasProducts[0].id, capacity: 8000,  currentQuantity: 1200, location: 'Backup Yard',           status: 'ACTIVE' },
    { id: uid(), tankNumber: 'TK-006', tankName: 'Autogas Tank',  gasProductId: gasProducts[3].id, capacity: 5000,  currentQuantity: 2100, location: 'Gate Area',             status: 'ACTIVE' },
  ];
  await prisma.storageTank.createMany({ data: tanks });

  /* ════════════════════════════════
     3. CYLINDER TYPES (7)
  ════════════════════════════════ */
  console.log('🔧 Creating cylinder types...');
  const cylTypes = [
    { id: uid(), cylinderSize: '6 KG',    gasCapacity: 6,    emptyWeight: 14, depositAmount: 2500,  status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:1400},{priceType:'DEALER',price:1300}]) },
    { id: uid(), cylinderSize: '11.8 KG', gasCapacity: 11.8, emptyWeight: 23, depositAmount: 4500,  status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:2700},{priceType:'DEALER',price:2550}]) },
    { id: uid(), cylinderSize: '14 KG',   gasCapacity: 14,   emptyWeight: 26, depositAmount: 5500,  status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:3200},{priceType:'DEALER',price:3050}]) },
    { id: uid(), cylinderSize: '19 KG',   gasCapacity: 19,   emptyWeight: 35, depositAmount: 7000,  status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:4300},{priceType:'DEALER',price:4100}]) },
    { id: uid(), cylinderSize: '45 KG',   gasCapacity: 45,   emptyWeight: 60, depositAmount: 15000, status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:9800},{priceType:'DEALER',price:9400},{priceType:'COMMERCIAL',price:9200}]) },
    { id: uid(), cylinderSize: '50 KG',   gasCapacity: 50,   emptyWeight: 65, depositAmount: 18000, status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:11000},{priceType:'DEALER',price:10500},{priceType:'COMMERCIAL',price:10200}]) },
    { id: uid(), cylinderSize: '2 KG',    gasCapacity: 2,    emptyWeight: 5,  depositAmount: 1000,  status: 'ACTIVE', sellingPrices: JSON.stringify([{priceType:'RETAIL',price:600}]) },
  ];
  await prisma.cylinderType.createMany({ data: cylTypes });

  // Cylinder inventory
  const cylInvData: any[] = [];
  cylTypes.forEach((ct) => {
    ['FILLED','EMPTY'].forEach((status) => {
      cylInvData.push({ id: uid(), cylinderTypeId: ct.id, status, quantity: rInt(50, 800) });
    });
  });
  await prisma.cylinderInventory.createMany({ data: cylInvData });

  /* ════════════════════════════════
     4. SUPPLIERS (30)
  ════════════════════════════════ */
  console.log('🏭 Creating 30 suppliers...');
  const suppliers: any[] = [];
  for (let i = 1; i <= 30; i++) {
    const name = randomName();
    suppliers.push({
      id: uid(), supplierCode: randomCode('SUP', i),
      supplierName: `${pick(BUSINESS_PREFIXES)} Petroleum ${i}`,
      contactPerson: name, phone: randomPhone(),
      email: `supplier${i}@lpg.pk`, address: `${rInt(1,500)} ${pick(CITIES)} Road`,
      taxNtn: `${rInt(1000000,9999999)}-${rInt(1,9)}`,
      openingBalance: rInt(0, 500000), currentBalance: rInt(0, 1000000),
      paymentTerms: pick([7,15,30,45,60]), status: pick(['ACTIVE','ACTIVE','ACTIVE','INACTIVE']),
    });
  }
  await prisma.supplier.createMany({ data: suppliers });

  /* ════════════════════════════════
     5. CUSTOMERS (500)
  ════════════════════════════════ */
  console.log('👥 Creating 500 customers...');
  const customers: any[] = [];
  const custTypes = ['RETAIL','RETAIL','RETAIL','DEALER','DEALER','COMMERCIAL','INDIVIDUAL'] as const;
  for (let i = 1; i <= 500; i++) {
    const type = pick(custTypes);
    customers.push({
      id: uid(), customerCode: randomCode('CUST', i),
      businessName: type === 'INDIVIDUAL' ? randomName() : randomBiz(),
      contactPerson: randomName(), phone: randomPhone(),
      email: `customer${i}@gmail.com`, address: `${rInt(1,999)} ${pick(CITIES)} Street`,
      customerType: type,
      creditLimit: type === 'RETAIL' ? rInt(50000,200000) : type === 'DEALER' ? rInt(200000,500000) : rInt(100000,1000000),
      openingBalance: rInt(0, 100000), currentBalance: rInt(0, 300000),
      paymentTerms: pick([0,7,15,30,60]),
      status: pick(['ACTIVE','ACTIVE','ACTIVE','ACTIVE','INACTIVE']),
    });
  }
  await prisma.customer.createMany({ data: customers });

  /* ════════════════════════════════
     6. PURCHASES (3,000)
  ════════════════════════════════ */
  console.log('🛒 Creating 3,000 purchases...');
  const purchases: any[] = [];
  for (let i = 1; i <= 3000; i++) {
    const supplier = pick(suppliers);
    const product  = pick(gasProducts);
    const qty      = rFloat(2000, 15000);
    const rate     = rFloat(product.defaultPurchaseRate - 20, product.defaultPurchaseRate + 30);
    const gasAmt   = Math.round(qty * rate);
    const transport = rInt(5000, 50000);
    const other    = rInt(0, 10000);
    const discount = rInt(0, 5000);
    const gross    = gasAmt + transport + other;
    const net      = gross - discount;
    const paid     = pick([0, 0, Math.round(net * 0.5), Math.round(net * 0.75), net]);
    const remaining = net - paid;
    const status   = remaining === 0 ? 'PAID' : paid === 0 ? 'UNPAID' : 'PARTIAL';
    purchases.push({
      id: uid(), purchaseNumber: randomCode('PUR', i),
      supplierId: supplier.id, gasProductId: product.id,
      purchaseDate: rDate(), quantity: qty, unit: 'KG',
      purchaseRate: rate, gasAmount: gasAmt,
      transportation: transport, otherCharges: other,
      discount, grossAmount: gross, netAmount: net,
      paidAmount: paid, remainingAmount: remaining,
      paymentStatus: status,
      supplierInvoiceNumber: `SI-${rInt(10000,99999)}`,
      notes: null, status: 'ACTIVE',
    });
  }
  await prisma.purchase.createMany({ data: purchases });

  /* ════════════════════════════════
     7. GAS RECEIVINGS (2,000)
  ════════════════════════════════ */
  console.log('📥 Creating 2,000 gas receivings...');
  const receivings: any[] = [];
  for (let i = 1; i <= 2000; i++) {
    const pur  = pick(purchases);
    const tank = pick(tanks);
    const exp  = rFloat(1000, 10000);
    const rec  = rFloat(exp * 0.95, exp * 1.02);
    receivings.push({
      id: uid(), receivingNumber: randomCode('RCV', i),
      purchaseId: pur.id, supplierId: pur.supplierId,
      receivingDate: rDate(), expectedQuantity: exp,
      receivedQuantity: parseFloat(rec.toFixed(1)),
      variance: parseFloat((rec - exp).toFixed(1)),
      unit: 'KG', tankId: tank.id,
    });
  }
  await prisma.gasReceiving.createMany({ data: receivings });

  /* ════════════════════════════════
     8. FILLING BATCHES (5,000)
  ════════════════════════════════ */
  console.log('🔄 Creating 5,000 filling batches...');
  const batches: any[] = [];
  const fillStatuses = ['COMPLETED','COMPLETED','COMPLETED','IN_PROGRESS','PENDING'];
  for (let i = 1; i <= 5000; i++) {
    const tank   = pick(tanks);
    const cylTyp = pick(cylTypes);
    const numCyl = rInt(20, 200);
    const expGas = parseFloat((numCyl * cylTyp.gasCapacity).toFixed(1));
    const status = pick(fillStatuses);
    const actGas = status === 'COMPLETED' ? parseFloat((expGas * rFloat(0.97, 1.02, 4)).toFixed(1)) : 0;
    batches.push({
      id: uid(), batchNumber: randomCode('FILL', i),
      fillingDate: rDate(), tankId: tank.id, cylinderTypeId: cylTyp.id,
      numberOfCylinders: numCyl, expectedGasQty: expGas,
      actualGasQty: actGas, gasVariance: parseFloat((actGas - expGas).toFixed(1)),
      fillingStation: `Station ${pick(['A','B','C','D'])}`,
      status,
    });
  }
  await prisma.fillingBatch.createMany({ data: batches });

  /* ════════════════════════════════
     9. SALES (10,000)
  ════════════════════════════════ */
  console.log('💰 Creating 10,000 sales...');
  const saleRecords: any[] = [];
  for (let i = 1; i <= 10000; i++) {
    const cust   = pick(customers);
    const method = pick(PAYMENT_METHODS);
    // 1-3 items
    const numItems = rInt(1, 3);
    let subtotal = 0;
    const itemsForSale: { cylTyp: any; qty: number; unitPrice: number; disc: number; total: number }[] = [];
    for (let j = 0; j < numItems; j++) {
      const ct  = pick(cylTypes);
      const prices = JSON.parse(ct.sellingPrices);
      const price  = prices[0]?.price || 2500;
      const qty    = rInt(1, 30);
      const disc   = rInt(0, 200);
      const total  = Math.round(qty * price - disc);
      subtotal    += total;
      itemsForSale.push({ cylTyp: ct, qty, unitPrice: price, disc, total });
    }
    const discount = rInt(0, 1000);
    const net      = Math.max(subtotal - discount, 0);
    const paid     = method === 'CASH' ? net : pick([0, 0, Math.round(net * 0.5), Math.round(net * 0.75), net]);
    const remaining = net - paid;
    const payStatus = remaining === 0 ? 'PAID' : paid === 0 ? 'UNPAID' : 'PARTIAL';
    const saleId   = uid();
    saleRecords.push({
      sale: {
        id: saleId, invoiceNumber: randomCode('INV', i),
        customerId: cust.id, saleDate: rDate(),
        subtotal, discount, netTotal: net,
        paidAmount: paid, remainingAmount: remaining,
        paymentMethod: method, paymentStatus: payStatus,
      },
      items: itemsForSale.map((it) => ({
        id: uid(), saleId,
        cylinderTypeId: it.cylTyp.id,
        quantity: it.qty, unitPrice: it.unitPrice,
        discount: it.disc, totalPrice: it.total,
      })),
    });
  }

  // Bulk insert sales in batches of 500
  console.log('   → Inserting sales...');
  const BATCH = 500;
  for (let i = 0; i < saleRecords.length; i += BATCH) {
    const chunk = saleRecords.slice(i, i + BATCH);
    await prisma.sale.createMany({ data: chunk.map((r) => r.sale) });
    await prisma.saleItem.createMany({ data: chunk.flatMap((r) => r.items) });
    if ((i + BATCH) % 2000 === 0) console.log(`   → ${i + BATCH} sales done...`);
  }

  /* ════════════════════════════════
     10. CUSTOMER PAYMENTS (8,000)
  ════════════════════════════════ */
  console.log('💳 Creating 8,000 customer payments...');
  const custPayments: any[] = [];
  const saleSample = saleRecords.filter((_, idx) => idx % 2 === 0); // half the sales get payments
  for (let i = 1; i <= 8000; i++) {
    const sr   = pick(saleSample);
    const cust = customers.find((c) => c.id === sr.sale.customerId)!;
    custPayments.push({
      id: uid(), paymentNumber: randomCode('CPY', i),
      customerId: cust.id, saleId: sr.sale.id,
      paymentDate: rDate(),
      amount: rInt(1000, 100000),
      paymentMethod: pick(['CASH','BANK','CHEQUE']),
      reference: pick([null, null, `CHQ-${rInt(10000,99999)}`]),
    });
  }
  for (let i = 0; i < custPayments.length; i += BATCH) {
    await prisma.customerPayment.createMany({ data: custPayments.slice(i, i + BATCH) });
  }

  /* ════════════════════════════════
     11. SUPPLIER PAYMENTS (2,000)
  ════════════════════════════════ */
  console.log('💳 Creating 2,000 supplier payments...');
  const suppPayments: any[] = [];
  for (let i = 1; i <= 2000; i++) {
    const pur = pick(purchases);
    suppPayments.push({
      id: uid(), paymentNumber: randomCode('SPY', i),
      supplierId: pur.supplierId, purchaseId: pur.id,
      paymentDate: rDate(),
      amount: rInt(50000, 500000),
      paymentMethod: pick(['CASH','BANK','CHEQUE']),
      reference: pick([null, `CHQ-${rInt(10000,99999)}`, `TT-${rInt(100000,999999)}`]),
    });
  }
  for (let i = 0; i < suppPayments.length; i += BATCH) {
    await prisma.supplierPayment.createMany({ data: suppPayments.slice(i, i + BATCH) });
  }

  /* ════════════════════════════════
     12. EXPENSES (10,000)
  ════════════════════════════════ */
  console.log('💸 Creating 10,000 expenses...');
  const expenses: any[] = [];
  for (let i = 1; i <= 10000; i++) {
    const cat  = pick(EXPENSE_CATS);
    const descs = EXPENSE_DESCS[cat];
    expenses.push({
      id: uid(), expenseNumber: randomCode('EXP', i),
      category: cat, expenseDate: rDate(),
      amount: rInt(500, 150000),
      paymentMethod: pick(['CASH','BANK','CHEQUE']),
      description: pick(descs),
    });
  }
  for (let i = 0; i < expenses.length; i += BATCH) {
    await prisma.expense.createMany({ data: expenses.slice(i, i + BATCH) });
  }

  /* ── Summary ── */
  const counts = await Promise.all([
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.purchase.count(),
    prisma.gasReceiving.count(),
    prisma.fillingBatch.count(),
    prisma.sale.count(),
    prisma.saleItem.count(),
    prisma.customerPayment.count(),
    prisma.supplierPayment.count(),
    prisma.expense.count(),
  ]);
  const labels = ['Customers','Suppliers','Purchases','Gas Receivings','Filling Batches','Sales','Sale Items','Customer Payments','Supplier Payments','Expenses'];
  console.log('\n✅ Seed complete!\n');
  labels.forEach((l, i) => console.log(`   ${l}: ${counts[i].toLocaleString()}`));
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
