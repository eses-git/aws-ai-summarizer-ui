import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock, Copy, FileText, HardDrive, Hash, LoaderCircle, Sparkles, TriangleAlert } from 'lucide-react'
import { StatusBadge } from './ui/StatusBadge'
import { formatAbsoluteTime, formatBytes, formatRelativeTime, shortId, snippet } from '../lib/format'
import { cn, copyText } from '../lib/utils'
import type { DocumentRecord } from '../types'

interface SummaryCardProps {
  document: DocumentRecord
  /** Feed position — used only for the staggered entry animation. */
  index: number
}

const SNIPPET_LENGTH = 180

type CopyState = 'idle' | 'copied' | 'failed'

/** Single knowledge-base entry: metadata rail, AI summary and clipboard action. */
export function SummaryCard({ document, index }: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    },
    [],
  )

  const hasSummary = document.summary.trim().length > 0
  const isTruncatable = document.summary.length > SNIPPET_LENGTH

  const handleCopy = async () => {
    if (!hasSummary) return
    const succeeded = await copyText(document.summary)
    setCopyState(succeeded ? 'copied' : 'failed')
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => setCopyState('idle'), 1800)
  }

  return (
    <article
      className="animate-rise rounded-xl border border-line bg-canvas-soft/50 p-4 transition-colors hover:border-line-strong hover:bg-canvas-soft"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-accent">
          <FileText className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink" title={document.fileName}>
            {document.fileName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
            <Hash className="size-3" />
            {shortId(document.id)}
          </p>
        </div>

        <StatusBadge status={document.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
        <span className="flex items-center gap-1.5" title={formatAbsoluteTime(document.createdAt)}>
          <Clock className="size-3" />
          {formatRelativeTime(document.createdAt)}
        </span>
        <span className="size-1 rounded-full bg-line-strong" />
        <span className="flex items-center gap-1.5">
          <HardDrive className="size-3" />
          {formatBytes(document.fileSize)}
        </span>
        <span className="size-1 rounded-full bg-line-strong" />
        <span className="max-w-[140px] truncate">{document.contentType}</span>
      </div>

      <div className="mt-3 rounded-lg border border-line/70 bg-canvas/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
            <Sparkles className="size-3 text-accent" />
            ai summary
          </p>

          <button
            type="button"
            onClick={() => void handleCopy()}
            disabled={!hasSummary}
            title={hasSummary ? 'Copy summary to clipboard' : 'Summary not available yet'}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors',
              copyState === 'copied' && 'border-success/30 bg-success-soft text-success',
              copyState === 'failed' && 'border-danger/30 bg-danger-soft text-danger',
              copyState === 'idle' && 'border-line text-faint hover:border-accent/40 hover:text-accent',
              !hasSummary && 'cursor-not-allowed opacity-50',
            )}
          >
            {copyState === 'copied' ? (
              <Check className="size-3" />
            ) : copyState === 'failed' ? (
              <TriangleAlert className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
            {copyState === 'copied' ? 'copied' : copyState === 'failed' ? 'blocked' : 'copy'}
          </button>
        </div>

        {hasSummary ? (
          <>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {isExpanded ? document.summary : snippet(document.summary, SNIPPET_LENGTH)}
            </p>

            {isTruncatable ? (
              <button
                type="button"
                onClick={() => setIsExpanded((previous) => !previous)}
                className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-faint uppercase transition-colors hover:text-accent"
              >
                {isExpanded ? 'collapse' : 'expand full summary'}
                <ChevronDown
                  className={cn('size-3 transition-transform', isExpanded && 'rotate-180')}
                />
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-warn">
            <LoaderCircle className="size-3.5 animate-spin" />
            generating summary…
          </p>
        )}
      </div>
    </article>
  )
}