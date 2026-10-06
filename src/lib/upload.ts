import type { UploadTicket } from '../types'
import {
  API_BASE_URL,
  IS_MOCK_MODE,
  asRecord,
  isRecord,
  pickNumber,
  pickString,
  resolveContentType,
  unwrapPayload,
} from './api'
import { registerMockDocument } from './mockData'
import { createId, delay } from './utils'

/** Called with a 0-100 completion ratio during the S3 transfer. */
export type UploadProgressHandler = (percent: number) => void

/**
 * Step 1 of the upload flow:
 * `POST ${VITE_AWS_API_URL}/upload-url` → time-boxed S3 presigned URL.
 */
export async function requestUploadUrl(file: File): Promise<UploadTicket> {
  // Explicit extension → MIME resolution (.pdf/.txt/.md); sent as `fileType`.
  const fileType = resolveContentType(file)

  if (IS_MOCK_MODE) {
    await delay(480 + Math.random() * 220)
    const documentId = createId('doc')
    registerMockDocument({
      id: documentId,
      fileName: file.name,
      status: 'PROCESSING',
      summary: '',
      createdAt: new Date().toISOString(),
      fileSize: file.size,
      contentType: fileType,
    })
    return {
      documentId,
      uploadUrl: `mock://s3/local-sandbox/${documentId}`,
      key: `uploads/${documentId}/${file.name}`,
      fileName: file.name,
      contentType: fileType,
      fileSize: file.size,
    }
  }

  // Step 1 — request the presigned S3 URL. Contract: { fileName, fileType }.
  const response = await fetch(`${API_BASE_URL}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType }),
  })

  if (!response.ok) {
    throw new Error(`POST /upload-url failed — ${response.status} ${response.statusText}`.trim())
  }

  const record = unwrapPayload(await response.json())
  const uploadUrl = pickString(record, [
    'uploadUrl',
    'url',
    'presignedUrl',
    'presigned_url',
    'signedUrl',
  ])

  if (!uploadUrl) {
    throw new Error('The /upload-url endpoint did not return a presigned URL.')
  }

  return {
    uploadUrl,
    key: pickString(record, ['key', 'objectKey', 's3Key']),
    documentId: pickString(record, ['documentId', 'docId', 'id', 'key']) ?? createId('doc'),
    fileName: pickString(record, ['fileName', 'filename', 'name']) ?? file.name,
    // Backend-issued content type wins so the presigned signature always
    // matches; the locally resolved MIME type is the fallback.
    contentType:
      pickString(record, [
        'contentType',
        'content_type',
        'fileType',
        'file_type',
        'mimeType',
        'mime_type',
      ]) ?? fileType,
    fileSize:
      pickNumber(record, ['fileSize', 'file_size', 'size']) ??
      (isRecord(record.metadata) ? pickNumber(asRecord(record.metadata), ['size']) : undefined) ??
      file.size,
  }
}

/**
 * Step 2 of the upload flow: `PUT` the raw {@link File} straight to the
 * presigned S3 URL, with `Content-Type` set to the exact `contentType` returned
 * by the backend (falling back to the resolved file MIME type). Uses XHR so real
 * transfer progress can be surfaced in the UI.
 */
export async function uploadObject(
  ticket: UploadTicket,
  file: File,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
): Promise<void> {
  if (ticket.uploadUrl.startsWith('mock://')) {
    const checkpoints = [9, 24, 41, 58, 73, 88, 97, 100]
    for (const checkpoint of checkpoints) {
      if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError')
      await delay(140 + Math.random() * 220)
      onProgress?.(checkpoint)
    }
    return
  }

  await putWithProgress(ticket.uploadUrl, file, ticket.contentType, onProgress, signal)
}

function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', url, true)
    request.timeout = 120_000
    // Must mirror the presigned signature (or the resolved file MIME type).
    request.setRequestHeader('Content-Type', contentType)

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    })

    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }
      reject(
        new Error(
          `S3 upload rejected — ${request.status} ${request.statusText}`.trim() ||
            `S3 upload rejected (${request.status}).`,
        ),
      )
    })

    request.addEventListener('error', () => {
      reject(
        new Error(
          'S3 upload failed — network error, or the bucket CORS policy does not allow PUT from this origin.',
        ),
      )
    })

    request.addEventListener('timeout', () => {
      reject(new Error('S3 upload timed out after 120s.'))
    })

    request.addEventListener('abort', () => {
      reject(new DOMException('Upload aborted', 'AbortError'))
    })

    if (signal) {
      if (signal.aborted) {
        request.abort()
        return
      }
      signal.addEventListener('abort', () => request.abort(), { once: true })
    }

    // Raw File object — the browser streams its binary payload as the body.
    request.send(file)
  })
}