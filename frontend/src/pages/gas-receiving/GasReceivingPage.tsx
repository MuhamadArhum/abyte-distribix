import React, { useEffect, useRef, useState } from 'react';
import { gasReceivingApi, purchasesApi, storageTanksApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import type { GasReceiving, Purchase, StorageTank } from '@/types';

const EMPTY_FORM = {
  receivingNumber: `REC-${Date.now()}`, purchaseId: '', supplierId: '',
  receivingDate: new Date().toISOString().split('T')[0],
  expectedQuantity: 0, receivedQuantity: 0, unit: 'KG', tankId: '', notes: '',
};

interface Summary { total: number; todayCount: number; todayReceivedQuantity: number; totalReceivedQuantity: number; totalVariance: number }

/** Minimal inline searchable dropdown — a plain <select> would otherwise
 * render every purchase/tank in the catalog (10k+ here). */
function SearchPicker<T>({
  value, valueLabel, placeholder, search, renderOption, onSelect,
}: {
  value: string; valueLabel: string; placeholder: string;
  search: (q: string) => Promise<T[]>;
  renderOption: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => { search(query.trim()).then(setResults).catch(() => setResults([])); }, 250);
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
        placeholder={placeholder}
        value={open ? query : valueLabel}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          {!query.trim() ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>Type to search...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>No matches</div>
          ) : (
            results.map((item, i) => (
              <div
                key={i}
                onClick={() => { onSelect(item); setOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {renderOption(item)}
              </div>
            ))
          )}
        </div>
      )}
      {!open && value && <input type="hidden" value={value} />}
    </div>
  );
}

