import React, { useEffect, useState } from 'react';
import { storageTanksApi, gasProductsApi } from '@/lib/api';
import type { StorageTank, GasProduct } from '@/types';

const EMPTY_FORM = { tankNumber: '', tankName: '', gasProductId: '', capacity: 0, location: '' };

export default function StorageTanksPage() {
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [t, p] = await Promise.all([storageTanksApi.getAll(), gasProductsApi.getAll()]);
      setTanks(t.data); setProducts(p.data);
    } catch { alert('Failed to load data'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.tankNumber || !form.tankName) { alert('Tank number and name required'); return; }
    setSaving(true);
    try { await storageTanksApi.create(form); setShowForm(false); setForm(EMPTY_FORM); load(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tank?')) return;
    try { await storageTanksApi.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  return (
    <div className="page-content">
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">Storage Tanks</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{tanks.length} storage tanks</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Tank
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
      ) : tanks.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No storage tanks configured yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tanks.map((tank) => {
            const pct = tank.capacity > 0 ? Math.round((tank.currentQuantity / tank.capacity) * 100) : 0;
            const barColor = pct > 60 ? 'var(--green-ok)' : pct > 30 ? 'var(--amber-warn)' : 'var(--red-risk)';
            return (
              <div key={tank.id} className="panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                      <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em' }}>{tank.tankName}</span>
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{tank.tankNumber}</div>
                    {tank.gasProduct && <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 2 }}>{tank.gasProduct.productName}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`pill ${tank.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{tank.status}</span>
                    <button className="ab-btn ab-btn-icon danger" onClick={() => handleDelete(tank.id)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--steel)' }}>Stock</span>
                    <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600 }}>{tank.currentQuantity} / {tank.capacity} KG</span>
                  </div>
                  <div style={{ background: 'var(--rule)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ background: barColor, height: '100%', width: `${pct}%`, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace' }}>
                    <span>{tank.location || ''}</span>
                    <span>{pct}% full</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Add Storage Tank</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Tank Number *</label><input className="ab-input" placeholder="TANK-001" value={form.tankNumber} onChange={(e) => setForm({ ...form, tankNumber: e.target.value })} /></div>
                <div><label className="ab-label">Tank Name *</label><input className="ab-input" placeholder="Main Tank" value={form.tankName} onChange={(e) => setForm({ ...form, tankName: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Gas Product *</label>
                  <select className="ab-input ab-select" value={form.gasProductId} onChange={(e) => setForm({ ...form, gasProductId: e.target.value })}>
                    <option value="">Select gas product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Capacity (KG)</label><input className="ab-input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Location</label><input className="ab-input" placeholder="Warehouse A" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Tank'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
