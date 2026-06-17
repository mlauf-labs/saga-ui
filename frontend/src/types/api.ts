/** TypeScript types derived from Saga REST API schemas. */

export type DocumentStatus =
  | 'pending'
  | 'converting'
  | 'classifying_type'
  | 'analyzing'
  | 'summarizing'
  | 'classifying'
  | 'indexing'
  | 'ready'
  | 'failed'

export interface ExtractedValue {
  key: string
  type: string
  value: string
  normalized: string | null
  confidence: number
}

export interface Note {
  note_id: string
  content: string
  created_at: string
  updated_at: string
}

/** A document's membership in a folder (n:m). */
export interface FolderRef {
  folder_id: string
  name: string
  emoji?: string | null
  is_primary: boolean
}

export interface DocumentResponse {
  document_id: string
  title: string
  filename: string
  mime_type: string
  size_bytes: number
  content_hash: string
  status: DocumentStatus
  error: string | null
  doc_type: string | null
  doc_type_id: string | null
  summary: string | null
  extracted_values: ExtractedValue[]
  folders: FolderRef[]
  primary_folder_path: string[]
  notes: Note[]
  content_markdown: string | null
  created_at: string
  updated_at: string
}

export interface DocumentListResponse {
  items: DocumentResponse[]
  page: number
  page_size: number
  total: number
}

export interface DocumentStatusResponse {
  document_id: string
  status: DocumentStatus
  error: string | null
}

export interface UploadAcceptedResponse {
  document_id: string
  status: DocumentStatus
  title: string
}

/** Editable document fields (PATCH /documents/{id}). */
export interface DocumentPatch {
  title?: string
  summary?: string | null
  doc_type_id?: string | null
  extracted_values?: ExtractedValue[]
}

/** Keyword document search over title/summary/content/metadata. */
export interface DocumentSearchRequest {
  query?: string
  page?: number
  page_size?: number
  doc_type?: string
  folder_id?: string
  include_subtree?: boolean
  title?: string
  status?: string
  filters?: Record<string, string>
}

// ── Folders ───────────────────────────────────────────────────────────────────

/** A first-class, hierarchical folder (system of record). */
export interface Folder {
  folder_id: string
  name: string
  description: string | null
  emoji?: string | null
  parent_id: string | null
  metadata: Record<string, string>
  notes: Note[]
  created_at: string
  updated_at: string
}

/** A node in the folder tree (folder + children + subtree document count). */
export interface FolderNode {
  folder_id: string
  name: string
  description: string | null
  emoji?: string | null
  parent_id: string | null
  metadata: Record<string, string>
  document_count: number
  children: FolderNode[]
}

export interface FolderCreate {
  name: string
  description?: string | null
  parent_id?: string | null
  metadata?: Record<string, string>
  emoji?: string | null
}

export interface FolderUpdate {
  name?: string
  description?: string | null
  parent_id?: string | null
  metadata?: Record<string, string>
  emoji?: string | null
}

export type DeleteFolderStrategy = 'reject' | 'reparent' | 'cascade'

// ── Doc-types ───────────────────────────────────────────────────────────────

export interface DocType {
  doc_type_id: string
  name: string
  description: string | null
  emoji?: string | null
  document_count: number
  created_at: string
  updated_at: string
}

export interface DocTypeCreate {
  name: string
  description?: string | null
  emoji?: string | null
}

export interface DocTypeUpdate {
  name?: string
  description?: string | null
  emoji?: string | null
}

// ── LLM helpers ─────────────────────────────────────────────────────────────

export interface EmojiSuggestRequest {
  kind: 'doc_type' | 'folder'
  name: string
  description?: string | null
}

export interface EmojiSuggestResponse {
  emoji: string
}

// ── Notes ───────────────────────────────────────────────────────────────────

export interface NoteCreate {
  content: string
}

export interface NoteUpdate {
  content: string
}

// ── Folder membership ─────────────────────────────────────────────────────────

export interface MembershipSetRequest {
  folder_ids: string[]
  primary_id?: string | null
}

export interface MembershipResponse {
  folders: FolderRef[]
}

// ── Hybrid search ─────────────────────────────────────────────────────────────

/** Fused hybrid search request (at least one of keyword/semantic query). */
export interface SearchRequest {
  keyword_query?: string
  semantic_query?: string
  top_k?: number
  doc_type?: string
  folder_id?: string
  include_subtree?: boolean
  title?: string
  status?: string
  created_from?: string
  created_to?: string
  filters?: Record<string, string>
}

/** A single fused (RRF) hybrid-search result at the document level. */
export interface SearchResultItem {
  document_id: string
  title: string
  score: number
  doc_type: string | null
  summary: string | null
  folder_ids: string[]
  snippet: string | null
}

export interface SearchResponse {
  results: SearchResultItem[]
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string
  message: string
}

export interface HealthResponse {
  status: string
  version: string
  saga_reachable: boolean | null
  store_name?: string
}

export interface UserInfo {
  username: string
}

// ── Timeline / events ───────────────────────────────────────────────────────

export type EventCategory = 'audit' | 'content'

export type EventType =
  | 'doc_ingested'
  | 'placement'
  | 'move'
  | 'reclassification'
  | 'folder_created'
  | 'folder_renamed'
  | 'dated_fact'
  | 'appointment'
  | 'recurring'

/** A single timeline event (named SagaEvent to avoid clashing with the DOM Event). */
export interface SagaEvent {
  event_id: string
  category: EventCategory
  event_type: EventType
  document_id?: string | null
  folder_id?: string | null
  occurred_at?: string | null
  recorded_at: string
  actor: string
  summary: string
  confidence?: number | null
  details: Record<string, unknown>
}

export interface TimelineResponse {
  items: SagaEvent[]
  limit: number
  offset: number
}

export interface TimelineQueryParams {
  category?: EventCategory
  eventType?: EventType
  folderId?: string
  includeSubtree?: boolean
  occurredFrom?: string
  occurredTo?: string
  expand?: boolean
  limit: number
  offset: number
}

export interface AgendaQueryParams {
  folderId?: string
  from?: string
  to?: string
  limit: number
  offset: number
}
