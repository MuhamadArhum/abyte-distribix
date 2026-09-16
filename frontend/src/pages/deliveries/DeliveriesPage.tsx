import React, { useEffect, useState } from 'react';
import { deliveriesApi, customersApi, driversApi, vehiclesApi } from '@/lib/api';
import { Delivery, Customer, Driver, Vehicle } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import { SearchPicker } from '@/components/shared/SearchPicker';

const STATUSES = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'];
const STATUS_PILL: Record<string, string> = {
  PENDING: 'pill-steel', IN_TRANSIT: 'pill-blue', DELIVERED: 'pill-green', FAILED: 'pill-red', CANCELLED: 'pill-amber',
};
const EMPTY_FORM = { deliveryNumber: `DEL-${Date.now()}`, customerId: '', driverId: '', vehicleId: '', deliveryDate: new Date().toISOString().split('T')[0], status: 'PENDING', address: '', notes: '' };

interface Summary { total: number; byStatus: Record<string, number> }

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customerLabel, setCustomerLabel] = useState('');
  const [driverLabel, setDriverLabel] = useState('');
  const [vehicleLabel, setVehicleLabel] = useState('');

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
      const r = await deliveriesApi.getAll({ search: search || undefined, status: filterStatus !== 'ALL' ? filterStatus : undefined, page, limit: pageSize });
      setDeliveries(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const loadSummary = () => {
    deliveriesApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => {
    setEditDelivery(null); setForm({ ...EMPTY_FORM, deliveryNumber: `DEL-${Date.now()}` });
    setCustomerLabel(''); setDriverLabel(''); setVehicleLabel('');
    setShowForm(true);
  };

  const openEdit = (d: Delivery) => {
    setEditDelivery(d);
    setForm({ deliveryNumber: d.deliveryNumber, customerId: d.customerId, driverId: d.driverId || '', vehicleId: d.vehicleId || '', deliveryDate: d.deliveryDate.split('T')[0], status: d.status, address: d.address || '', notes: d.notes || '' });
    setCustomerLabel(d.customer?.businessName || '');
    setDriverLabel(d.driver?.fullName || '');
    setVehicleLabel(d.vehicle ? `${d.vehicle.vehicleNumber} (${d.vehicle.vehicleType})` : '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.deliveryNumber || !form.customerId || !form.deliveryDate) { alert('Delivery number, customer, and date are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, driverId: form.driverId || null, vehicleId: form.vehicleId || null };
      if (editDelivery) { await deliveriesApi.update(editDelivery.id, payload); toast.success('Delivery updated'); }
      else { await deliveriesApi.create(payload); toast.success('Delivery created'); }
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete delivery ${num}?`)) return;
    try { await deliveriesApi.delete(id); toast.success('Deleted'); refreshAfterMutation(); }
    catch { toast.error('Delete failed'); }
  };

  const filtersActive = search || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Deliveries</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">All records</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">In Transit</span></div>
          <div className="kpi-value">{summary?.byStatus?.IN_TRANSIT ?? 0}</div>
          <div className="kpi-sub">On the road</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Delivered</span></div>
          <div className="kpi-value">{summary?.byStatus?.DELIVERED ?? 0}</div>
          <div className="kpi-sub">Completed</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Failed</span></div>
          <div className="kpi-value">{summary?.byStatus?.FAILED ?? 0}</div>
          <div className="kpi-sub">Needs follow-up</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Deliveries</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching · track cylinder deliveries to customers</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Delivery
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by delivery #, customer..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
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
        ) : deliveries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No deliveries found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>No.</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{d.deliveryNumber}</span></td>
                    <td><span className="row-title">{d.customer?.businessName || '—'}</span></td>
                    <td>{d.driver?.fullName || '—'}</td>
                    <td>{d.vehicle?.vehicleNumber || '—'}</td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(d.deliveryDate)}</span></td>
                    <td><span className={`pill ${STATUS_PILL[d.status] || 'pill-steel'}`}>{d.status.replace('_', ' ')}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(d)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(d.id, d.deliveryNumber)}>
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
        {!loading && deliveries.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editDelivery ? 'Edit Delivery' : 'New Delivery'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Delivery Number *</label><input className="ab-input" value={form.deliveryNumber} onChange={(e) => setForm({ ...form, deliveryNumber: e.target.value })} /></div>
                <div><label className="ab-label">Delivery Date *</label><input className="ab-input" type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Customer *</label>
                  <SearchPicker<Customer>
                    value={form.customerId}
                    valueLabel={customerLabel}
                    placeholder="Type customer name..."
                    search={(q) => customersApi.getAll({ search: q, page: 1, limit: 8 }).then((r) => r.data.data)}
                    onSelect={(c) => { setForm({ ...form, customerId: c.id }); setCustomerLabel(c.businessName); }}
                    renderOption={(c) => (
                      <div>
                        <div className="row-title">{c.businessName}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{c.customerCode}</div>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className="ab-label">Driver</label>
                  <SearchPicker<Driver>
                    value={form.driverId}
                    valueLabel={driverLabel}
                    placeholder="Type driver name..."
                    search={(q) => driversApi.getAll({ search: q, page: 1, limit: 8 }).then((r) => r.data.data)}
                    onSelect={(dr) => { setForm({ ...form, driverId: dr.id }); setDriverLabel(dr.fullName); }}
                    renderOption={(dr) => <div className="row-title">{dr.fullName}</div>}
                  />
                </div>
                <div>
                  <label className="ab-label">Vehicle</label>
                  <SearchPicker<Vehicle>
                    value={form.vehicleId}
                    valueLabel={vehicleLabel}
                    placeholder="Type vehicle number..."
                    search={(q) => vehiclesApi.getAll({ search: q, page: 1, limit: 8 }).then((r) => r.data.data)}
                    onSelect={(v) => { setForm({ ...form, vehicleId: v.id }); setVehicleLabel(`${v.vehicleNumber} (${v.vehicleType})`); }}
                    renderOption={(v) => (
                      <div>
                        <div className="row-title">{v.vehicleNumber}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{v.vehicleType}</div>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className="ab-label">Status</label>
                  <select className="ab-input ab-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="span-2"><label className="ab-label">Delivery Address</label><input className="ab-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="span-2"><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editDelivery ? 'Update Delivery' : 'Save Delivery'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
