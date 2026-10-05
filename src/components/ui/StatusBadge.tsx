import { CircleCheck, CircleDashed } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { DocumentStatus } from '../../types'

interface StatusBadgeProps {
  status: DocumentStatus
  className?: string
}

/** High-contrast monospaced status pill: emerald for processed, amber for in-flight. */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isProcessed = status === 'PROCESSED'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] leading-none font-medium tracking-[0.14em] uppercase',
        isProcessed
          ? 'border-success/30 bg-success-soft text-success'
          : 'border-warn/30 bg-warn-soft text-warn',
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