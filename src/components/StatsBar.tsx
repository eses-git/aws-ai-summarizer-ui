import { Activity, CircleCheck, HardDrive, Layers, RefreshCw } from 'lucide-react'
import { formatBytes, formatRelativeTime, percentage } from '../lib/format'
import { cn } from '../lib/utils'
import type { DocumentRecord } from '../types'

interface StatsBarProps {
  documents: DocumentRecord[]
  isLoading: boolean
  lastSyncedAt: Date | null
}

/** Storage meter reference point (50 MB budget) used for the capacity bar. */
const STORAGE_BUDGET_BYTES = 50 * 1024 * 1024

/** Four-tile key metrics rail sitting above the two dashboard columns. */
export function StatsBar({ documents, isLoading, lastSyncedAt }: StatsBarProps) {
  const total = documents.length
  const processed = documents.filter((doc) => doc.status === 'PROCESSED').length
  const processing = total - processed
  const storageBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
  const completionRate = percentage(processed, total)
  const awaitingFirstSync = isLoading && total === 0
  const placeholder = '—'

  const tiles = [
    {
      key: 'total',
      label: 'Total Documents',
      value: awaitingFirstSync ? placeholder : String(total),
      hint: 'DynamoDB knowledge base',
      Icon: Layers,
      text: 'text-indigo-600',
      bar: 'from-indigo-500 to-indigo-600',
      meter: total > 0 ? 100 : 0,
    },
    {
      key: 'processed',
      label: 'Processed',
      value: awaitingFirstSync ? placeholder : String(processed),
      hint: `${completionRate}% pipeline success`,
      Icon: CircleCheck,
      text: 'text-emerald-600',
      bar: 'from-emerald-500 to-emerald-600',
      meter: completionRate,
    },
    {
      key: 'processing',
      label: 'Processing',
      value: awaitingFirstSync ? placeholder : String(processing),
      hint: processing > 0 ? 'Lambda workers active' : 'Queue drained',
      Icon: Activity,
      text: 'text-amber-600',
      bar: 'from-amber-500 to-amber-600',
      meter: percentage(processing, total),
    },
    {
      key: 'storage',
      label: 'Storage Used',
      value: awaitingFirstSync ? placeholder : formatBytes(storageBytes),
      hint: 'S3 standard tier',
      Icon: HardDrive,
      text: 'text-indigo-600',
      bar: 'from-indigo-500 to-indigo-600',
      meter: Math.min(100, percentage(storageBytes, STORAGE_BUDGET_BYTES)),
    },
  ]

  return (
    <section aria-label="Pipeline metrics" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Pipeline Metrics
        </h2>
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase">
          <RefreshCw className={cn('size-3', isLoading && 'animate-spin')} />
          {lastSyncedAt
            ? `last sync ${formatRelativeTime(lastSyncedAt.toISOString())}`
            : 'awaiting first sync'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ key, label, value, hint, Icon, text, bar, meter }) => (
          <article
            key={key}
            className="group relative overflow-hidden rounded-none border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
          >
            <span className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', bar)} />

            <div className="flex items-center justify-between gap-3">
              <p className="truncate font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
                {label}
              </p>
              <Icon className={cn('size-4 shrink-0', text)} />
            </div>

            <p className="mt-3 font-mono text-2xl leading-none font-semibold text-slate-900 tabular-nums">
              {value}
            </p>
            <p className="mt-2 truncate text-[11px] text-slate-500">{hint}</p>

            <div className="mt-3 h-1 w-full overflow-hidden rounded-none bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-none bg-gradient-to-r transition-[width] duration-500',
                  bar,
                )}
                style={{ width: `${meter}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

