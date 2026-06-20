import { Card, SimpleGrid, Text, Title } from '@mantine/core'

interface StatCard {
  label: string
  value: string | number
}

export default function StatCards({ title, items }: { title: string; items: StatCard[] }) {
  return (
    <>
      <Title order={4} mt="md" mb="xs">
        {title}
      </Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
        {items.map((item) => (
          <Card key={item.label} withBorder padding="sm">
            <Text size="xs" c="dimmed">
              {item.label}
            </Text>
            <Text fw={700} size="lg">
              {item.value}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </>
  )
}
