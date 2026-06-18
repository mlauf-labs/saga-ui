import { EventList } from '../Timeline/EventList'
import { useDocumentTimeline } from '../../hooks/useTimeline'

interface DocumentTimelineSectionProps {
  documentId: string
}

export function DocumentTimelineSection({ documentId }: DocumentTimelineSectionProps) {
  const q = useDocumentTimeline(documentId)
  return (
    <EventList
      events={q.events}
      documents={q.documents}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={q.refetch}
      hasMore={q.hasMore}
      onLoadMore={q.fetchNextPage}
      isLoadingMore={q.isFetchingNextPage}
      emptyMessage="No timeline events for this document yet."
    />
  )
}
