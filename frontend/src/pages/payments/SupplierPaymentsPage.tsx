import React, { useEffect, useState } from 'react';
import { paymentsApi, suppliersApi, purchasesApi } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { SupplierPayment, Supplier, Purchase } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

const METHODS = ['CASH', 'BANK', 'CHEQUE'];

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentNumber: `SPAY-${Date.now()}`, supplierId: '', purchaseId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0, paymentMethod: 'CASH', reference: '', notes: '',
  });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [p, s, pur] = await Promise.all([paymentsApi.getSupplierPayments(), suppliersApi.getAll(), purchasesApi.getAll()]);
      setPayments(p.data); setSuppliers(s.data); setPurchases(pur.data);
    } catch { alert('Failed to load'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.supplierId || !form.amount) { alert('Supplier and amount required'); return; }
    setSaving(true);
    try {
      await paymentsApi.createSupplierPayment(form);
      setShowForm(false);
      const res = await paymentsApi.getSupplierPayments();
      setPayments(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const supplierPurchases = purchases.filter((p) => p.supplierId === form.supplierId && p.paymentStatus !== 'PAID');

  const columns: ColumnDef<SupplierPayment>[] = [
    { accessorKey: 'paymentNumber', header: 'Payment No', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{row.original.paymentNumber}</span> },
    { accessorKey: 'supplier', header: 'Supplier', cell: ({ row }) => <span className="row-title">{row.original.supplier?.supplierName || '—'}</span> },
    { accessorKey: 'paymentDate', header: 'Date', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(row.original.paymentDate)}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: 'var(--blueprint)' }}>{formatCurrency(row.original.amount)}</span> },
    { accessorKey: 'paymentMethod', header: 'Method', cell: ({ row }) => <span className="pill pill-steel">{row.original.paymentMethod}</span> },
    { accessorKey: 'reference', header: 'Reference', cell: ({ row }) => <span style={{ fontSize: 12, color: 'var(--steel)' }}>{row.original.reference || '—'}</span> },
  ];

  return (
    <div className="page-content">
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">Supplier Payments</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Payments made to suppliers</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Payment
        </button>
      </div>

      <div className="panel">
        {loading ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
          : <DataTable columns={columns} data={payments} searchKey="paymentNumber" searchPlaceholder="Search payments..." />}
      </div>

      {showForm && (
        <div className="ab-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Supplier Payment</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={form.paymentNumber} onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Supplier *</label>
                  <select className="ab-input ab-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value, purchaseId: '' })}>
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName} — Balance: {formatCurrency(s.currentBalance)}</option>)}
                  </select>
                </div>
                {form.supplierId && supplierPurchases.length > 0 && (
                  <div className="span-2">
                    <label className="ab-label">Against Purchase (Optional)</label>
                    <select className="ab-input ab-select" value={form.purchaseId} onChange={(e) => setForm({ ...form, purchaseId: e.target.value })}>
                      <option value="">Select purchase (optional)</option>
                      {supplierPurchases.map((p) => <option key={p.id} value={p.id}>{p.purchaseNumber} — Remaining: {formatCurrency(p.remainingAmount)}</option>)}
                    </select>
                  </div>
                )}
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="span-2"><label className="ab-label">Reference</label><input className="ab-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
