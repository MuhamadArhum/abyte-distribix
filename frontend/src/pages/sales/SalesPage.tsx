import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sale } from '@/types';

const today = new Date().toISOString().split('T')[0];

const statusPill = (s: string) => {
  if (s === 'PAID') return <span className="pill pill-green">Paid</span>;
  if (s === 'PARTIAL') return <span className="pill pill-amber">Partial</span>;
  return <span className="pill pill-red">Unpaid</span>;
};

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const load = () => {
    setLoading(true);
    salesApi.getAll().then((r) => setSales(r.data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, inv: string) => {
    if (!confirm(`Delete invoice ${inv}? This cannot be undone.`)) return;
    try { await salesApi.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.invoiceNumber.toLowerCase().includes(q) || (s.customer?.businessName || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || s.paymentStatus === filterStatus;
      const matchMethod = filterMethod === 'ALL' || s.paymentMethod === filterMethod;
      const saleDate = s.saleDate?.split('T')[0] || '';
      const matchDate = saleDate >= startDate && saleDate <= endDate;
      return matchSearch && matchStatus && matchMethod && matchDate;
    });
  }, [sales, search, filterStatus, filterMethod, startDate, endDate]);

  // KPIs
  const todaySales = sales.filter((s) => (s.saleDate?.split('T')[0] || '') === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.netTotal, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = sales.filter((s) => (s.saleDate || '').startsWith(thisMonth)).reduce((sum, s) => sum + s.netTotal, 0);
  const totalOutstanding = sales.reduce((sum, s) => sum + s.remainingAmount, 0);
  const unpaidCount = sales.filter((s) => s.paymentStatus !== 'PAID').length;

  const filtersActive = search || filterStatus !== 'ALL' || filterMethod !== 'ALL' || startDate !== today || endDate !== today;

  const methods = [...new Set(sales.map((s) => s.paymentMethod).filter(Boolean))];

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Revenue</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(todayRevenue)}</div>
          <div className="kpi-sub">{todaySales.length} invoices today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(monthRevenue)}</div>
          <div className="kpi-sub">Month-to-date sales</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Outstanding</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--amber-warn)' }}>{formatCurrency(totalOutstanding)}</div>
          <div className="kpi-sub">{unpaidCount} unpaid / partial</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Invoices</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{sales.length}</div>
          <div className="kpi-sub">All time records</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Sales</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {sales.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => navigate('/sales/new')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Sale
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input
          className="ab-input"
          placeholder="Search invoice # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 200px', minWidth: 160 }}
        />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <select className="ab-input ab-select" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Methods</option>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterMethod('ALL'); setStartDate(today); setEndDate(today); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No sales found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Net Total</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Method</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{s.invoiceNumber}</span></td>
                  <td><span className="row-title">{s.customer?.businessName || '—'}</span></td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(s.saleDate)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{formatCurrency(s.netTotal)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--green-ok)' }}>{formatCurrency(s.paidAmount)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: s.remainingAmount > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>{formatCurrency(s.remainingAmount)}</span></td>
                  <td><span className="pill pill-steel" style={{ fontSize: 11 }}>{s.paymentMethod}</span></td>
                  <td>{statusPill(s.paymentStatus)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="ab-btn ab-btn-icon" title="View Invoice" onClick={() => navigate(`/sales/${s.id}`)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(s.id, s.invoiceNumber)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
