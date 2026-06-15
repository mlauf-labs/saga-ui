/**
 * Typed API client for the Saga UI BFF.
 * All requests go to /api/* which Vite proxies (dev) or BFF serves (prod).
 */

import { dispatchUnauthorized } from '../lib/auth-events'
import type {
  DeleteFolderStrategy,
  DocType,
  DocTypeCreate,
  DocTypeUpdate,
  DocumentListResponse,
  DocumentPatch,
  DocumentResponse,
  DocumentSearchRequest,
  DocumentStatusResponse,
  EmojiSuggestRequest,
  EmojiSuggestResponse,
  Folder,
  FolderCreate,
  FolderNode,
  FolderUpdate,
  HealthResponse,
  MembershipResponse,
  MembershipSetRequest,
  Note,
  NoteCreate,
  NoteUpdate,
  SearchRequest,
  SearchResponse,
  UploadAcceptedResponse,
  UserInfo,
} from '../types/api'

class ApiClientError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!response.ok) {
    let code = 'unknown_error'
    let message = `HTTP ${response.status}`
    try {
      const body = await response.json()
      code = body.code ?? code
      message = body.detail ?? body.message ?? message
    } catch {
      // ignore parse errors
    }
    const error = new ApiClientError(response.status, code, message)
    // Signal global auth handler – skip on /api/auth/* to avoid loops
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      dispatchUnauthorized()
    }
    throw error
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (username: string, password: string) =>
    request<UserInfo>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<void>('/api/auth/logout', { method: 'POST' }),

  me: () => request<UserInfo>('/api/auth/me'),
}

// ── Health ────────────────────────────────────────────────────────────────────

export const health = {
  get: () => request<HealthResponse>('/health'),
}

// ── Documents ─────────────────────────────────────────────────────────────────

export const documents = {
  list: (page = 1, pageSize = 25) =>
    request<DocumentListResponse>(`/api/documents?page=${page}&page_size=${pageSize}`),

  get: (id: string, includeContent = true) =>
    request<DocumentResponse>(`/api/documents/${id}?include_content=${includeContent}`),

  getStatus: (id: string) =>
    request<DocumentStatusResponse>(`/api/documents/${id}/status`),

  search: (body: DocumentSearchRequest) =>
    request<DocumentListResponse>('/api/documents/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadAcceptedResponse>('/api/documents', {
      method: 'POST',
      headers: {},
      body: form,
    })
  },

  replace: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadAcceptedResponse>(`/api/documents/${id}`, {
      method: 'PUT',
      headers: {},
      body: form,
    })
  },

  delete: (id: string) =>
    request<void>(`/api/documents/${id}`, { method: 'DELETE' }),

  /** Update editable document fields (title, summary, doc_type_id, extracted_values). */
  update: (id: string, patch: DocumentPatch) =>
    request<DocumentResponse>(`/api/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  reanalyze: (id: string) =>
    request<UploadAcceptedResponse>(`/api/documents/${id}/reanalyze`, { method: 'POST' }),

  fileUrl: (id: string, disposition: 'attachment' | 'inline' = 'attachment') =>
    `/api/documents/${id}/file?disposition=${disposition}`,

  // ── Document notes ──────────────────────────────────────────────────────────
  notes: {
    list: (id: string) => request<Note[]>(`/api/documents/${id}/notes`),

    add: (id: string, content: string) =>
      request<Note>(`/api/documents/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content } satisfies NoteCreate),
      }),

    update: (id: string, noteId: string, content: string) =>
      request<Note>(`/api/documents/${id}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content } satisfies NoteUpdate),
      }),

    remove: (id: string, noteId: string) =>
      request<void>(`/api/documents/${id}/notes/${noteId}`, { method: 'DELETE' }),
  },

  // ── Folder membership ─────────────────────────────────────────────────────────
  membership: {
    list: (id: string) => request<MembershipResponse>(`/api/documents/${id}/folders`),

    set: (id: string, body: MembershipSetRequest) =>
      request<MembershipResponse>(`/api/documents/${id}/folders`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    add: (id: string, folderId: string, primary = false) =>
      request<MembershipResponse>(
        `/api/documents/${id}/folders/${folderId}?primary=${primary}`,
        { method: 'POST' },
      ),

    setPrimary: (id: string, folderId: string) =>
      request<MembershipResponse>(`/api/documents/${id}/folders/${folderId}`, {
        method: 'PATCH',
      }),

    remove: (id: string, folderId: string) =>
      request<MembershipResponse>(`/api/documents/${id}/folders/${folderId}`, {
        method: 'DELETE',
      }),
  },
}

// ── Search ────────────────────────────────────────────────────────────────────

export const search = {
  hybrid: (body: SearchRequest) =>
    request<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ── Folders ────────────────────────────────────────────────────────────────────

export const folders = {
  tree: (prefix?: string, maxDepth?: number) => {
    const params = new URLSearchParams()
    if (prefix) params.set('prefix', prefix)
    if (maxDepth != null) params.set('max_depth', String(maxDepth))
    const qs = params.toString()
    return request<FolderNode[]>(`/api/folders${qs ? `?${qs}` : ''}`)
  },

  flat: () => request<Folder[]>('/api/folders/flat'),

  get: (folderId: string) => request<Folder>(`/api/folders/${folderId}`),

  create: (body: FolderCreate) =>
    request<Folder>('/api/folders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (folderId: string, body: FolderUpdate) =>
    request<Folder>(`/api/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (folderId: string, strategy: DeleteFolderStrategy = 'reject') =>
    request<void>(`/api/folders/${folderId}?strategy=${strategy}`, {
      method: 'DELETE',
    }),

  documents: (folderId: string, includeSubtree = true, page = 1, pageSize = 25) =>
    request<DocumentListResponse>(
      `/api/folders/${folderId}/documents?include_subtree=${includeSubtree}&page=${page}&page_size=${pageSize}`,
    ),

  // ── Folder notes ──────────────────────────────────────────────────────────────
  notes: {
    list: (folderId: string) => request<Note[]>(`/api/folders/${folderId}/notes`),

    add: (folderId: string, content: string) =>
      request<Note>(`/api/folders/${folderId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content } satisfies NoteCreate),
      }),

    update: (folderId: string, noteId: string, content: string) =>
      request<Note>(`/api/folders/${folderId}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content } satisfies NoteUpdate),
      }),

    remove: (folderId: string, noteId: string) =>
      request<void>(`/api/folders/${folderId}/notes/${noteId}`, { method: 'DELETE' }),
  },
}

// ── Doc-types ────────────────────────────────────────────────────────────────

export const docTypes = {
  list: () => request<DocType[]>('/api/doc-types'),

  get: (docTypeId: string) => request<DocType>(`/api/doc-types/${docTypeId}`),

  create: (body: DocTypeCreate) =>
    request<DocType>('/api/doc-types', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (docTypeId: string, body: DocTypeUpdate) =>
    request<DocType>(`/api/doc-types/${docTypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  remove: (docTypeId: string) =>
    request<void>(`/api/doc-types/${docTypeId}`, { method: 'DELETE' }),

  documents: (docTypeId: string, page = 1, pageSize = 25) =>
    request<DocumentListResponse>(
      `/api/doc-types/${docTypeId}/documents?page=${page}&page_size=${pageSize}`,
    ),
}

// ── LLM helpers ───────────────────────────────────────────────────────────────

export const llm = {
  suggestEmoji: (body: EmojiSuggestRequest) =>
    request<EmojiSuggestResponse>('/api/llm/suggest-emoji', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export { ApiClientError }
