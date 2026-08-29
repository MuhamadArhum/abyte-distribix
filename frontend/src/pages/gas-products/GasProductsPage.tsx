import React, { useEffect, useState, useMemo } from 'react';
import { gasProductsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { GasProduct } from '@/types';

const EMPTY = { productCode: '', productName: '', gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 0, defaultSellingRate: 0, minStockLevel: 0 };

export default function GasProductsPage() {
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await gasProductsApi.getAll(); setProducts(r.data); }
    catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const openAdd = () => { setEditId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p: GasProduct) => {
    setEditId(p.id);
    setForm({ productCode: p.productCode, productName: p.productName, gasType: p.gasType, unit: p.unit, defaultPurchaseRate: p.defaultPurchaseRate, defaultSellingRate: p.defaultSellingRate, minStockLevel: p.minStockLevel });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.productCode || !form.productName) { alert('Code and Name required'); return; }
    setSaving(true);
    try {
      if (editId) await gasProductsApi.update(editId, form);
      else await gasProductsApi.create(form);
      setShowForm(false); load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await gasProductsApi.delete(id); load(); } catch { alert('Failed'); }
  };

  const handleToggleStatus = async (p: GasProduct) => {
    try { await gasProductsApi.update(p.id, { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); load(); }
    catch { alert('Failed to update status'); }
  };

  // KPIs
  const activeCount = products.filter((p) => p.status === 'ACTIVE').length;
  const avgPurchaseRate = products.length ? products.reduce((s, p) => s + p.defaultPurchaseRate, 0) / products.length : 0;
  const avgSellingRate = products.length ? products.reduce((s, p) => s + p.defaultSellingRate, 0) / products.length : 0;

  const gasTypes = useMemo(() => [...new Set(products.map((p) => p.gasType).filter(Boolean))], [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.productName.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q);
      const matchType = filterType === 'ALL' || p.gasType === filterType;
      const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [products, search, filterType, filterStatus]);

  const filtersActive = search || filterType !== 'ALL' || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Products</span></div>
          <div className="kpi-value">{products.length}</div>
          <div className="kpi-sub">{activeCount} active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{products.length - activeCount}</div>
          <div className="kpi-sub">Deactivated products</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Avg Purchase Rate</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(avgPurchaseRate)}</div>
          <div className="kpi-sub">Per unit average</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Avg Selling Rate</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(avgSellingRate)}</div>
          <div className="kpi-sub">Per unit average</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Products</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {products.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Types</option>
          {gasTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterType('ALL'); setFilterStatus('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No products found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Purchase Rate</th>
                <th style={{ textAlign: 'right' }}>Selling Rate</th>
                <th style={{ textAlign: 'right' }}>Min Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.productCode}</span></td>
                  <td><span className="row-title">{p.productName}</span></td>
                  <td><span className="pill pill-steel">{p.gasType}</span></td>
                  <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.unit}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatCurrency(p.defaultPurchaseRate)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--green-ok)' }}>{formatCurrency(p.defaultSellingRate)}</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.minStockLevel} {p.unit}</span></td>
                  <td><span className={`pill ${p.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{p.status}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="ab-btn ab-btn-icon" title={p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(p)} style={{ color: p.status === 'ACTIVE' ? 'var(--amber-warn)' : 'var(--green-ok)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                      </button>
                      <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(p.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Gas Product' : 'Add Gas Product'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Product Code *</label><input className="ab-input" placeholder="LPG-001" value={form.productCode} onChange={(e) => setForm({ ...form, productCode: e.target.value })} /></div>
                <div><label className="ab-label">Product Name *</label><input className="ab-input" placeholder="LPG Gas" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
                <div><label className="ab-label">Gas Type</label><input className="ab-input" placeholder="LPG" value={form.gasType} onChange={(e) => setForm({ ...form, gasType: e.target.value })} /></div>
                <div><label className="ab-label">Unit</label><input className="ab-input" placeholder="KG" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                <div><label className="ab-label">Purchase Rate (PKR)</label><input className="ab-input" type="number" value={form.defaultPurchaseRate} onChange={(e) => setForm({ ...form, defaultPurchaseRate: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Selling Rate (PKR)</label><input className="ab-input" type="number" value={form.defaultSellingRate} onChange={(e) => setForm({ ...form, defaultSellingRate: Number(e.target.value) })} /></div>
                <div className="span-2"><label className="ab-label">Min Stock Level</label><input className="ab-input" type="number" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Product' : 'Save Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
