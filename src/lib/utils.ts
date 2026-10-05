import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'

/**
 * Conditional className helper: `clsx` for logic, `tailwind-merge` for
 * de-duplicating conflicting Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Promise based delay used by the mock backend. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** Generates a collision-resistant id with a graceful fallback. */
export function createId(prefix = 'doc'): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${uuid.slice(0, 8)}`
}

/**
 * Copy helper that prefers the async Clipboard API and falls back to the
 * legacy `execCommand` path for non-secure contexts.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fall through to the legacy implementation below.
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const succeeded = document.execCommand('copy')
    document.body.removeChild(textarea)
    return succeeded
  } catch {
    return false
  }
}