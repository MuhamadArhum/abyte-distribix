import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersApi } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import type { Supplier } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

const EMPTY = { supplierCode: '', supplierName: '', contactPerson: '', phone: '', email: '', address: '', taxNtn: '', openingBalance: 0, paymentTerms: 30 };

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterBalance, setFilterBalance] = useState('ALL');
  const [filterTerms, setFilterTerms] = useState('ALL');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await suppliersApi.getAll(); setSuppliers(r.data); }
    catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const openAdd = () => { setEditId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ supplierCode: s.supplierCode, supplierName: s.supplierName, contactPerson: s.contactPerson || '', phone: s.phone, email: s.email || '', address: s.address || '', taxNtn: s.taxNtn || '', openingBalance: s.openingBalance, paymentTerms: s.paymentTerms });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.supplierCode || !form.supplierName) { alert('Code and Name required'); return; }
    setSaving(true);
    try {
      if (editId) await suppliersApi.update(editId, form);
      else await suppliersApi.create(form);
      setShowForm(false); load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await suppliersApi.delete(id); load(); } catch { alert('Failed'); }
  };

  const handleToggleStatus = async (s: Supplier) => {
    try { await suppliersApi.update(s.id, { status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); load(); }
    catch { alert('Failed to update status'); }
  };

  // Filtered data
  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.supplierName.toLowerCase().includes(q) || s.supplierCode.toLowerCase().includes(q) || s.phone.includes(q) || (s.taxNtn || '').toLowerCase().includes(q) || (s.contactPerson || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
      const matchBalance =
        filterBalance === 'ALL' ? true :
        filterBalance === 'HAS_BALANCE' ? s.currentBalance > 0 :
        filterBalance === 'CLEAR' ? s.currentBalance === 0 : true;
      const matchTerms = filterTerms === 'ALL' || String(s.paymentTerms) === filterTerms;
      return matchSearch && matchStatus && matchBalance && matchTerms;
    });
  }, [suppliers, search, filterStatus, filterBalance, filterTerms]);

  // KPIs
  const totalPayables = suppliers.reduce((s, sup) => s + (sup.currentBalance > 0 ? sup.currentBalance : 0), 0);
  const withBalance = suppliers.filter((s) => s.currentBalance > 0).length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;

  const columns: ColumnDef<Supplier>[] = [
    { accessorKey: 'supplierCode', header: 'Code', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.supplierCode}</span> },
    {
      accessorKey: 'supplierName', header: 'Supplier',
      cell: ({ row }) => (
        <div>
          <div className="row-title">{row.original.supplierName}</div>
          {row.original.contactPerson && <div className="row-sub">{row.original.contactPerson}</div>}
        </div>
      ),
    },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.phone}</span> },
    { accessorKey: 'taxNtn', header: 'NTN', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--steel)' }}>{row.original.taxNtn || '—'}</span> },
    { accessorKey: 'paymentTerms', header: 'Terms', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.paymentTerms}d</span> },
    {
      accessorKey: 'currentBalance', header: 'Payable',
      cell: ({ row }) => (
        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: row.original.currentBalance > 0 ? 'var(--red-risk)' : 'var(--steel)' }}>
          {formatCurrency(row.original.currentBalance)}
        </span>
      ),
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={`pill ${row.original.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{row.original.status}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="row-actions">
          <button className="ab-btn ab-btn-icon" title="View Detail" onClick={() => navigate(`/suppliers/${row.original.id}`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(row.original)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="ab-btn ab-btn-icon" title={row.original.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(row.original)} style={{ color: row.original.status === 'ACTIVE' ? 'var(--amber-warn)' : 'var(--green-ok)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
          </button>
          <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(row.original.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      ),
    },
  ];

  const filtersActive = search || filterStatus !== 'ALL' || filterBalance !== 'ALL' || filterTerms !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Suppliers</span></div>
          <div className="kpi-value">{suppliers.length}</div>
          <div className="kpi-sub">{activeCount} active</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Total Payables</span></div>
          <div className="kpi-value">{formatCurrency(totalPayables)}</div>
          <div className="kpi-sub">Amount we owe</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Pending Payments</span></div>
          <div className="kpi-value">{withBalance}</div>
          <div className="kpi-sub">Suppliers with balance</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{suppliers.length - activeCount}</div>
          <div className="kpi-sub">Inactive accounts</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Suppliers</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {suppliers.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Supplier
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input
          className="ab-input"
          placeholder="Search by name, code, phone, NTN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 220px', minWidth: 180 }}
        />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="ab-input ab-select" value={filterBalance} onChange={(e) => setFilterBalance(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="ALL">All Balances</option>
          <option value="HAS_BALANCE">Has Payable</option>
          <option value="CLEAR">Clear (Zero)</option>
        </select>
        <select className="ab-input ab-select" value={filterTerms} onChange={(e) => setFilterTerms(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Terms</option>
          <option value="30">30 Days</option>
          <option value="60">60 Days</option>
          <option value="90">90 Days</option>
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterBalance('ALL'); setFilterTerms('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading
          ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
          : <DataTable columns={columns} data={filtered} searchKey="supplierName" searchPlaceholder="" hideSearch />}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Supplier' : 'Add Supplier'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Supplier Code *</label><input className="ab-input" placeholder="SUP-001" value={form.supplierCode} onChange={(e) => setForm({ ...form, supplierCode: e.target.value })} /></div>
                <div><label className="ab-label">Supplier Name *</label><input className="ab-input" placeholder="Company name" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
                <div><label className="ab-label">Contact Person</label><input className="ab-input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div><label className="ab-label">Phone</label><input className="ab-input" placeholder="0300-0000000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="ab-label">Email</label><input className="ab-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><label className="ab-label">NTN / Tax No</label><input className="ab-input" value={form.taxNtn} onChange={(e) => setForm({ ...form, taxNtn: e.target.value })} /></div>
                <div><label className="ab-label">Payment Terms (days)</label><input className="ab-input" type="number" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })} /></div>
                {!editId && <div><label className="ab-label">Opening Balance (PKR)</label><input className="ab-input" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} /></div>}
                <div className={editId ? 'span-2' : ''}><label className="ab-label">Address</label><input className="ab-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Supplier' : 'Save Supplier'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
