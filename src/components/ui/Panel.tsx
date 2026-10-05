import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PanelProps {
  /** Panel heading rendered in the header rail. */
  title: string
  /** Monospace eyebrow / supporting label. */
  subtitle?: string
  /** Icon element rendered inside the square glyph tile. */
  icon?: ReactNode
  /** Right-aligned header controls. */
  actions?: ReactNode
  /** Optional footer rail. */
  footer?: ReactNode
  /** Extra classes for the outer shell (used to stretch panels in the grid). */
  className?: string
  /** Extra classes for the content region. */
  bodyClassName?: string
  children: ReactNode
}

/**
 * Shared console panel shell — guarantees symmetrical chrome across both
 * dashboard columns (identical header rail, borders and padding rhythm).
 */
export function Panel({
  title,
  subtitle,
  icon,
  actions,
  footer,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel/70 shadow-panel backdrop-blur-sm',
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-line/80 bg-canvas-soft/60 px-5 py-4">
        {icon ? (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-accent">
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-1 truncate font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              {subtitle}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <div className={cn('flex-1 px-5 py-5', bodyClassName)}>{children}</div>

      {footer ? (
        <footer className="border-t border-line/80 bg-canvas-soft/40 px-5 py-3">{footer}</footer>
      ) : null}
    </section>
  )
}