import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock, Copy, FileText, HardDrive, Hash, LoaderCircle, Sparkles, Trash2, TriangleAlert } from 'lucide-react'
import { StatusBadge } from './ui/StatusBadge'
import { deleteDocument } from '../lib/api'
import { formatAbsoluteTime, formatBytes, formatRelativeTime, shortId } from '../lib/format'
import { cn, copyText } from '../lib/utils'
import type { DocumentRecord } from '../types'

interface SummaryCardProps {
  document: DocumentRecord
  /** Feed position — used only for the staggered entry animation. */
  index: number
  /** Called with the document id once the DELETE request resolves successfully. */
  onDeleted: (id: string) => void
}

/** Character heuristic for whether Tailwind's `line-clamp-3` actually clips the text. */
const CLAMP_THRESHOLD = 180

type CopyState = 'idle' | 'copied' | 'failed'
type DeleteState = 'idle' | 'deleting' | 'failed'

/** Single knowledge-base entry: metadata rail, AI summary and clipboard action. */
export function SummaryCard({ document, index, onDeleted }: SummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const resetTimerRef = useRef<number | null>(null)
  const deleteResetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
      if (deleteResetTimerRef.current !== null) window.clearTimeout(deleteResetTimerRef.current)
    },
    [],
  )

  const hasSummary = document.summary.trim().length > 0
  const isTruncatable = document.summary.length > CLAMP_THRESHOLD
  const isDeleting = deleteState === 'deleting'

  const handleCopy = async () => {
    if (!hasSummary) return
    const succeeded = await copyText(document.summary)
    setCopyState(succeeded ? 'copied' : 'failed')
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => setCopyState('idle'), 1800)
  }

  /** DELETE /documents/:id → drop the record from the feed's state array on success. */
  const handleDelete = async () => {
    if (isDeleting) return
    setDeleteState('deleting')
    try {
      await deleteDocument(document.id)
      // Removed from the parent's state array — this card unmounts immediately.
      onDeleted(document.id)
    } catch {
      setDeleteState('failed')
      if (deleteResetTimerRef.current !== null) window.clearTimeout(deleteResetTimerRef.current)
      deleteResetTimerRef.current = window.setTimeout(() => setDeleteState('idle'), 2400)
    }
  }

  return (
    <article
      className="animate-rise rounded-none border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-slate-50 text-slate-900">
          <FileText className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900" title={document.fileName}>
            {document.fileName}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
            <Hash className="size-3" />
            {shortId(document.id)}
          </p>
        </div>

        <StatusBadge status={document.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase">
        <span className="flex items-center gap-1.5" title={formatAbsoluteTime(document.createdAt)}>
          <Clock className="size-3" />
          {formatRelativeTime(document.createdAt)}
        </span>
        <span className="size-1 rounded-none bg-slate-300" />
        <span className="flex items-center gap-1.5">
          <HardDrive className="size-3" />
          {formatBytes(document.fileSize)}
        </span>
        <span className="size-1 rounded-none bg-slate-300" />
        <span className="max-w-[140px] truncate">{document.contentType}</span>
      </div>

      <div className="mt-3 rounded-none border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
            <Sparkles className="size-3 text-slate-900" />
            ai summary
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!hasSummary}
              title={hasSummary ? 'Copy summary to clipboard' : 'Summary not available yet'}
              className={cn(
                'inline-flex items-center gap-1 rounded-none border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors',
                copyState === 'copied' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                copyState === 'failed' && 'border-rose-200 bg-rose-50 text-rose-700',
                copyState === 'idle' && 'border-slate-300 text-slate-500 hover:border-slate-900 hover:text-slate-900',
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

            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              title="Delete document — DELETE /documents/:id"
              aria-label={`Delete ${document.fileName}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-none border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors',
                deleteState === 'failed' && 'border-rose-200 bg-rose-50 text-rose-700',
                deleteState === 'deleting' && 'cursor-wait border-rose-200 text-rose-700',
                deleteState === 'idle' && 'border-slate-300 text-slate-500 hover:border-rose-300 hover:text-rose-700',
              )}
            >
              {isDeleting ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : deleteState === 'failed' ? (
                <TriangleAlert className="size-3" />
              ) : (
                <Trash2 className="size-3" />
              )}
              {isDeleting ? 'deleting' : deleteState === 'failed' ? 'failed' : 'delete'}
            </button>
          </div>
        </div>

        {hasSummary ? (
          <>
            <p
              className={cn(
                'mt-2 text-xs leading-relaxed text-slate-700',
                !isExpanded && 'line-clamp-3',
              )}
            >
              {document.summary}
            </p>

            {isTruncatable ? (
              <button
                type="button"
                onClick={() => setIsExpanded((previous) => !previous)}
                aria-expanded={isExpanded}
                className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-slate-400 uppercase transition-colors hover:text-slate-900"
              >
                {isExpanded ? 'collapse' : 'expand'}
                <ChevronDown
                  className={cn('size-3 transition-transform', isExpanded && 'rotate-180')}
                />
              </button>
            ) : null}
          </>
        ) : (
          <p className="mt-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-amber-600">
            <LoaderCircle className="size-3.5 animate-spin" />
            generating summary…
          </p>
        )}
      </div>
    </article>
  )
}