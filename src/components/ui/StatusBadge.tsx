import { CircleCheck, CircleDashed } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DocumentStatus } from '../../types'

interface StatusBadgeProps {
  status: DocumentStatus
  className?: string
}

/** High-contrast monospaced status tag: emerald for processed, indigo for in-flight. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isProcessed = status === 'PROCESSED'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-none border px-2 py-0.5 font-mono text-xs leading-none font-medium tracking-wider uppercase',
        isProcessed
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-indigo-200 bg-indigo-50 text-indigo-800',
        className,
      )}
    >
      {isProcessed ? (
        <CircleCheck className="size-3" />
      ) : (
        <CircleDashed className="size-3 animate-orbit" />
      )}
      {status}
    </span>
  )
}