import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Sale } from '@/types';

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    salesApi.getOne(id).then((r) => setSale(r.data)).catch(() => navigate('/sales')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;
  if (!sale) return null;

  const statusColor = sale.paymentStatus === 'PAID' ? 'var(--green-ok)' : sale.paymentStatus === 'PARTIAL' ? 'var(--amber-warn)' : 'var(--red-risk)';
  const statusClass = sale.paymentStatus === 'PAID' ? 'pill-green' : sale.paymentStatus === 'PARTIAL' ? 'pill-amber' : 'pill-red';

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="ab-btn ab-btn-outline" onClick={() => navigate('/sales')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <div className="section-title">{sale.invoiceNumber}</div>
            <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>
              {sale.customer?.businessName} · {formatDate(sale.saleDate)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`pill ${statusClass}`} style={{ fontSize: 12, padding: '4px 12px' }}>{sale.paymentStatus}</span>
          <button className="ab-btn ab-btn-outline" onClick={() => window.print()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Net Total</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(sale.netTotal)}</div>
          <div className="kpi-sub">Invoice amount</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Paid</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: 'var(--green-ok)' }}>{formatCurrency(sale.paidAmount)}</div>
          <div className="kpi-sub">Amount received</div>
        </div>
        <div className={`kpi-card ${sale.remainingAmount > 0 ? 'alt' : ''}`}>
          <div className="kpi-top"><span className="kpi-label">Remaining</span></div>
          <div className="kpi-value" style={{ fontSize: 18, color: statusColor }}>{formatCurrency(sale.remainingAmount)}</div>
          <div className="kpi-sub">Balance due</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span className="kpi-label">Discount</span></div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{formatCurrency(sale.discount)}</div>
          <div className="kpi-sub">Applied discount</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* Items */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
            SALE ITEMS
          </div>
          {(sale.saleItems || []).length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cylinder</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Discount</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.saleItems || []).map((item) => (
                  <tr key={item.id}>
                    <td><span className="row-title">{item.cylinderType?.cylinderSize || '—'}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{item.quantity}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>{formatCurrency(item.unitPrice)}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--steel)' }}>{item.discount > 0 ? formatCurrency(item.discount) : '—'}</span></td>
                    <td style={{ textAlign: 'right' }}><span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, fontWeight: 700 }}>{formatCurrency(item.totalPrice)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No items</div>
          )}
        </div>

        {/* Summary + Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Invoice Summary */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              INVOICE SUMMARY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Subtotal', val: formatCurrency(sale.subtotal), color: 'var(--ink)' },
                { label: 'Discount', val: `- ${formatCurrency(sale.discount)}`, color: 'var(--red-risk)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--steel)' }}>{label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', color }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, paddingTop: 10, borderTop: '2px solid var(--rule)', marginTop: 2 }}>
                <span>Net Total</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--safety-orange)' }}>{formatCurrency(sale.netTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--steel)' }}>Amount Paid</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', color: 'var(--green-ok)', fontWeight: 600 }}>{formatCurrency(sale.paidAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--steel)' }}>Remaining</span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, color: statusColor }}>{formatCurrency(sale.remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--steel)', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--rule)' }}>
              INVOICE INFO
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Customer', val: sale.customer?.businessName || '—' },
                { label: 'Sale Date', val: formatDate(sale.saleDate) },
                { label: 'Payment Method', val: sale.paymentMethod },
                { label: 'Created', val: formatDate(sale.createdAt) },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
                  <span style={{ color: 'var(--steel)', flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
              {sale.notes && (
                <div style={{ fontSize: 12, color: 'var(--steel)', paddingTop: 8, borderTop: '1px solid var(--rule)', marginTop: 4 }}>
                  {sale.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
