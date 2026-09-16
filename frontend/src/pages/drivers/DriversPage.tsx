import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { driversApi } from '@/lib/api';
import { Driver } from '@/types';
import { toast } from 'sonner';
import Pagination from '@/components/shared/Pagination';

const EMPTY_FORM = { driverCode: '', fullName: '', phone: '', licenseNumber: '', address: '', status: 'ACTIVE' };

interface Summary { total: number; active: number; inactive: number }

export default function DriversPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterStatus]);
  useEffect(() => { load(); }, [search, filterStatus, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await driversApi.getAll({ search: search || undefined, status: filterStatus !== 'ALL' ? filterStatus : undefined, page, limit: pageSize });
      setDrivers(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  };

  const loadSummary = () => {
    driversApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setEditDriver(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (d: Driver) => {
    setEditDriver(d);
    setForm({ driverCode: d.driverCode, fullName: d.fullName, phone: d.phone, licenseNumber: d.licenseNumber || '', address: d.address || '', status: d.status });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.driverCode || !form.fullName || !form.phone) { alert('Code, Name and Phone required'); return; }
    setSaving(true);
    try {
      if (editDriver) { await driversApi.update(editDriver.id, form); toast.success('Driver updated'); }
      else { await driversApi.create(form); toast.success('Driver created'); }
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this driver?')) return;
    try { await driversApi.delete(id); toast.success('Driver deleted'); refreshAfterMutation(); }
    catch { toast.error('Delete failed'); }
  };

  const handleToggleStatus = async (d: Driver) => {
    try { await driversApi.update(d.id, { status: d.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); refreshAfterMutation(); }
    catch { toast.error('Failed to update status'); }
  };

  const filtersActive = search || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Drivers</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{summary?.active ?? '—'} active</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Active</span></div>
          <div className="kpi-value">{summary?.active ?? '—'}</div>
          <div className="kpi-sub">Available for delivery</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{summary?.inactive ?? '—'}</div>
          <div className="kpi-sub">Not currently active</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Drivers</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Driver
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by name, code, phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterStatus('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : drivers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No drivers found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Phone</th><th>License</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{d.driverCode}</span></td>
                    <td><span className="row-title" style={{ cursor: 'pointer' }} onClick={() => navigate(`/drivers/${d.id}`)}>{d.fullName}</span></td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{d.phone}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{d.licenseNumber || '—'}</span></td>
                    <td><span className={`pill ${d.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{d.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="View Detail" onClick={() => navigate(`/drivers/${d.id}`)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(d)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon" title={d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(d)} style={{ color: d.status === 'ACTIVE' ? 'var(--amber-warn)' : 'var(--green-ok)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(d.id)}>
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
        {!loading && drivers.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editDriver ? 'Edit Driver' : 'Add Driver'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Driver Code *</label><input className="ab-input" value={form.driverCode} onChange={(e) => setForm({ ...form, driverCode: e.target.value })} /></div>
                <div><label className="ab-label">Full Name *</label><input className="ab-input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
                <div><label className="ab-label">Phone *</label><input className="ab-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><label className="ab-label">License Number</label><input className="ab-input" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
                <div className="span-2"><label className="ab-label">Address</label><input className="ab-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div>
                  <label className="ab-label">Status</label>
                  <select className="ab-input ab-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editDriver ? 'Update Driver' : 'Save Driver'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
