import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersApi, paymentsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer, Sale, CustomerPayment } from '@/types';

type Tab = 'overview' | 'sales' | 'payments' | 'ledger';

const METHODS = ['CASH', 'BANK', 'CHEQUE', 'ONLINE'];

const EDIT_FORM_DEFAULTS = { customerCode: '', businessName: '', contactPerson: '', phone: '', email: '', address: '', customerType: 'RETAIL', creditLimit: 0, paymentTerms: 30 };

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer & { sales?: Sale[]; customerPayments?: CustomerPayment[] } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Edit
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(EDIT_FORM_DEFAULTS);
  const [saving, setSaving] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ paymentNumber: `CPAY-${Date.now()}`, customerId: id || '', paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => { if (id) loadAll(); }, [id]);

  const loadAll = async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        customersApi.getOne(id!),
        customersApi.getLedger(id!).catch(() => ({ data: [] })),
      ]);
      setCustomer(cRes.data);
      setLedger(lRes.data);
    } catch { navigate('/customers'); }
    finally { setLoading(false); }
  };

  const openEdit = () => {
    if (!customer) return;
    setEditForm({ customerCode: customer.customerCode, businessName: customer.businessName, contactPerson: customer.contactPerson || '', phone: customer.phone, email: customer.email || '', address: customer.address || '', customerType: customer.customerType, creditLimit: customer.creditLimit, paymentTerms: customer.paymentTerms });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try { await customersApi.update(id!, editForm); setShowEdit(false); loadAll(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount) { alert('Amount required'); return; }
    setPaymentSaving(true);
    try {
      await paymentsApi.createCustomerPayment({ ...paymentForm, customerId: id });
      setShowPayment(false);
      setPaymentForm({ paymentNumber: `CPAY-${Date.now()}`, customerId: id || '', paymentDate: new Date().toISOString().split('T')[0], amount: 0, paymentMethod: 'CASH', reference: '', notes: '' });
      loadAll();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setPaymentSaving(false); }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;
  if (!customer) return null;

  const totalSales = (customer.sales || []).reduce((s, x) => s + x.netTotal, 0);
  const totalPaid = (customer.sales || []).reduce((s, x) => s + x.paidAmount, 0);
  const outstanding = (customer.sales || []).reduce((s, x) => s + x.remainingAmount, 0);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sales', label: `Sales (${(customer.sales || []).length})` },
    { key: 'payments', label: `Payments (${(customer.customerPayments || []).length})` },
    { key: 'ledger', label: `Ledger (${ledger.length})` },
  ];

  return (
    <div className="page-content">
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ab-btn ab-btn-outline" onClick={() => navigate('/customers')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <div className="section-title">{customer.businessName}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{customer.customerCode} · {customer.customerType}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ab-btn ab-btn-outline" onClick={openEdit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button className="ab-btn ab-btn-outline" onClick={() => setShowPayment(true)} style={{ borderColor: 'var(--green-ok)', color: 'var(--green-ok)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Record Payment
          </button>
          <button className="ab-btn ab-btn-primary" onClick={() => navigate(`/sales/new?customerId=${customer.id}`)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Sale
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Sales</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(totalSales)}</div>
          <div className="kpi-sub">{(customer.sales || []).length} invoices</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Total Received</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(totalPaid)}</div>
          <div className="kpi-sub">Payments collected</div>
        </div>
        <div className="kpi-card alt">
          <div className="kpi-top"><span className="kpi-label">Outstanding</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(outstanding)}</div>
          <div className="kpi-sub">Remaining balance</div>
        </div>
        <div className={`kpi-card ${customer.currentBalance > customer.creditLimit ? 'red' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Credit Limit</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(customer.creditLimit)}</div>
          <div className="kpi-sub" style={{ color: customer.currentBalance > customer.creditLimit ? 'var(--red-risk)' : undefined }}>
            {customer.currentBalance > customer.creditLimit ? '▲ Exceeded' : `Used: ${formatCurrency(customer.currentBalance)}`}
          </div>
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
          <div className="panel" style={{ padding: 20, alignSelf: 'start' }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>CONTACT INFORMATION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.34a2 2 0 0 1 1.99-2.19H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{customer.address}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Type', value: <span className="pill pill-steel">{customer.customerType}</span> },
                { label: 'Status', value: <span className={`pill ${customer.status === 'ACTIVE' ? 'pill-green' : 'pill-steel'}`}>{customer.status}</span> },
                { label: 'Payment Terms', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{customer.paymentTerms} days</span> },
                { label: 'Current Balance', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: customer.currentBalance > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>{formatCurrency(customer.currentBalance)}</span> },
                { label: 'Member Since', value: <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(customer.createdAt)}</span> },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>{label}</span>{value}
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Recent Sales */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--rule)' }}>RECENT SALES</div>
              {(customer.sales || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(customer.sales || []).slice(0, 5).map((sale) => (
                    <div key={sale.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{sale.invoiceNumber}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{formatDate(sale.saleDate)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700 }}>{formatCurrency(sale.netTotal)}</div>
                        <span className={`pill ${sale.paymentStatus === 'PAID' ? 'pill-green' : sale.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red'}`} style={{ display: 'inline-block', marginTop: 3 }}>{sale.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                  {(customer.sales || []).length > 5 && (
                    <button className="ab-btn ab-btn-outline" style={{ fontSize: 11 }} onClick={() => setActiveTab('sales')}>View all {(customer.sales || []).length} sales →</button>
                  )}
                </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No sales yet</div>
              )}
            </div>
            {/* Recent Payments */}
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--rule)' }}>RECENT PAYMENTS</div>
              {(customer.customerPayments || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(customer.customerPayments || []).slice(0, 4).map((pay) => (
                    <div key={pay.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                      <div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{pay.paymentNumber}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{formatDate(pay.paymentDate)} · {pay.paymentMethod}</div>
                      </div>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--green-ok)' }}>{formatCurrency(pay.amount)}</span>
                    </div>
                  ))}
                  {(customer.customerPayments || []).length > 4 && (
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

      {/* Tab: Sales */}
      {activeTab === 'sales' && (
        <div className="panel" style={{ padding: 20 }}>
          {(customer.sales || []).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No sales records</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Payment Method</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(customer.sales || []).map((sale) => (
                    <tr key={sale.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{sale.invoiceNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(sale.saleDate)}</span></td>
                      <td><span className="pill pill-steel">{sale.paymentMethod}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700 }}>{formatCurrency(sale.netTotal)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--green-ok)' }}>{formatCurrency(sale.paidAmount)}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: sale.remainingAmount > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>{formatCurrency(sale.remainingAmount)}</span></td>
                      <td style={{ textAlign: 'center' }}><span className={`pill ${sale.paymentStatus === 'PAID' ? 'pill-green' : sale.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red'}`}>{sale.paymentStatus}</span></td>
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
          {(customer.customerPayments || []).length === 0 ? (
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
                  {(customer.customerPayments || []).map((pay) => (
                    <tr key={pay.id}>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 600 }}>{pay.paymentNumber}</span></td>
                      <td><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatDate(pay.paymentDate)}</span></td>
                      <td><span className="pill pill-steel">{pay.paymentMethod}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{pay.reference || '—'}</span></td>
                      <td><span style={{ fontSize: 12, color: 'var(--steel)' }}>{pay.notes || '—'}</span></td>
                      <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--green-ok)' }}>{formatCurrency(pay.amount)}</span></td>
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
                        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700, color: entry.balance > 0 ? 'var(--amber-warn)' : 'var(--steel)' }}>
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
              <span className="ab-modal-title">Edit Customer</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowEdit(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Customer Code</label><input className="ab-input" value={editForm.customerCode} onChange={(e) => setEditForm({ ...editForm, customerCode: e.target.value })} /></div>
                <div><label className="ab-label">Business Name *</label><input className="ab-input" value={editForm.businessName} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} /></div>
                <div><label className="ab-label">Contact Person</label><input className="ab-input" value={editForm.contactPerson} onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })} /></div>
                <div><label className="ab-label">Phone *</label><input className="ab-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div><label className="ab-label">Email</label><input className="ab-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div>
                  <label className="ab-label">Customer Type</label>
                  <select className="ab-input ab-select" value={editForm.customerType} onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })}>
                    {['RETAIL','DEALER','COMMERCIAL','INDIVIDUAL'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Credit Limit (PKR)</label><input className="ab-input" type="number" value={editForm.creditLimit} onChange={(e) => setEditForm({ ...editForm, creditLimit: Number(e.target.value) })} /></div>
                <div><label className="ab-label">Payment Terms (days)</label><input className="ab-input" type="number" value={editForm.paymentTerms} onChange={(e) => setEditForm({ ...editForm, paymentTerms: Number(e.target.value) })} /></div>
                <div className="span-2"><label className="ab-label">Address</label><input className="ab-input" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Update Customer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="ab-modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Payment — {customer.businessName}</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowPayment(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div className="ab-form-grid">
                <div><label className="ab-label">Payment Number</label><input className="ab-input" value={paymentForm.paymentNumber} onChange={(e) => setPaymentForm({ ...paymentForm, paymentNumber: e.target.value })} /></div>
                <div><label className="ab-label">Payment Date</label><input className="ab-input" type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></div>
                <div><label className="ab-label">Amount (PKR) *</label><input className="ab-input" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} /></div>
                <div>
                  <label className="ab-label">Payment Method</label>
                  <select className="ab-input ab-select" value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="ab-label">Reference</label><input className="ab-input" placeholder="Cheque no / TXN ID" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></div>
                <div><label className="ab-label">Notes</label><input className="ab-input" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--steel)' }}>Current Balance</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: 'var(--amber-warn)' }}>{formatCurrency(customer.currentBalance)}</span>
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
