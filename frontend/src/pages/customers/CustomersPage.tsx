import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersApi } from '@/lib/api';
import Pagination from '@/components/shared/Pagination';
import { formatCurrency } from '@/lib/utils';
import type { Customer } from '@/types';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';

const CUSTOMER_TYPES = ['RETAIL', 'DEALER', 'COMMERCIAL', 'INDIVIDUAL'];
const EMPTY_FORM = { customerCode: '', businessName: '', contactPerson: '', phone: '', email: '', address: '', customerType: 'RETAIL', creditLimit: 0, openingBalance: 0, paymentTerms: 30 };

interface Summary { total: number; active: number; inactive: number; totalReceivables: number; overdue: number }

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Server-side filters — the customer list is fetched page-by-page instead
  // of loading the full table (10k+ rows) into the browser every time.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterBalance, setFilterBalance] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Debounce the free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change re-starts pagination from page 1.
  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, filterBalance]);

  useEffect(() => { load(); }, [search, filterType, filterStatus, filterBalance, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await customersApi.getAll({
        search: search || undefined,
        customerType: filterType !== 'ALL' ? filterType : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        balance: filterBalance !== 'ALL' ? filterBalance : undefined,
        page, limit: pageSize,
      });
      setCustomers(r.data.data);
      setTotal(r.data.total);
    } catch { alert('Failed to load customers'); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const r = await customersApi.getSummary(); setSummary(r.data); } catch { /* KPI row just stays blank */ }
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ customerCode: c.customerCode, businessName: c.businessName, contactPerson: c.contactPerson || '', phone: c.phone, email: c.email || '', address: c.address || '', customerType: c.customerType, creditLimit: c.creditLimit, openingBalance: c.openingBalance, paymentTerms: c.paymentTerms });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customerCode || !form.businessName || !form.phone) { alert('Code, Name and Phone required'); return; }
    setSaving(true);
    try {
      // Same phone number often means the same person was already entered
      // under a different business name — worth a heads-up at 10k+ customers.
      const dupCheck = await customersApi.getAll({ search: form.phone, limit: 5 });
      const dupe = (dupCheck.data.data as Customer[] || []).find((c) => c.phone === form.phone && c.id !== editId);
      if (dupe && !confirm(`Phone ${form.phone} is already used by "${dupe.businessName}" (${dupe.customerCode}). Save anyway?`)) {
        setSaving(false); return;
      }
      if (editId) await customersApi.update(editId, form);
      else await customersApi.create(form);
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try { await customersApi.delete(id); refreshAfterMutation(); }
    catch { alert('Failed to delete'); }
  };

  const handleToggleStatus = async (c: Customer) => {
    try { await customersApi.update(c.id, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); refreshAfterMutation(); }
    catch { alert('Failed to update status'); }
  };

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'customerCode', header: 'Code',
      cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.customerCode}</span>,
    },
    {
      accessorKey: 'businessName', header: 'Business',
      cell: ({ row }) => (
        <div>
          <div className="row-title">{row.original.businessName}</div>
          {row.original.contactPerson && <div className="row-sub">{row.original.contactPerson}</div>}
        </div>
      ),
    },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.phone}</span> },
    { accessorKey: 'customerType', header: 'Type', cell: ({ row }) => <span className="pill pill-steel">{row.original.customerType}</span> },
    { accessorKey: 'creditLimit', header: 'Credit Limit', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--steel)' }}>{formatCurrency(row.original.creditLimit)}</span> },
    {
      accessorKey: 'currentBalance', header: 'Balance',
      cell: ({ row }) => {
        const over = row.original.currentBalance > row.original.creditLimit;
        return (
          <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: over ? 'var(--red-risk)' : row.original.currentBalance > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>
            {formatCurrency(row.original.currentBalance)}
            {over && <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--red-risk)' }}>▲ LIMIT</span>}
          </span>
        );
      },
    },
    { accessorKey: 'paymentTerms', header: 'Terms', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.paymentTerms}d</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className={`pill ${row.original.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{row.original.status}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="row-actions">
          <button className="ab-btn ab-btn-icon" title="View Detail" onClick={() => navigate(`/customers/${row.original.id}`)}>
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

  // Table is rendered manually (not via the shared DataTable) because that
  // component paginates a fully-loaded array client-side — wrong once the
  // server itself is only sending one page of rows.
  const table = useReactTable({ data: customers, columns, getCoreRowModel: getCoreRowModel() });

  const hasFilters = search || filterType !== 'ALL' || filterStatus !== 'ALL' || filterBalance !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Customers</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{summary?.active ?? '—'} active</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Total Receivables</span></div>
          <div className="kpi-value">{formatCurrency(summary?.totalReceivables ?? 0)}</div>
          <div className="kpi-sub">Outstanding balance</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Overdue</span></div>
          <div className="kpi-value">{summary?.overdue ?? '—'}</div>
          <div className="kpi-sub">Exceeded credit limit</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{summary?.inactive ?? '—'}</div>
          <div className="kpi-sub">Inactive accounts</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Customers</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input
          className="ab-input"
          placeholder="Search by name, code, phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ flex: '1 1 220px', minWidth: 180 }}
        />
        <select className="ab-input ab-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Types</option>
          {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="ab-input ab-select" value={filterBalance} onChange={(e) => setFilterBalance(e.target.value)} style={{ flex: '0 0 180px' }}>
          <option value="ALL">All Balances</option>
          <option value="HAS_BALANCE">Has Balance</option>
          <option value="OVERDUE">Overdue (Over Limit)</option>
          <option value="CLEAR">Clear (Zero Balance)</option>
        </select>
        {hasFilters && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterType('ALL'); setFilterStatus('ALL'); setFilterBalance('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((header) => (
                        <th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 18px', color: 'var(--steel)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Customer' : 'Add Customer'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Customer Code *</label><input className="ab-input" placeholder="CUST-001" value={form.customerCode} onChange={(e) => setForm({ ...form, customerCode: e.target.value })} /></div>
                <div><label className="ab-label">Business Name *</label><input className="ab-input" placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
                <div><label className="ab-label">Contact Person</label><input className="ab-input" placeholder="Name" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div><label className="ab-label">Phone *</label><input className="ab-input" placeholder="0300-0000000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="ab-label">Email</label><input className="ab-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <label className="ab-label">Customer Type</label>
                  <select className="ab-input ab-select" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
                    {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Credit Limit (PKR)</label><input className="ab-input" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Payment Terms (days)</label><input className="ab-input" type="number" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: Number(e.target.value) })} /></div>
                {!editId && <div><label className="ab-label">Opening Balance (PKR)</label><input className="ab-input" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} /></div>}
                <div className={editId ? 'span-2' : ''}><label className="ab-label">Address</label><input className="ab-input" placeholder="Full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Customer' : 'Save Customer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
