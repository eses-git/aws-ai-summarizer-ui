import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDocuments, IS_MOCK_MODE } from '../lib/api'
import type { ConnectionState, DocumentRecord } from '../types'

/** Cadence used to poll while at least one document is still processing. */
const POLL_INTERVAL_MS = 5000

export interface UseDocumentsResult {
  documents: DocumentRecord[]
  /** True only for the very first load (drives skeletons). */
  isLoading: boolean
  /** True while a background/polling refresh is in flight. */
  isRefreshing: boolean
  error: string | null
  connection: ConnectionState
  lastSyncedAt: Date | null
  refresh: () => void
  upsertDocument: (doc: DocumentRecord) => void
}

interface RefreshOptions {
  silent?: boolean
}

/**
 * Owns the knowledge-base feed: bootstrap fetch, manual refresh, optimistic
 * inserts after upload and self-cancelling polling while jobs are in flight.
 */
export function useDocuments(): UseDocumentsResult {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<ConnectionState>(
    IS_MOCK_MODE ? 'mock' : 'checking',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const requestIdRef = useRef(0)
  const didBootstrapRef = useRef(false)

  const load = useCallback(async ({ silent = false }: RefreshOptions = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (silent) setIsRefreshing(true)

    try {
      const next = await fetchDocuments()
      if (requestIdRef.current !== requestId) return
      setDocuments(next)
      setError(null)
      setConnection(IS_MOCK_MODE ? 'mock' : 'connected')
      setLastSyncedAt(new Date())
    } catch (caught) {
      if (requestIdRef.current !== requestId) return
      setError(
        caught instanceof Error ? caught.message : 'Unable to reach the summarizer API.',
      )
      setConnection(IS_MOCK_MODE ? 'mock' : 'offline')
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [])

  const refresh = useCallback(() => {
    void load()
  }, [load])

  // Bootstrap once (guarded so React StrictMode's double mount stays single-shot).
  useEffect(() => {
    if (didBootstrapRef.current) return
    didBootstrapRef.current = true
    void load()
  }, [load])

  const hasProcessing = documents.some((doc) => doc.status === 'PROCESSING')

  // Poll only while the pipeline still has work outstanding.
  useEffect(() => {
    if (!hasProcessing) return
    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [hasProcessing, load])

  const upsertDocument = useCallback((doc: DocumentRecord) => {
    setDocuments((previous) => [doc, ...previous.filter((item) => item.id !== doc.id)])
  }, [])

  return {
    documents,
    isLoading,
    isRefreshing,
    error,
    connection,
    lastSyncedAt,
    refresh,
    upsertDocument,
  }
}