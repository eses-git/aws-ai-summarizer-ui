import { useCallback } from 'react'
import { Header } from './components/Header'
import { StatsBar } from './components/StatsBar'
import { SummaryFeed } from './components/SummaryFeed'
import { UploadCard } from './components/UploadCard'
import { useDocuments } from './hooks/useDocuments'
import { API_LABEL, AWS_REGION, IS_MOCK_MODE } from './lib/api'
import type { DocumentRecord } from './types'

/**
 * Symmetrical console layout:
 *   left  → document upload + live pipeline status
 *   right → summaries feed + DynamoDB knowledge base
 */
export default function App() {
  const {
    documents,
    isLoading,
    isRefreshing,
    error,
    connection,
    lastSyncedAt,
    refresh,
    upsertDocument,
    removeDocument,
  } = useDocuments()

  // Surface the freshly uploaded job in the feed immediately, then let the
  // polling loop reconcile it once the Lambda writes the summary.
  const handleUploaded = useCallback(
    (record: DocumentRecord) => {
      upsertDocument(record)
    },
    [upsertDocument],
  )

  return (
    <div className="relative min-h-screen bg-[#F4F6F8]">
      <div className="relative flex min-h-screen flex-col">
        <Header connection={connection} documentCount={documents.length} />

        {IS_MOCK_MODE ? (
          <div className="border-b border-indigo-200 bg-indigo-50">
            <p className="mx-auto max-w-[1440px] px-4 py-2 font-mono text-[10px] tracking-[0.14em] text-indigo-700 uppercase sm:px-6 lg:px-8">
              sandbox dataset active — set VITE_AWS_API_URL in .env.local to stream from API Gateway
            </p>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <StatsBar documents={documents} isLoading={isLoading} lastSyncedAt={lastSyncedAt} />

          <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
            <UploadCard onUploaded={handleUploaded} />
            <SummaryFeed
              documents={documents}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              error={error}
              onRefresh={refresh}
              onDeleted={removeDocument}
            />
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase">
            <span className="truncate">endpoint · {API_LABEL}</span>
            <span>region · {AWS_REGION} · react 19 · vite 8 · tailwind 4</span>
          </div>
        </footer>
      </div>
    </div>
  )
}