export default function GasReceivingPage() {
  const [receivings, setReceivings] = useState<GasReceiving[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editReceiving, setEditReceiving] = useState<GasReceiving | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [purchaseLabel, setPurchaseLabel] = useState('');
  const [tankLabel, setTankLabel] = useState('');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, startDate, endDate]);
  useEffect(() => { load(); }, [search, startDate, endDate, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await gasReceivingApi.getAll({ search: search || undefined, from: startDate || undefined, to: endDate || undefined, page, limit: pageSize });
      setReceivings(r.data.data); setTotal(r.data.total);
    } catch { alert('Failed to load data'); } finally { setLoading(false); }
  };

  const loadSummary = () => {
    gasReceivingApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const openAdd = () => {
    setEditReceiving(null);
    setForm({ ...EMPTY_FORM, receivingNumber: `REC-${Date.now()}` });
    setPurchaseLabel(''); setTankLabel('');
    setShowForm(true);
  };

  const openEdit = (r: GasReceiving) => {
    setEditReceiving(r);
    setForm({ ...EMPTY_FORM, receivedQuantity: r.receivedQuantity, notes: r.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editReceiving) {
        // Backend only ever applies receivedQuantity/notes corrections here.
        await gasReceivingApi.update(editReceiving.id, { receivedQuantity: form.receivedQuantity, notes: form.notes });
      } else {
        if (!form.purchaseId || !form.tankId) { alert('Select a purchase order and a storage tank'); setSaving(false); return; }
        await gasReceivingApi.create(form);
      }
      setShowForm(false); refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete receiving ${num}? The tank's stock will be reverted.`)) return;
    try { await gasReceivingApi.delete(id); refreshAfterMutation(); } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const filtersActive = search || startDate || endDate;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Receivings</span></div>
          <div className="kpi-value">{summary?.todayCount ?? '—'}</div>
          <div className="kpi-sub">{(summary?.todayReceivedQuantity ?? 0).toFixed(0)} KG today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Received</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{(summary?.totalReceivedQuantity ?? 0).toFixed(0)}<span style={{ fontSize: 12, color: 'var(--steel)', marginLeft: 4 }}>KG</span></div>
          <div className="kpi-sub">All time</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Total Records</span></div>
          <div className="kpi-value">{summary?.total ?? '—'}</div>
          <div className="kpi-sub">{total} matching filters</div>
        </div>
        <div className={`kpi-card ${(summary?.totalVariance ?? 0) < 0 ? 'red' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Net Variance</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: (summary?.totalVariance ?? 0) < 0 ? 'var(--red-risk)' : (summary?.totalVariance ?? 0) > 0 ? 'var(--green-ok)' : undefined }}>
            {(summary?.totalVariance ?? 0) > 0 ? '+' : ''}{(summary?.totalVariance ?? 0).toFixed(0)}<span style={{ fontSize: 12, color: 'var(--steel)', marginLeft: 4 }}>KG</span>
          </div>
          <div className="kpi-sub">Expected vs received</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Receiving</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Receiving
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search receiving #, supplier, or tank..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setStartDate(''); setEndDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : receivings.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No receivings found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receiving #</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Tank</th>
                  <th style={{ textAlign: 'right' }}>Expected</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {receivings.map((r) => {
                  const v = r.variance || 0;
                  return (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{r.receivingNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(r.receivingDate)}</span></td>
                      <td><span className="row-title">{r.supplier?.supplierName || '—'}</span></td>
                      <td><span style={{ fontSize: 13 }}>{r.tank?.tankName || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{r.expectedQuantity} {r.unit}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{r.receivedQuantity} {r.unit}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: v < 0 ? 'var(--red-risk)' : v > 0 ? 'var(--green-ok)' : 'var(--steel)' }}>{v > 0 ? '+' : ''}{v} {r.unit}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="ab-btn ab-btn-icon" title="Correct quantity / notes" onClick={() => openEdit(r)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(r.id, r.receivingNumber)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && receivings.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">{editReceiving ? `Correct Receiving — ${editReceiving.receivingNumber}` : 'Record Gas Receiving'}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              {editReceiving ? (
                <div className="ab-form-grid">
                  <div><label className="ab-label">Received Qty (KG)</label><input className="ab-input" type="number" value={form.receivedQuantity} onChange={(e) => setForm({ ...form, receivedQuantity: Number(e.target.value) })} /></div>
                  <div><label className="ab-label">Expected Qty (KG)</label><input className="ab-input" value={editReceiving.expectedQuantity} disabled /></div>
                  <div className="span-2"><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
              ) : (
                <div className="ab-form-grid">
                  <div><label className="ab-label">Receiving Number</label><input className="ab-input" value={form.receivingNumber} onChange={(e) => setForm({ ...form, receivingNumber: e.target.value })} /></div>
                  <div><label className="ab-label">Receiving Date</label><input className="ab-input" type="date" value={form.receivingDate} onChange={(e) => setForm({ ...form, receivingDate: e.target.value })} /></div>
                  <div className="span-2">
                    <label className="ab-label">Purchase Order *</label>
                    <SearchPicker<Purchase>
                      value={form.purchaseId}
                      valueLabel={purchaseLabel}
                      placeholder="Type purchase # or supplier..."
                      search={(q) => purchasesApi.getAll({ search: q, page: 1, limit: 8 }).then((r) => r.data.data)}
                      onSelect={(p) => { setForm({ ...form, purchaseId: p.id, supplierId: p.supplierId, expectedQuantity: p.quantity }); setPurchaseLabel(`${p.purchaseNumber} — ${p.supplier?.supplierName}`); }}
                      renderOption={(p) => (
                        <div>
                          <div className="row-title">{p.purchaseNumber}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{p.supplier?.supplierName} · {p.quantity} {p.unit}</div>
                        </div>
                      )}
                    />
                  </div>
                  <div className="span-2">
                    <label className="ab-label">Storage Tank *</label>
                    <SearchPicker<StorageTank>
                      value={form.tankId}
                      valueLabel={tankLabel}
                      placeholder="Type tank name or number..."
                      search={(q) => storageTanksApi.getAll({ search: q, status: 'ACTIVE', page: 1, limit: 8 }).then((r) => r.data.data)}
                      onSelect={(t) => { setForm({ ...form, tankId: t.id }); setTankLabel(`${t.tankName} (${t.currentQuantity}/${t.capacity} KG)`); }}
                      renderOption={(t) => (
                        <div>
                          <div className="row-title">{t.tankName}</div>
                          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{t.currentQuantity}/{t.capacity} KG</div>
                        </div>
                      )}
                    />
                  </div>
                  <div><label className="ab-label">Expected Qty (KG)</label><input className="ab-input" type="number" value={form.expectedQuantity} onChange={(e) => setForm({ ...form, expectedQuantity: Number(e.target.value) })} /></div>
                  <div><label className="ab-label">Received Qty (KG)</label><input className="ab-input" type="number" value={form.receivedQuantity} onChange={(e) => setForm({ ...form, receivedQuantity: Number(e.target.value) })} /></div>
                  <div className="span-2"><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
              )}
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editReceiving ? 'Save Correction' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
