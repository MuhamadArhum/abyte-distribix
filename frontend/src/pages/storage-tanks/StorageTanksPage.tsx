import React, { useEffect, useRef, useState } from 'react';
import { storageTanksApi, gasProductsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { StorageTank, GasProduct } from '@/types';
import Pagination from '@/components/shared/Pagination';

const EMPTY_FORM = { tankNumber: '', tankName: '', gasProductId: '', capacity: 0, currentQuantity: 0, location: '' };

interface Summary { total: number; active: number; inactive: number; totalCapacity: number; totalStock: number }

/** Minimal inline searchable dropdown for picking a gas product — a plain
 * <select> would otherwise render every product in the catalog (10k+ here). */
function GasProductPicker({ value, valueLabel, onSelect }: { value: string; valueLabel: string; onSelect: (p: GasProduct) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GasProduct[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      gasProductsApi.getAll({ search: query.trim(), status: 'ACTIVE', page: 1, limit: 8 })
        .then((r) => setResults(r.data.data))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        className="ab-input"
        placeholder="Type to search products..."
        value={open ? query : valueLabel}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          {!query.trim() ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>Type a product name or code...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>No matching products</div>
          ) : (
            results.map((p) => (
              <div
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="row-title">{p.productName}</div>
                <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{p.productCode} · {p.gasType}</div>
              </div>
            ))
          )}
        </div>
      )}
      {!open && value && <input type="hidden" value={value} />}
    </div>
  );
}

export default function StorageTanksPage() {
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editingGasProductName, setEditingGasProductName] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedProductLabel, setSelectedProductLabel] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

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
      const r = await storageTanksApi.getAll({
        search: search || undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        page, limit: pageSize,
      });
      setTanks(r.data.data);
      setTotal(r.data.total);
    } catch { alert('Failed to load data'); } finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const r = await storageTanksApi.getSummary(); setSummary(r.data); } catch { /* KPI row just stays blank */ }
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setSelectedProductLabel(''); setShowForm(true); };
  const openEdit = (tank: StorageTank) => {
    setEditId(tank.id);
    setEditingGasProductName(tank.gasProduct?.productName || '—');
    setForm({ tankNumber: tank.tankNumber, tankName: tank.tankName, gasProductId: tank.gasProductId, capacity: tank.capacity, currentQuantity: tank.currentQuantity, location: tank.location || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.tankNumber || !form.tankName) { alert('Tank number and name required'); return; }
    if (!editId && !form.gasProductId) { alert('Select a gas product'); return; }
    setSaving(true);
    try {
      if (editId) {
        // Backend intentionally disallows moving a tank to a different gas
        // product on update — only these fields are ever sent.
        await storageTanksApi.update(editId, { tankName: form.tankName, capacity: form.capacity, currentQuantity: form.currentQuantity, location: form.location });
      } else {
        await storageTanksApi.create(form);
      }
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tank?')) return;
    try { await storageTanksApi.delete(id); refreshAfterMutation(); } catch { alert('Failed to delete'); }
  };

  const handleToggleStatus = async (tank: StorageTank) => {
    try { await storageTanksApi.update(tank.id, { status: tank.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); refreshAfterMutation(); }
    catch { alert('Failed to update status'); }
  };

  const filtersActive = search || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Tanks</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{summary?.active ?? '—'} active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{summary?.inactive ?? '—'}</div>
          <div className="kpi-sub">Deactivated tanks</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Total Capacity</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{(summary?.totalCapacity ?? 0).toLocaleString()} KG</div>
          <div className="kpi-sub">Combined across tanks</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Current Stock</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{(summary?.totalStock ?? 0).toLocaleString()} KG</div>
          <div className="kpi-sub">Combined across tanks</div>
        </div>
      </div>

      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">Storage Tanks</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Tank
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by tank name, number, location..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
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

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
      ) : tanks.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No storage tanks found</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tanks.map((tank) => {
            const rawPct = tank.capacity > 0 ? (tank.currentQuantity / tank.capacity) * 100 : 0;
            const pct = Math.min(100, Math.round(rawPct));
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`pill ${tank.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{tank.status}</span>
                    <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(tank)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="ab-btn ab-btn-icon" title={tank.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(tank)} style={{ color: tank.status === 'ACTIVE' ? 'var(--amber-warn)' : 'var(--green-ok)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                    </button>
                    <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(tank.id)}>
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

      {!loading && tanks.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}

      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Storage Tank' : 'Add Storage Tank'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Tank Number *</label><input className="ab-input" placeholder="TANK-001" value={form.tankNumber} disabled={!!editId} onChange={(e) => setForm({ ...form, tankNumber: e.target.value })} /></div>
                <div><label className="ab-label">Tank Name *</label><input className="ab-input" placeholder="Main Tank" value={form.tankName} onChange={(e) => setForm({ ...form, tankName: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Gas Product {editId ? '' : '*'}</label>
                  {editId ? (
                    <input className="ab-input" value={editingGasProductName} disabled />
                  ) : (
                    <GasProductPicker
                      value={form.gasProductId}
                      valueLabel={selectedProductLabel}
                      onSelect={(p) => { setForm({ ...form, gasProductId: p.id }); setSelectedProductLabel(p.productName); }}
                    />
                  )}
                </div>
                <div><label className="ab-label">Capacity (KG)</label><input className="ab-input" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
                {editId && <div><label className="ab-label">Current Quantity (KG)</label><input className="ab-input" type="number" value={form.currentQuantity} onChange={(e) => setForm({ ...form, currentQuantity: Number(e.target.value) })} /></div>}
                <div className={editId ? 'span-2' : ''}><label className="ab-label">Location</label><input className="ab-input" placeholder="Warehouse A" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Tank' : 'Save Tank'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
