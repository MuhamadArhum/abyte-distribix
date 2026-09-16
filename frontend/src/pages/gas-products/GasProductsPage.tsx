import React, { useEffect, useState } from 'react';
import { gasProductsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import type { GasProduct } from '@/types';

const GAS_TYPES = ['LPG', 'CNG', 'LNG', 'PNG'];
const EMPTY = { productCode: '', productName: '', gasType: 'LPG', unit: 'KG', defaultPurchaseRate: 0, defaultSellingRate: 0, minStockLevel: 0 };

interface Summary { total: number; active: number; inactive: number; avgPurchaseRate: number; avgSellingRate: number }
interface LowStockItem { id: string; productCode: string; productName: string; unit: string; minStockLevel: number; currentStock: number }

export default function GasProductsPage() {
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  // Server-side filters — the product list is fetched page-by-page instead
  // of loading the full table (10k+ rows) into the browser every time.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterType, filterStatus]);
  useEffect(() => { load(); }, [search, filterType, filterStatus, page, pageSize]);
  useEffect(() => { loadSummary(); loadLowStock(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await gasProductsApi.getAll({
        search: search || undefined,
        gasType: filterType !== 'ALL' ? filterType : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        page, limit: pageSize,
      });
      setProducts(r.data.data);
      setTotal(r.data.total);
    } catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const r = await gasProductsApi.getSummary(); setSummary(r.data); } catch { /* KPI row just stays blank */ }
  };

  const loadLowStock = async () => {
    try { const r = await gasProductsApi.getLowStock(); setLowStock(r.data); } catch { /* banner just stays hidden */ }
  };

  const refreshAfterMutation = () => { load(); loadSummary(); loadLowStock(); };

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
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try { await gasProductsApi.delete(id); refreshAfterMutation(); } catch { alert('Failed'); }
  };

  const handleToggleStatus = async (p: GasProduct) => {
    try { await gasProductsApi.update(p.id, { status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); refreshAfterMutation(); }
    catch { alert('Failed to update status'); }
  };

  const lowStockIds = new Set(lowStock.map((l) => l.id));
  const filtersActive = search || filterType !== 'ALL' || filterStatus !== 'ALL';

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Products</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{summary?.active ?? '—'} active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Inactive</span></div>
          <div className="kpi-value">{summary?.inactive ?? '—'}</div>
          <div className="kpi-sub">Deactivated products</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Avg Purchase Rate</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(summary?.avgPurchaseRate ?? 0)}</div>
          <div className="kpi-sub">Per unit average</div>
        </div>
        <div className={`kpi-card ${lowStock.length > 0 ? 'red' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Below Min Stock</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{lowStock.length}</div>
          <div className="kpi-sub">{lowStock.length > 0 ? 'Needs restock' : 'All within range'}</div>
        </div>
      </div>

      {/* Low stock banner — capped so a large catalog doesn't flood the page */}
      {lowStock.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(194,59,46,0.08)', border: '1px solid var(--red-risk)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--red-risk)', marginBottom: 6 }}>
            ⚠ {lowStock.length} PRODUCT{lowStock.length > 1 ? 'S' : ''} BELOW MINIMUM STOCK
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink)', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {lowStock.slice(0, 8).map((l) => (
              <span key={l.id} style={{ fontFamily: 'IBM Plex Mono,monospace' }}>
                {l.productName}: {l.currentStock}/{l.minStockLevel} {l.unit}
              </span>
            ))}
            {lowStock.length > 8 && <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--steel)' }}>+ {lowStock.length - 8} more</span>}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Products</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by name or code..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Types</option>
          {GAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterType('ALL'); setFilterStatus('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No products found</div>
        ) : (
          <>
            <div className="table-scroll">
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
                  {products.map((p) => (
                    <tr key={p.id} style={lowStockIds.has(p.id) ? { background: 'rgba(194,59,46,0.06)' } : undefined}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.productCode}</span></td>
                      <td>
                        <span className="row-title">{p.productName}</span>
                        {lowStockIds.has(p.id) && <span className="pill pill-red" style={{ marginLeft: 6, fontSize: 10 }}>LOW STOCK</span>}
                      </td>
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
            </div>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
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
                <div>
                  <label className="ab-label">Gas Type</label>
                  <select className="ab-input ab-select" value={form.gasType} onChange={(e) => setForm({ ...form, gasType: e.target.value })}>
                    {GAS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
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
