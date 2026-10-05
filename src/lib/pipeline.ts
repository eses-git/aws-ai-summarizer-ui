import type { PipelineStage } from '../types'

/**
 * Human readable label for every pipeline stage. Kept out of the component
 * modules so React Fast Refresh stays strictly component-only.
 */
export const STAGE_LABEL: Record<PipelineStage, string> = {
  idle: 'Idle',
  'requesting-url': 'Requesting URL',
  uploading: 'Uploading',
  processing: 'Queued for AI',
  complete: 'Complete',
  error: 'Failed',
}