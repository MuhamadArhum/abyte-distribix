import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { purchasesApi, suppliersApi, gasProductsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Supplier, GasProduct } from '@/types';

export default function NewPurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledSupplierId = searchParams.get('supplierId') || '';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    purchaseNumber: `PUR-${Date.now()}`, supplierId: prefilledSupplierId, gasProductId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: 0, unit: 'KG', purchaseRate: 0, transportation: 0, otherCharges: 0, discount: 0,
    supplierInvoiceNumber: '', notes: '',
  });

  useEffect(() => {
    Promise.all([suppliersApi.getAll(), gasProductsApi.getAll()]).then(([s, p]) => {
      setSuppliers(s.data); setProducts(p.data);
    });
  }, []);

  const gasAmount = form.quantity * form.purchaseRate;
  const grossAmount = gasAmount + form.transportation + form.otherCharges;
  const netAmount = grossAmount - form.discount;

  const handleProductChange = (id: string) => {
    const product = products.find((p) => p.id === id);
    setForm({ ...form, gasProductId: id, purchaseRate: product?.defaultPurchaseRate || 0, unit: product?.unit || 'KG' });
  };

  const handleSave = async () => {
    if (!form.supplierId || !form.gasProductId || form.quantity <= 0) { alert('Please fill all required fields'); return; }
    setSaving(true);
    try { await purchasesApi.create(form); navigate('/purchases'); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to create purchase'); }
    finally { setSaving(false); }
  };

  const inp = (label: string, key: keyof typeof form, type = 'text', className = '') => (
    <div className={className}>
      <label className="ab-label">{label}</label>
      <input className="ab-input" type={type} value={form[key] as any}
        onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} />
    </div>
  );

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button className="ab-btn ab-btn-outline" onClick={() => navigate('/purchases')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div>
          <div className="section-title">New Purchase</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Record a new gas purchase</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        <div className="panel" style={{ padding: 24 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            PURCHASE DETAILS
          </div>
          <div className="ab-form-grid">
            {inp('Purchase Number *', 'purchaseNumber')}
            {inp('Purchase Date *', 'purchaseDate', 'date')}
            <div>
              <label className="ab-label">Supplier *</label>
              <select className="ab-input ab-select" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplierName}</option>)}
              </select>
            </div>
            <div>
              <label className="ab-label">Gas Product *</label>
              <select className="ab-input ab-select" value={form.gasProductId} onChange={(e) => handleProductChange(e.target.value)}>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.productName}</option>)}
              </select>
            </div>
            {inp('Quantity *', 'quantity', 'number')}
            {inp('Unit', 'unit')}
            {inp('Purchase Rate (PKR/KG)', 'purchaseRate', 'number')}
            {inp('Transportation (PKR)', 'transportation', 'number')}
            {inp('Other Charges', 'otherCharges', 'number')}
            {inp('Discount', 'discount', 'number')}
            {inp('Supplier Invoice No', 'supplierInvoiceNumber')}
            {inp('Notes', 'notes', 'text', 'span-2')}
          </div>
        </div>

        {/* Summary */}
        <div className="panel" style={{ padding: 20, position: 'sticky', top: 16 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            PURCHASE SUMMARY
          </div>
          {[
            { label: 'Gas Amount', value: formatCurrency(gasAmount) },
            { label: 'Transportation', value: formatCurrency(form.transportation) },
            { label: 'Other Charges', value: formatCurrency(form.otherCharges) },
            { label: 'Gross Amount', value: formatCurrency(grossAmount) },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: 'var(--steel)' }}>{label}</span>
              <span style={{ fontFamily: 'IBM Plex Mono,monospace' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
            <span style={{ color: 'var(--steel)' }}>Discount</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--red-risk)' }}>-{formatCurrency(form.discount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 12, borderTop: '2px solid var(--rule)', marginTop: 4 }}>
            <span>Net Amount</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--safety-orange)' }}>{formatCurrency(netAmount)}</span>
          </div>
          <button className="ab-btn ab-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
