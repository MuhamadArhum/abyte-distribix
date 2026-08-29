import React, { useEffect, useState } from 'react';
import { gasReceivingApi, purchasesApi, suppliersApi, storageTanksApi } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';
import type { GasReceiving, Purchase, Supplier, StorageTank } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

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
    receivingDate: new Date().toISOString().split('T')[0],
    expectedQuantity: 0, receivedQuantity: 0, unit: 'KG', tankId: '', notes: '',
  });

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
      const res = await gasReceivingApi.getAll();
      setReceivings(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const columns: ColumnDef<GasReceiving>[] = [
    { accessorKey: 'receivingNumber', header: 'Receiving No', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{row.original.receivingNumber}</span> },
    { accessorKey: 'supplier', header: 'Supplier', cell: ({ row }) => <span className="row-title">{row.original.supplier?.supplierName || '—'}</span> },
    { accessorKey: 'tank', header: 'Tank', cell: ({ row }) => row.original.tank?.tankName || '—' },
    { accessorKey: 'receivingDate', header: 'Date', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(row.original.receivingDate)}</span> },
    { accessorKey: 'expectedQuantity', header: 'Expected', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{row.original.expectedQuantity} {row.original.unit}</span> },
    { accessorKey: 'receivedQuantity', header: 'Received', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{row.original.receivedQuantity} {row.original.unit}</span> },
    {
      accessorKey: 'variance', header: 'Variance',
      cell: ({ row }) => {
        const v = row.original.variance;
        return <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: v < 0 ? 'var(--red-risk)' : v > 0 ? 'var(--green-ok)' : 'var(--steel)' }}>{v} {row.original.unit}</span>;
      },
    },
  ];

  return (
    <div className="page-content">
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">Gas Receiving</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Record gas deliveries from suppliers</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Receiving
        </button>
      </div>

      <div className="panel">
        {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
          : <DataTable columns={columns} data={receivings} searchKey="receivingNumber" searchPlaceholder="Search by receiving number..." />}
      </div>

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
