import React, { useState } from 'react';

const PAGE_SIZES = [10, 20, 50, 100];

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (ps: number) => void;
}

export default function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const isCustom = !PAGE_SIZES.includes(pageSize);

  const handleSizeChange = (val: string) => {
    if (val === 'custom') {
      setCustomMode(true);
      setCustomVal(String(pageSize));
    } else {
      setCustomMode(false);
      onPageSizeChange(Number(val));
      onPageChange(1);
    }
  };

  const applyCustom = () => {
    const n = parseInt(customVal, 10);
    if (n > 0 && n <= 10000) {
      onPageSizeChange(n);
      onPageChange(1);
      setCustomMode(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
      padding: '10px 14px',
      borderTop: '1px solid var(--rule)',
      background: 'var(--paper-light)',
      fontFamily: 'IBM Plex Mono,monospace', fontSize: 12,
    }}>
      {/* Left: page size + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--steel)' }}>Rows:</span>
        <select
          className="ab-input ab-select"
          value={customMode || isCustom ? 'custom' : String(pageSize)}
          onChange={(e) => handleSizeChange(e.target.value)}
          style={{ padding: '3px 8px', fontSize: 12, width: 90 }}
        >
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="custom">Custom</option>
        </select>
        {(customMode || isCustom) && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              className="ab-input"
              type="number"
              min={1}
              max={10000}
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
              style={{ width: 70, padding: '3px 8px', fontSize: 12 }}
              autoFocus
            />
            <button className="ab-btn ab-btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={applyCustom}>OK</button>
          </div>
        )}
        <span style={{ color: 'var(--steel)' }}>
          {total === 0 ? '0 results' : `${from}–${to} of ${total}`}
        </span>
      </div>

      {/* Right: page navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="ab-btn ab-btn-icon" disabled={page === 1} onClick={() => onPageChange(1)} title="First page">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
        </button>
        <button className="ab-btn ab-btn-icon" disabled={page === 1} onClick={() => onPageChange(page - 1)} title="Previous page">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        {/* Page number pills */}
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={{
                  minWidth: 28, height: 28, border: '1px solid',
                  borderColor: p === page ? 'var(--safety-orange)' : 'var(--rule)',
                  background: p === page ? 'var(--safety-orange)' : 'transparent',
                  color: p === page ? '#fff' : 'var(--ink)',
                  borderRadius: 'var(--radius)', cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono,monospace', fontSize: 11, fontWeight: p === page ? 700 : 400,
                  padding: '0 6px',
                }}
              >{p}</button>
            );
          })}
        </div>

        <button className="ab-btn ab-btn-icon" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} title="Next page">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button className="ab-btn ab-btn-icon" disabled={page === totalPages} onClick={() => onPageChange(totalPages)} title="Last page">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        </button>
      </div>
    </div>
  );
}
