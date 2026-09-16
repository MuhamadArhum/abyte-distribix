import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fillingApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';
import type { FillingBatch } from '@/types';

const statusPill = (s: string) => {
  if (s === 'COMPLETED') return <span className="pill pill-green">Completed</span>;
  if (s === 'IN_PROGRESS') return <span className="pill pill-amber">In Progress</span>;
  if (s === 'PENDING') return <span className="pill pill-steel">Pending</span>;
  return <span className="pill pill-red">Cancelled</span>;
};

interface Summary { todayCount: number; todayCylinders: number; monthCylinders: number; totalGasUsed: number; inProgressCount: number }

export default function FillingPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<FillingBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [completingBatch, setCompletingBatch] = useState<FillingBatch | null>(null);
  const [actualGasQty, setActualGasQty] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, filterStatus, startDate, endDate]);
  useEffect(() => { load(); }, [search, filterStatus, startDate, endDate, page, pageSize]);
  useEffect(() => { loadSummary(); }, []);

  const load = () => {
    setLoading(true);
    fillingApi.getAll({
      search: search || undefined,
      status: filterStatus !== 'ALL' ? filterStatus : undefined,
      from: startDate || undefined,
      to: endDate || undefined,
      page, limit: pageSize,
    }).then((r) => { setBatches(r.data.data); setTotal(r.data.total); })
      .catch(() => alert('Failed to load'))
      .finally(() => setLoading(false));
  };

  const loadSummary = () => {
    fillingApi.getSummary().then((r) => setSummary(r.data)).catch(() => { /* KPI row just stays blank */ });
  };

  const refreshAfterMutation = () => { load(); loadSummary(); };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete batch ${num}?`)) return;
    try { await fillingApi.delete(id); refreshAfterMutation(); } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete'); }
  };

  const handleStart = async (b: FillingBatch) => {
    try { await fillingApi.update(b.id, { status: 'IN_PROGRESS' }); refreshAfterMutation(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const openComplete = (b: FillingBatch) => {
    setCompletingBatch(b);
    setActualGasQty(b.expectedGasQty);
  };

  const handleComplete = async () => {
    if (!completingBatch) return;
    if (actualGasQty <= 0) { alert('Actual gas quantity must be greater than zero'); return; }
    setSaving(true);
    try {
      await fillingApi.update(completingBatch.id, { status: 'COMPLETED', actualGasQty });
      setCompletingBatch(null);
      refreshAfterMutation();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to complete batch'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (b: FillingBatch) => {
    const warning = b.status === 'COMPLETED'
      ? `Cancel completed batch ${b.batchNumber}? This will reverse the gas and cylinder stock it already moved.`
      : `Cancel batch ${b.batchNumber}?`;
    if (!confirm(warning)) return;
    try { await fillingApi.update(b.id, { status: 'CANCELLED' }); refreshAfterMutation(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtersActive = search || filterStatus !== 'ALL' || startDate || endDate;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Batches</span></div>
          <div className="kpi-value">{summary?.todayCount ?? '—'}</div>
          <div className="kpi-sub">{summary?.todayCylinders ?? 0} cylinders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value">{summary?.monthCylinders ?? '—'}</div>
          <div className="kpi-sub">Cylinders filled</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Gas Used</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{(summary?.totalGasUsed ?? 0).toFixed(1)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--steel)', marginLeft: 4 }}>KG</span></div>
          <div className="kpi-sub">Completed batches</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Active / Pending</span></div>
          <div className="kpi-value" style={{ color: 'var(--amber-warn)' }}>{summary?.inProgressCount ?? '—'}</div>
          <div className="kpi-sub">Batches in progress</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Filling</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{total} matching</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => navigate('/filling/new')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Batch
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search batch #, tank, or cylinder..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearchInput(''); setFilterStatus('ALL'); setStartDate(''); setEndDate(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : batches.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No batches found</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Date</th>
                  <th>Tank</th>
                  <th>Cylinder</th>
                  <th style={{ textAlign: 'right' }}>Cylinders</th>
                  <th style={{ textAlign: 'right' }}>Expected</th>
                  <th style={{ textAlign: 'right' }}>Actual</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const variance = b.actualGasQty > 0 ? b.actualGasQty - b.expectedGasQty : null;
                  return (
                    <tr key={b.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{b.batchNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(b.fillingDate)}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{b.tank?.tankName || '—'}</span></td>
                      <td><span className="row-title">{b.cylinderType?.cylinderSize || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{b.numberOfCylinders}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{b.expectedGasQty} KG</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {b.actualGasQty > 0 ? (
                          <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: variance && variance < 0 ? 'var(--red-risk)' : variance && variance > 0 ? 'var(--amber-warn)' : 'inherit' }}>
                            {b.actualGasQty} KG
                            {variance !== null && variance !== 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>({variance > 0 ? '+' : ''}{variance.toFixed(1)})</span>}
                          </span>
                        ) : <span style={{ color: 'var(--steel)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>{statusPill(b.status)}</td>
                      <td>
                        <div className="row-actions">
                          {b.status === 'PENDING' && (
                            <button className="ab-btn ab-btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => handleStart(b)}>Start</button>
                          )}
                          {(b.status === 'PENDING' || b.status === 'IN_PROGRESS') && (
                            <button className="ab-btn ab-btn-primary" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => openComplete(b)}>Complete</button>
                          )}
                          {(b.status === 'PENDING' || b.status === 'IN_PROGRESS' || b.status === 'COMPLETED') && (
                            <button className="ab-btn ab-btn-icon" title="Cancel batch" onClick={() => handleCancel(b)} style={{ color: 'var(--amber-warn)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            </button>
                          )}
                          {b.status !== 'COMPLETED' && (
                            <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(b.id, b.batchNumber)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && batches.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>

      {/* Complete Batch Modal */}
      {completingBatch && (
        <div className="ab-modal-overlay" onClick={() => setCompletingBatch(null)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Complete Batch — {completingBatch.batchNumber}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setCompletingBatch(null)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                Filling <strong>{completingBatch.numberOfCylinders}</strong> × {completingBatch.cylinderType?.cylinderSize} from <strong>{completingBatch.tank?.tankName}</strong>.
                This moves the actual gas out of the tank and marks the cylinders FILLED.
              </div>
              <label className="ab-label">Actual Gas Used (KG) *</label>
              <input className="ab-input" type="number" value={actualGasQty} onChange={(e) => setActualGasQty(Number(e.target.value))} />
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>Expected: {completingBatch.expectedGasQty} KG</div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setCompletingBatch(null)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleComplete} disabled={saving}>{saving ? 'Saving...' : 'Confirm Complete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
