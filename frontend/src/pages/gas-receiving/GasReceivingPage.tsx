import React, { useEffect, useState, useMemo } from 'react';
import { gasReceivingApi, purchasesApi, suppliersApi, storageTanksApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import type { GasReceiving, Purchase, Supplier, StorageTank } from '@/types';

const today = new Date().toISOString().split('T')[0];

export default function GasReceivingPage() {
  const [receivings, setReceivings] = useState<GasReceiving[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tanks, setTanks] = useState<StorageTank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    receivingNumber: `REC-${Date.now()}`, purchaseId: '', supplierId: '',
    receivingDate: today,
    expectedQuantity: 0, receivedQuantity: 0, unit: 'KG', tankId: '', notes: '',
  });

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [r, p, s, t] = await Promise.all([gasReceivingApi.getAll(), purchasesApi.getAll(), suppliersApi.getAll(), storageTanksApi.getAll()]);
      setReceivings(r.data); setPurchases(p.data); setSuppliers(s.data); setTanks(t.data);
    } catch { alert('Failed to load data'); } finally { setLoading(false); }
  };

  const handlePurchaseChange = (id: string) => {
    const purchase = purchases.find((p) => p.id === id);
    if (purchase) setForm({ ...form, purchaseId: id, supplierId: purchase.supplierId, expectedQuantity: purchase.quantity });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await gasReceivingApi.create(form);
      setShowForm(false);
      setForm({ receivingNumber: `REC-${Date.now()}`, purchaseId: '', supplierId: '', receivingDate: today, expectedQuantity: 0, receivedQuantity: 0, unit: 'KG', tankId: '', notes: '' });
      const res = await gasReceivingApi.getAll();
      setReceivings(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    return receivings.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.receivingNumber.toLowerCase().includes(q) || (r.supplier?.supplierName || '').toLowerCase().includes(q) || (r.tank?.tankName || '').toLowerCase().includes(q);
      const rDate = (r.receivingDate || '').split('T')[0];
      const matchDate = rDate >= startDate && rDate <= endDate;
      return matchSearch && matchDate;
    });
  }, [receivings, search, startDate, endDate]);

  // KPIs
  const todayRec = receivings.filter((r) => (r.receivingDate || '').split('T')[0] === today);
  const totalReceived = receivings.reduce((s, r) => s + r.receivedQuantity, 0);
  const totalVariance = receivings.reduce((s, r) => s + (r.variance || 0), 0);
  const filtersActive = search || startDate !== today || endDate !== today;

  const { paged, page, pageSize, setPage, setPageSize } = usePagination(filtered);

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Today's Receivings</span></div>
          <div className="kpi-value">{todayRec.length}</div>
          <div className="kpi-sub">{todayRec.reduce((s, r) => s + r.receivedQuantity, 0).toFixed(0)} KG today</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Received</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{totalReceived.toFixed(0)}<span style={{ fontSize: 12, color: 'var(--steel)', marginLeft: 4 }}>KG</span></div>
          <div className="kpi-sub">All time</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Total Records</span></div>
          <div className="kpi-value">{receivings.length}</div>
          <div className="kpi-sub">{filtered.length} shown</div>
        </div>
        <div className={`kpi-card ${totalVariance < 0 ? 'red' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Net Variance</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: totalVariance < 0 ? 'var(--red-risk)' : totalVariance > 0 ? 'var(--green-ok)' : undefined }}>{totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(0)}<span style={{ fontSize: 12, color: 'var(--steel)', marginLeft: 4 }}>KG</span></div>
          <div className="kpi-sub">Expected vs received</div>
        </div>
      </div>

      {/* Header */}
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
        <div>
          <div className="section-title">Gas Receiving</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{filtered.length} of {receivings.length} shown</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Receiving
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
        <input className="ab-input" placeholder="Search receiving # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '1 1 200px', minWidth: 160 }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>From</span>
        <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        <span style={{ fontSize: 12, color: 'var(--steel)', whiteSpace: 'nowrap', alignSelf: 'center' }}>To</span>
        <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ flex: '0 0 140px' }} />
        {filtersActive && (
          <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setStartDate(today); setEndDate(today); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>No receivings found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => {
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Gas Receiving</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Receiving Number</label><input className="ab-input" value={form.receivingNumber} onChange={(e) => setForm({ ...form, receivingNumber: e.target.value })} /></div>
                <div><label className="ab-label">Receiving Date</label><input className="ab-input" type="date" value={form.receivingDate} onChange={(e) => setForm({ ...form, receivingDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Purchase Order</label>
                  <select className="ab-input ab-select" value={form.purchaseId} onChange={(e) => handlePurchaseChange(e.target.value)}>
                    <option value="">Select purchase order</option>
                    {purchases.map((p) => <option key={p.id} value={p.id}>{p.purchaseNumber} — {p.supplier?.supplierName}</option>)}
                  </select>
                </div>
                <div className="span-2">
                  <label className="ab-label">Storage Tank</label>
                  <select className="ab-input ab-select" value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })}>
                    <option value="">Select tank</option>
                    {tanks.map((t) => <option key={t.id} value={t.id}>{t.tankName} ({t.currentQuantity}/{t.capacity} KG)</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Expected Qty (KG)</label><input className="ab-input" type="number" value={form.expectedQuantity} onChange={(e) => setForm({ ...form, expectedQuantity: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Received Qty (KG)</label><input className="ab-input" type="number" value={form.receivedQuantity} onChange={(e) => setForm({ ...form, receivedQuantity: Number(e.target.value) })} /></div>
                <div className="span-2"><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
