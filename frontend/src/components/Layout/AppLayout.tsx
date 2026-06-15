import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionIcon,
  AppShell,
  Burger,
  CloseButton,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { IconLayoutSidebarRight, IconSearch } from '@tabler/icons-react'
import AppHeader from './AppHeader'

interface AppLayoutProps {
  navbar: React.ReactNode
  main: React.ReactNode
  aside: React.ReactNode
  /** Optional banner rendered directly below the header (e.g. health warning) */
  banner?: React.ReactNode
  /** Controlled search input value */
  searchValue: string
  onSearchChange: (value: string) => void
  /** Called when the user commits a search (Enter key or icon click) */
  onSearchSubmit: (query: string) => void
  /** Called when the search is cleared */
  onSearchClear: () => void
  /** Ref forwarded to the search TextInput so callers can programmatically focus it */
  searchInputRef?: React.RefObject<HTMLInputElement | null>
  /** Mobile bottom navigation bar (visible only on mobile via AppShell.Footer) */
  bottomNav?: React.ReactNode
  /** Callback to expose the navbar toggle for external callers (e.g. mobile bottom nav) */
  onNavbarToggleReady?: (toggle: () => void) => void
}

const NAVBAR_MIN = 160
const NAVBAR_MAX = 600
const ASIDE_MIN  = 260
const ASIDE_MAX  = 900

export default function AppLayout({
  navbar,
  main,
  aside,
  banner,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  searchInputRef,
  bottomNav,
  onNavbarToggleReady,
}: AppLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 48em)')
  const [navbarOpen, { toggle: toggleNavbar }] = useDisclosure(true)
  const [asideOpen,  { toggle: toggleAside  }] = useDisclosure(true)

  // Expose navbar toggle to parent (e.g. mobile bottom nav "Folders" button)
  if (onNavbarToggleReady) {
    onNavbarToggleReady(toggleNavbar)
  }

  const [navbarWidth, setNavbarWidth] = useState(280)
  const [asideWidth,  setAsideWidth ] = useState(420)

  // Refs so drag handlers always read the current value without stale closures.
  // Synced in effects (after render) — React 19 disallows ref writes during render.
  const navbarWidthRef = useRef(navbarWidth)
  const asideWidthRef  = useRef(asideWidth)
  useEffect(() => {
    navbarWidthRef.current = navbarWidth
  }, [navbarWidth])
  useEffect(() => {
    asideWidthRef.current = asideWidth
  }, [asideWidth])

  const startResizeNavbar = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = navbarWidthRef.current

    const onMove = (ev: MouseEvent) => {
      setNavbarWidth(Math.max(NAVBAR_MIN, Math.min(NAVBAR_MAX, startWidth + ev.clientX - startX)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const startResizeAside = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = asideWidthRef.current

    const onMove = (ev: MouseEvent) => {
      // Dragging the left edge of the aside: moving left → wider
      setAsideWidth(Math.max(ASIDE_MIN, Math.min(ASIDE_MAX, startWidth - (ev.clientX - startX))))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor     = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor     = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      onSearchSubmit(searchValue.trim())
    }
    if (e.key === 'Escape') {
      onSearchClear()
    }
  }

  return (
    <AppShell
      header={{ height: 56 }}
      footer={isMobile ? { height: 60 } : undefined}
      navbar={{
        width: navbarWidth,
        breakpoint: 'sm',
        collapsed: { mobile: !navbarOpen, desktop: !navbarOpen },
      }}
      aside={{
        width: asideWidth,
        breakpoint: 'lg',
        collapsed: { mobile: true, desktop: !asideOpen },
      }}
      padding={0}
    >
      <AppShell.Header>
        <AppHeader
          startSlot={
            <Tooltip label="Toggle folder tree" visibleFrom="sm">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={toggleNavbar}
                aria-label="Toggle folder tree"
              >
                <Burger opened={navbarOpen} size="sm" />
              </ActionIcon>
            </Tooltip>
          }
          searchSlot={
            <TextInput
              ref={searchInputRef}
              flex={1}
              maw={480}
              placeholder="Search… (press / to focus)"
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
          }
          endSlot={
            <Tooltip label="Toggle detail panel" visibleFrom="lg">
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={toggleAside}
                visibleFrom="lg"
                aria-label="Toggle detail panel"
              >
                <IconLayoutSidebarRight size={18} />
              </ActionIcon>
            </Tooltip>
          }
        />
      </AppShell.Header>

      {/* ── Left: Folder Tree ──────────────────────────────────────── */}
      <AppShell.Navbar>
        {/* Wrapper keeps position:relative scoped inside the panel */}
        <div style={{ position: 'relative', height: '100%' }}>
          {navbar}
          {/* Drag handle on the right edge */}
          <div
            onMouseDown={startResizeNavbar}
            title="Drag to resize"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 5,
              height: '100%',
              cursor: 'col-resize',
              zIndex: 200,
              background: 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--mantine-color-blue-5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          />
        </div>
      </AppShell.Navbar>

      {/* ── Centre: Document List / Search Results ─────────────────── */}
      <AppShell.Main>
        {banner}
        {main}
      </AppShell.Main>

      {/* ── Right: Document Detail + Preview ─────────────────────── */}
      <AppShell.Aside>
        {/* Wrapper keeps position:relative scoped inside the panel */}
        <div style={{ position: 'relative', height: '100%' }}>
          {/* Drag handle on the left edge */}
          <div
            onMouseDown={startResizeAside}
            title="Drag to resize"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 5,
              height: '100%',
              cursor: 'col-resize',
              zIndex: 200,
              background: 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--mantine-color-blue-5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          />
          {aside}
        </div>
      </AppShell.Aside>

      {/* ── Mobile bottom navigation ──────────────────────────────── */}
      {isMobile && bottomNav && (
        <AppShell.Footer hiddenFrom="sm">
          {bottomNav}
        </AppShell.Footer>
      )}
    </AppShell>
  )
}
