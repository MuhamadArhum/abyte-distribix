import React, { useState } from 'react';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Report', description: 'Daily/monthly sales with customer details', hasDateFilter: true },
  { id: 'purchases', label: 'Purchase Report', description: 'Gas purchases from suppliers', hasDateFilter: true },
  { id: 'receivables', label: 'Customer Receivables', description: 'Outstanding balances from customers', hasDateFilter: false },
  { id: 'payables', label: 'Supplier Payables', description: 'Outstanding amounts to suppliers', hasDateFilter: false },
  { id: 'inventory', label: 'Inventory Report', description: 'Current gas and cylinder stock', hasDateFilter: false },
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
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 14 }}>
            <span className="section-title" style={{ fontSize: 13 }}>{REPORT_TYPES.find((r) => r.id === selectedReport)?.label}</span>
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
        </div>
      )}
    </div>
  );
}
