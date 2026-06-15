import { Box, CloseButton, Stack, Text, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import SearchResultsPanel from './SearchResultsPanel'

interface MobileSearchPanelProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchSubmit: (query: string) => void
  onSearchClear: () => void
  searchQuery: string
  activeDocumentId: string | null
  onDocumentSelect: (id: string) => void
}

export default function MobileSearchPanel({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  searchQuery,
  activeDocumentId,
  onDocumentSelect,
}: MobileSearchPanelProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      onSearchSubmit(searchValue.trim())
    }
    if (e.key === 'Escape') {
      onSearchClear()
    }
  }

  return (
    <Stack gap={0} h="100%">
      <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <TextInput
          autoFocus
          placeholder="Search documents…"
          value={searchValue}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          leftSection={
            <IconSearch
              size={15}
              style={{ cursor: searchValue.trim() ? 'pointer' : 'default' }}
              onClick={() => searchValue.trim() && onSearchSubmit(searchValue.trim())}
            />
          }
          rightSection={
            searchValue ? (
              <CloseButton size="sm" onClick={onSearchClear} aria-label="Clear search" />
            ) : null
          }
          size="sm"
          radius="xl"
          aria-label="Search documents"
        />
      </Box>

      {searchQuery.trim() ? (
        <Box flex={1} style={{ overflow: 'hidden' }}>
          <SearchResultsPanel
            query={searchQuery}
            activeDocumentId={activeDocumentId}
            onDocumentSelect={onDocumentSelect}
          />
        </Box>
      ) : (
        <Stack align="center" justify="center" flex={1} c="dimmed" gap="xs">
          <IconSearch size={36} />
          <Text size="sm">Type and press Enter to search</Text>
        </Stack>
      )}
    </Stack>
  )
}
