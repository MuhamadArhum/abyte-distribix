import React, { useEffect, useState } from 'react';
import { expensesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import type { Expense } from '@/types';

const CATEGORIES = ['TRANSPORTATION','FUEL','SALARIES','ELECTRICITY','RENT','MAINTENANCE','LOADING_UNLOADING','CYLINDER_REPAIR','OFFICE','OTHER'];
const METHODS = ['CASH','BANK','CHEQUE','ONLINE'];
const EMPTY_FORM = () => ({ expenseNumber: `EXP-${Date.now()}`, category: 'OTHER', expenseDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', description: '' });

interface Summary { total: number; todayTotal: number; monthTotal: number; allTotal: number; topCategory: { category: string; total: number } | null }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM());

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterCategory, filterMethod, startDate, endDate]);
  useEffect(() => { load(); }, [search, filterCategory, filterMethod, startDate, endDate, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await expensesApi.getAll({
        search: search || undefined,
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        method: filterMethod !== 'ALL' ? filterMethod : undefined,
        from: startDate || undefined,
        to: endDate || undefined,
        page, limit: pageSize,
      });
      setExpenses(r.data.data); setTotal(r.data.total);
    } catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const loadSummary = () => {
    expensesApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM()); setShowForm(true); };
  const openEdit = (e: Expense) => {
    setEditId(e.id);
    setForm({ expenseNumber: e.expenseNumber, category: e.category, expenseDate: e.expenseDate?.split('T')[0] || '', amount: e.amount, paymentMethod: e.paymentMethod, description: e.description || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.amount) { alert('Amount required'); return; }
    setSaving(true);
    try {
      if (editId) await expensesApi.update(editId, form);
      else await expensesApi.create(form);
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense? The cash/bank book entry it created will be reversed.')) return;
    try { await expensesApi.delete(id); refreshAfterMutation(); } catch { alert('Failed'); }
  };

  const filtersActive = search || filterCategory !== 'ALL' || filterMethod !== 'ALL' || startDate || endDate;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Today's Expenses</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.todayTotal ?? 0)}</div>
          <div className="kpi-sub">Today's spend</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.monthTotal ?? 0)}</div>
          <div className="kpi-sub">{new Date().toLocaleString('default', { month: 'long' })}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Top Category</span></div>
          <div className="kpi-value" style={{ fontSize: 14, paddingTop: 4 }}>{summary?.topCategory?.category.replace(/_/g, ' ') || '—'}</div>
          <div className="kpi-sub">{formatCurrency(summary?.topCategory?.total || 0)} total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">All-Time Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.allTotal ?? 0)}</div>
          <div className="kpi-sub">{summary?.total ?? '—'} records</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Expenses</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by number or description..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="ALL">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="ab-input ab-select" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={{ flex: '0 0 140px' }}>
          <option value="ALL">All Methods</option>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterCategory('ALL'); setFilterMethod('ALL'); setStartDate(''); setEndDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No expenses found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expense #</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Method</th>
                  <th>Description</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{e.expenseNumber}</span></td>
                    <td><span className="pill pill-steel">{e.category.replace(/_/g, ' ')}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(e.expenseDate)}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: 'var(--red-risk)' }}>{formatCurrency(e.amount)}</span></td>
                    <td><span className="pill pill-steel">{e.paymentMethod}</span></td>
                    <td><span style={{ color: 'var(--steel)', fontSize: 12 }}>{e.description || '—'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(e)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(e.id)}>
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
        {!loading && expenses.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(ev) => ev.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Expense' : 'Record Expense'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Expense Number</label><input className="ab-input" value={form.expenseNumber} onChange={(e) => setForm({ ...form, expenseNumber: e.target.value })} /></div>
                <div><label className="ab-label">Date</label><input className="ab-input" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Category</label>
                  <select className="ab-input ab-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} disabled={!!editId}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="span-2"><label className="ab-label">Description</label><input className="ab-input" placeholder="Details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Expense' : 'Save Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
