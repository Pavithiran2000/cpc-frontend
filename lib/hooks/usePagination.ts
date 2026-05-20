'use client'

import { useState, useCallback } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
}

export function usePagination({
  initialPage = 1,
  initialLimit = 25,
}: UsePaginationOptions = {}) {
  const [page, _setPage] = useState(initialPage)
  const [limit, _setLimit] = useState(initialLimit)

  const setPage = useCallback((p: number) => _setPage(p), [])
  const resetPage = useCallback(() => _setPage(1), [])
  const setLimit = useCallback((l: number) => {
    _setLimit(l)
    _setPage(1)
  }, [])

  return { page, limit, setPage, setLimit, resetPage }
}
