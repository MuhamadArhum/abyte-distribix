import React, { useEffect, useRef, useState } from 'react';
import { cylinderUnitsApi, cylindersApi } from '@/lib/api';
import { CylinderUnit, CylinderType } from '@/types';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';

const STATUS_PILL: Record<string, string> = {
  FILLED: 'pill-green', EMPTY: 'pill-steel', WITH_CUSTOMER: 'pill-blue', DAMAGED: 'pill-red', MAINTENANCE: 'pill-amber', LOST: 'pill-red',
};
const STATUSES = ['EMPTY', 'FILLED', 'WITH_CUSTOMER', 'DAMAGED', 'MAINTENANCE', 'LOST'];
const EMPTY_FORM = { serialNumber: '', cylinderTypeId: '', status: 'EMPTY', purchaseDate: '', notes: '' };

interface Summary { total: number; byStatus: Record<string, number> }

/** Minimal inline searchable dropdown for picking a cylinder type — a plain
 * <select> would otherwise render every type in the catalog (10k+ here). */
function CylinderTypePicker({ value, valueLabel, onSelect }: { value: string; valueLabel: string; onSelect: (t: CylinderType) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CylinderType[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      cylindersApi.getAll({ search: query.trim(), status: 'ACTIVE', page: 1, limit: 8 })
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
        placeholder="Type to search sizes..."
        value={open ? query : valueLabel}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          {!query.trim() ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>Type a cylinder size...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>No matching cylinder types</div>
          ) : (
            results.map((t) => (
              <div
                key={t.id}
                onClick={() => { onSelect(t); setOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="row-title">{t.cylinderSize}</div>
              </div>
            ))
          )}
        </div>
      )}
      {!open && value && <input type="hidden" value={value} />}
    </div>
  );
}

export default function CylinderUnitsPage() {
  const [units, setUnits] = useState<CylinderUnit[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState<CylinderUnit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<CylinderUnit | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedTypeLabel, setSelectedTypeLabel] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState(EMPTY_FORM);

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
      const r = await cylinderUnitsApi.getAll({ status: filterStatus || undefined, search: search || undefined, page, limit: pageSize });
      setUnits(r.data.data); setTotal(r.data.total);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const r = await cylinderUnitsApi.getSummary(); setSummary(r.data); } catch { /* KPI row just stays blank */ }
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const handlePrintQR = useReactToPrint({ contentRef: qrRef });

  const openAdd = () => { setEditUnit(null); setForm(EMPTY_FORM); setSelectedTypeLabel(''); setShowForm(true); };
  const openEdit = (u: CylinderUnit) => {
    setEditUnit(u);
    setForm({ serialNumber: u.serialNumber, cylinderTypeId: u.cylinderTypeId, status: u.status, purchaseDate: u.purchaseDate ? u.purchaseDate.split('T')[0] : '', notes: u.notes || '' });
    setSelectedTypeLabel(u.cylinderType?.cylinderSize || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.serialNumber || !form.cylinderTypeId) { alert('Serial number and cylinder type are required'); return; }
    setSaving(true);
    try {
      if (editUnit) await cylinderUnitsApi.update(editUnit.id, form);
      else await cylinderUnitsApi.create(form);
      toast.success(editUnit ? 'Unit updated' : 'Unit created');
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cylinder unit?')) return;
    try { await cylinderUnitsApi.delete(id); toast.success('Deleted'); refreshAfterMutation(); }
    catch { toast.error('Delete failed'); }
  };

  const filtersActive = search || filterStatus;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Units</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">Individually tracked cylinders</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-top"><span className="kpi-label">Filled</span></div>
          <div className="kpi-value">{summary?.byStatus?.FILLED ?? 0}</div>
          <div className="kpi-sub">Ready for sale</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">With Customers</span></div>
          <div className="kpi-value">{summary?.byStatus?.WITH_CUSTOMER ?? 0}</div>
          <div className="kpi-sub">At customer sites</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Damaged / Lost</span></div>
          <div className="kpi-value">{(summary?.byStatus?.DAMAGED ?? 0) + (summary?.byStatus?.LOST ?? 0)}</div>
          <div className="kpi-sub">Needs attention</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Cylinder Units</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching · individual QR-tracked cylinders</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Cylinder Unit
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search by serial number..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 170px' }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterStatus(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : units.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No cylinder units found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serial No.</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Customer</th>
                  <th>Purchase Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id}>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{u.serialNumber}</span></td>
                    <td><span className="row-title">{u.cylinderType?.cylinderSize || '—'}</span></td>
                    <td><span className={`pill ${STATUS_PILL[u.status] || 'pill-steel'}`}>{u.status.replace('_', ' ')}</span></td>
                    <td>{u.customer?.businessName || '—'}</td>
                    <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{u.purchaseDate ? formatDate(u.purchaseDate) : '—'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="ab-btn ab-btn-icon" title="QR Code" onClick={() => setSelectedUnit(u)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon" title="Edit" onClick={() => openEdit(u)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(u.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && units.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editUnit ? 'Edit Cylinder Unit' : 'New Cylinder Unit'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Serial Number *</label><input className="ab-input" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></div>
                <div>
                  <label className="ab-label">Cylinder Type *</label>
                  <CylinderTypePicker
                    value={form.cylinderTypeId}
                    valueLabel={selectedTypeLabel}
                    onSelect={(t) => { setForm({ ...form, cylinderTypeId: t.id }); setSelectedTypeLabel(t.cylinderSize); }}
                  />
                </div>
                <div>
                  <label className="ab-label">Status</label>
                  <select className="ab-input ab-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Purchase Date</label><input className="ab-input" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
                <div className="span-2"><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editUnit ? 'Update Unit' : 'Save Unit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedUnit && (
        <div className="ab-modal-overlay" onClick={() => setSelectedUnit(null)}>
          <div className="ab-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">QR Code — {selectedUnit.serialNumber}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setSelectedUnit(null)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div ref={qrRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#fff', borderRadius: 'var(--radius)' }}>
                <QRCodeSVG value={selectedUnit.qrCode} size={200} />
                <div style={{ marginTop: 12, fontFamily: 'IBM Plex Mono,monospace', fontSize: 14, color: '#000' }}>{selectedUnit.serialNumber}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{selectedUnit.cylinderType?.cylinderSize}</div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setSelectedUnit(null)}>Close</button>
              <button className="ab-btn ab-btn-primary" onClick={() => handlePrintQR()}>Print QR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
