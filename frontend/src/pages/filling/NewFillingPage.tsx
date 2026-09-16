import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fillingApi, storageTanksApi, cylindersApi } from '@/lib/api';
import { SearchPicker } from '@/components/shared/SearchPicker';
import type { StorageTank, CylinderType } from '@/types';

export default function NewFillingPage() {
  const navigate = useNavigate();
  const [tankLabel, setTankLabel] = useState('');
  const [cylinderLabel, setCylinderLabel] = useState('');
  const [selectedCylinder, setSelectedCylinder] = useState<CylinderType | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchNumber: `FILL-${Date.now()}`,
    fillingDate: new Date().toISOString().split('T')[0],
    tankId: '', cylinderTypeId: '', numberOfCylinders: 0, expectedGasQty: 0,
    fillingStation: '', notes: '',
  });

  const handleCylinderCount = (count: number) => {
    setForm({ ...form, numberOfCylinders: count, expectedGasQty: selectedCylinder ? count * selectedCylinder.gasCapacity : 0 });
  };

  const handleSave = async () => {
    if (!form.tankId || !form.cylinderTypeId || form.numberOfCylinders <= 0) { alert('Please fill required fields'); return; }
    setSaving(true);
    try { await fillingApi.create(form); navigate('/filling'); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="ab-btn ab-btn-outline" onClick={() => navigate('/filling')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div>
          <div className="section-title">New Filling Batch</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Record cylinder filling operation</div>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            FILLING DETAILS
          </div>
          <div className="ab-form-grid">
            <div>
              <label className="ab-label">Batch Number</label>
              <input className="ab-input" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
            </div>
            <div>
              <label className="ab-label">Filling Date</label>
              <input className="ab-input" type="date" value={form.fillingDate} onChange={(e) => setForm({ ...form, fillingDate: e.target.value })} />
            </div>
            <div className="span-2">
              <label className="ab-label">Storage Tank *</label>
              <SearchPicker<StorageTank>
                value={form.tankId}
                valueLabel={tankLabel}
                placeholder="Type tank name or number..."
                search={(q) => storageTanksApi.getAll({ search: q, status: 'ACTIVE', page: 1, limit: 8 }).then((r) => r.data.data)}
                onSelect={(t) => { setForm({ ...form, tankId: t.id }); setTankLabel(`${t.tankName} — ${t.currentQuantity} KG available`); }}
                renderOption={(t) => (
                  <div>
                    <div className="row-title">{t.tankName}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{t.currentQuantity}/{t.capacity} KG</div>
                  </div>
                )}
              />
            </div>
            <div className="span-2">
              <label className="ab-label">Cylinder Type *</label>
              <SearchPicker<CylinderType>
                value={form.cylinderTypeId}
                valueLabel={cylinderLabel}
                placeholder="Type cylinder size..."
                search={(q) => cylindersApi.getAll({ search: q, status: 'ACTIVE', page: 1, limit: 8 }).then((r) => r.data.data)}
                onSelect={(c) => {
                  setSelectedCylinder(c);
                  setForm({ ...form, cylinderTypeId: c.id, expectedGasQty: form.numberOfCylinders * c.gasCapacity });
                  setCylinderLabel(`${c.cylinderSize} (${c.gasCapacity} KG)`);
                }}
                renderOption={(c) => (
                  <div>
                    <div className="row-title">{c.cylinderSize}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{c.gasCapacity} KG capacity</div>
                  </div>
                )}
              />
            </div>
            <div>
              <label className="ab-label">Number of Cylinders *</label>
              <input className="ab-input" type="number" value={form.numberOfCylinders} onChange={(e) => handleCylinderCount(Number(e.target.value))} />
            </div>
            <div>
              <label className="ab-label">Expected Gas (KG)</label>
              <input className="ab-input" type="number" value={form.expectedGasQty} onChange={(e) => setForm({ ...form, expectedGasQty: Number(e.target.value) })} />
            </div>
            <div>
              <label className="ab-label">Filling Station</label>
              <input className="ab-input" placeholder="Station A" value={form.fillingStation} onChange={(e) => setForm({ ...form, fillingStation: e.target.value })} />
            </div>
            <div>
              <label className="ab-label">Notes</label>
              <input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button className="ab-btn ab-btn-outline" onClick={() => navigate('/filling')}>Cancel</button>
            <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {saving ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
