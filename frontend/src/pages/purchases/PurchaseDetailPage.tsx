import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchasesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Purchase } from '@/types';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    purchasesApi.getOne(id).then((r) => setPurchase(r.data)).catch(() => navigate('/purchases')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;
  if (!purchase) return null;

  const statusClass = purchase.paymentStatus === 'PAID' ? 'pill-green' : purchase.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red';
  const statusColor = purchase.paymentStatus === 'PAID' ? 'var(--green-ok)' : purchase.paymentStatus === 'PARTIAL' ? 'var(--amber-warn)' : 'var(--red-risk)';

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ab-btn ab-btn-outline" onClick={() => navigate('/purchases')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <div className="section-title">{purchase.purchaseNumber}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
              {purchase.supplier?.supplierName} · {formatDate(purchase.purchaseDate)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`pill ${statusClass}`} style={{ fontSize: 12, padding: '4px 12px' }}>{purchase.paymentStatus}</span>
          <button className="ab-btn ab-btn-outline" onClick={() => window.print()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Net Amount</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(purchase.netAmount)}</div>
          <div className="kpi-sub">Total payable</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Paid</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(purchase.paidAmount)}</div>
          <div className="kpi-sub">Amount paid</div>
        </div>
        <div className={`kpi-card ${purchase.remainingAmount > 0 ? 'alt' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Remaining</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: statusColor }}>{formatCurrency(purchase.remainingAmount)}</div>
          <div className="kpi-sub">Balance due</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Quantity</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{purchase.quantity}</div>
          <div className="kpi-sub">{purchase.unit}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Cost Breakdown */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            COST BREAKDOWN
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="row-title">Gas Amount</div>
                  <div className="row-sub">{purchase.quantity} {purchase.unit} × {formatCurrency(purchase.purchaseRate)}/unit</div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 600 }}>{formatCurrency(purchase.gasAmount)}</span>
                </td>
              </tr>
              {purchase.transportation > 0 && (
                <tr>
                  <td><span className="row-title">Transportation</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13 }}>{formatCurrency(purchase.transportation)}</span></td>
                </tr>
              )}
              {purchase.otherCharges > 0 && (
                <tr>
                  <td><span className="row-title">Other Charges</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13 }}>{formatCurrency(purchase.otherCharges)}</span></td>
                </tr>
              )}
              <tr>
                <td><span style={{ color: 'var(--steel)', fontSize: 12 }}>Gross Amount</span></td>
                <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13 }}>{formatCurrency(purchase.grossAmount)}</span></td>
              </tr>
              {purchase.discount > 0 && (
                <tr>
                  <td><span style={{ color: 'var(--red-risk)', fontSize: 12 }}>Discount</span></td>
                  <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, color: 'var(--red-risk)' }}>- {formatCurrency(purchase.discount)}</span></td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Net total row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, padding: '14px 0 0', borderTop: '2px solid var(--rule)', marginTop: 8 }}>
            <span>Net Amount</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--safety-orange)' }}>{formatCurrency(purchase.netAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 10 }}>
            <span style={{ color: 'var(--steel)' }}>Amount Paid</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--green-ok)', fontWeight: 600 }}>{formatCurrency(purchase.paidAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}>
            <span style={{ color: 'var(--steel)' }}>Remaining</span>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: statusColor }}>{formatCurrency(purchase.remainingAmount)}</span>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            PURCHASE INFO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { label: 'Supplier', val: purchase.supplier?.supplierName || '—' },
              { label: 'Gas Product', val: purchase.gasProduct?.productName || '—' },
              { label: 'Purchase Date', val: formatDate(purchase.purchaseDate) },
              { label: 'Purchase Rate', val: `${formatCurrency(purchase.purchaseRate)} / ${purchase.unit}` },
              { label: 'Supplier Invoice', val: purchase.supplierInvoiceNumber || '—' },
              { label: 'Created', val: formatDate(purchase.createdAt) },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
                <span style={{ color: 'var(--steel)', flexShrink: 0 }}>{label}</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, textAlign: 'right' }}>{val}</span>
              </div>
            ))}
            {purchase.notes && (
              <div style={{ fontSize: 12, color: 'var(--steel)', paddingTop: 8, borderTop: '1px solid var(--rule)', marginTop: 4 }}>
                {purchase.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
