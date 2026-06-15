import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
  Tree,
  useTree,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconFiles,
  IconFolder,
  IconFolderOpen,
  IconSearch,
} from '@tabler/icons-react'
import { folders } from '../../api/client'
import { filterTree, toTreeData, type FolderMeta } from '../../lib/tree-utils'

interface FolderTreePanelProps {
  activeFolderId: string | null
  onFolderSelect: (folderId: string | null, name: string | null) => void
  /** Show the "All Documents" entry that maps to a null selection. */
  showAllOption?: boolean
  allLabel?: string
  /** Section title above the tree. */
  title?: string
  /** Optional toolbar rendered between the search box and the tree. */
  toolbar?: React.ReactNode
}

export default function FolderTreePanel({
  activeFolderId,
  onFolderSelect,
  showAllOption = true,
  allLabel = 'All Documents',
  title = 'Folders',
  toolbar,
}: FolderTreePanelProps) {
  const [searchValue, setSearchValue] = useState('')
  const [debouncedSearch] = useDebouncedValue(searchValue, 250)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: () => folders.tree(),
  })

  const { treeData, metaMap } = useMemo(() => {
    const map = new Map<string, FolderMeta>()
    const nodes = data ? toTreeData(data, map) : []
    return { treeData: nodes, metaMap: map }
  }, [data])

  const filteredTree = useMemo(
    () => filterTree(treeData, debouncedSearch),
    [treeData, debouncedSearch],
  )

  const tree = useTree({
    selectedState: activeFolderId ? [activeFolderId] : [],
    onSelectedStateChange: (selected) => {
      const id = selected[0] ?? null
      onFolderSelect(id, id ? (metaMap.get(id)?.name ?? null) : null)
    },
  })

  const totalCount = useMemo(
    () => data?.reduce((sum, n) => sum + n.document_count, 0) ?? null,
    [data],
  )

  return (
    <Stack gap={0} h="100%">
      {/* Search ────────────────────────────────────────────────── */}
      <Box p="sm">
        <TextInput
          placeholder="Search folders…"
          leftSection={<IconSearch size={14} />}
          value={searchValue}
          onChange={(e) => setSearchValue(e.currentTarget.value)}
          size="sm"
          aria-label="Search folders"
        />
      </Box>

      {toolbar && (
        <Box px="sm" pb="sm">
          {toolbar}
        </Box>
      )}

      <Divider />

      {/* "All Documents" ───────────────────────────────────────── */}
      {showAllOption && (
        <>
          <Box px="xs" pt="xs">
            <NavLink
              label={allLabel}
              leftSection={<IconFiles size={16} />}
              rightSection={
                totalCount != null ? (
                  <Badge size="xs" variant="light" color="gray">
                    {totalCount}
                  </Badge>
                ) : null
              }
              active={activeFolderId === null}
              onClick={() => onFolderSelect(null, null)}
              styles={{ root: { borderRadius: 6 } }}
              aria-label="Show all documents"
            />
          </Box>
          <Divider mt="xs" />
        </>
      )}

      {/* Folder tree ───────────────────────────────────────────── */}
      <ScrollArea flex={1} p={0}>
        <Box px="xs" pb="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="xs" py="xs">
            {title}
          </Text>

          {isLoading && (
            <Stack gap={6} px="xs">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={28} radius="sm" />
              ))}
            </Stack>
          )}

          {isError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mx="xs">
              Failed to load folders.
            </Alert>
          )}

          {!isLoading && !isError && filteredTree.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="md">
              {debouncedSearch ? 'No results.' : 'No folders available.'}
            </Text>
          )}

          {!isLoading && filteredTree.length > 0 && (
            <Tree
              data={filteredTree}
              tree={tree}
              selectOnClick
              renderNode={({ node, expanded, hasChildren, selected, elementProps, level }) => {
                const meta = metaMap.get(node.value as string)
                const paddingStart = 8 + (level - 1) * 16
                const labelText = typeof node.label === 'string' ? node.label : String(node.value)
                return (
                  <Group
                    {...elementProps}
                    gap={4}
                    py={5}
                    pr="xs"
                    wrap="nowrap"
                    style={{
                      ...elementProps.style,
                      paddingInlineStart: paddingStart,
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: selected
                        ? 'var(--mantine-color-blue-light)'
                        : undefined,
                    }}
                  >
                    {/* Expand/collapse chevron */}
                    <Box w={14} style={{ flexShrink: 0 }}>
                      {hasChildren &&
                        (expanded ? (
                          <IconChevronDown size={13} />
                        ) : (
                          <IconChevronRight size={13} />
                        ))}
                    </Box>

                    {/* Folder icon */}
                    {hasChildren ? (
                      expanded ? (
                        <IconFolderOpen size={15} style={{ flexShrink: 0 }} />
                      ) : (
                        <IconFolder size={15} style={{ flexShrink: 0 }} />
                      )
                    ) : (
                      <IconFolder size={15} style={{ flexShrink: 0, opacity: 0.5 }} />
                    )}

                    {/* Name (with description tooltip) */}
                    <Tooltip
                      label={meta?.description}
                      disabled={!meta?.description}
                      openDelay={500}
                      multiline
                      maw={260}
                    >
                      <Text size="sm" flex={1} truncate>
                        {meta?.emoji ? `${meta.emoji} ` : ''}{labelText}
                      </Text>
                    </Tooltip>

                    {/* Document count */}
                    {meta && (
                      <Badge size="xs" variant="light" color={selected ? 'blue' : 'gray'}>
                        {meta.documentCount}
                      </Badge>
                    )}
                  </Group>
                )
              }}
            />
          )}
        </Box>
      </ScrollArea>
    </Stack>
  )
}
