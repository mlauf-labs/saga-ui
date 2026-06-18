import { Box, Group, Text, Title, Tooltip, ActionIcon, useMantineColorScheme } from '@mantine/core'
import { NavLink as RouterNavLink } from 'react-router-dom'
import { IconDatabase, IconFolders, IconFiles, IconMoon, IconSun, IconTag, IconTimeline, IconCalendarEvent } from '@tabler/icons-react'
import { useAuth } from '../../contexts/useAuth'
import { useHealthCheck } from '../../hooks/useHealthCheck'

const NAV_ITEMS = [
  { to: '/', label: 'Documents', icon: IconFiles, end: true },
  { to: '/folders', label: 'Folders', icon: IconFolders, end: false },
  { to: '/doc-types', label: 'Doc Types', icon: IconTag, end: false },
  { to: '/timeline', label: 'Timeline', icon: IconTimeline, end: false },
  { to: '/agenda', label: 'Agenda', icon: IconCalendarEvent, end: false },
]

interface AppHeaderProps {
  /** Rendered right after the brand (e.g. a burger toggle). */
  startSlot?: React.ReactNode
  /** Rendered in the centre (e.g. a search input). */
  searchSlot?: React.ReactNode
  /** Rendered just before the dark-mode toggle (e.g. an aside toggle). */
  endSlot?: React.ReactNode
}

export default function AppHeader({ startSlot, searchSlot, endSlot }: AppHeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { user, logout } = useAuth()
  const { data: healthData } = useHealthCheck()
  const storeName = healthData?.store_name ?? 'Saga'

  return (
    <Group h="100%" px="md" gap="sm" wrap="nowrap">
      {/* Left: brand + nav */}
      <Group gap="sm" style={{ flexShrink: 0 }} wrap="nowrap">
        {startSlot}
        <IconDatabase size={22} color="var(--mantine-color-blue-6)" />
        <Title order={4} fw={600} visibleFrom="sm">
          {storeName}
        </Title>
      </Group>

      <Group gap={2} wrap="nowrap" visibleFrom="sm" style={{ flexShrink: 0 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 'var(--mantine-font-size-sm)',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? 'var(--mantine-color-blue-text)'
                  : 'var(--mantine-color-text)',
                backgroundColor: isActive ? 'var(--mantine-color-blue-light)' : 'transparent',
              })}
            >
              <Icon size={16} />
              {item.label}
            </RouterNavLink>
          )
        })}
      </Group>

      {/* Centre: search slot — hidden on mobile (search is in BottomNav / MobileSearchPanel) */}
      <Box flex={1} visibleFrom="sm" style={{ display: 'flex', justifyContent: 'center' }}>
        {searchSlot}
      </Box>
      {/* Spacer so right-side actions stay flush on mobile */}
      <Box flex={1} hiddenFrom="sm" />

      {/* Right: actions */}
      <Group gap="xs" ml="auto" style={{ flexShrink: 0 }} wrap="nowrap">
        {endSlot}
        <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="subtle"
            onClick={() => toggleColorScheme()}
            size="lg"
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Tooltip>

        <Tooltip label={`Sign out (${user?.username ?? '–'})`}>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={logout}
            color="red"
            aria-label="Sign out"
          >
            <Text size="xs" fw={700} ff="monospace">
              {(user?.username ?? '?').slice(0, 2).toUpperCase()}
            </Text>
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}
