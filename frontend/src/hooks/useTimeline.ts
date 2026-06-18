import { useInfiniteQuery } from '@tanstack/react-query'
import { timeline } from '../api/client'
import type { EventCategory, SagaEvent, TimelineQueryParams } from '../types/api'

const PAGE_SIZE = 50

type TimelineFilters = Omit<TimelineQueryParams, 'limit' | 'offset'>

function flatten(pages: { items: SagaEvent[] }[] | undefined): SagaEvent[] {
  return (pages ?? []).flatMap((p) => p.items)
}

function nextOffset(last: { items: SagaEvent[]; limit: number; offset: number }): number | undefined {
  return last.items.length === last.limit ? last.offset + last.limit : undefined
}

export function useTimeline(filters: TimelineFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ['timeline', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      timeline.query({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: nextOffset,
  })
  return {
    ...query,
    events: flatten(query.data?.pages),
    hasMore: Boolean(query.hasNextPage),
  }
}

export function useDocumentTimeline(id: string, filters: { category?: EventCategory } = {}) {
  const query = useInfiniteQuery({
    queryKey: ['document-timeline', id, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      timeline.forDocument(id, { ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: nextOffset,
    enabled: Boolean(id),
  })
  return { ...query, events: flatten(query.data?.pages), hasMore: Boolean(query.hasNextPage) }
}
