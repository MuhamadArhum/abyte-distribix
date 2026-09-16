import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import type { Sale } from '@/types';

const PAYMENT_METHODS = ['CASH', 'CREDIT', 'BANK', 'CHEQUE'];

const statusPill = (s: string) => {
  if (s === 'PAID') return <span className="pill pill-green">Paid</span>;
  if (s === 'PARTIAL') return <span className="pill pill-amber">Partial</span>;
  return <span className="pill pill-red">Unpaid</span>;
};

interface Summary { total: number; todayRevenue: number; todayCount: number; monthRevenue: number; totalOutstanding: number; unpaidCount: number }

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterStatus, filterMethod, startDate, endDate]);
  useEffect(() => { load(); }, [search, filterStatus, filterMethod, startDate, endDate, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = () => {
    setLoading(true);
    salesApi.getAll({
      search: search || undefined,
      status: filterStatus !== 'ALL' ? filterStatus : undefined,
      method: filterMethod !== 'ALL' ? filterMethod : undefined,
      from: startDate || undefined,
      to: endDate || undefined,
      page, limit: pageSize,
    }).then((r) => { setSales(r.data.data); setTotal(r.data.total); })
      .catch(() => alert('Failed to load'))
      .finally(() => setLoading(false));
  };

  const loadSummary = () => {
    salesApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const handleDelete = async (id: string, inv: string) => {
    if (!confirm(`Delete invoice ${inv}? This cannot be undone.`)) return;
    try { await salesApi.delete(id); refreshAfterMutation(); } catch { alert('Failed to delete'); }
  };

  const filtersActive = search || filterStatus !== 'ALL' || filterMethod !== 'ALL' || startDate || endDate;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Revenue</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.todayRevenue ?? 0)}</div>
          <div className="kpi-sub">{summary?.todayCount ?? 0} invoices today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.monthRevenue ?? 0)}</div>
          <div className="kpi-sub">Month-to-date sales</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Outstanding</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--amber-warn)' }}>{formatCurrency(summary?.totalOutstanding ?? 0)}</div>
          <div className="kpi-sub">{summary?.unpaidCount ?? 0} unpaid / partial</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Invoices</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{summary?.total ?? '—'}</div>
          <div className="kpi-sub">All time records</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Sales</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterStatus('ALL'); setFilterMethod('ALL'); setStartDate(''); setEndDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : sales.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No sales found</div>
        ) : (
          <div className="table-scroll">
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
                {sales.map((s) => (
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
          </div>
        )}
        {!loading && sales.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>
    </div>
  );
}
