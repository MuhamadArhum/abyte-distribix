import React, { useEffect, useState, useMemo } from 'react';
import { cylindersApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import type { CylinderType } from '@/types';

const EMPTY = { cylinderSize: '', gasCapacity: 0, emptyWeight: 0, depositAmount: 0 };

export default function CylindersPage() {
  const [cylinders, setCylinders] = useState<CylinderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const r = await cylindersApi.getAll(); setCylinders(r.data); }
    catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const openAdd = () => { setEditId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (c: CylinderType) => {
    setEditId(c.id);
    setForm({ cylinderSize: c.cylinderSize, gasCapacity: c.gasCapacity, emptyWeight: c.emptyWeight, depositAmount: c.depositAmount });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.cylinderSize) { alert('Cylinder size required'); return; }
    setSaving(true);
    try {
      if (editId) await cylindersApi.update(editId, form);
      else await cylindersApi.create(form);
      setShowForm(false); load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cylinder type?')) return;
    try { await cylindersApi.delete(id); load(); } catch { alert('Failed'); }
  };

  const handleToggleStatus = async (c: CylinderType) => {
    try { await cylindersApi.update(c.id, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }); load(); }
    catch { alert('Failed to update status'); }
  };

  const getInv = (c: CylinderType, status: string) => (c.cylinderInventory || []).find((i: any) => i.status === status)?.quantity || 0;

  // KPIs
  const activeCount = cylinders.filter((c) => c.status === 'ACTIVE').length;
  const totalFilled = cylinders.reduce((s, c) => s + getInv(c, 'FILLED'), 0);
  const totalEmpty = cylinders.reduce((s, c) => s + getInv(c, 'EMPTY'), 0);
  const totalDeposit = cylinders.reduce((s, c) => s + c.depositAmount * (getInv(c, 'FILLED') + getInv(c, 'EMPTY')), 0);

  const filtered = useMemo(() => {
    return cylinders.filter((c) => {
      const matchSearch = !search || c.cylinderSize.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [cylinders, search, filterStatus]);

  const filtersActive = search || filterStatus !== 'ALL';

  const { paged, page, pageSize, setPage, setPageSize } = usePagination(filtered);

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Types</span></div>
          <div className="kpi-value">{cylinders.length}</div>
          <div className="kpi-sub">{activeCount} active</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Filled</span></div>
          <div className="kpi-value" style={{ color: 'var(--green-ok)' }}>{totalFilled}</div>
          <div className="kpi-sub">Cylinders ready to sell</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Total Empty</span></div>
          <div className="kpi-value" style={{ color: 'var(--amber-warn)' }}>{totalEmpty}</div>
          <div className="kpi-sub">Awaiting filling</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Deposit Value</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalDeposit)}</div>
          <div className="kpi-sub">All cylinders in stock</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Cylinders</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {cylinders.length} types</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Cylinder Type
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by size..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 150px' }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('ALL'); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No cylinder types found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Gas Cap.</th>
                <th style={{ textAlign: 'right' }}>Empty Wt.</th>
                <th style={{ textAlign: 'right' }}>Deposit</th>
                <th style={{ textAlign: 'right' }}>Filled</th>
                <th style={{ textAlign: 'right' }}>Empty</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => {
                const filled = getInv(c, 'FILLED');
                const empty = getInv(c, 'EMPTY');
                return (
                  <tr key={c.id}>
                    <td><span className="row-title">{c.cylinderSize}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{c.gasCapacity} KG</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{c.emptyWeight} KG</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatCurrency(c.depositAmount)}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: 'var(--green-ok)' }}>{filled}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: empty > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>{empty}</span></td>
                    <td><span className={`pill ${c.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{c.status}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(c)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon" title={c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(c)} style={{ color: c.status === 'ACTIVE' ? 'var(--amber-warn)' : 'var(--green-ok)' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(c.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editId ? 'Edit Cylinder Type' : 'Add Cylinder Type'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div className="span-2"><label className="ab-label">Cylinder Size *</label><input className="ab-input" placeholder="e.g. 11.8 KG" value={form.cylinderSize} onChange={(e) => setForm({ ...form, cylinderSize: e.target.value })} /></div>
                <div><label className="ab-label">Gas Capacity (KG)</label><input className="ab-input" type="number" value={form.gasCapacity} onChange={(e) => setForm({ ...form, gasCapacity: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Empty Weight (KG)</label><input className="ab-input" type="number" value={form.emptyWeight} onChange={(e) => setForm({ ...form, emptyWeight: Number(e.target.value) })} /></div>
                <div className="span-2"><label className="ab-label">Deposit Amount (PKR)</label><input className="ab-input" type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
