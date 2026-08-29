import React, { useEffect, useState, useMemo } from 'react';
import { paymentsApi, customersApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import type { CustomerPayment, Customer } from '@/types';

const METHODS = ['CASH', 'BANK', 'CHEQUE', 'ONLINE'];
const today = new Date().toISOString().split('T')[0];

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentNumber: `CPAY-${Date.now()}`, customerId: '',
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
      const [p, c] = await Promise.all([paymentsApi.getCustomerPayments(), customersApi.getAll()]);
      setPayments(p.data); setCustomers(c.data);
    } catch { alert('Failed to load payments'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.customerId || !form.amount) { alert('Customer and amount required'); return; }
    setSaving(true);
    try {
      await paymentsApi.createCustomerPayment(form);
      setShowForm(false);
      setForm({ paymentNumber: `CPAY-${Date.now()}`, customerId: '', paymentDate: today, amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
      const res = await paymentsApi.getCustomerPayments();
      setPayments(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.paymentNumber.toLowerCase().includes(q) || (p.customer?.businessName || '').toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q);
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
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Collections</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(todayTotal)}</div>
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
          <div className="kpi-top"><span className="kpi-label">Total Customers</span></div>
          <div className="kpi-value">{customers.length}</div>
          <div className="kpi-sub">Active accounts</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Customer Payments</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {payments.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Payment
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search payment # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
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
                  <th>Customer</th>
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
                    <td><span className="row-title">{p.customer?.businessName || '—'}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.paymentDate)}</span></td>
                    <td><span className="pill pill-steel">{p.paymentMethod}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.reference || '—'}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.notes || '—'}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--green-ok)' }}>{formatCurrency(p.amount)}</span></td>
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
              <span className="ab-modal-title">Record Customer Payment</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={form.paymentNumber} onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Customer *</label>
                  <select className="ab-input ab-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName} — Balance: {formatCurrency(c.currentBalance)}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Reference</label><input className="ab-input" placeholder="Cheque no / transaction ID" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                <div><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
