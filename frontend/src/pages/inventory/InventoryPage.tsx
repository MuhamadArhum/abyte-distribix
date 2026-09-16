import React, { useEffect, useState } from 'react';
import { inventoryApi, storageTanksApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/shared/Pagination';
import { SearchPicker } from '@/components/shared/SearchPicker';
import type { StorageTank } from '@/types';

const ADJUSTMENT_FORM = { tankId: '', quantity: 0, notes: '' };

export default function InventoryPage() {
  const [gasTanks, setGasTanks] = useState<StorageTank[]>([]);
  const [gasTotal, setGasTotal] = useState(0);
  const [gasSearchInput, setGasSearchInput] = useState('');
  const [gasSearch, setGasSearch] = useState('');
  const [gasPage, setGasPage] = useState(1);
  const [gasPageSize, setGasPageSize] = useState(10);

  const [cylinderStock, setCylinderStock] = useState<any[]>([]);
  const [cylTotal, setCylTotal] = useState(0);
  const [cylSearchInput, setCylSearchInput] = useState('');
  const [cylSearch, setCylSearch] = useState('');
  const [cylPage, setCylPage] = useState(1);
  const [cylPageSize, setCylPageSize] = useState(10);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdjust, setShowAdjust] = useState(false);
  const [tankLabel, setTankLabel] = useState('');
  const [selectedTank, setSelectedTank] = useState<StorageTank | null>(null);
  const [adjustForm, setAdjustForm] = useState(ADJUSTMENT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGasSearch(gasSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [gasSearchInput]);
  useEffect(() => {
    const t = setTimeout(() => setCylSearch(cylSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [cylSearchInput]);

  useEffect(() => { setGasPage(1); }, [gasSearch]);
  useEffect(() => { setCylPage(1); }, [cylSearch]);

  const loadGasStock = () => {
    inventoryApi.getGasStock({ search: gasSearch || undefined, page: gasPage, limit: gasPageSize })
      .then((r) => { setGasTanks(r.data.data); setGasTotal(r.data.total); });
  };
  const loadCylinderStock = () => {
    inventoryApi.getCylinderStock({ search: cylSearch || undefined, page: cylPage, limit: cylPageSize })
      .then((r) => { setCylinderStock(r.data.data); setCylTotal(r.data.total); });
  };

  useEffect(() => { loadGasStock(); }, [gasSearch, gasPage, gasPageSize]);
  useEffect(() => { loadCylinderStock(); }, [cylSearch, cylPage, cylPageSize]);

  useEffect(() => {
    inventoryApi.getTransactions().then((r) => setTransactions(r.data)).finally(() => setLoading(false));
  }, []);

  const { paged: txnPaged, page: txnPage, pageSize: txnPageSize, setPage: setTxnPage, setPageSize: setTxnPageSize } = usePagination(transactions);

  const openAdjust = () => {
    setSelectedTank(null); setTankLabel(''); setAdjustForm(ADJUSTMENT_FORM); setShowAdjust(true);
  };

  const handleSaveAdjustment = async () => {
    if (!adjustForm.tankId) { alert('Select a storage tank'); return; }
    if (!adjustForm.quantity) { alert('Enter a non-zero adjustment quantity'); return; }
    setSaving(true);
    try {
      await inventoryApi.createAdjustment(adjustForm);
      setShowAdjust(false);
      loadGasStock();
      inventoryApi.getTransactions().then((r) => setTransactions(r.data));
    } catch (e: any) { alert(e.response?.data?.message || 'Adjustment failed'); }
    finally { setSaving(false); }
  };

  const txnPill = (t: string) => {
    if (t === 'RECEIVING') return <span className="pill pill-green">{t}</span>;
    if (t === 'FILLING') return <span className="pill pill-amber">{t}</span>;
    if (t === 'ADJUSTMENT') return <span className="pill pill-blue">{t}</span>;
    return <span className="pill pill-steel">{t}</span>;
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>;

  return (
    <div className="page-content">
      <div className="panel-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-title">Inventory</div>
          <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Current gas and cylinder stock levels</div>
        </div>
        <button className="ab-btn ab-btn-primary" onClick={openAdjust}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Record Adjustment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Gas Stock */}
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              <span className="section-title" style={{ fontSize: 13 }}>Gas Stock</span>
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{gasTotal} tanks</span>
          </div>
          <input className="ab-input" placeholder="Search tank name..." value={gasSearchInput} onChange={(e) => setGasSearchInput(e.target.value)} style={{ marginBottom: 10, width: '100%' }} />
          {gasTanks.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12 }}>No tanks found</div>
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
          <Pagination total={gasTotal} page={gasPage} pageSize={gasPageSize} onPageChange={setGasPage} onPageSizeChange={(s) => { setGasPageSize(s); setGasPage(1); }} />
        </div>

        {/* Cylinder Stock */}
        <div className="panel">
          <div className="panel-head" style={{ borderBottom: '1px solid var(--rule)', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--safety-orange)" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/></svg>
              <span className="section-title" style={{ fontSize: 13 }}>Cylinder Stock</span>
            </div>
            <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{cylTotal} records</span>
          </div>
          <input className="ab-input" placeholder="Search cylinder size..." value={cylSearchInput} onChange={(e) => setCylSearchInput(e.target.value)} style={{ marginBottom: 10, width: '100%' }} />
          {cylinderStock.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12 }}>No cylinder inventory found</div>
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
          <Pagination total={cylTotal} page={cylPage} pageSize={cylPageSize} onPageChange={setCylPage} onPageSizeChange={(s) => { setCylPageSize(s); setCylPage(1); }} />
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
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {txnPaged.map((txn) => (
                <div key={txn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                  <div>
                    {txnPill(txn.transactionType)}
                    <div style={{ fontSize: 12, color: 'var(--steel)', marginTop: 4, fontFamily: 'IBM Plex Mono,monospace' }}>{txn.tank?.tankName} · {formatDate(txn.createdAt)}</div>
                    {txn.notes && <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{txn.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600, fontSize: 13, color: txn.quantity < 0 ? 'var(--red-risk)' : 'var(--green-ok)' }}>{txn.quantity > 0 ? '+' : ''}{txn.quantity} KG</div>
                    <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{txn.previousStock} → {txn.newStock}</div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination total={transactions.length} page={txnPage} pageSize={txnPageSize} onPageChange={setTxnPage} onPageSizeChange={setTxnPageSize} />
          </>
        )}
      </div>

      {/* Record Adjustment Modal */}
      {showAdjust && (
        <div className="ab-modal-overlay" onClick={() => setShowAdjust(false)}>
          <div className="ab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ab-modal-head">
              <span className="ab-modal-title">Record Stock Adjustment</span>
              <button className="ab-btn ab-btn-icon" onClick={() => setShowAdjust(false)}>✕</button>
            </div>
            <div className="ab-modal-body">
              <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--steel)' }}>
                Use this to correct a tank's recorded stock against a physical count (leak, spillage, counting error). Positive quantity adds stock, negative subtracts.
              </div>
              <div className="ab-form-grid">
                <div className="span-2">
                  <label className="ab-label">Storage Tank *</label>
                  <SearchPicker<StorageTank>
                    value={adjustForm.tankId}
                    valueLabel={tankLabel}
                    placeholder="Type tank name or number..."
                    search={(q) => storageTanksApi.getAll({ search: q, status: 'ACTIVE', page: 1, limit: 8 }).then((r) => r.data.data)}
                    onSelect={(t) => { setSelectedTank(t); setAdjustForm({ ...adjustForm, tankId: t.id }); setTankLabel(`${t.tankName} (${t.currentQuantity}/${t.capacity} KG)`); }}
                    renderOption={(t) => (
                      <div>
                        <div className="row-title">{t.tankName}</div>
                        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>{t.currentQuantity}/{t.capacity} KG</div>
                      </div>
                    )}
                  />
                </div>
                <div className="span-2">
                  <label className="ab-label">Adjustment Quantity (KG) — use negative to subtract *</label>
                  <input className="ab-input" type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} />
                  {selectedTank && (
                    <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 4 }}>
                      New stock will be: {(selectedTank.currentQuantity + adjustForm.quantity).toFixed(1)} / {selectedTank.capacity} KG
                    </div>
                  )}
                </div>
                <div className="span-2"><label className="ab-label">Reason / Notes</label><input className="ab-input" placeholder="e.g. Physical count correction" value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="ab-modal-foot">
              <button className="ab-btn ab-btn-outline" onClick={() => setShowAdjust(false)}>Cancel</button>
              <button className="ab-btn ab-btn-primary" onClick={handleSaveAdjustment} disabled={saving}>{saving ? 'Saving...' : 'Save Adjustment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
