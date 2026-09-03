import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { driversApi } from '@/lib/api';
import { Driver } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState({ driverCode: '', fullName: '', phone: '', licenseNumber: '', address: '', status: 'ACTIVE' });

  const load = async () => {
    try {
      const res = await driversApi.getAll();
      setDrivers(res.data);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editDriver) {
        await driversApi.update(editDriver.id, form);
        toast.success('Driver updated');
      } else {
        await driversApi.create(form);
        toast.success('Driver created');
      }
      setShowForm(false);
      setEditDriver(null);
      setForm({ driverCode: '', fullName: '', phone: '', licenseNumber: '', address: '', status: 'ACTIVE' });
      load();
    } catch { toast.error('Operation failed'); }
  };

  const handleEdit = (d: Driver) => {
    setEditDriver(d);
    setForm({ driverCode: d.driverCode, fullName: d.fullName, phone: d.phone, licenseNumber: d.licenseNumber || '', address: d.address || '', status: d.status });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this driver?')) return;
    try { await driversApi.delete(id); toast.success('Driver deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Drivers" description="Manage delivery drivers" action={
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditDriver(null); setForm({ driverCode: '', fullName: '', phone: '', licenseNumber: '', address: '', status: 'ACTIVE' }); }}>
          + Add Driver
        </button>
      } />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>{editDriver ? 'Edit Driver' : 'New Driver'}</h3></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Driver Code *</label>
                  <input className="form-input" value={form.driverCode} onChange={e => setForm(f => ({ ...f, driverCode: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>License Number</label>
                  <input className="form-input" value={form.licenseNumber} onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Driver</button>
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
                <tr>
                  <th>Code</th><th>Name</th><th>Phone</th><th>License</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id}>
                    <td><code>{d.driverCode}</code></td>
                    <td>{d.fullName}</td>
                    <td>{d.phone}</td>
                    <td>{d.licenseNumber || '—'}</td>
                    <td><span className={`badge badge-${d.status === 'ACTIVE' ? 'success' : 'secondary'}`}>{d.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(d)}>Edit</button>
                      {' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No drivers found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
