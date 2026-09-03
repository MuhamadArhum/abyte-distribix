import React, { useEffect, useState, useRef } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { cylinderUnitsApi, cylindersApi } from '@/lib/api';
import { CylinderUnit, CylinderType } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';

const STATUS_COLORS: Record<string, string> = {
  FILLED: 'success', EMPTY: 'secondary', WITH_CUSTOMER: 'info', DAMAGED: 'danger', MAINTENANCE: 'warning', LOST: 'danger',
};

export default function CylinderUnitsPage() {
  const [units, setUnits] = useState<CylinderUnit[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState<CylinderUnit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<CylinderUnit | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  const emptyForm = { serialNumber: '', cylinderTypeId: '', status: 'EMPTY', purchaseDate: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const [uRes, tRes] = await Promise.all([cylinderUnitsApi.getAll(), cylindersApi.getAll()]);
      setUnits(uRes.data); setCylinderTypes(tRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePrintQR = useReactToPrint({ contentRef: qrRef });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editUnit) { await cylinderUnitsApi.update(editUnit.id, form); toast.success('Unit updated'); }
      else { await cylinderUnitsApi.create(form); toast.success('Unit created'); }
      setShowForm(false); setEditUnit(null); setForm(emptyForm); load();
    } catch { toast.error('Operation failed'); }
  };

  const handleEdit = (u: CylinderUnit) => {
    setEditUnit(u);
    setForm({ serialNumber: u.serialNumber, cylinderTypeId: u.cylinderTypeId, status: u.status, purchaseDate: u.purchaseDate ? u.purchaseDate.split('T')[0] : '', notes: u.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cylinder unit?')) return;
    try { await cylinderUnitsApi.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = filterStatus ? units.filter(u => u.status === filterStatus) : units;

  return (
    <div className="page-container">
      <PageHeader title="Cylinder Units" description="Individual cylinder tracking with QR codes" action={
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditUnit(null); setForm(emptyForm); }}>
          + Add Cylinder Unit
        </button>
      } />

      {/* QR Print Modal */}
      {selectedUnit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>QR Code — {selectedUnit.serialNumber}</h3>
            <div ref={qrRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: 'white' }}>
              <QRCodeSVG value={selectedUnit.qrCode} size={200} />
              <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 14, color: '#000' }}>{selectedUnit.serialNumber}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{selectedUnit.cylinderType?.cylinderSize}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedUnit(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => handlePrintQR()}>Print QR</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>{editUnit ? 'Edit Cylinder Unit' : 'New Cylinder Unit'}</h3></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Serial Number *</label>
                  <input className="form-input" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Cylinder Type *</label>
                  <select className="form-input" value={form.cylinderTypeId} onChange={e => setForm(f => ({ ...f, cylinderTypeId: e.target.value }))} required>
                    <option value="">Select type...</option>
                    {cylinderTypes.map(t => <option key={t.id} value={t.id}>{t.cylinderSize}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="EMPTY">Empty</option>
                    <option value="FILLED">Filled</option>
                    <option value="WITH_CUSTOMER">With Customer</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input type="date" className="form-input" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Notes</label>
                  <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <h3 style={{ flex: 1 }}>Cylinder Units</h3>
          <select className="form-input" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="FILLED">Filled</option>
            <option value="EMPTY">Empty</option>
            <option value="WITH_CUSTOMER">With Customer</option>
            <option value="DAMAGED">Damaged</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? <div className="loading-state">Loading...</div> : (
            <table className="data-table">
              <thead>
                <tr><th>Serial No.</th><th>Type</th><th>Status</th><th>Customer</th><th>Purchase Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td><code>{u.serialNumber}</code></td>
                    <td>{u.cylinderType?.cylinderSize}</td>
                    <td><span className={`badge badge-${STATUS_COLORS[u.status] || 'secondary'}`}>{u.status.replace('_', ' ')}</span></td>
                    <td>{u.customer?.businessName || '—'}</td>
                    <td>{u.purchaseDate ? formatDate(u.purchaseDate) : '—'}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setSelectedUnit(u)}>QR</button>
                      {' '}
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(u)}>Edit</button>
                      {' '}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--steel)' }}>No cylinder units found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
