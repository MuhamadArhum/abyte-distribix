import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { CustomersService } from './customers.service';

/**
 * FINAL-002 regression matrix: the customer ledger's running balance must
 * always reconcile with the stored Customer.currentBalance, including when
 * Sale Returns are involved (previously, returns were invisible to the
 * ledger even though they correctly decrement currentBalance).
 *
 * Runs against a throwaway, fully isolated SQLite copy of the schema-only
 * template database — never the real development database. Every case
 * seeds its own customer directly with Prisma (bypassing the app's own
 * services) so the ledger math can be checked against exactly the fields
 * being asserted, independent of any other module's behavior.
 */
describe('CustomersService.getLedger — reconciliation with currentBalance (FINAL-002)', () => {
  let testDbPath: string;
  let prisma: PrismaClient;
  let service: CustomersService;
  let saleCounter = 0;
  let returnCounter = 0;
  let paymentCounter = 0;

  beforeAll(() => {
    const templatePath = path.join(__dirname, '..', '..', '..', 'prisma', 'template.db');
    testDbPath = path.join(os.tmpdir(), `abyte-ledger-test-${Date.now()}.db`);
    fs.copyFileSync(templatePath, testDbPath);
    prisma = new PrismaClient({ datasources: { db: { url: `file:${testDbPath}` } } });
    service = new CustomersService(prisma as any);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    fs.rmSync(testDbPath, { force: true });
  });

  const COMPANY_ID = 'cmp_default';

  async function makeCustomer(openingBalance: number, currentBalance: number) {
    const n = Math.random().toString(36).slice(2);
    return prisma.customer.create({
      data: {
        companyId: COMPANY_ID,
        customerCode: `LEDGER-TEST-${n}`,
        businessName: 'Ledger Test Co',
        phone: '0300-0000000',
        openingBalance,
        currentBalance,
      },
    });
  }

  async function makeSale(customerId: string, netTotal: number, paidAmount: number, daysAgo: number) {
    saleCounter++;
    const saleDate = new Date(Date.now() - daysAgo * 86400000);
    return prisma.sale.create({
      data: {
        companyId: COMPANY_ID,
        invoiceNumber: `LEDGER-INV-${saleCounter}-${Date.now()}`,
        customerId,
        saleDate,
        subtotal: netTotal,
        netTotal,
        paidAmount,
        remainingAmount: netTotal - paidAmount,
        paymentStatus: paidAmount >= netTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
      },
    });
  }

  async function makePayment(customerId: string, amount: number, daysAgo: number) {
    paymentCounter++;
    return prisma.customerPayment.create({
      data: {
        companyId: COMPANY_ID,
        paymentNumber: `LEDGER-PAY-${paymentCounter}-${Date.now()}`,
        customerId,
        paymentDate: new Date(Date.now() - daysAgo * 86400000),
        amount,
      },
    });
  }

  async function makeReturn(customerId: string, saleId: string, totalAmount: number, daysAgo: number) {
    returnCounter++;
    return prisma.saleReturn.create({
      data: {
        companyId: COMPANY_ID,
        returnNumber: `LEDGER-RET-${returnCounter}-${Date.now()}`,
        saleId,
        customerId,
        returnDate: new Date(Date.now() - daysAgo * 86400000),
        totalAmount,
      },
    });
  }

  /** Mirrors exactly how the real balance-maintaining code paths compute
   *  currentBalance, so each test case's `currentBalance` seed value is
   *  itself a faithful simulation of the real app, not an arbitrary number. */
  function expectedBalance(openingBalance: number, sales: { netTotal: number; paidAmount: number }[], payments: number[], returns: number[]) {
    const salesImpact = sales.reduce((s, sale) => s + (sale.netTotal - sale.paidAmount), 0);
    const paymentsImpact = payments.reduce((s, p) => s + p, 0);
    const returnsImpact = returns.reduce((s, r) => s + r, 0);
    return openingBalance + salesImpact - paymentsImpact - returnsImpact;
  }

  async function ledgerFinalBalance(customerId: string) {
    const rows = await service.getLedger(customerId, COMPANY_ID);
    return rows[rows.length - 1].balance;
  }

  it('Case 1 — sale only', async () => {
    const opening = 5000;
    const sale = { netTotal: 20000, paidAmount: 0 };
    const balance = expectedBalance(opening, [sale], [], []);
    const customer = await makeCustomer(opening, balance);
    await makeSale(customer.id, sale.netTotal, sale.paidAmount, 5);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
    expect(final).toBe(customer.currentBalance);
  });

  it('Case 2 — sale + payment', async () => {
    const opening = 0;
    const sale = { netTotal: 20000, paidAmount: 0 };
    const payment = 8000;
    const balance = expectedBalance(opening, [sale], [payment], []);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 5);
    await makePayment(customer.id, payment, 2);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
  });

  it('Case 3 — sale + partial return', async () => {
    const opening = 0;
    const sale = { netTotal: 20000, paidAmount: 0 };
    const ret = 5000;
    const balance = expectedBalance(opening, [sale], [], [ret]);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 5);
    await makeReturn(customer.id, s.id, ret, 2);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
  });

  it('Case 4 — sale + full return', async () => {
    const opening = 0;
    const sale = { netTotal: 15000, paidAmount: 0 };
    const ret = 15000;
    const balance = expectedBalance(opening, [sale], [], [ret]);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 5);
    await makeReturn(customer.id, s.id, ret, 2);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
    expect(final).toBe(0); // fully returned, nothing owed
  });

  it('Case 5 — sale + payment + partial return', async () => {
    const opening = 2000;
    const sale = { netTotal: 30000, paidAmount: 10000 };
    const payment = 5000;
    const ret = 6000;
    const balance = expectedBalance(opening, [sale], [payment], [ret]);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 10);
    await makePayment(customer.id, payment, 6);
    await makeReturn(customer.id, s.id, ret, 3);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
  });

  it('Case 6 — sale + payment + full return', async () => {
    const opening = 0;
    const sale = { netTotal: 12000, paidAmount: 4000 };
    const payment = 8000; // pays off the remaining 8000 fully
    const ret = 12000; // then the whole sale is returned
    const balance = expectedBalance(opening, [sale], [payment], [ret]);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 10);
    await makePayment(customer.id, payment, 6);
    await makeReturn(customer.id, s.id, ret, 3);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
  });

  it('Case 7 — multiple returns against different sales', async () => {
    const opening = 1000;
    const saleA = { netTotal: 10000, paidAmount: 0 };
    const saleB = { netTotal: 8000, paidAmount: 0 };
    const retA = 3000;
    const retB = 2000;
    const balance = expectedBalance(opening, [saleA, saleB], [], [retA, retB]);
    const customer = await makeCustomer(opening, balance);
    const sA = await makeSale(customer.id, saleA.netTotal, saleA.paidAmount, 20);
    const sB = await makeSale(customer.id, saleB.netTotal, saleB.paidAmount, 15);
    await makeReturn(customer.id, sA.id, retA, 10);
    await makeReturn(customer.id, sB.id, retB, 5);

    const final = await ledgerFinalBalance(customer.id);
    expect(final).toBe(balance);
  });

  it('Case 8 — return after payment (chronological order still reconciles)', async () => {
    const opening = 0;
    const sale = { netTotal: 10000, paidAmount: 0 };
    const payment = 10000; // fully paid first
    const ret = 4000; // then partially returned afterwards
    const balance = expectedBalance(opening, [sale], [payment], [ret]);
    const customer = await makeCustomer(opening, balance);
    const s = await makeSale(customer.id, sale.netTotal, sale.paidAmount, 30);
    await makePayment(customer.id, payment, 20);
    await makeReturn(customer.id, s.id, ret, 5); // most recent event

    const rows = await service.getLedger(customer.id, COMPANY_ID);
    // Confirm chronological ordering: OPENING, SALE, PAYMENT, then SALE_RETURN last.
    expect(rows.map((r: any) => r.transactionType)).toEqual(['OPENING', 'SALE', 'PAYMENT', 'SALE_RETURN']);
    expect(rows[rows.length - 1].balance).toBe(balance);
  });

  it('Case 9 — multiple chronological transactions, running balance correct after every row', async () => {
    const opening = 500;
    const customer = await makeCustomer(opening, 0); // currentBalance recomputed below
    const s1 = await makeSale(customer.id, 10000, 0, 10);
    const p1 = await makePayment(customer.id, 3000, 8);
    const s2 = await makeSale(customer.id, 5000, 5000, 6); // fully paid at creation
    const r1 = await makeReturn(customer.id, s1.id, 2000, 4);
    const p2 = await makePayment(customer.id, 1000, 2);

    const balance = expectedBalance(
      opening,
      [{ netTotal: 10000, paidAmount: 0 }, { netTotal: 5000, paidAmount: 5000 }],
      [3000, 1000],
      [2000],
    );
    await prisma.customer.update({ where: { id: customer.id }, data: { currentBalance: balance } });

    const rows = await service.getLedger(customer.id, COMPANY_ID);
    expect(rows.map((r: any) => r.transactionType)).toEqual(['OPENING', 'SALE', 'PAYMENT', 'SALE', 'SALE_RETURN', 'PAYMENT']);

    // Running balance must be monotonically consistent step by step.
    let running = opening;
    for (const row of rows.slice(1)) {
      running += row.debit - row.credit;
      expect(row.balance).toBe(running);
    }
    expect(rows[rows.length - 1].balance).toBe(balance);
  });

  it('Case 10 — customer with no returns: existing (pre-fix) behavior is completely unchanged', async () => {
    const opening = 1000;
    const sale = { netTotal: 20000, paidAmount: 5000 };
    const payment = 4000;
    const balance = expectedBalance(opening, [sale], [payment], []);
    const customer = await makeCustomer(opening, balance);
    await makeSale(customer.id, sale.netTotal, sale.paidAmount, 5);
    await makePayment(customer.id, payment, 2);

    const rows = await service.getLedger(customer.id, COMPANY_ID);
    expect(rows.some((r: any) => r.transactionType === 'SALE_RETURN')).toBe(false);
    expect(rows[rows.length - 1].balance).toBe(balance);
  });
});
