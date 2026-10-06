import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  AlertTriangle,
  Check,
  CloudUpload,
  FileText,
  FileUp,
  LoaderCircle,
  Trash2,
  Upload,
} from 'lucide-react'
import { PipelineStatus } from './PipelineStatus'
import { Panel } from './ui/Panel'
import {
  ACCEPT_ATTRIBUTE,
  IS_MOCK_MODE,
  MAX_FILE_BYTES,
  SUPPORTED_EXTENSIONS,
  isSupportedFile,
  resolveContentType,
} from '../lib/api'
import { formatBytes } from '../lib/format'
import { STAGE_LABEL } from '../lib/pipeline'
import { requestUploadUrl, uploadObject } from '../lib/upload'
import { cn } from '../lib/utils'
import type { DocumentRecord, PipelineStage } from '../types'

interface UploadCardProps {
  /** Called once the S3 transfer succeeds so the feed can show the job instantly. */
  onUploaded: (record: DocumentRecord) => void
}

/** Left column: drag-and-drop ingest zone plus live pipeline telemetry. */
export function UploadCard({ onUploaded }: UploadCardProps) {
  const inputId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [progress, setProgress] = useState(0)
  const [failedStep, setFailedStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)

  useEffect(
    () => () => {
      mountedRef.current = false
      abortRef.current?.abort()
    },
    [],
  )

  const isBusy = stage === 'requesting-url' || stage === 'uploading'

  const selectFile = useCallback((candidate: File | null) => {
    if (!candidate) return
    setFile(candidate)
    setStage('idle')
    setProgress(0)
    setFailedStep(0)
    setError(null)
    setDocumentId(null)
  }, [])

  const failAt = useCallback((step: number, message: string) => {
    setFailedStep(step)
    setError(message)
    setStage('error')
  }, [])

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      if (!isBusy) setIsDragging(true)
    },
    [isBusy],
  )

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    // Ignore the leave events fired while moving across child nodes.
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      setIsDragging(false)
      if (isBusy) return
      selectFile(event.dataTransfer.files?.[0] ?? null)
    },
    [isBusy, selectFile],
  )

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      selectFile(event.target.files?.[0] ?? null)
      event.target.value = ''
    },
    [selectFile],
  )

  /** Two-step upload: 1) presign via API Gateway, 2) PUT the payload straight to S3. */
  const handleUpload = useCallback(async () => {
    if (!file) return

    if (!isSupportedFile(file)) {
      failAt(0, `Unsupported file type. Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}.`)
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      failAt(0, `File exceeds the ${formatBytes(MAX_FILE_BYTES)} pipeline limit.`)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    let currentStep = 0

    setError(null)
    setProgress(0)
    setDocumentId(null)
    setFailedStep(0)
    setStage('requesting-url')

    try {
      const ticket = await requestUploadUrl(file)
      if (!mountedRef.current) return

      currentStep = 1
      setDocumentId(ticket.documentId)
      setFailedStep(1)
      setStage('uploading')

      await uploadObject(
        ticket,
        file,
        (percent) => {
          if (mountedRef.current) setProgress(percent)
        },
        controller.signal,
      )
      if (!mountedRef.current) return

      currentStep = 2
      setProgress(100)
      setFailedStep(2)
      setStage('processing')
      onUploaded({
        id: ticket.documentId,
        fileName: ticket.fileName,
        status: 'PROCESSING',
        summary: '',
        createdAt: new Date().toISOString(),
        fileSize: ticket.fileSize,
        contentType: ticket.contentType,
      })
      setStage('complete')
      setFile(null)
    } catch (caught) {
      if (!mountedRef.current) return
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      failAt(
        currentStep,
        caught instanceof Error ? caught.message : 'Upload failed unexpectedly.',
      )
    }
  }, [failAt, file, onUploaded])

  const progressLabel =
    stage === 'requesting-url' ? 'Requesting presigned URL' : 'Uploading to S3'

  return (
    <Panel
      title="Document Upload"
      subtitle="S3 presigned ingest pipeline"
      icon={<Upload className="size-4" />}
      className="h-full"
      bodyClassName="flex flex-col gap-4"
      actions={
        <span className="rounded-none border border-slate-300 bg-white px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase">
          {IS_MOCK_MODE ? 'mock' : 'live'}
        </span>
      }
      footer={
        <p className="font-mono text-[10px] leading-relaxed tracking-[0.1em] text-slate-400 uppercase">
          step 1 · post /upload-url → step 2 · put presigned object
        </p>
      }
    >
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleInputChange}
        className="sr-only"
      />

      <label
        htmlFor={inputId}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-none border border-dashed px-6 py-9 text-center transition-colors',
          isDragging
            ? 'border-slate-900 bg-slate-50'
            : 'border-slate-300 bg-white hover:border-slate-900 hover:bg-slate-50',
          isBusy && 'pointer-events-none opacity-60',
        )}
      >
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-none border bg-slate-50 transition-colors',
            isDragging ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-500',
          )}
        >
          <CloudUpload className="size-6" />
        </span>

        <span className="space-y-1">
          <span className="block text-sm font-medium text-slate-900">
            {isDragging ? 'Drop to stage the document' : 'Drag & drop your document'}
          </span>
          <span className="block text-xs text-slate-500">
            or{' '}
            <span className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4">
              browse files
            </span>
          </span>
        </span>

        <span className="flex flex-wrap items-center justify-center gap-1.5">
          {SUPPORTED_EXTENSIONS.map((extension) => (
            <span
              key={extension}
              className="rounded-none border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500"
            >
              {extension}
            </span>
          ))}
          <span className="font-mono text-[10px] text-slate-400">
            max {formatBytes(MAX_FILE_BYTES)}
          </span>
        </span>
      </label>

      {file ? (
        <div className="flex items-center gap-3 rounded-none border border-slate-200 bg-slate-50 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-white text-slate-900">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-900">{file.name}</p>
            <p className="truncate font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase">
              {formatBytes(file.size)} · {resolveContentType(file)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectFile(null)}
            aria-label="Remove selected file"
            className="rounded-none border border-slate-300 p-1.5 text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : null}

      {isBusy ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase">
            <span>{progressLabel}</span>
            <span className="text-slate-500 tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-none border border-slate-200 bg-slate-100">
            <div
              className="h-full rounded-none bg-gradient-to-r from-slate-700 to-slate-900 transition-[width] duration-300"
              style={{ width: `${Math.max(progress, stage === 'requesting-url' ? 8 : 0)}%` }}
            />
          </div>
        </div>
      ) : null}
      {stage === 'complete' && documentId ? (
        <div className="flex items-start gap-2 rounded-none border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          <p className="leading-relaxed">
            Transfer complete. <span className="font-mono">{documentId}</span> is queued for AI
            summarization — results land in the knowledge base feed.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-none border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p className="leading-relaxed">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleUpload()}
        disabled={!file || isBusy}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-none px-4 py-3 font-mono text-xs font-medium tracking-[0.14em] uppercase transition-all',
          !file || isBusy
            ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
            : 'border border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
        )}
      >
        {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {isBusy ? STAGE_LABEL[stage] : 'Upload & Process'}
      </button>

      <PipelineStatus stage={stage} failedStep={failedStep} />
    </Panel>
  )
}