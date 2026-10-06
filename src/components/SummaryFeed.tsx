import { useMemo, useState } from 'react'
import { Database, FileText, RefreshCw, Search, TriangleAlert, X } from 'lucide-react'
import { SummaryCard } from './SummaryCard'
import { Panel } from './ui/Panel'
import { IS_MOCK_MODE } from '../lib/api'
import { cn } from '../lib/utils'
import type { DocumentRecord } from '../types'

interface SummaryFeedProps {
  documents: DocumentRecord[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  onRefresh: () => void
  /** Removes a document from the feed once its DELETE succeeds. */
  onDeleted: (id: string) => void
}

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PROCESSED', label: 'Processed' },
  { key: 'PROCESSING', label: 'Processing' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const ACTION_CHIP =
  'rounded-none border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-slate-500 tabular-nums uppercase'

const REFRESH_BUTTON = 'rounded-none border border-slate-300 bg-white p-1.5 transition-colors'

/** Right column: searchable, refreshable DynamoDB results feed. */
export function SummaryFeed({
  documents,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onDeleted,
}: SummaryFeedProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('ALL')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return documents.filter((doc) => {
      if (filter !== 'ALL' && doc.status !== filter) return false
      if (needle.length === 0) return true
      return (
        doc.fileName.toLowerCase().includes(needle) ||
        doc.id.toLowerCase().includes(needle) ||
        doc.summary.toLowerCase().includes(needle)
      )
    })
  }, [documents, filter, query])

  const processingCount = documents.filter((doc) => doc.status === 'PROCESSING').length
  const isSearching = query.trim().length > 0
  const showSkeletons = isLoading && documents.length === 0

  return (
    <Panel
      title="Summaries Feed"
      subtitle="DynamoDB results · knowledge base"
      icon={<Database className="size-4" />}
      className="h-full"
      bodyClassName="flex flex-col gap-4"
      actions={
        <>
          <span className={ACTION_CHIP}>
            {filtered.length}/{documents.length}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh summaries"
            title="GET /documents"
            className={cn(
              REFRESH_BUTTON,
              isRefreshing ? 'text-slate-900' : 'text-slate-500 hover:border-slate-900 hover:text-slate-900',
            )}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.1em] text-slate-400 uppercase">
          {processingCount > 0 ? (
            <span className="flex items-center gap-2 text-amber-600">
              <span className="size-1.5 animate-pulse-soft rounded-none bg-amber-500" />
              auto-refresh · {processingCount} in flight
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-none bg-emerald-500" />
              queue idle
            </span>
          )}
          <span className="truncate">{IS_MOCK_MODE ? 'mock dataset' : 'live dataset'}</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file name, document id or summary…"
            aria-label="Search summaries"
            className="w-full rounded-none border border-slate-300 bg-white py-2.5 pr-9 pl-9 font-mono text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 focus:outline-none"
          />
          {isSearching ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-none p-1 text-slate-400 transition-colors hover:text-slate-900"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-none border border-slate-300 bg-white p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-none px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors',
                filter === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="flex items-start gap-2 rounded-none border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="leading-relaxed">{error}</p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.1em] uppercase opacity-80">
              verify VITE_AWS_API_URL and the bucket CORS policy
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 lg:max-h-[470px] lg:overflow-y-auto lg:pr-1">
        {showSkeletons ? (
          <>
            <FeedSkeleton />
            <FeedSkeleton />
            <FeedSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState isSearching={isSearching} query={query} />
        ) : (
          filtered.map((doc, index) => (
            <SummaryCard
              key={`${doc.id}-${doc.status}`}
              document={doc}
              index={index}
              onDeleted={onDeleted}
            />
          ))
        )}
      </div>
    </Panel>
  )
}

/** Loading placeholder matching the summary card rhythm. */
function FeedSkeleton() {
  return (
    <div className="animate-pulse rounded-none border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className="size-9 shrink-0 rounded-none bg-slate-200" />
        <div className="flex-1 space-y-2">
          <span className="block h-3 w-1/2 rounded-none bg-slate-200" />
          <span className="block h-2 w-1/3 rounded-none bg-slate-200" />
        </div>
        <span className="h-5 w-20 shrink-0 rounded-none bg-slate-200" />
      </div>
      <div className="mt-3 h-16 rounded-none bg-slate-100" />
    </div>
  )
}

/** Empty state that differentiates an empty feed from a fruitless search. */
function EmptyState({ isSearching, query }: { isSearching: boolean; query: string }) {
  const Icon = isSearching ? Search : FileText

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-none border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-none border border-slate-200 bg-white text-slate-400">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm text-slate-900">
          {isSearching ? 'No matching documents' : 'Knowledge base is empty'}
        </p>
        <p className="text-xs text-slate-500">
          {isSearching ? (
            <>
              Nothing matches <span className="font-mono text-slate-900">{query}</span> — try another
              term.
            </>
          ) : (
            'Upload a document to trigger the summarization pipeline.'
          )}
        </p>
      </div>
    </div>
  )
}