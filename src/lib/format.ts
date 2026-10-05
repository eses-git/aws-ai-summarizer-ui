const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** Human readable byte size, e.g. `1.4 MB`. */
export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  const decimals = exponent === 0 ? 0 : value < 10 ? 1 : 0
  return `${value.toFixed(decimals)} ${BYTE_UNITS[exponent]}`
}

/** Compact relative timestamp, e.g. `4m ago`. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) {
    return 'unknown'
  }

  const seconds = Math.floor(Math.max(0, now - timestamp) / 1000)
  if (seconds < 45) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Absolute timestamp for tooltips, e.g. `Oct 05, 2026, 14:32`. */
export function formatAbsoluteTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Truncated monospace id, e.g. `doc-8f2a91c4` -> `8f2a91c4`. */
export function shortId(id: string): string {
  if (!id) return '--------'
  const cleaned = id.replace(/^doc[-_]?/i, '')
  return cleaned.length > 12 ? `${cleaned.slice(0, 12)}…` : cleaned
}

/** Collapses whitespace and clamps a string for snippet previews. */
export function snippet(value: string, max = 140): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  return collapsed.length > max ? `${collapsed.slice(0, max).trimEnd()}…` : collapsed
}

/** Percentage helper that never divides by zero. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}