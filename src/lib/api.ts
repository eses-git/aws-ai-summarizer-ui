import type { DocumentRecord, DocumentStatus } from '../types'
import { listMockDocuments, unregisterMockDocument } from './mockData'
import { delay } from './utils'

/* -------------------------------------------------------------------------- */
/* Environment configuration                                                  */
/* -------------------------------------------------------------------------- */

const RAW_API_URL = (import.meta.env.VITE_AWS_API_URL ?? '').trim().replace(/\/+$/, '')
const RAW_MOCK_FLAG = (import.meta.env.VITE_USE_MOCK_API ?? '').trim().toLowerCase()

/** Base URL of the deployed API Gateway stage (`''` when unset). */
export const API_BASE_URL = RAW_API_URL

/**
 * Mock backend resolution:
 *  - `VITE_USE_MOCK_API=true`  → always mock (zero network calls)
 *  - `VITE_USE_MOCK_API=false` → never mock (fails loudly without an API URL)
 *  - unset                     → mock only when no API URL is configured
 */
export const IS_MOCK_MODE =
  RAW_MOCK_FLAG === 'true' || (RAW_MOCK_FLAG !== 'false' && RAW_API_URL.length === 0)

/** Endpoint label rendered by the header status bar. */
export const API_LABEL = RAW_API_URL.length > 0 ? RAW_API_URL : 'mock://local-sandbox'

/** Region label rendered inside the console header. */
export const AWS_REGION = (import.meta.env.VITE_AWS_REGION ?? 'us-east-1').trim() || 'us-east-1'

/* -------------------------------------------------------------------------- */
/* Upload constraints                                                         */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf'] as const
export const ACCEPT_ATTRIBUTE = '.txt,.md,.pdf,text/plain,text/markdown,application/pdf'
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/**
 * Explicit, extension-authoritative MIME map for the `/upload-url` contract:
 *   .pdf → application/pdf · .txt → text/plain · .md → text/markdown
 */
export const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
}

/** Used only when a file falls outside {@link MIME_TYPE_BY_EXTENSION}. */
export const DEFAULT_MIME_TYPE = 'application/octet-stream'

/** Lowercase extension without the dot (`''` when the name has none). */
export function fileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index === -1 ? '' : fileName.slice(index + 1).toLowerCase()
}

/**
 * Resolves the MIME type explicitly from the file extension. This is the value
 * sent to `/upload-url` as `fileType` and re-used as the S3 `Content-Type`.
 */
export function resolveFileType(fileName: string): string {
  return MIME_TYPE_BY_EXTENSION[fileExtension(fileName)] ?? DEFAULT_MIME_TYPE
}

/** Extension-derived MIME type with a readable `text/plain` fallback (feed display). */
export function guessContentType(fileName: string): string {
  return MIME_TYPE_BY_EXTENSION[fileExtension(fileName)] ?? 'text/plain'
}

/**
 * Resolves the upload MIME type for a `File`. The extension map is authoritative
 * so `.md` always uploads as `text/markdown` regardless of what the browser
 * reports; the browser-reported type is only consulted for unmapped extensions.
 */
export function resolveContentType(file: File): string {
  const byExtension = MIME_TYPE_BY_EXTENSION[fileExtension(file.name)]
  if (byExtension) return byExtension

  const browserType = file.type.trim()
  return browserType.length > 0 ? browserType : DEFAULT_MIME_TYPE
}

export function isSupportedFile(file: File): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(`.${fileExtension(file.name)}`)
}

/* -------------------------------------------------------------------------- */
/* Response coercion helpers (shared with the upload transport)               */
/* -------------------------------------------------------------------------- */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

/** Unwraps Lambda proxy envelopes: raw JSON, `{ body: '<json>' }` or `{ body: {} }`. */
export function unwrapPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      return unwrapPayload(JSON.parse(payload))
    } catch {
      return {}
    }
  }

  const record = asRecord(payload)
  if (typeof record.body === 'string') {
    try {
      return unwrapPayload(JSON.parse(record.body))
    } catch {
      return record
    }
  }
  if (isRecord(record.body)) return record.body
  return record
}

/** First non-empty string (or numeric) value found across the given keys. */
export function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

/** First numeric value found across the given keys. */
export function pickNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

/* -------------------------------------------------------------------------- */
/* Documents endpoint                                                         */
/* -------------------------------------------------------------------------- */

/** `GET ${API_BASE_URL}/documents` → normalised knowledge-base feed. */
export async function fetchDocuments(): Promise<DocumentRecord[]> {
  if (IS_MOCK_MODE) {
    await delay(360 + Math.random() * 240)
    return listMockDocuments()
  }

  const response = await fetch(`${API_BASE_URL}/documents`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`GET /documents failed — ${response.status} ${response.statusText}`.trim())
  }

  return normalizeDocuments(await response.json())
}

/** `DELETE ${API_BASE_URL}/documents/${id}` → drops the item from DynamoDB (+ S3 object). */
export async function deleteDocument(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await delay(300 + Math.random() * 220)
    unregisterMockDocument(id)
    return
  }

  const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(
      `DELETE /documents/${id} failed — ${response.status} ${response.statusText}`.trim(),
    )
  }
}

/** Maps any backend list shape onto {@link DocumentRecord}[]. */
export function normalizeDocuments(payload: unknown): DocumentRecord[] {
  return extractList(payload).map((entry, index) => normalizeDocument(entry, index))
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload

  const record = unwrapPayload(payload)
  for (const key of ['documents', 'items', 'results', 'data', 'summaries', 'records']) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }

  const looksLikeDocument = ['documentId', 'docId', 'id', 'fileName', 'summary'].some(
    (key) => key in record,
  )
  return looksLikeDocument ? [record] : []
}

function normalizeDocument(raw: unknown, index: number): DocumentRecord {
  const record = asRecord(raw)
  const fileName =
    pickString(record, ['fileName', 'filename', 'name', 'objectKey', 'key']) ??
    `document-${index + 1}.txt`

  return {
    id:
      pickString(record, ['documentId', 'docId', 'doc_id', 'id', 'key']) ?? `document-${index + 1}`,
    fileName,
    status: normalizeStatus(pickString(record, ['status', 'state', 'processingStatus'])),
    summary:
      pickString(record, ['summary', 'aiSummary', 'ai_summary', 'analysis', 'result', 'text']) ?? '',
    createdAt:
      pickString(record, [
        'createdAt',
        'created_at',
        'timestamp',
        'uploadedAt',
        'uploaded_at',
        'modifiedAt',
      ]) ?? new Date().toISOString(),
    fileSize: pickNumber(record, ['fileSize', 'file_size', 'size', 'bytes', 'contentLength']) ?? 0,
    contentType:
      pickString(record, ['contentType', 'content_type', 'mimeType', 'mime_type']) ??
      guessContentType(fileName),
  }
}

/** Anything not explicitly reported as finished is treated as still in flight. */
function normalizeStatus(value?: string): DocumentStatus {
  const next = (value ?? '').trim().toUpperCase()
  if (next.length === 0) return 'PROCESSING'
  if (
    next.includes('PROCESSED') ||
    ['COMPLETE', 'COMPLETED', 'DONE', 'SUCCESS', 'SUCCEEDED', 'READY'].includes(next)
  ) {
    return 'PROCESSED'
  }
  return 'PROCESSING'
}