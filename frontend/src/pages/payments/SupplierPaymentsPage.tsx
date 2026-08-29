import React, { useEffect, useState, useMemo } from 'react';
import { paymentsApi, suppliersApi, purchasesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import type { SupplierPayment, Supplier, Purchase } from '@/types';

const METHODS = ['CASH', 'BANK', 'CHEQUE'];
const today = new Date().toISOString().split('T')[0];

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentNumber: `SPAY-${Date.now()}`, supplierId: '', purchaseId: '',
    paymentDate: today,
    amount: 0, paymentMethod: 'CASH', reference: '', notes: '',
  });

  // Filters
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [p, s, pur] = await Promise.all([paymentsApi.getSupplierPayments(), suppliersApi.getAll(), purchasesApi.getAll()]);
      setPayments(p.data); setSuppliers(s.data); setPurchases(pur.data);
    } catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.supplierId || !form.amount) { alert('Supplier and amount required'); return; }
    setSaving(true);
    try {
      await paymentsApi.createSupplierPayment(form);
      setShowForm(false);
      setForm({ paymentNumber: `SPAY-${Date.now()}`, supplierId: '', purchaseId: '', paymentDate: today, amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
      const res = await paymentsApi.getSupplierPayments();
      setPayments(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const supplierPurchases = purchases.filter((p) => p.supplierId === form.supplierId && p.paymentStatus !== 'PAID');

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.paymentNumber.toLowerCase().includes(q) || (p.supplier?.supplierName || '').toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q);
      const matchMethod = filterMethod === 'ALL' || p.paymentMethod === filterMethod;
      const pDate = (p.paymentDate || '').split('T')[0];
      const matchDate = pDate >= startDate && pDate <= endDate;
      return matchSearch && matchMethod && matchDate;
    });
  }, [payments, search, filterMethod, startDate, endDate]);

  // KPIs
  const todayTotal = payments.filter((p) => (p.paymentDate || '').split('T')[0] === today).reduce((s, p) => s + p.amount, 0);
  const todayCount = payments.filter((p) => (p.paymentDate || '').split('T')[0] === today).length;
  const allTotal = payments.reduce((s, p) => s + p.amount, 0);
  const filteredTotal = filtered.reduce((s, p) => s + p.amount, 0);
  const filtersActive = search || filterMethod !== 'ALL' || startDate !== today || endDate !== today;

  const { paged, page, pageSize, setPage, setPageSize } = usePagination(filtered);

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Today's Payments</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(todayTotal)}</div>
          <div className="kpi-sub">{todayCount} payments today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Filtered Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(filteredTotal)}</div>
          <div className="kpi-sub">{filtered.length} records shown</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">All-Time Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(allTotal)}</div>
          <div className="kpi-sub">{payments.length} total payments</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Suppliers</span></div>
          <div className="kpi-value">{suppliers.length}</div>
          <div className="kpi-sub">Active suppliers</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Supplier Payments</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {payments.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Payment
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search payment # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Methods</option>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterMethod('ALL'); setStartDate(today); setEndDate(today); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No payments found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.paymentNumber}</span></td>
                    <td><span className="row-title">{p.supplier?.supplierName || '—'}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.paymentDate)}</span></td>
                    <td><span className="pill pill-steel">{p.paymentMethod}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.reference || '—'}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.notes || '—'}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--blueprint)' }}>{formatCurrency(p.amount)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Supplier Payment</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={form.paymentNumber} onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Supplier *</label>
                  <select className="ab-input ab-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value, purchaseId: '' })}>
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName} — Balance: {formatCurrency(s.currentBalance)}</option>)}
                  </select>
                </div>
                {form.supplierId && supplierPurchases.length > 0 && (
                  <div className="span-2">
                    <label className="ab-label">Against Purchase (Optional)</label>
                    <select className="ab-input ab-select" value={form.purchaseId} onChange={(e) => setForm({ ...form, purchaseId: e.target.value })}>
                      <option value="">Select purchase (optional)</option>
                      {supplierPurchases.map((p) => <option key={p.id} value={p.id}>{p.purchaseNumber} — Remaining: {formatCurrency(p.remainingAmount)}</option>)}
                    </select>
                  </div>
                )}
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="span-2"><label className="ab-label">Reference</label><input className="ab-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
