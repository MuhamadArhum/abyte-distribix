import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchasesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Purchase } from '@/types';

const today = new Date().toISOString().split('T')[0];

const statusPill = (s: string) => {
  if (s === 'PAID') return <span className="pill pill-green">Paid</span>;
  if (s === 'PARTIAL') return <span className="pill pill-amber">Partial</span>;
  return <span className="pill pill-red">Unpaid</span>;
};

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterProduct, setFilterProduct] = useState('ALL');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [useDateFilter, setUseDateFilter] = useState(false);

  const load = () => {
    setLoading(true);
    purchasesApi.getAll().then((r) => setPurchases(r.data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete purchase ${num}? This cannot be undone.`)) return;
    try { await purchasesApi.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const products = useMemo(() => [...new Set(purchases.map((p) => p.gasProduct?.productName).filter(Boolean))], [purchases]);

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.purchaseNumber.toLowerCase().includes(q) || (p.supplier?.supplierName || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || p.paymentStatus === filterStatus;
      const matchProduct = filterProduct === 'ALL' || p.gasProduct?.productName === filterProduct;
      const pDate = p.purchaseDate?.split('T')[0] || '';
      const matchDate = !useDateFilter || (pDate >= startDate && pDate <= endDate);
      return matchSearch && matchStatus && matchProduct && matchDate;
    });
  }, [purchases, search, filterStatus, filterProduct, startDate, endDate, useDateFilter]);

  // KPIs
  const todayPurchases = purchases.filter((p) => (p.purchaseDate?.split('T')[0] || '') === today);
  const todayTotal = todayPurchases.reduce((s, p) => s + p.netAmount, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = purchases.filter((p) => (p.purchaseDate || '').startsWith(thisMonth)).reduce((s, p) => s + p.netAmount, 0);
  const totalOutstanding = purchases.reduce((s, p) => s + p.remainingAmount, 0);
  const unpaidCount = purchases.filter((p) => p.paymentStatus !== 'PAID').length;

  const filtersActive = search || filterStatus !== 'ALL' || filterProduct !== 'ALL' || useDateFilter;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Purchases</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(todayTotal)}</div>
          <div className="kpi-sub">{todayPurchases.length} orders today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(monthTotal)}</div>
          <div className="kpi-sub">Month-to-date spend</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Outstanding</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--red-risk)' }}>{formatCurrency(totalOutstanding)}</div>
          <div className="kpi-sub">{unpaidCount} unpaid / partial</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Records</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{purchases.length}</div>
          <div className="kpi-sub">All time purchases</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Purchases</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {purchases.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => navigate('/purchases/new')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Purchase
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input
          className="ab-input"
          placeholder="Search purchase # or supplier..."
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
        <select className="ab-input ab-select" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="ALL">All Products</option>
          {products.map((p) => <option key={p} value={p!}>{p}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--steel)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={useDateFilter} onChange={(e) => setUseDateFilter(e.target.checked)} style={{ cursor: 'pointer' }} />
          Date Range
        </label>
        {useDateFilter && (
          <>
            <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
            <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
          </>
        )}
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterProduct('ALL'); setUseDateFilter(false); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No purchases found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Purchase #</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Net Amount</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Remaining</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.purchaseNumber}</span></td>
                  <td><span className="row-title">{p.supplier?.supplierName || '—'}</span></td>
                  <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.gasProduct?.productName || '—'}</span></td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.purchaseDate)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.quantity} {p.unit}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{formatCurrency(p.netAmount)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--green-ok)' }}>{formatCurrency(p.paidAmount)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: p.remainingAmount > 0 ? 'var(--red-risk)' : 'var(--steel)' }}>{formatCurrency(p.remainingAmount)}</span></td>
                  <td>{statusPill(p.paymentStatus)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="ab-btn ab-btn-icon" title="View Detail" onClick={() => navigate(`/purchases/${p.id}`)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(p.id, p.purchaseNumber)}>
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
