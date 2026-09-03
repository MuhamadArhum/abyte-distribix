import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { vehiclesApi } from '@/lib/api';
import { Vehicle } from '@/types';
import { toast } from 'sonner';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ vehicleCode: '', vehicleNumber: '', vehicleType: 'TRUCK', capacity: 0, status: 'ACTIVE' });

  const load = async () => {
    try { const res = await vehiclesApi.getAll(); setVehicles(res.data); }
    catch { toast.error('Failed to load vehicles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editVehicle) { await vehiclesApi.update(editVehicle.id, form); toast.success('Vehicle updated'); }
      else { await vehiclesApi.create(form); toast.success('Vehicle created'); }
      setShowForm(false); setEditVehicle(null);
      setForm({ vehicleCode: '', vehicleNumber: '', vehicleType: 'TRUCK', capacity: 0, status: 'ACTIVE' });
      load();
    } catch { toast.error('Operation failed'); }
  };

  const handleEdit = (v: Vehicle) => {
    setEditVehicle(v);
    setForm({ vehicleCode: v.vehicleCode, vehicleNumber: v.vehicleNumber, vehicleType: v.vehicleType, capacity: v.capacity, status: v.status });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle?')) return;
    try { await vehiclesApi.delete(id); toast.success('Vehicle deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Vehicles" description="Manage delivery vehicles" action={
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditVehicle(null); setForm({ vehicleCode: '', vehicleNumber: '', vehicleType: 'TRUCK', capacity: 0, status: 'ACTIVE' }); }}>
          + Add Vehicle
        </button>
      } />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>{editVehicle ? 'Edit Vehicle' : 'New Vehicle'}</h3></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Vehicle Code *</label>
                  <input className="form-input" value={form.vehicleCode} onChange={e => setForm(f => ({ ...f, vehicleCode: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Vehicle Number *</label>
                  <input className="form-input" placeholder="e.g. ABC-123" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="form-input" value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}>
                    <option value="TRUCK">Truck</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="VAN">Van</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Capacity (cylinders)</label>
                  <input type="number" className="form-input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Vehicle</button>
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
                <tr><th>Code</th><th>Number</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><code>{v.vehicleCode}</code></td>
                    <td>{v.vehicleNumber}</td>
                    <td>{v.vehicleType}</td>
                    <td>{v.capacity}</td>
                    <td><span className={`badge badge-${v.status === 'ACTIVE' ? 'success' : v.status === 'MAINTENANCE' ? 'warning' : 'secondary'}`}>{v.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(v)}>Edit</button>
                      {' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(v.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {vehicles.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No vehicles found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
