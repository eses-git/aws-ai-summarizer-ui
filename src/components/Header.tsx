import type { ReactNode } from 'react'
import { Activity, Boxes, Layers, Moon, Radio, Server, WifiOff } from 'lucide-react'
import { API_LABEL, AWS_REGION } from '../lib/api'
import { cn } from '../lib/utils'
import type { ConnectionState } from '../types'

interface HeaderProps {
  connection: ConnectionState
  documentCount: number
}

interface ConnectionMeta {
  label: string
  text: string
  border: string
  dot: string
}

const CONNECTION_META: Record<ConnectionState, ConnectionMeta> = {
  connected: {
    label: 'API Connected',
    text: 'text-success',
    border: 'border-success/30 bg-success-soft',
    dot: 'bg-success',
  },
  mock: {
    label: 'Mock Mode',
    text: 'text-accent',
    border: 'border-accent-line bg-accent-soft',
    dot: 'bg-accent',
  },
  checking: {
    label: 'Syncing',
    text: 'text-accent',
    border: 'border-accent-line bg-accent-soft',
    dot: 'bg-accent',
  },
  offline: {
    label: 'API Offline',
    text: 'text-danger',
    border: 'border-danger/30 bg-danger-soft',
    dot: 'bg-danger',
  },
}

const CONNECTION_ICON: Record<ConnectionState, typeof Radio> = {
  connected: Radio,
  mock: Activity,
  checking: Activity,
  offline: WifiOff,
}

/** Sticky system status bar: brand, live API connection indicator and badges. */
export function Header({ connection, documentCount }: HeaderProps) {
  const meta = CONNECTION_META[connection]
  const StatusIcon = CONNECTION_ICON[connection]
  const isLive = connection !== 'offline'

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent-line bg-accent-soft text-accent">
            <Boxes className="size-5" />
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-canvas',
                isLive ? 'bg-success' : 'bg-danger',
              )}
            />
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-ink sm:text-base">
              AWS Serverless AI Document Summarizer
            </h1>
            <p className="truncate font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
              API Gateway · Lambda · S3 · DynamoDB · Bedrock
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5',
              meta.border,
            )}
          >
            <span className="relative flex size-2">
              {isLive ? (
                <span
                  className={cn(
                    'absolute inline-flex size-2 animate-ping rounded-full opacity-70',
                    meta.dot,
                  )}
                />
              ) : null}
              <span className={cn('relative inline-flex size-2 rounded-full', meta.dot)} />
            </span>
            <StatusIcon className={cn('size-3.5', meta.text)} />
            <span
              className={cn(
                'font-mono text-[10px] font-medium tracking-[0.14em] uppercase',
                meta.text,
              )}
            >
              {meta.label}
            </span>
          </span>

          <HeaderBadge icon={<Server className="size-3" />} label={AWS_REGION} />
          <HeaderBadge icon={<Moon className="size-3" />} label="Dark" />
          <HeaderBadge
            icon={<Layers className="size-3" />}
            label={`${documentCount} ${documentCount === 1 ? 'doc' : 'docs'}`}
          />

          <span
            title={API_LABEL}
            className="hidden max-w-[260px] truncate rounded-lg border border-line bg-canvas-soft px-2.5 py-1.5 font-mono text-[10px] tracking-[0.06em] text-faint lg:inline-block"
          >
            {API_LABEL}
          </span>
        </div>
      </div>
    </header>
  )
}

function HeaderBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="hidden items-center gap-1.5 rounded-lg border border-line bg-canvas-soft px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-muted uppercase sm:inline-flex">
      <span className="text-faint">{icon}</span>
      {label}
    </span>
  )
}