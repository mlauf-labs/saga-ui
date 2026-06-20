import { Alert, Container, Loader, Table, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { stats } from '../api/client'
import AdminLayout from '../components/Layout/AdminLayout'
import StatCards from '../components/Statistics/StatCards'

function fmtBytes(n: number | null): string {
  if (n === null) return '–'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = n
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(1)} ${units[i]}`
}

export default function StatisticsPage() {
  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: stats.get })
  const agentsQuery = useQuery({ queryKey: ['agents-stats'], queryFn: stats.agents, retry: false })

  if (statsQuery.isLoading) return (
    <AdminLayout>
      <Loader m="xl" />
    </AdminLayout>
  )
  if (statsQuery.isError || !statsQuery.data)
    return (
      <AdminLayout>
        <Alert color="red">Failed to load statistics.</Alert>
      </AdminLayout>
    )

  const { snapshot, pipeline } = statsQuery.data
  const c = snapshot.counts
  const s = snapshot.storage

  return (
    <AdminLayout>
      <Container size="lg" py="md">
        <Title order={2}>Statistics</Title>

        <StatCards
          title="Inventory"
          items={[
            { label: 'Documents', value: c.documents_total },
            { label: 'Folders', value: c.folders_total },
            { label: 'Doc types', value: c.doc_types_total },
            { label: 'Chunks', value: snapshot.chunks_total ?? '–' },
            { label: 'Total size', value: fmtBytes(c.size_bytes_sum) },
            { label: 'Without folder', value: c.documents_without_folder },
          ]}
        />

        <StatCards
          title="Documents by status"
          items={Object.entries(c.documents_by_status).map(([k, v]) => ({ label: k, value: v }))}
        />

        <StatCards
          title="Storage"
          items={[
            { label: 'Postgres', value: fmtBytes(s.postgres_bytes) },
            { label: 'OpenSearch', value: fmtBytes(s.opensearch_bytes) },
            { label: 'MinIO', value: fmtBytes(s.minio_bytes) },
            { label: 'Redis', value: fmtBytes(s.redis_bytes) },
            { label: 'Queue depth', value: s.queue_depth ?? '–' },
          ]}
        />

        <Title order={4} mt="md" mb="xs">
          Pipeline stage timings (ms)
        </Title>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Stage</Table.Th>
              <Table.Th>Count</Table.Th>
              <Table.Th>Min</Table.Th>
              <Table.Th>Avg</Table.Th>
              <Table.Th>Max</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Object.entries(pipeline.stages).map(([stage, agg]) => (
              <Table.Tr key={stage}>
                <Table.Td>{stage}</Table.Td>
                <Table.Td>{agg.count}</Table.Td>
                <Table.Td>{agg.min_ms.toFixed(0)}</Table.Td>
                <Table.Td>{agg.avg_ms.toFixed(0)}</Table.Td>
                <Table.Td>{agg.max_ms.toFixed(0)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Title order={4} mt="md" mb="xs">
          LLM tokens
        </Title>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Step</Table.Th>
              <Table.Th>Model</Table.Th>
              <Table.Th>Kind</Table.Th>
              <Table.Th>Tokens</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pipeline.tokens.map((t) => (
              <Table.Tr key={`${t.step}-${t.model}-${t.kind}`}>
                <Table.Td>{t.step}</Table.Td>
                <Table.Td>{t.model}</Table.Td>
                <Table.Td>{t.kind}</Table.Td>
                <Table.Td>{t.tokens}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {agentsQuery.isSuccess && agentsQuery.data && (
          <StatCards
            title="Agents"
            items={[
              { label: 'Agents', value: agentsQuery.data.runtime.agent_count },
              ...Object.entries(agentsQuery.data.proposals).map(([k, v]) => ({
                label: `Pending: ${k}`,
                value: v,
              })),
            ]}
          />
        )}
      </Container>
    </AdminLayout>
  )
}
