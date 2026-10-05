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
}

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PROCESSED', label: 'Processed' },
  { key: 'PROCESSING', label: 'Processing' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const ACTION_CHIP =
  'rounded-md border border-line bg-canvas px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-faint tabular-nums uppercase'

const REFRESH_BUTTON = 'rounded-md border border-line bg-canvas p-1.5 transition-colors'

/** Right column: searchable, refreshable DynamoDB results feed. */
export function SummaryFeed({
  documents,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
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
              isRefreshing ? 'text-accent' : 'text-faint hover:border-accent/40 hover:text-accent',
            )}
          >
            <RefreshCw className={cn('size-3.5', isRefreshing && 'animate-spin')} />
          </button>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
          {processingCount > 0 ? (
            <span className="flex items-center gap-2 text-warn">
              <span className="size-1.5 animate-pulse-soft rounded-full bg-warn" />
              auto-refresh · {processingCount} in flight
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" />
              queue idle
            </span>
          )}
          <span className="truncate">{IS_MOCK_MODE ? 'mock dataset' : 'live dataset'}</span>
        </div>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search file name, document id or summary…"
            aria-label="Search summaries"
            className="w-full rounded-lg border border-line bg-canvas py-2.5 pr-9 pl-9 font-mono text-xs text-ink transition-colors placeholder:text-faint focus:border-accent-line focus:outline-none"
          />
          {isSearching ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-faint transition-colors hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line bg-canvas p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-md px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors',
                filter === key ? 'bg-accent-soft text-accent' : 'text-faint hover:text-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
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
            <SummaryCard key={`${doc.id}-${doc.status}`} document={doc} index={index} />
          ))
        )}
      </div>
    </Panel>
  )
}

/** Loading placeholder matching the summary card rhythm. */
function FeedSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-line bg-canvas-soft/50 p-4">
      <div className="flex items-center gap-3">
        <span className="size-9 shrink-0 rounded-lg bg-line/70" />
        <div className="flex-1 space-y-2">
          <span className="block h-3 w-1/2 rounded bg-line/70" />
          <span className="block h-2 w-1/3 rounded bg-line/50" />
        </div>
        <span className="h-5 w-20 shrink-0 rounded bg-line/60" />
      </div>
      <div className="mt-3 h-16 rounded-lg bg-line/40" />
    </div>
  )
}

/** Empty state that differentiates an empty feed from a fruitless search. */
function EmptyState({ isSearching, query }: { isSearching: boolean; query: string }) {
  const Icon = isSearching ? Search : FileText

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-faint">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm text-ink">
          {isSearching ? 'No matching documents' : 'Knowledge base is empty'}
        </p>
        <p className="text-xs text-muted">
          {isSearching ? (
            <>
              Nothing matches <span className="font-mono text-accent">{query}</span> — try another
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