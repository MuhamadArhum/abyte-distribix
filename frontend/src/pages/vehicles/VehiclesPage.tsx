import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesApi } from '@/lib/api';
import { Vehicle } from '@/types';
import { toast } from 'sonner';
import Pagination from '@/components/shared/Pagination';

const VEHICLE_TYPES = ['TRUCK', 'PICKUP', 'VAN'];
const EMPTY_FORM = { vehicleCode: '', vehicleNumber: '', vehicleType: 'TRUCK', capacity: 0, status: 'ACTIVE' };

interface Summary { total: number; active: number; maintenance: number; inactive: number }

export default function VehiclesPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
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
      const r = await vehiclesApi.getAll({ search: search || undefined, status: filterStatus !== 'ALL' ? filterStatus : undefined, page, limit: pageSize });
      setVehicles(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load vehicles'); }
    finally { setLoading(false); }
  };

  const loadSummary = () => {
    vehiclesApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setEditVehicle(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (v: Vehicle) => {
    setEditVehicle(v);
    setForm({ vehicleCode: v.vehicleCode, vehicleNumber: v.vehicleNumber, vehicleType: v.vehicleType, capacity: v.capacity, status: v.status });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.vehicleCode || !form.vehicleNumber) { alert('Code and Number required'); return; }
    setSaving(true);
    try {
      if (editVehicle) { await vehiclesApi.update(editVehicle.id, form); toast.success('Vehicle updated'); }
      else { await vehiclesApi.create(form); toast.success('Vehicle created'); }
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try { await vehiclesApi.delete(id); toast.success('Vehicle deleted'); refreshAfterMutation(); }
    catch { toast.error('Delete failed'); }
  };

  const filtersActive = search || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Vehicles</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{summary?.active ?? '—'} active</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Active</span></div>
          <div className="kpi-value">{summary?.active ?? '—'}</div>
          <div className="kpi-sub">Available for delivery</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Maintenance</span></div>
          <div className="kpi-value">{summary?.maintenance ?? '—'}</div>
          <div className="kpi-sub">Out of service</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{summary?.inactive ?? '—'}</div>
          <div className="kpi-sub">Not in use</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Vehicles</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Vehicle
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by number, code, type..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="MAINTENANCE">Maintenance</option>
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
        ) : vehicles.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No vehicles found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Number</th><th>Type</th><th style={{ textAlign: 'right' }}>Capacity</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{v.vehicleCode}</span></td>
                    <td><span className="row-title" style={{ cursor: 'pointer' }} onClick={() => navigate(`/vehicles/${v.id}`)}>{v.vehicleNumber}</span></td>
                    <td><span className="pill pill-steel">{v.vehicleType}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{v.capacity}</span></td>
                    <td><span className={`pill ${v.status === 'ACTIVE' ? 'pill-green' : v.status === 'MAINTENANCE' ? 'pill-amber' : 'pill-steel'}`}>{v.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="View Detail" onClick={() => navigate(`/vehicles/${v.id}`)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(v)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(v.id)}>
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
        {!loading && vehicles.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Vehicle Code *</label><input className="ab-input" value={form.vehicleCode} onChange={(e) => setForm({ ...form, vehicleCode: e.target.value })} /></div>
                <div><label className="ab-label">Vehicle Number *</label><input className="ab-input" placeholder="e.g. ABC-123" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} /></div>
                <div>
                  <label className="ab-label">Type</label>
                  <select className="ab-input ab-select" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Capacity (cylinders)</label><input className="ab-input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                <div className="span-2">
                  <label className="ab-label">Status</label>
                  <select className="ab-input ab-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editVehicle ? 'Update Vehicle' : 'Save Vehicle'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
