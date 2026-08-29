import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], defaultPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const setPageSafe = (p: number) => setPage(Math.min(Math.max(1, p), Math.max(1, Math.ceil(data.length / pageSize))));

  const onPageSizeChange = (ps: number) => { setPageSize(ps); setPage(1); };

  return { paged, page, pageSize, totalPages, setPage: setPageSafe, setPageSize: onPageSizeChange };
}
