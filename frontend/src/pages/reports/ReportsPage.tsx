import React, { useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Report', description: 'Daily/monthly sales with customer details', hasDateFilter: true },
  { id: 'purchases', label: 'Purchase Report', description: 'Gas purchases from suppliers', hasDateFilter: true },
  { id: 'receivables', label: 'Customer Receivables', description: 'Outstanding balances from customers', hasDateFilter: false },
  { id: 'payables', label: 'Supplier Payables', description: 'Outstanding amounts to suppliers', hasDateFilter: false },
  { id: 'inventory', label: 'Inventory Report', description: 'Current gas and cylinder stock', hasDateFilter: false },
  { id: 'profit-loss', label: 'Profit & Loss', description: 'Revenue, costs, and net profit summary', hasDateFilter: true },
  { id: 'cylinder-movement', label: 'Cylinder Movement', description: 'Filling batches and cylinder transactions', hasDateFilter: true },
  { id: 'sales-by-user', label: 'Sales by User', description: 'Sales performance per user/staff', hasDateFilter: true },
  { id: 'sales-returns', label: 'Sales Returns', description: 'Returned invoices and reasons', hasDateFilter: true },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async (type: string) => {
    setSelectedReport(type);
    setLoading(true);
    setData(null);
    try {
      const params = { startDate, endDate };
      let res;
      if (type === 'sales') res = await reportsApi.getSales(params);
      else if (type === 'purchases') res = await reportsApi.getPurchases(params);
      else if (type === 'receivables') res = await reportsApi.getReceivables();
      else if (type === 'payables') res = await reportsApi.getPayables();
      else if (type === 'inventory') res = await reportsApi.getInventory();
      else if (type === 'profit-loss') res = await reportsApi.getProfitLoss(params);
      else if (type === 'cylinder-movement') res = await reportsApi.getCylinderMovement(params);
      else if (type === 'sales-by-user') res = await reportsApi.getSalesByUser(params);
      else if (type === 'sales-returns') res = await reportsApi.getSalesReturns(params);
      setData(res?.data);
    } catch { alert('Failed to generate report'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <div className="section-title">Reports</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Generate business reports</div>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <label className="ab-label">From Date</label>
          <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 160 }} />
        </div>
        <div>
          <label className="ab-label">To Date</label>
          <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      {/* Report Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {REPORT_TYPES.map((report) => (
          <button
            key={report.id}
            onClick={() => generateReport(report.id)}
            style={{
              textAlign: 'left', padding: 16, border: `1px solid ${selectedReport === report.id ? 'var(--safety-orange)' : 'var(--rule)'}`,
              borderRadius: 'var(--radius)', background: selectedReport === report.id ? 'rgba(255,109,0,0.06)' : 'var(--paper-light)',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--blueprint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>{report.label}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--steel)' }}>{report.description}</div>
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Generating report...</div>}

      {data && !loading && (
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="section-title" style={{ fontSize: 13 }}>{REPORT_TYPES.find((r) => r.id === selectedReport)?.label}</span>
            <button className="ab-btn ab-btn-outline no-print" style={{ fontSize: 11 }} onClick={() => window.print()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Report
            </button>
          </div>

          {selectedReport === 'sales' && Array.isArray(data) && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginBottom: 12 }}>
                {data.length} sales · Revenue: {formatCurrency(data.reduce((s: number, i: any) => s + i.netTotal, 0))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.slice(0, 50).map((sale: any) => (
                  <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, fontSize: 12 }}>{sale.invoiceNumber}</span>
                      <span style={{ color: 'var(--steel)' }}>{sale.customer?.businessName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(sale.saleDate)}</span>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, fontSize: 12 }}>{formatCurrency(sale.netTotal)}</span>
                      <span className={`pill ${sale.paymentStatus === 'PAID' ? 'pill-green' : sale.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red'}`}>{sale.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedReport === 'receivables' && Array.isArray(data) && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginBottom: 12 }}>
                Total Receivables: {formatCurrency(data.reduce((s: number, i: any) => s + i.currentBalance, 0))}
              </div>
              {data.map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{c.businessName}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginLeft: 8 }}>{c.customerCode}</span>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--amber-warn)' }}>{formatCurrency(c.currentBalance)}</span>
                </div>
              ))}
            </div>
          )}

          {selectedReport === 'payables' && Array.isArray(data) && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginBottom: 12 }}>
                Total Payables: {formatCurrency(data.reduce((s: number, i: any) => s + i.currentBalance, 0))}
              </div>
              {data.map((s: any) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{s.supplierName}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginLeft: 8 }}>{s.supplierCode}</span>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--red-risk)' }}>{formatCurrency(s.currentBalance)}</span>
                </div>
              ))}
            </div>
          )}

          {selectedReport === 'inventory' && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em', color: 'var(--ink)' }}>GAS TANKS</div>
                {data.gasTanks?.map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{t.tankName}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace' }}>{t.currentQuantity} / {t.capacity} KG</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em', color: 'var(--ink)' }}>CYLINDERS</div>
                {data.cylinders?.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{c.cylinderType?.cylinderSize}</span>
                      <span className="pill pill-steel">{c.status}</span>
                    </div>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: 16 }}>{c.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profit & Loss */}
          {selectedReport === 'profit-loss' && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Revenue */}
              <div style={{ padding: 16, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em' }}>REVENUE</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>Total Revenue</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700 }}>{formatCurrency(data.totalRevenue ?? 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>Invoice Count</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace' }}>{data.invoiceCount ?? 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>Total Discount</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--amber-warn)' }}>{formatCurrency(data.totalDiscount ?? 0)}</span>
                </div>
              </div>
              {/* COGS */}
              <div style={{ padding: 16, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em' }}>COST OF GOODS SOLD</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>COGS</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--red-risk)' }}>{formatCurrency(data.cogs ?? 0)}</span>
                </div>
              </div>
              {/* Gross Profit */}
              <div style={{ padding: 16, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>Gross Profit</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700 }}>{formatCurrency(data.grossProfit ?? 0)}</div>
                    <div style={{ fontSize: 11, color: 'var(--steel)' }}>{data.grossMargin ?? 0}% margin</div>
                  </div>
                </div>
              </div>
              {/* Expenses by Category */}
              {data.expensesByCategory && (
                <div style={{ padding: 16, background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em' }}>EXPENSES BY CATEGORY</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 0', color: 'var(--steel)', fontWeight: 600 }}>Category</th>
                        <th style={{ textAlign: 'right', padding: '4px 0', color: 'var(--steel)', fontWeight: 600 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.expensesByCategory).map(([cat, amt]: [string, any]) => (
                        <tr key={cat} style={{ borderBottom: '1px solid var(--rule)' }}>
                          <td style={{ padding: '6px 0' }}>{cat}</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(amt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Net Profit */}
              <div style={{ padding: 16, background: (data.netProfit ?? 0) >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${(data.netProfit ?? 0) >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                  <span style={{ fontWeight: 700 }}>Net Profit</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 800, color: (data.netProfit ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(data.netProfit ?? 0)}</div>
                    <div style={{ fontSize: 11, color: 'var(--steel)' }}>{data.netMargin ?? 0}% margin</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cylinder Movement */}
          {selectedReport === 'cylinder-movement' && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {data.fillingBatches && (
                <div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em' }}>FILLING BATCHES</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--blueprint)', color: 'var(--paper-light)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Batch #</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Cylinder Type</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Cylinders</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Gas (KG)</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fillingBatches.map((b: any) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{b.batchNumber}</td>
                          <td style={{ padding: '8px 12px' }}>{formatDate(b.fillingDate)}</td>
                          <td style={{ padding: '8px 12px' }}>{b.cylinderType?.cylinderSize}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{b.numberOfCylinders}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{b.actualGasQty}</td>
                          <td style={{ padding: '8px 12px' }}>{b.status}</td>
                        </tr>
                      ))}
                      {data.fillingBatches.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--steel)' }}>No filling batches found</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {data.cylinderTransactions && (
                <div>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.04em' }}>CYLINDER TRANSACTIONS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--blueprint)', color: 'var(--paper-light)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Type</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Cylinder</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Qty</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cylinderTransactions.map((t: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--rule)' }}>
                          <td style={{ padding: '8px 12px' }}>{formatDate(t.date)}</td>
                          <td style={{ padding: '8px 12px' }}>{t.type}</td>
                          <td style={{ padding: '8px 12px' }}>{t.cylinderType?.cylinderSize || t.cylinderSize}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{t.quantity}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--steel)', fontSize: 12 }}>{t.notes || '—'}</td>
                        </tr>
                      ))}
                      {data.cylinderTransactions.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--steel)' }}>No transactions found</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sales by User */}
          {selectedReport === 'sales-by-user' && Array.isArray(data) && (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--blueprint)', color: 'var(--paper-light)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>User</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Sales Count</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Total Amount</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Total Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{row.user?.fullName || row.username || '—'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{row.salesCount ?? row.count ?? 0}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700 }}>{formatCurrency(row.totalAmount ?? 0)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(row.totalCollected ?? 0)}</td>
                    </tr>
                  ))}
                  {data.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--steel)' }}>No data found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Sales Returns */}
          {selectedReport === 'sales-returns' && Array.isArray(data) && (
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginBottom: 12 }}>
                {data.length} return(s)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--blueprint)', color: 'var(--paper-light)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Return #</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Customer</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Original Invoice</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 700 }}>Amount</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700 }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{r.returnNumber}</td>
                      <td style={{ padding: '8px 12px' }}>{r.customer?.businessName || '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{r.sale?.invoiceNumber || r.invoiceNumber || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{formatDate(r.returnDate || r.createdAt)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(r.amount ?? 0)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--steel)', fontSize: 12 }}>{r.reason || '—'}</td>
                    </tr>
                  ))}
                  {data.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--steel)' }}>No returns found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
