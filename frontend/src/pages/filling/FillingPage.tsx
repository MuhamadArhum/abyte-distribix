import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fillingApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { FillingBatch } from '@/types';

const today = new Date().toISOString().split('T')[0];

const statusPill = (s: string) => {
  if (s === 'COMPLETED') return <span className="pill pill-green">Completed</span>;
  if (s === 'IN_PROGRESS') return <span className="pill pill-amber">In Progress</span>;
  if (s === 'PENDING') return <span className="pill pill-steel">Pending</span>;
  return <span className="pill pill-red">Cancelled</span>;
};

export default function FillingPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<FillingBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCylinder, setFilterCylinder] = useState('ALL');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [useDateFilter, setUseDateFilter] = useState(false);

  const load = () => {
    setLoading(true);
    fillingApi.getAll().then((r) => setBatches(r.data)).catch(() => alert('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete batch ${num}?`)) return;
    try { await fillingApi.delete(id); load(); } catch { alert('Failed to delete'); }
  };

  const cylinderTypes = useMemo(() => [...new Set(batches.map((b) => b.cylinderType?.cylinderSize).filter(Boolean))], [batches]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch = !q || b.batchNumber.toLowerCase().includes(q) || (b.cylinderType?.cylinderSize || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
      const matchCyl = filterCylinder === 'ALL' || b.cylinderType?.cylinderSize === filterCylinder;
      const bDate = (b.fillingDate || '').split('T')[0];
      const matchDate = !useDateFilter || (bDate >= startDate && bDate <= endDate);
      return matchSearch && matchStatus && matchCyl && matchDate;
    });
  }, [batches, search, filterStatus, filterCylinder, startDate, endDate, useDateFilter]);

  // KPIs
  const todayBatches = batches.filter((b) => (b.fillingDate || '').split('T')[0] === today);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthCylinders = batches.filter((b) => (b.fillingDate || '').startsWith(thisMonth)).reduce((s, b) => s + b.numberOfCylinders, 0);
  const totalGasUsed = batches.filter((b) => b.status === 'COMPLETED').reduce((s, b) => s + (b.actualGasQty || b.expectedGasQty), 0);
  const inProgressCount = batches.filter((b) => b.status === 'IN_PROGRESS' || b.status === 'PENDING').length;

  const filtersActive = search || filterStatus !== 'ALL' || filterCylinder !== 'ALL' || useDateFilter;

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Batches</span></div>
          <div className="kpi-value">{todayBatches.length}</div>
          <div className="kpi-sub">{todayBatches.reduce((s, b) => s + b.numberOfCylinders, 0)} cylinders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">This Month</span></div>
          <div className="kpi-value">{monthCylinders}</div>
          <div className="kpi-sub">Cylinders filled</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Gas Used</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{totalGasUsed.toFixed(1)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--steel)', marginLeft: 4 }}>KG</span></div>
          <div className="kpi-sub">Completed batches</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Active / Pending</span></div>
          <div className="kpi-value" style={{ color: 'var(--amber-warn)' }}>{inProgressCount}</div>
          <div className="kpi-sub">Batches in progress</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Filling</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {batches.length} batches</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => navigate('/filling/new')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Batch
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search batch # or cylinder..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <select className="ab-input ab-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className="ab-input ab-select" value={filterCylinder} onChange={(e) => setFilterCylinder(e.target.value)} style={{ flex: '0 0 160px' }}>
          <option value="ALL">All Cylinders</option>
          {cylinderTypes.map((t) => <option key={t} value={t!}>{t}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--steel)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={useDateFilter} onChange={(e) => setUseDateFilter(e.target.checked)} style={{ cursor: 'pointer' }} />
          Date Range
        </label>
        {useDateFilter && (
          <>
            <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
            <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
          </>
        )}
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setFilterStatus('ALL'); setFilterCylinder('ALL'); setUseDateFilter(false); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No batches found</div>
        ) : (
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
              {filtered.map((b) => {
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
                        <button className="ab-btn ab-btn-icon danger" title="Delete" onClick={() => handleDelete(b.id, b.batchNumber)}>
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
      </div>
    </div>
  );
}
