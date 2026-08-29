import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { salesApi, customersApi, cylindersApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Customer, CylinderType } from '@/types';

interface SaleItemForm { cylinderTypeId: string; quantity: number; unitPrice: number; discount: number; }

export default function NewSalePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCustomerId = searchParams.get('customerId') || '';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoiceNumber: `INV-${Date.now()}`, customerId: prefilledCustomerId,
    saleDate: new Date().toISOString().split('T')[0],
    discount: 0, paidAmount: 0, paymentMethod: 'CASH', notes: '',
  });
  const [items, setItems] = useState<SaleItemForm[]>([{ cylinderTypeId: '', quantity: 1, unitPrice: 0, discount: 0 }]);

  useEffect(() => {
    Promise.all([customersApi.getAll(), cylindersApi.getAll()]).then(([c, cy]) => { setCustomers(c.data); setCylinderTypes(cy.data); });
  }, []);

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === form.customerId), [customers, form.customerId]);

  const addItem = () => setItems([...items, { cylinderTypeId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof SaleItemForm, value: any) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleCylinderChange = (i: number, id: string) => {
    const cyl = cylinderTypes.find((c) => c.id === id);
    const prices = cyl?.sellingPrices ? JSON.parse(cyl.sellingPrices) : [];
    const defaultPrice = prices[0]?.price || 0;
    setItems(items.map((item, idx) => idx === i ? { ...item, cylinderTypeId: id, unitPrice: defaultPrice } : item));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discount), 0);
  const netTotal = subtotal - form.discount;
  const remaining = netTotal - form.paidAmount;

  const customerBalance = selectedCustomer?.currentBalance ?? 0;
  const creditLimit = selectedCustomer?.creditLimit ?? 0;
  const balanceAfterSale = customerBalance + remaining;
  const overLimit = creditLimit > 0 && balanceAfterSale > creditLimit;

  const handleSave = async () => {
    if (!form.customerId || items.some((i) => !i.cylinderTypeId)) { alert('Please fill all required fields'); return; }
    if (overLimit && !confirm(`Warning: This sale will exceed the customer's credit limit of ${formatCurrency(creditLimit)}. Proceed anyway?`)) return;
    setSaving(true);
    try { await salesApi.create({ ...form, items }); navigate('/sales'); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="ab-btn ab-btn-outline" onClick={() => navigate('/sales')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div>
          <div className="section-title">New Sale</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Create a new sales invoice</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sale Info */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              SALE INFORMATION
            </div>
            <div className="ab-form-grid">
              <div>
                <label className="ab-label">Invoice Number</label>
                <input className="ab-input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
              <div>
                <label className="ab-label">Sale Date</label>
                <input className="ab-input" type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
              </div>
              <div className="span-2">
                <label className="ab-label">Customer *</label>
                <select className="ab-input ab-select" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.businessName}</option>)}
                </select>
              </div>
              <div>
                <label className="ab-label">Payment Method</label>
                <select className="ab-input ab-select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {['CASH', 'CREDIT', 'BANK', 'CHEQUE'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="ab-label">Notes</label>
                <input className="ab-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {/* Customer balance info */}
            {selectedCustomer && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--radius)', border: `1px solid ${overLimit ? 'var(--red-risk)' : 'var(--rule)'}`, background: overLimit ? 'rgba(220,38,38,0.06)' : 'var(--paper)' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace' }}>Current Balance: </span>
                    <span style={{ fontWeight: 700, color: customerBalance > 0 ? 'var(--amber-warn)' : 'var(--green-ok)', fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(customerBalance)}</span>
                  </div>
                  {creditLimit > 0 && (
                    <div>
                      <span style={{ color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace' }}>Credit Limit: </span>
                      <span style={{ fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(creditLimit)}</span>
                    </div>
                  )}
                  {creditLimit > 0 && (
                    <div>
                      <span style={{ color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace' }}>After This Sale: </span>
                      <span style={{ fontWeight: 700, color: overLimit ? 'var(--red-risk)' : 'var(--ink)', fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(balanceAfterSale)}</span>
                    </div>
                  )}
                  {overLimit && <span style={{ color: 'var(--red-risk)', fontWeight: 700, fontSize: 11, fontFamily: 'Oswald,sans-serif', letterSpacing: '0.05em' }}>▲ CREDIT LIMIT EXCEEDED</span>}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)' }}>ITEMS</span>
              <button className="ab-btn ab-btn-outline" style={{ fontSize: 12 }} onClick={addItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Item
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, i) => {
                const rowSubtotal = item.quantity * item.unitPrice - item.discount;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 100px auto', gap: 8, alignItems: 'flex-end' }}>
                    <div>
                      <label className="ab-label" style={{ fontSize: 10 }}>Cylinder Type</label>
                      <select className="ab-input ab-select" value={item.cylinderTypeId} onChange={(e) => handleCylinderChange(i, e.target.value)}>
                        <option value="">Select</option>
                        {cylinderTypes.map((c) => <option key={c.id} value={c.id}>{c.cylinderSize}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="ab-label" style={{ fontSize: 10 }}>Qty</label>
                      <input className="ab-input" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="ab-label" style={{ fontSize: 10 }}>Unit Price</label>
                      <input className="ab-input" type="number" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))} />
                    </div>
                    <div style={{ textAlign: 'right', paddingBottom: 6 }}>
                      <div style={{ fontSize: 10, color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', marginBottom: 2 }}>Subtotal</div>
                      <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 700, color: 'var(--safety-orange)' }}>{formatCurrency(rowSubtotal)}</div>
                    </div>
                    <button className="ab-btn ab-btn-icon danger" style={{ alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeItem(i)} disabled={items.length === 1}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="panel" style={{ padding: 20, position: 'sticky', top: 16 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            SUMMARY
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--steel)' }}>Subtotal</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace' }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--steel)' }}>Discount</span>
            <input className="ab-input" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} style={{ width: 100, textAlign: 'right', padding: '4px 8px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 12, borderTop: '2px solid var(--rule)', marginBottom: 12 }}>
            <span>Net Total</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--safety-orange)' }}>{formatCurrency(netTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--steel)' }}>Amount Paid</span>
            <input className="ab-input" type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} style={{ width: 100, textAlign: 'right', padding: '4px 8px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 20 }}>
            <span style={{ color: 'var(--steel)' }}>Remaining</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: remaining > 0 ? 'var(--amber-warn)' : 'var(--green-ok)' }}>{formatCurrency(remaining)}</span>
          </div>
          {overLimit && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid var(--red-risk)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--red-risk)', fontFamily: 'IBM Plex Mono,monospace' }}>
              Credit limit will be exceeded
            </div>
          )}
          <button className="ab-btn ab-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {saving ? 'Creating...' : 'Create Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
