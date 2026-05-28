'use client'

import { useState, useCallback } from 'react'

export type SortOrder = 'ASC' | 'DESC'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  initialSortBy?: string
  initialSortOrder?: SortOrder
}

export function usePagination({
  initialPage = 1,
  initialLimit = 25,
  initialSortBy,
  initialSortOrder,
}: UsePaginationOptions = {}) {
  const [page, _setPage] = useState(initialPage)
  const [limit, _setLimit] = useState(initialLimit)
  const [sortBy, _setSortBy] = useState<string | undefined>(initialSortBy)
  const [sortOrder, _setSortOrder] = useState<SortOrder | undefined>(initialSortOrder)

  const setPage = useCallback((p: number) => _setPage(p), [])
  const resetPage = useCallback(() => _setPage(1), [])
  const setLimit = useCallback((l: number) => {
    _setLimit(l)
    _setPage(1)
  }, [])

  const setSort = useCallback((key: string, defaultDir: SortOrder = 'ASC') => {
    if (sortBy === key) {
      _setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))
    } else {
      _setSortBy(key)
      _setSortOrder(defaultDir)
    }
    _setPage(1)
  }, [sortBy])

  const clearSort = useCallback(() => {
    _setSortBy(undefined)
    _setSortOrder(undefined)
    _setPage(1)
  }, [])

  return { page, limit, sortBy, sortOrder, setPage, setLimit, setSort, clearSort, resetPage }
}
