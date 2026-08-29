import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { suppliersApi, paymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Supplier, Purchase, SupplierPayment } from '@/types';

type Tab = 'overview' | 'purchases' | 'payments' | 'ledger';

const METHODS = ['CASH', 'BANK', 'CHEQUE'];

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier & { purchases?: Purchase[]; supplierPayments?: SupplierPayment[] } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Edit
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ supplierCode: '', supplierName: '', contactPerson: '', phone: '', email: '', address: '', taxNtn: '', paymentTerms: 30 });
  const [saving, setSaving] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ paymentNumber: `SPAY-${Date.now()}`, supplierId: id || '', purchaseId: '', paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => { if (id) loadAll(); }, [id]);

  const loadAll = async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        suppliersApi.getOne(id!),
        suppliersApi.getLedger(id!).catch(() => ({ data: [] })),
      ]);
      setSupplier(sRes.data);
      setLedger(lRes.data);
    } catch { navigate('/suppliers'); }
    finally { setLoading(false); }
  };

  const openEdit = () => {
    if (!supplier) return;
    setEditForm({ supplierCode: supplier.supplierCode, supplierName: supplier.supplierName, contactPerson: supplier.contactPerson || '', phone: supplier.phone, email: supplier.email || '', address: supplier.address || '', taxNtn: supplier.taxNtn || '', paymentTerms: supplier.paymentTerms });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try { await suppliersApi.update(id!, editForm); setShowEdit(false); loadAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount) { alert('Amount required'); return; }
    setPaymentSaving(true);
    try {
      await paymentsApi.createSupplierPayment({ ...paymentForm, supplierId: id });
      setShowPayment(false);
      setPaymentForm({ paymentNumber: `SPAY-${Date.now()}`, supplierId: id || '', purchaseId: '', paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
      loadAll();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setPaymentSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;
  if (!supplier) return null;

  const purchases = supplier.purchases || [];
  const payments = supplier.supplierPayments || [];
  const totalPurchases = purchases.reduce((s, p) => s + p.netAmount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalOutstanding = purchases.reduce((s, p) => s + p.remainingAmount, 0);

  // Unpaid purchases for payment modal dropdown
  const unpaidPurchases = purchases.filter((p) => p.paymentStatus !== 'PAID');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'purchases', label: `Purchases (${purchases.length})` },
    { key: 'payments', label: `Payments (${payments.length})` },
    { key: 'ledger', label: `Ledger (${ledger.length})` },
  ];

  return (
    <div className="page-content">
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ab-btn ab-btn-outline" onClick={() => navigate('/suppliers')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <div className="section-title">{supplier.supplierName}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{supplier.supplierCode}{supplier.taxNtn ? ` · NTN: ${supplier.taxNtn}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ab-btn ab-btn-outline" onClick={openEdit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button className="ab-btn ab-btn-outline" onClick={() => setShowPayment(true)} style={{ borderColor: 'var(--blueprint)', color: 'var(--blueprint)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Record Payment
          </button>
          <button className="ab-btn ab-btn-primary" onClick={() => navigate(`/purchases/new?supplierId=${supplier.id}`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Purchase
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Purchases</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalPurchases)}</div>
          <div className="kpi-sub">{purchases.length} orders</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Paid</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">Payments made</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-top"><span className="kpi-label">Outstanding</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalOutstanding)}</div>
          <div className="kpi-sub">Amount we owe</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Current Balance</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(supplier.currentBalance)}</div>
          <div className="kpi-sub">{supplier.paymentTerms} day terms</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--rule)', marginBottom: 16 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
              color: activeTab === t.key ? 'var(--safety-orange)' : 'var(--steel)',
              borderBottom: activeTab === t.key ? '2px solid var(--safety-orange)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          {/* Info Panel */}
          <div className="panel" style={{ padding: 20, alignSelf: 'start' }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>SUPPLIER DETAILS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {supplier.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.34a2 2 0 0 1 1.99-2.19H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>{supplier.email}</span>
                </div>
              )}
              {supplier.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{supplier.address}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Status', value: <span className={`pill ${supplier.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{supplier.status}</span> },
                { label: 'Payment Terms', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{supplier.paymentTerms} days</span> },
                ...(supplier.taxNtn ? [{ label: 'NTN', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{supplier.taxNtn}</span> }] : []),
                { label: 'Current Balance', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: supplier.currentBalance > 0 ? 'var(--red-risk)' : 'var(--green-ok)' }}>{formatCurrency(supplier.currentBalance)}</span> },
                { label: 'Member Since', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(supplier.createdAt)}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>{label}</span>{value}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Recent Purchases */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--rule)' }}>RECENT PURCHASES</div>
              {purchases.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {purchases.slice(0, 5).map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.purchaseNumber}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{formatDate(p.purchaseDate)} · {p.quantity} {p.unit}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700 }}>{formatCurrency(p.netAmount)}</div>
                        <span className={`pill ${p.paymentStatus === 'PAID' ? 'pill-green' : p.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red'}`} style={{ display: 'inline-block', marginTop: 3 }}>{p.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                  {purchases.length > 5 && (
                    <button className="ab-btn ab-btn-outline" style={{ fontSize: 11 }} onClick={() => setActiveTab('purchases')}>View all {purchases.length} purchases →</button>
                  )}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No purchases yet</div>
              )}
            </div>

            {/* Recent Payments */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--rule)' }}>RECENT PAYMENTS</div>
              {payments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {payments.slice(0, 4).map((pay) => (
                    <div key={pay.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{pay.paymentNumber}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{formatDate(pay.paymentDate)} · {pay.paymentMethod}</div>
                      </div>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--blueprint)' }}>{formatCurrency(pay.amount)}</span>
                    </div>
                  ))}
                  {payments.length > 4 && (
                    <button className="ab-btn ab-btn-outline" style={{ fontSize: 11 }} onClick={() => setActiveTab('payments')}>View all payments →</button>
                  )}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No payments yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Purchases */}
      {activeTab === 'purchases' && (
        <div className="panel" style={{ padding: 20 }}>
          {purchases.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No purchase records</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Purchase #</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{p.purchaseNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(p.purchaseDate)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{p.quantity} {p.unit}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatCurrency(p.purchaseRate)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700 }}>{formatCurrency(p.netAmount)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--green-ok)' }}>{formatCurrency(p.paidAmount)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: p.remainingAmount > 0 ? 'var(--red-risk)' : 'var(--steel)' }}>{formatCurrency(p.remainingAmount)}</span></td>
                      <td style={{ textAlign: 'center' }}><span className={`pill ${p.paymentStatus === 'PAID' ? 'pill-green' : p.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red'}`}>{p.paymentStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div className="panel" style={{ padding: 20 }}>
          {payments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No payment records</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{pay.paymentNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(pay.paymentDate)}</span></td>
                      <td><span className="pill pill-steel">{pay.paymentMethod}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{pay.reference || '—'}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{pay.notes || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--blueprint)' }}>{formatCurrency(pay.amount)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Ledger */}
      {activeTab === 'ledger' && (
        <div className="panel" style={{ padding: 20 }}>
          {ledger.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No ledger entries</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry: any, i: number) => (
                    <tr key={i}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(entry.date || entry.createdAt)}</span></td>
                      <td><span style={{ fontSize: 13 }}>{entry.description || entry.transactionType || '—'}</span></td>
                      <td><span className="pill pill-steel" style={{ fontSize: 10 }}>{entry.transactionType || entry.type || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: entry.debit > 0 ? 'var(--red-risk)' : 'var(--steel)' }}>
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: entry.credit > 0 ? 'var(--green-ok)' : 'var(--steel)' }}>
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: entry.balance > 0 ? 'var(--red-risk)' : 'var(--steel)' }}>
                          {formatCurrency(entry.balance ?? 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="ab-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Edit Supplier</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Supplier Code</label><input className="ab-input" value={editForm.supplierCode} onChange={(e) => setEditForm({ ...editForm, supplierCode: e.target.value })} /></div>
                <div><label className="ab-label">Supplier Name *</label><input className="ab-input" value={editForm.supplierName} onChange={(e) => setEditForm({ ...editForm, supplierName: e.target.value })} /></div>
                <div><label className="ab-label">Contact Person</label><input className="ab-input" value={editForm.contactPerson} onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })} /></div>
                <div><label className="ab-label">Phone</label><input className="ab-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div><label className="ab-label">Email</label><input className="ab-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div><label className="ab-label">NTN / Tax No</label><input className="ab-input" value={editForm.taxNtn} onChange={(e) => setEditForm({ ...editForm, taxNtn: e.target.value })} /></div>
                <div><label className="ab-label">Payment Terms (days)</label><input className="ab-input" type="number" value={editForm.paymentTerms} onChange={(e) => setEditForm({ ...editForm, paymentTerms: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Address</label><input className="ab-input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Update Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="ab-modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Payment — {supplier.supplierName}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={paymentForm.paymentNumber} onChange={(e) => setPaymentForm({ ...paymentForm, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></div>
                {unpaidPurchases.length > 0 && (
                  <div className="span-2">
                    <label className="ab-label">Against Purchase (Optional)</label>
                    <select className="ab-input ab-select" value={paymentForm.purchaseId} onChange={(e) => setPaymentForm({ ...paymentForm, purchaseId: e.target.value })}>
                      <option value="">General payment</option>
                      {unpaidPurchases.map((p) => <option key={p.id} value={p.id}>{p.purchaseNumber} — Remaining: {formatCurrency(p.remainingAmount)}</option>)}
                    </select>
                  </div>
                )}
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="span-2"><label className="ab-label">Reference</label><input className="ab-input" placeholder="Cheque no / TXN ID" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--steel)' }}>Current Payable Balance</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--red-risk)' }}>{formatCurrency(supplier.currentBalance)}</span>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowPayment(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleRecordPayment} disabled={paymentSaving}>{paymentSaving ? 'Saving...' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
