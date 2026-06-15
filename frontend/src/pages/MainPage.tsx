import { useCallback, useEffect, useRef, useState } from 'react'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import AppLayout from '../components/Layout/AppLayout'
import BottomNav, { type MobileTab } from '../components/Layout/BottomNav'
import MobileDetailSheet from '../components/Layout/MobileDetailSheet'
import HealthBanner from '../components/Layout/HealthBanner'
import FolderTreePanel from '../components/FolderTree/FolderTreePanel'
import DocumentListPanel from '../components/DocumentList/DocumentListPanel'
import DocumentDetailPanel from '../components/DocumentDetail/DocumentDetailPanel'
import SearchResultsPanel from '../components/Search/SearchResultsPanel'
import MobileSearchPanel from '../components/Search/MobileSearchPanel'
import UploadModal from '../components/Upload/UploadModal'

export default function MainPage() {
  const isMobile = useMediaQuery('(max-width: 48em)')

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [activeFolderName, setActiveFolderName] = useState<string | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)

  // Search state: `searchInput` is the live value; `searchQuery` is the committed query.
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Mobile tab + detail sheet
  const [mobileTab, setMobileTab] = useState<MobileTab>('documents')
  const [mobileDetailOpen, { open: openMobileDetail, close: closeMobileDetail }] = useDisclosure(false)

  // Upload modal — lifted here so BottomNav FAB can trigger it
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure(false)

  // Callback ref so AppLayout can expose its navbar toggle to BottomNav
  const navbarToggleRef = useRef<(() => void) | null>(null)
  const handleNavbarToggleReady = useCallback((toggle: () => void) => {
    navbarToggleRef.current = toggle
  }, [])

  const searchInputRef = useRef<HTMLInputElement>(null)

  const isSearchActive = searchQuery.trim().length > 0

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q)
    setActiveFolderId(null)
    setActiveFolderName(null)
    setActiveDocumentId(null)
  }

  const handleSearchClear = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  const handleDocumentSelect = (id: string) => {
    setActiveDocumentId(id)
    if (isMobile) {
      openMobileDetail()
    }
  }

  const handleDocumentDeleted = () => {
    setActiveDocumentId(null)
  }

  const handleMobileTabChange = (tab: MobileTab) => {
    setMobileTab(tab)
    if (tab === 'documents') {
      // Clear search when switching back to documents tab
      handleSearchClear()
    }
  }

  // Global keyboard shortcut: press "/" to focus the search bar (desktop only)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Determine what to show in the main centre panel
  const mainPanel = (() => {
    if (isMobile && mobileTab === 'search') {
      return (
        <MobileSearchPanel
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
          searchQuery={searchQuery}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={handleDocumentSelect}
        />
      )
    }
    if (isSearchActive) {
      return (
        <SearchResultsPanel
          query={searchQuery}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={handleDocumentSelect}
        />
      )
    }
    return (
      <DocumentListPanel
        activeFolderId={activeFolderId}
        activeFolderName={activeFolderName}
        activeDocumentId={activeDocumentId}
        onDocumentSelect={handleDocumentSelect}
        onUploadClick={openUpload}
      />
    )
  })()

  return (
    <>
      <UploadModal opened={uploadOpened} onClose={closeUpload} />

      {isMobile && (
        <MobileDetailSheet
          opened={mobileDetailOpen}
          onClose={closeMobileDetail}
          documentId={activeDocumentId}
          onDocumentDeleted={handleDocumentDeleted}
        />
      )}

      <AppLayout
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        onSearchClear={handleSearchClear}
        searchInputRef={searchInputRef}
        onNavbarToggleReady={handleNavbarToggleReady}
        banner={<HealthBanner />}
        navbar={
          <FolderTreePanel
            activeFolderId={activeFolderId}
            onFolderSelect={(folderId, name) => {
              handleSearchClear()
              setActiveFolderId(folderId)
              setActiveFolderName(name)
              setActiveDocumentId(null)
              // On mobile, switch to documents tab so the list is visible
              if (isMobile) setMobileTab('documents')
            }}
          />
        }
        main={mainPanel}
        aside={
          isMobile ? null : (
            <DocumentDetailPanel
              documentId={activeDocumentId}
              onDocumentDeleted={handleDocumentDeleted}
            />
          )
        }
        bottomNav={
          <BottomNav
            activeTab={mobileTab}
            onTabChange={handleMobileTabChange}
            onFolderClick={() => navbarToggleRef.current?.()}
            onUploadClick={openUpload}
          />
        }
      />
    </>
  )
}
