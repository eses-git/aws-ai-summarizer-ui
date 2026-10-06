import type { ReactNode } from 'react'
import { Activity, Boxes, Layers, Radio, Server, Sun, WifiOff } from 'lucide-react'
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
    text: 'text-emerald-700',
    border: 'border-emerald-200 bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  mock: {
    label: 'Mock Mode',
    text: 'text-indigo-700',
    border: 'border-indigo-200 bg-indigo-50',
    dot: 'bg-indigo-500',
  },
  checking: {
    label: 'Syncing',
    text: 'text-indigo-700',
    border: 'border-indigo-200 bg-indigo-50',
    dot: 'bg-indigo-500',
  },
  offline: {
    label: 'API Offline',
    text: 'text-rose-700',
    border: 'border-rose-200 bg-rose-50',
    dot: 'bg-rose-500',
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-slate-900 text-white">
            <Boxes className="size-5" />
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 size-2.5 rounded-none ring-2 ring-white',
                isLive ? 'bg-emerald-500' : 'bg-rose-500',
              )}
            />
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
              AWS Serverless AI Document Summarizer
            </h1>
            <p className="truncate font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
              API Gateway · Lambda · S3 · DynamoDB · Bedrock
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span
            className={cn(
              'flex items-center gap-2 rounded-none border px-3 py-1.5',
              meta.border,
            )}
          >
            <span className="relative flex size-2">
              {isLive ? (
                <span
                  className={cn(
                    'absolute inline-flex size-2 animate-ping rounded-none opacity-70',
                    meta.dot,
                  )}
                />
              ) : null}
              <span className={cn('relative inline-flex size-2 rounded-none', meta.dot)} />
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
          <HeaderBadge icon={<Sun className="size-3" />} label="Light" />
          <HeaderBadge
            icon={<Layers className="size-3" />}
            label={`${documentCount} ${documentCount === 1 ? 'doc' : 'docs'}`}
          />

          <span
            title={API_LABEL}
            className="hidden max-w-[260px] truncate rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.06em] text-slate-500 lg:inline-block"
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
    <span className="hidden items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-slate-500 uppercase sm:inline-flex">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
  )
}