import React, { useEffect, useRef, useState } from 'react';

/** Minimal inline searchable dropdown for picking one record out of a large
 * catalog — a plain <select> would otherwise render every row (10k+ in some
 * modules here), which is unusable and slow to render. */
export function SearchPicker<T>({
  value, valueLabel, placeholder, search, renderOption, onSelect,
}: {
  value: string;
  valueLabel: string;
  placeholder: string;
  search: (q: string) => Promise<T[]>;
  renderOption: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => { search(query.trim()).then(setResults).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        className="ab-input"
        placeholder={placeholder}
        value={open ? query : valueLabel}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--paper-light)', border: '1px solid var(--rule)', borderRadius: 'var(--radius)', marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
          {!query.trim() ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>Type to search...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--steel)' }}>No matches</div>
          ) : (
            results.map((item, i) => (
              <div
                key={i}
                onClick={() => { onSelect(item); setOpen(false); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--rule)' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {renderOption(item)}
              </div>
            ))
          )}
        </div>
      )}
      {!open && value && <input type="hidden" value={value} />}
    </div>
  );
}
