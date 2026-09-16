import React, { useEffect, useState } from 'react';
import { paymentsApi, customersApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import { SearchPicker } from '@/components/shared/SearchPicker';
import type { CustomerPayment, Customer } from '@/types';

const METHODS = ['CASH', 'BANK', 'CHEQUE', 'ONLINE'];
const EMPTY_FORM = { paymentNumber: `CPAY-${Date.now()}`, customerId: '', paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', reference: '', notes: '' };

interface Summary { total: number; todayTotal: number; todayCount: number; allTotal: number }

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customerLabel, setCustomerLabel] = useState('');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterMethod, startDate, endDate]);
  useEffect(() => { load(); }, [search, filterMethod, startDate, endDate, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await paymentsApi.getCustomerPayments({
        search: search || undefined,
        method: filterMethod !== 'ALL' ? filterMethod : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page, limit: pageSize,
      });
      setPayments(r.data.data); setTotal(r.data.total);
    } catch { alert('Failed to load payments'); } finally { setLoading(false); }
  };

  const loadSummary = () => {
    paymentsApi.getCustomerPaymentsSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setForm({ ...EMPTY_FORM, paymentNumber: `CPAY-${Date.now()}` }); setCustomerLabel(''); setShowForm(true); };

  const handleSave = async () => {
    if (!form.customerId || !form.amount) { alert('Customer and amount required'); return; }
    setSaving(true);
    try {
      await paymentsApi.createCustomerPayment(form);
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete payment ${num}? This will restore the customer's balance and reverse the cash/bank entry.`)) return;
    try { await paymentsApi.deleteCustomerPayment(id); refreshAfterMutation(); } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const filtersActive = search || filterMethod !== 'ALL' || startDate || endDate;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Collections</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(summary?.todayTotal ?? 0)}</div>
          <div className="kpi-sub">{summary?.todayCount ?? 0} payments today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Matching Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}</div>
          <div className="kpi-sub">This page ({payments.length} rows)</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">All-Time Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.allTotal ?? 0)}</div>
          <div className="kpi-sub">{summary?.total ?? '—'} total payments</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Matching</span></div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-sub">Under current filters</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Customer Payments</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Payment
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search payment # or customer..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Methods</option>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterMethod('ALL'); setStartDate(''); setEndDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : payments.length === 0 ? (
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.paymentNumber}</span></td>
                    <td><span className="row-title">{p.customer?.businessName || '—'}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.paymentDate)}</span></td>
                    <td><span className="pill pill-steel">{p.paymentMethod}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.reference || '—'}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{p.notes || '—'}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--green-ok)' }}>{formatCurrency(p.amount)}</span></td>
                    <td>
                      <button className="ab-btn ab-btn-icon danger" title="Delete / void" onClick={() => handleDelete(p.id, p.paymentNumber)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && payments.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
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
                  <SearchPicker<Customer>
                    value={form.customerId}
                    valueLabel={customerLabel}
                    placeholder="Type customer name..."
                    search={(q) => customersApi.getAll({ search: q, page: 1, limit: 8 }).then((r) => r.data.data)}
                    onSelect={(c) => { setForm({ ...form, customerId: c.id }); setCustomerLabel(`${c.businessName} — Balance: ${formatCurrency(c.currentBalance)}`); }}
                    renderOption={(c) => (
                      <div>
                        <div className="row-title">{c.businessName}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>Balance: {formatCurrency(c.currentBalance)}</div>
                      </div>
                    )}
                  />
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
