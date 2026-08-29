import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, cylindersApi, storageTanksApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sale, Purchase, Customer, CylinderType, StorageTank } from '@/types';

function fillPct(filled: number, total: number) {
  if (!total) return 0;
  return Math.round((filled / total) * 100);
}

function statusPill(pct: number) {
  if (pct >= 50) return <span className="pill pill-green">Optimal</span>;
  if (pct >= 25) return <span className="pill pill-amber">Low Stock</span>;
  return <span className="pill pill-red">Critical</span>;
}

function getInv(c: CylinderType, status: string) {
  return (c.cylinderInventory || []).find((i: any) => i.status === status)?.quantity || 0;
}

/* ── Mini SVG bar chart ── */
function SalesBarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 300; const H = 140; const barW = Math.min(28, (W / data.length) - 8);
  const slot = W / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} width="100%" height={H + 28}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1="0" y1={H - t * H} x2={W} y2={H - t * H} stroke="var(--rule)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const bh = (d.value / max) * H;
        const cx = i * slot + slot / 2;
        return (
          <g key={i}>
            <rect x={cx - barW / 2} y={H - bh} width={barW} height={bh} fill="var(--blueprint)" rx="2" />
            <text x={cx} y={H + 16} textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontSize="9" fill="var(--steel)">{d.label}</text>
            {d.value > 0 && <text x={cx} y={H - bh - 5} textAnchor="middle" fontFamily="IBM Plex Mono,monospace" fontSize="8" fill="var(--steel)">{(d.value / 1000).toFixed(0)}K</text>}
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<Purchase[]>([]);
  const [topDebtors, setTopDebtors] = useState<Customer[]>([]);
  const [cylinders, setCylinders] = useState<CylinderType[]>([]);
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      dashboardApi.getStats(),
      dashboardApi.getSalesChart(),
      dashboardApi.getRecentSales(),
      dashboardApi.getPendingPurchases(),
      dashboardApi.getTopDebtors(),
      cylindersApi.getAll(),
      storageTanksApi.getAll(),
    ]).then(([s, chart, sales, purch, cust, cyl, tank]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);

      if (chart.status === 'fulfilled') {
        const raw = chart.value.data;
        if (Array.isArray(raw)) {
          setChartData(raw.map((d: any) => ({ label: d.label || d.date || '', value: d.value || d.total || d.netTotal || d.amount || 0 })));
        }
      }

      if (sales.status === 'fulfilled') setRecentSales(sales.value.data);
      if (purch.status === 'fulfilled') setPendingPurchases(purch.value.data);
      if (cust.status === 'fulfilled') setTopDebtors(cust.value.data);
      if (cyl.status === 'fulfilled') setCylinders(cyl.value.data);
      if (tank.status === 'fulfilled') setTanks(tank.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // Derive live alerts
  const alerts: { level: 'high' | 'med'; title: string; sub: string }[] = [];
  tanks.forEach((t) => {
    const pct = t.capacity > 0 ? (t.currentQuantity / t.capacity) * 100 : 100;
    if (pct < 20) alerts.push({ level: 'high', title: `Low Gas Stock — ${t.tankName}`, sub: `Current: ${t.currentQuantity} KG · Capacity: ${t.capacity} KG (${Math.round(pct)}%)` });
    else if (pct < 40) alerts.push({ level: 'med', title: `Gas Level Warning — ${t.tankName}`, sub: `Current: ${t.currentQuantity} KG · ${Math.round(pct)}% remaining` });
  });
  if (pendingPurchases.length > 0) {
    const total = pendingPurchases.reduce((s, p) => s + p.remainingAmount, 0);
    alerts.push({ level: 'med', title: `${pendingPurchases.length} Purchase${pendingPurchases.length > 1 ? 's' : ''} Pending Payment`, sub: `Total outstanding: ${formatCurrency(total)}` });
  }
  const overdueCustomers = topDebtors.filter((c) => c.currentBalance > c.creditLimit && c.creditLimit > 0);
  if (overdueCustomers.length > 0) alerts.push({ level: 'high', title: `${overdueCustomers.length} Customer${overdueCustomers.length > 1 ? 's' : ''} Over Credit Limit`, sub: overdueCustomers.map((c) => c.businessName).join(', ') });

  const kpi = [
    { label: 'Bulk Gas Stock', value: stats ? `${stats.bulkGasStock ?? 0} KG` : '—', sub: `${tanks.length} tank${tanks.length !== 1 ? 's' : ''} active`, cls: '' },
    { label: "Today's Sales", value: formatCurrency(stats?.todaySales ?? 0), sub: 'Revenue today', cls: '' },
    { label: 'Total Receivables', value: formatCurrency(stats?.totalReceivables ?? 0), sub: 'Outstanding from customers', cls: 'alt' },
    { label: 'Total Payables', value: formatCurrency(stats?.totalPayables ?? 0), sub: 'Outstanding to suppliers', cls: 'alt' },
    { label: 'Filled Cylinders', value: String(stats?.filledCylinders ?? cylinders.reduce((s, c) => s + getInv(c, 'FILLED'), 0)), sub: 'Ready for sale', cls: 'green' },
    { label: 'Empty Cylinders', value: String(stats?.emptyCylinders ?? cylinders.reduce((s, c) => s + getInv(c, 'EMPTY'), 0)), sub: 'Awaiting filling', cls: '' },
    { label: 'With Customers', value: String(stats?.cylindersWithCustomers ?? 0), sub: 'At customer sites', cls: 'alt' },
    { label: "Today's Expenses", value: formatCurrency(stats?.todayExpenses ?? 0), sub: 'Costs today', cls: 'red' },
  ];

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading dashboard...</div>;

  return (
    <div className="page-content">

      {/* KPI Row */}
      <div className="kpi-grid">
        {kpi.map((k, i) => (
          <div key={i} className={`kpi-card ${k.cls}`}>
            <div className="kpi-top"><span className="kpi-label">{k.label}</span></div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Cylinder Inventory + Sales Chart */}
      <div className="panels-grid">
        {/* Cylinder inventory */}
        <div className="panel">
          <div className="panel-head">
            <span className="section-title">Cylinder Inventory</span>
            <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => navigate('/cylinders')}>View all →</button>
          </div>
          {cylinders.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No cylinder data</div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Status</th>
                    <th style={{ width: 130 }}>Fill Rate</th>
                    <th style={{ textAlign: 'right' }}>Filled</th>
                    <th style={{ textAlign: 'right' }}>Empty</th>
                  </tr>
                </thead>
                <tbody>
                  {cylinders.map((c) => {
                    const filled = getInv(c, 'FILLED');
                    const empty = getInv(c, 'EMPTY');
                    const total = filled + empty;
                    const pct = fillPct(filled, total);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="row-title">{c.cylinderSize}</div>
                          <div className="row-sub">Total: {total}</div>
                        </td>
                        <td>{statusPill(pct)}</td>
                        <td>
                          <div className="prog-track">
                            <div className={`prog-fill${pct >= 50 ? ' fill-green' : ''}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="prog-pct">{pct}% filled</div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, color: 'var(--green-ok)', fontWeight: 600 }}>{filled}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, color: empty > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>{empty}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sales Chart */}
        <div className="panel">
          <div className="panel-head">
            <span className="section-title">Sales Trend</span>
            <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => navigate('/sales')}>View all →</button>
          </div>
          <div className="panel-body">
            {chartData.length > 0 ? (
              <SalesBarChart data={chartData} />
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', marginBottom: 8 }}>Recent sales by day</div>
                <SalesBarChart data={
                  (() => {
                    const last7: { label: string; value: number }[] = [];
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date(); d.setDate(d.getDate() - i);
                      const key = d.toISOString().split('T')[0];
                      const label = d.toLocaleDateString('en', { weekday: 'short' });
                      const value = recentSales.filter((s) => (s.saleDate || '').startsWith(key)).reduce((sum, s) => sum + s.netTotal, 0);
                      last7.push({ label, value });
                    }
                    return last7;
                  })()
                } />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales + Alerts */}
      <div className="panels-grid">
        {/* Recent Sales */}
        <div className="panel">
          <div className="panel-head">
            <span className="section-title">Recent Sales</span>
            <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => navigate('/sales')}>View all →</button>
          </div>
          {recentSales.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No sales yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/sales/${s.id}`)}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{s.invoiceNumber}</span></td>
                    <td>
                      <div className="row-title">{s.customer?.businessName || '—'}</div>
                      <div className="row-sub">{formatDate(s.saleDate)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: 'var(--safety-orange)' }}>{formatCurrency(s.netTotal)}</span></td>
                    <td>
                      {s.paymentStatus === 'PAID' ? <span className="pill pill-green">Paid</span>
                        : s.paymentStatus === 'PARTIAL' ? <span className="pill pill-amber">Partial</span>
                        : <span className="pill pill-red">Unpaid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Alerts */}
        <div className="panel">
          <div className="panel-head">
            <span className="section-title">Alerts</span>
            {alerts.length > 0 && <span className="pill pill-red" style={{ fontSize: 11 }}>{alerts.length} active</span>}
          </div>
          <div className="panel-body">
            {alerts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--green-ok)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>✓ No alerts — all systems normal</div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="alert-item">
                  <span className={`alert-icon ${a.level === 'high' ? 'alert-icon-high' : 'alert-icon-med'}`}>!</span>
                  <div>
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-sub">{a.sub}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Top Debtors mini list */}
          {topDebtors.length > 0 && (
            <>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', padding: '14px 16px 8px', borderTop: '1px solid var(--rule)' }}>
                TOP OUTSTANDING
              </div>
              {topDebtors.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 16px', cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.id}`)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.businessName}</div>
                    <div style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace' }}>{c.customerType}</div>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--amber-warn)' }}>{formatCurrency(c.currentBalance)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Pending Purchases */}
      {pendingPurchases.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <span className="section-title">Pending Purchase Payments</span>
            <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => navigate('/purchases')}>View all →</button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Net Amount</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingPurchases.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/purchases/${p.id}`)}>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.purchaseNumber}</span></td>
                  <td><span className="row-title">{p.supplier?.supplierName || '—'}</span></td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.purchaseDate)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatCurrency(p.netAmount)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: 'var(--red-risk)' }}>{formatCurrency(p.remainingAmount)}</span></td>
                  <td>{p.paymentStatus === 'PARTIAL' ? <span className="pill pill-amber">Partial</span> : <span className="pill pill-red">Unpaid</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
