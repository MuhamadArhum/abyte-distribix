import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { deliveriesApi, customersApi, driversApi, vehiclesApi } from '@/lib/api';
import { Delivery, Customer, Driver, Vehicle } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'warning', IN_TRANSIT: 'info', DELIVERED: 'success', FAILED: 'danger', CANCELLED: 'secondary',
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDelivery, setEditDelivery] = useState<Delivery | null>(null);
  const emptyForm = { deliveryNumber: '', customerId: '', driverId: '', vehicleId: '', deliveryDate: '', status: 'PENDING', address: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const [dRes, cRes, drRes, vRes] = await Promise.all([
        deliveriesApi.getAll(), customersApi.getAll(), driversApi.getAll(), vehiclesApi.getAll(),
      ]);
      setDeliveries(dRes.data); setCustomers(cRes.data); setDrivers(drRes.data); setVehicles(vRes.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, driverId: form.driverId || null, vehicleId: form.vehicleId || null };
      if (editDelivery) { await deliveriesApi.update(editDelivery.id, payload); toast.success('Delivery updated'); }
      else { await deliveriesApi.create(payload); toast.success('Delivery created'); }
      setShowForm(false); setEditDelivery(null); setForm(emptyForm); load();
    } catch { toast.error('Operation failed'); }
  };

  const handleEdit = (d: Delivery) => {
    setEditDelivery(d);
    setForm({ deliveryNumber: d.deliveryNumber, customerId: d.customerId, driverId: d.driverId || '', vehicleId: d.vehicleId || '', deliveryDate: d.deliveryDate.split('T')[0], status: d.status, address: d.address || '', notes: d.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this delivery?')) return;
    try { await deliveriesApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Deliveries" description="Track cylinder deliveries to customers" action={
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditDelivery(null); setForm(emptyForm); }}>
          + New Delivery
        </button>
      } />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>{editDelivery ? 'Edit Delivery' : 'New Delivery'}</h3></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Delivery Number *</label>
                  <input className="form-input" value={form.deliveryNumber} onChange={e => setForm(f => ({ ...f, deliveryNumber: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Customer *</label>
                  <select className="form-input" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Driver</label>
                  <select className="form-input" value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}>
                    <option value="">Select driver...</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle</label>
                  <select className="form-input" value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}>
                    <option value="">Select vehicle...</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleType})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Date *</label>
                  <input type="date" className="form-input" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDING">Pending</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FAILED">Failed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Delivery Address</label>
                  <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Notes</label>
                  <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading-state">Loading...</div> : (
            <table className="data-table">
              <thead>
                <tr><th>No.</th><th>Customer</th><th>Driver</th><th>Vehicle</th><th>Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td><code>{d.deliveryNumber}</code></td>
                    <td>{d.customer?.businessName}</td>
                    <td>{d.driver?.fullName || '—'}</td>
                    <td>{d.vehicle?.vehicleNumber || '—'}</td>
                    <td>{formatDate(d.deliveryDate)}</td>
                    <td><span className={`badge badge-${STATUS_COLORS[d.status] || 'secondary'}`}>{d.status.replace('_', ' ')}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(d)}>Edit</button>
                      {' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {deliveries.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No deliveries found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
