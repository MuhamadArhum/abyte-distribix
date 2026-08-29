import React, { useEffect, useState } from 'react';
import { inventoryApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { StorageTank } from '@/types';

export default function InventoryPage() {
  const [gasTanks, setGasTanks] = useState<StorageTank[]>([]);
  const [cylinderStock, setCylinderStock] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([inventoryApi.getGasStock(), inventoryApi.getCylinderStock(), inventoryApi.getTransactions()])
      .then(([g, c, t]) => { setGasTanks(g.data); setCylinderStock(c.data); setTransactions(t.data); })
      .catch(() => alert('Failed to load inventory'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;

  const txnPill = (t: string) => {
    if (t === 'RECEIVING') return <span className="pill pill-green">{t}</span>;
    if (t === 'FILLING') return <span className="pill pill-amber">{t}</span>;
    return <span className="pill pill-steel">{t}</span>;
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <div className="section-title">Inventory</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Current gas and cylinder stock levels</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Gas Stock */}
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              <span className="section-title" style={{ fontSize: 13 }}>Gas Stock</span>
            </div>
          </div>
          {gasTanks.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12 }}>No tanks configured</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gasTanks.map((tank) => {
                const pct = tank.capacity > 0 ? Math.round((tank.currentQuantity / tank.capacity) * 100) : 0;
                const barColor = pct > 60 ? 'var(--green-ok)' : pct > 30 ? 'var(--amber-warn)' : 'var(--red-risk)';
                return (
                  <div key={tank.id} style={{ padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{tank.tankName}</div>
                        <div style={{ fontSize: 11, color: 'var(--steel)' }}>{tank.gasProduct?.productName}</div>
                      </div>
                      <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 13, fontWeight: 600 }}>{tank.currentQuantity} KG</span>
                    </div>
                    <div style={{ background: 'var(--rule)', borderRadius: 3, height: 6 }}>
                      <div style={{ background: barColor, height: '100%', width: `${pct}%`, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4, fontFamily: 'IBM Plex Mono,monospace' }}>{pct}% of {tank.capacity} KG</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cylinder Stock */}
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/></svg>
              <span className="section-title" style={{ fontSize: 13 }}>Cylinder Stock</span>
            </div>
          </div>
          {cylinderStock.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12 }}>No cylinder inventory</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cylinderStock.map((inv) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{inv.cylinderType?.cylinderSize}</div>
                    <span className="pill pill-steel" style={{ marginTop: 4, display: 'inline-block' }}>{inv.status}</span>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 22, fontWeight: 700, color: inv.status === 'FILLED' ? 'var(--green-ok)' : 'var(--amber-warn)' }}>{inv.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="panel">
        <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 12 }}>
          <span className="section-title" style={{ fontSize: 13 }}>Recent Inventory Transactions</span>
        </div>
        {transactions.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12 }}>No transactions yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transactions.slice(0, 20).map((txn) => (
              <div key={txn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div>
                  {txnPill(txn.transactionType)}
                  <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 4, fontFamily: 'IBM Plex Mono,monospace' }}>{txn.tank?.tankName} · {formatDate(txn.createdAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, fontSize: 13 }}>{txn.quantity} KG</div>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{txn.previousStock} → {txn.newStock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
