import { useInfiniteQuery } from '@tanstack/react-query'
import { agenda } from '../api/client'
import type { AgendaQueryParams, SagaEvent } from '../types/api'

const PAGE_SIZE = 50

type AgendaFilters = Omit<AgendaQueryParams, 'limit' | 'offset'>

export function useAgenda(filters: AgendaFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ['agenda', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      agenda.get({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (last) =>
      last.items.length === last.limit ? last.offset + last.limit : undefined,
  })
  const pages: { items: SagaEvent[]; documents?: Record<string, string> }[] =
    query.data?.pages ?? []
  return {
    ...query,
    events: pages.flatMap((p) => p.items),
    documents: Object.assign({}, ...pages.map((p) => p.documents ?? {})),
    hasMore: Boolean(query.hasNextPage),
  }
}
