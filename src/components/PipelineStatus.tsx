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
  pending: 'border-slate-200 bg-white text-slate-400',
  active: 'border-indigo-200 bg-indigo-50 text-indigo-600',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
}

const LABEL_CLASSES: Record<StepState, string> = {
  pending: 'text-slate-400',
  active: 'text-slate-900',
  done: 'text-slate-500',
  failed: 'text-rose-700',
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
    <div className={cn('border-t border-slate-200 pt-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">
          Live Pipeline Status
        </p>
        <p
          className={cn(
            'font-mono text-[10px] tracking-[0.14em] uppercase',
            stage === 'error'
              ? 'text-rose-700'
              : stage === 'complete'
                ? 'text-emerald-700'
                : stage === 'idle'
                  ? 'text-slate-400'
                  : 'text-indigo-600',
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
              className="flex items-center gap-3 rounded-none border border-slate-200 bg-slate-50 px-3 py-2 transition-colors"
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-none border font-mono text-[10px]',
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

              <span className="hidden font-mono text-[10px] tracking-[0.1em] text-slate-400 uppercase sm:inline">
                {step.detail}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}