import React, { useEffect, useState } from 'react';
import { paymentsApi, customersApi } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { CustomerPayment, Customer } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

const METHODS = ['CASH', 'BANK', 'CHEQUE', 'ONLINE'];

export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentNumber: `CPAY-${Date.now()}`, customerId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0, paymentMethod: 'CASH', reference: '', notes: '',
  });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [p, c] = await Promise.all([paymentsApi.getCustomerPayments(), customersApi.getAll()]);
      setPayments(p.data); setCustomers(c.data);
    } catch { alert('Failed to load payments'); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.customerId || !form.amount) { alert('Customer and amount required'); return; }
    setSaving(true);
    try {
      await paymentsApi.createCustomerPayment(form);
      setShowForm(false);
      const res = await paymentsApi.getCustomerPayments();
      setPayments(res.data);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); } finally { setSaving(false); }
  };

  const columns: ColumnDef<CustomerPayment>[] = [
    { accessorKey: 'paymentNumber', header: 'Payment No', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{row.original.paymentNumber}</span> },
    { accessorKey: 'customer', header: 'Customer', cell: ({ row }) => <span className="row-title">{row.original.customer?.businessName || '—'}</span> },
    { accessorKey: 'paymentDate', header: 'Date', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(row.original.paymentDate)}</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600, color: 'var(--green-ok)' }}>{formatCurrency(row.original.amount)}</span> },
    { accessorKey: 'paymentMethod', header: 'Method', cell: ({ row }) => <span className="pill pill-steel">{row.original.paymentMethod}</span> },
    { accessorKey: 'reference', header: 'Reference', cell: ({ row }) => <span style={{ fontSize: 12, color: 'var(--steel)' }}>{row.original.reference || '—'}</span> },
  ];

  return (
    <div className="page-content">
      <div className="panel-head" style={{ background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginBottom: 16 }}>
        <div>
          <div className="section-title">Customer Payments</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Payments received from customers</div>
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
              <span className="ab-modal-title">Record Customer Payment</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={form.paymentNumber} onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
                <div className="span-2">
                  <label className="ab-label">Customer *</label>
                  <select className="ab-input ab-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName} — Balance: {formatCurrency(c.currentBalance)}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Reference</label><input className="ab-input" placeholder="Cheque no / transaction ID" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                <div><label className="ab-label">Notes</label><input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
