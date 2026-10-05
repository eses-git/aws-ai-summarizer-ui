/**
 * Shared domain types for the AWS Serverless AI Document Summarizer.
 */

/** Lifecycle status of a document travelling through the serverless pipeline. */
export type DocumentStatus = 'PROCESSED' | 'PROCESSING'

/** Normalised record shape used by the UI (DynamoDB item mapped to the client). */
export interface DocumentRecord {
  /** Unique document id (DynamoDB partition key / S3 object key). */
  id: string
  /** Original file name as uploaded by the operator. */
  fileName: string
  /** Pipeline status badge. */
  status: DocumentStatus
  /** AI generated summary returned by the Lambda + Bedrock stage. */
  summary: string
  /** ISO-8601 creation timestamp. */
  createdAt: string
  /** Raw size in bytes. */
  fileSize: number
  /** MIME type stored alongside the object. */
  contentType: string
}

/** Response of `POST {VITE_AWS_API_URL}/upload-url`. */
export interface PresignedUploadResponse {
  /** Time-boxed S3 presigned URL used for the direct PUT. */
  uploadUrl: string
  /** Server generated document id. */
  documentId?: string
  /** S3 object key the payload is written to. */
  key?: string
}

/** Everything the upload card needs to perform the two-step upload. */
export interface UploadTicket extends PresignedUploadResponse {
  /** Resolved document id (never undefined on the client). */
  documentId: string
  /** File name echoed back to the client. */
  fileName: string
  /** Content type used for the S3 PUT signature. */
  contentType: string
  /** Raw size in bytes. */
  fileSize: number
}

/** Connection state rendered by the header status bar. */
export type ConnectionState = 'connected' | 'mock' | 'checking' | 'offline'

/** Live pipeline stages shown in the upload card stepper. */
export type PipelineStage =
  | 'idle'
  | 'requesting-url'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'