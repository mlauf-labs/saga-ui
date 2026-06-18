import { useState } from 'react'
import { Group, Stack, Title } from '@mantine/core'
import AdminLayout from '../components/Layout/AdminLayout'
import FolderTreePanel from '../components/FolderTree/FolderTreePanel'
import { CategoryFilter, type CategorySelection } from '../components/Timeline/CategoryFilter'
import { DateRangeFilter } from '../components/Timeline/DateRangeFilter'
import { rangeToBounds, type DateRange } from '../lib/date-range'
import { EventList } from '../components/Timeline/EventList'
import { useTimeline } from '../hooks/useTimeline'
import type { TimelineQueryParams } from '../types/api'

export default function TimelinePage() {
  const [category, setCategory] = useState<CategorySelection>('all')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const [range, setRange] = useState<DateRange>([null, null])

  const bounds = rangeToBounds(range)
  const base: Omit<TimelineQueryParams, 'category' | 'limit' | 'offset'> = {
    ...(folderId ? { folderId, includeSubtree: true } : {}),
    ...(bounds.from ? { occurredFrom: bounds.from } : {}),
    ...(bounds.to ? { occurredTo: bounds.to } : {}),
  }
  const q = useTimeline(category === 'all' ? base : { ...base, category })

  return (
    <AdminLayout
      navbarLabel="Toggle folder tree"
      navbar={
        <FolderTreePanel
          activeFolderId={folderId}
          onFolderSelect={(id, name) => {
            setFolderId(id)
            setFolderName(name)
          }}
          showAllOption
          allLabel="All events"
          title="Folders"
        />
      }
    >
      <Stack gap="md">
        <Title order={3}>{folderName ? `Timeline — ${folderName}` : 'Timeline'}</Title>
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <CategoryFilter value={category} onChange={setCategory} />
          <DateRangeFilter value={range} onChange={setRange} label="Limit to a date range" />
        </Group>
        <EventList
          events={q.events}
          documents={q.documents}
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
        />
      </Stack>
    </AdminLayout>
  )
}
