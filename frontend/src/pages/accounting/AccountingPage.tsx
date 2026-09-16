import React, { useEffect, useState } from 'react';
import { accountingApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/shared/Pagination';

type Book = 'cash' | 'bank';

export default function AccountingPage() {
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [book, setBook] = useState<Book>('cash');
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchPL = () => {
    accountingApi.getProfitLoss({ startDate, endDate }).then((r) => setProfitLoss(r.data)).catch(() => { /* P&L cards just stay blank */ });
  };

  const fetchBook = () => {
    setLoading(true);
    const call = book === 'cash' ? accountingApi.getCashBook : accountingApi.getBankBook;
    call({ startDate, endDate, page, limit: pageSize })
      .then((r) => { setEntries(r.data.data); setTotal(r.data.total); })
      .catch(() => alert('Failed to load accounting data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPL(); }, []);
  useEffect(() => { setPage(1); }, [book]);
  useEffect(() => { fetchBook(); }, [book, page, pageSize]);

  const applyDateFilter = () => { setPage(1); fetchPL(); fetchBook(); };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16 }}>
        <div className="section-title">Accounting</div>
        <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>Financial overview, cash book, and bank book</div>
      </div>

      {/* Date Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <label className="ab-label">From</label>
          <input className="ab-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: 160 }} />
        </div>
        <div>
          <label className="ab-label">To</label>
          <input className="ab-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: 160 }} />
        </div>
        <button className="ab-btn ab-btn-primary" onClick={applyDateFilter} disabled={loading}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
      </div>

      {/* P&L Cards */}
      {profitLoss && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-top"><span className="kpi-label">Total Revenue</span></div>
            <div className="kpi-value" style={{ color: 'var(--green-ok)' }}>{formatCurrency(profitLoss.revenue)}</div>
            <div className="kpi-sub">Sales income</div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-top"><span className="kpi-label">Total Expenses</span></div>
            <div className="kpi-value">{formatCurrency(profitLoss.expenses)}</div>
            <div className="kpi-sub">All costs</div>
          </div>
          <div className={`kpi-card ${profitLoss.grossProfit >= 0 ? '' : 'red'}`}>
            <div className="kpi-top"><span className="kpi-label">Gross Profit</span></div>
            <div className="kpi-value" style={{ color: profitLoss.grossProfit >= 0 ? 'var(--green-ok)' : 'var(--red-risk)' }}>{formatCurrency(profitLoss.grossProfit)}</div>
            <div className="kpi-sub">Net P&L</div>
          </div>
        </div>
      )}

      {/* Book tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--rule)', marginBottom: 16 }}>
        {(['cash', 'bank'] as Book[]).map((b) => (
          <button
            key={b}
            onClick={() => setBook(b)}
            style={{
              padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
              color: book === b ? 'var(--safety-orange)' : 'var(--steel)',
              borderBottom: book === b ? '2px solid var(--safety-orange)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >{b === 'cash' ? 'Cash Book' : 'Bank Book'}</button>
        ))}
      </div>

      {/* Book */}
      <div className="panel">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--steel)', fontSize: 12, fontFamily: 'IBM Plex Mono,monospace' }}>No {book === 'cash' ? 'cash' : 'bank'} transactions for selected period</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16 }}>
            {entries.map((txn) => (
              <div key={txn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{txn.transactionType}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)', marginTop: 2 }}>{txn.description} · {formatDate(txn.createdAt)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: 13, color: txn.direction === 'IN' ? 'var(--green-ok)' : 'var(--red-risk)' }}>
                    {txn.direction === 'IN' ? '+' : '−'}{formatCurrency(txn.amount)}
                  </div>
                  <div style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, color: 'var(--steel)' }}>Bal: {formatCurrency(txn.balance)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && entries.length > 0 && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        )}
      </div>
    </div>
  );
}
