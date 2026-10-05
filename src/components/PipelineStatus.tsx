import { AlertTriangle, Check, LoaderCircle } from 'lucide-react'
import { STAGE_LABEL } from '../lib/pipeline'
import { cn } from '../lib/utils'
import type { PipelineStage } from '../types'

export interface PipelineStatusProps {
  stage: PipelineStage
  /** Zero-based index of the step that failed (only read when stage is `error`). */
  failedStep: number
  className?: string
}

type StepState = 'pending' | 'active' | 'done' | 'failed'

/** The three observable hops of the serverless ingest path. */
const STEPS = [
  { label: 'Presigned URL', detail: 'post /upload-url' },
  { label: 'S3 Transfer', detail: 'put presigned object' },
  { label: 'AI Summarize', detail: 'lambda → bedrock' },
] as const

const STAGE_INDEX: Record<PipelineStage, number> = {
  idle: -1,
  'requesting-url': 0,
  uploading: 1,
  processing: 2,
  complete: 3,
  error: -1,
}

const GLYPH_CLASSES: Record<StepState, string> = {
  pending: 'border-line bg-canvas text-faint',
  active: 'border-accent-line bg-accent-soft text-accent',
  done: 'border-success/30 bg-success-soft text-success',
  failed: 'border-danger/30 bg-danger-soft text-danger',
}

const LABEL_CLASSES: Record<StepState, string> = {
  pending: 'text-faint',
  active: 'text-ink',
  done: 'text-muted',
  failed: 'text-danger',
}

/** Live three-step pipeline stepper rendered under the upload controls. */
export function PipelineStatus({ stage, failedStep, className }: PipelineStatusProps) {
  const currentIndex = STAGE_INDEX[stage]

  const resolveState = (index: number): StepState => {
    if (stage === 'error') {
      if (index === failedStep) return 'failed'
      return index < failedStep ? 'done' : 'pending'
    }
    if (stage === 'complete') return 'done'
    if (currentIndex === -1) return 'pending'
    if (index < currentIndex) return 'done'
    if (index === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <div className={cn('border-t border-line/70 pt-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">
          Live Pipeline Status
        </p>
        <p
          className={cn(
            'font-mono text-[10px] tracking-[0.14em] uppercase',
            stage === 'error'
              ? 'text-danger'
              : stage === 'complete'
                ? 'text-success'
                : stage === 'idle'
                  ? 'text-faint'
                  : 'text-accent',
          )}
        >
          {STAGE_LABEL[stage]}
        </p>
      </div>

      <ol className="mt-3 space-y-2">
        {STEPS.map((step, index) => {
          const state = resolveState(index)

          return (
            <li
              key={step.label}
              className="flex items-center gap-3 rounded-lg border border-line/60 bg-canvas-soft/40 px-3 py-2 transition-colors"
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[10px]',
                  GLYPH_CLASSES[state],
                )}
              >
                {state === 'done' ? (
                  <Check className="size-3.5" />
                ) : state === 'active' ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : state === 'failed' ? (
                  <AlertTriangle className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>

              <span className={cn('min-w-0 flex-1 truncate text-xs', LABEL_CLASSES[state])}>
                {step.label}
              </span>

              <span className="hidden font-mono text-[10px] tracking-[0.1em] text-faint uppercase sm:inline">
                {step.detail}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}