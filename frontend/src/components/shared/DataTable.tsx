import React, { useState } from 'react';
import {
  useReactTable, getCoreRowModel, getPaginationRowModel,
  getSortedRowModel, getFilteredRowModel, flexRender,
  type ColumnDef, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  hideSearch?: boolean;
}

export function DataTable<TData, TValue>({
  columns, data, searchKey, searchPlaceholder = 'Search...', pageSize = 12, hideSearch = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data, columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  });

  return (
    <div>
      {/* Search */}
      {searchKey && !hideSearch && (
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rule)' }}>
          <div className="search-box" style={{ width: '100%', maxWidth: 280 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px 18px', color: 'var(--steel)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', gap: 8,
        padding: '10px 18px', borderTop: '1px solid var(--rule)',
      }}>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--steel)' }}>
          {table.getFilteredRowModel().rows.length} records · page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { label: '«', fn: () => table.setPageIndex(0), dis: !table.getCanPreviousPage() },
            { label: '‹', fn: () => table.previousPage(), dis: !table.getCanPreviousPage() },
            { label: '›', fn: () => table.nextPage(), dis: !table.getCanNextPage() },
            { label: '»', fn: () => table.setPageIndex(table.getPageCount() - 1), dis: !table.getCanNextPage() },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.fn}
              disabled={b.dis}
              style={{
                width: 28, height: 28, border: '1px solid var(--rule)',
                background: 'var(--paper-light)', borderRadius: 'var(--radius)',
                cursor: b.dis ? 'not-allowed' : 'pointer',
                opacity: b.dis ? 0.4 : 1,
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 13,
                color: 'var(--blueprint)',
              }}
            >{b.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
