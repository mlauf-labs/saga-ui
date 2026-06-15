import { ActionIcon, AppShell, Burger, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import AppHeader from './AppHeader'

interface AdminLayoutProps {
  /** Optional left navbar (e.g. a folder tree). When omitted, the main area is full-width. */
  navbar?: React.ReactNode
  navbarLabel?: string
  children: React.ReactNode
}

export default function AdminLayout({ navbar, navbarLabel = 'Navigation', children }: AdminLayoutProps) {
  const [navbarOpen, { toggle: toggleNavbar }] = useDisclosure(true)

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={
        navbar
          ? {
              width: 300,
              breakpoint: 'sm',
              collapsed: { mobile: !navbarOpen, desktop: !navbarOpen },
            }
          : undefined
      }
      padding="md"
    >
      <AppShell.Header>
        <AppHeader
          startSlot={
            navbar ? (
              <Tooltip label={navbarLabel} visibleFrom="sm">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={toggleNavbar}
                  aria-label={navbarLabel}
                >
                  <Burger opened={navbarOpen} size="sm" />
                </ActionIcon>
              </Tooltip>
            ) : undefined
          }
        />
      </AppShell.Header>

      {navbar && <AppShell.Navbar>{navbar}</AppShell.Navbar>}

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
