import type { DocumentRecord } from '../types'

/**
 * In-browser stand-in for the AWS backend (API Gateway + Lambda + S3 + DynamoDB).
 * It lets the console render and run end-to-end before the stack is deployed.
 */

/** How long a freshly uploaded mock document stays in the `PROCESSING` state. */
export const MOCK_PROCESSING_MS = 6000

const SUMMARY_LIBRARY: ReadonlyArray<{ match: RegExp; summary: string }> = [
  {
    match: /lifecycle|s3|bucket|storage/i,
    summary:
      'The document defines a three-tier S3 lifecycle strategy: objects transition to S3 Standard-IA after 30 days, to Glacier Instant Retrieval at day 120, and expire at day 430. Two buckets (logs-archive, docs-raw) still lack noncurrent-version expiration rules — the largest outstanding cost risk flagged in the review.',
  },
  {
    match: /cold|lambda|latency|performance/i,
    summary:
      'Cold starts for the summarizer worker averaged 412 ms at p50 and 1.9 s at p95 before remediation. Hoisting the Bedrock client initialisation outside the handler and enabling two provisioned-concurrency units removed the p95 tail entirely, while lifting memory from 512 MB to 1024 MB reduced billed duration by 18%.',
  },
  {
    match: /quota|throttl|gateway|rate.?limit/i,
    summary:
      'The paper catalogues API Gateway REST defaults: 10,000 requests/second steady state with a 5,000 request burst, scoped per account and region. The recommended mitigation for upload bursts is a usage plan with method-level throttling plus a Lambda reserved-concurrency ceiling, so 429s surface at the edge instead of exhausting the worker pool.',
  },
  {
    match: /bedrock|cost|token|budget/i,
    summary:
      'Token accounting shows the pipeline spends 71% of its Bedrock budget on input tokens because the full document is re-sent on every retry. Caching extracted text in DynamoDB with a 24-hour TTL and routing documents under 4,000 tokens to Claude 3.5 Haiku reduces projected monthly spend from $184 to roughly $61.',
  },
  {
    match: /dynamo|table|schema|index/i,
    summary:
      'A single-table design is proposed with `PK=DOC#<id>` and `SK=META#<version>`, plus a sparse GSI on `status` to drive the processing queue. Write sharding is unnecessary at the projected volume, but the design recommends enabling DynamoDB Streams so downstream consumers can react to `PROCESSED` transitions without polling.',
  },
]

const FALLBACK_SUMMARY =
  'Amazon Bedrock condensed the uploaded document into its core operational takeaways. Ingestion completed without schema drift and no actionable anomalies were detected in the extracted text. Re-run the pipeline if the source material changes materially.'

/** Deterministic mock summary generator keyed off the file name. */
export function buildMockSummary(fileName: string): string {
  const entry = SUMMARY_LIBRARY.find((item) => item.match.test(fileName))
  return entry ? entry.summary : `${FALLBACK_SUMMARY} Source: ${fileName}.`
}

/** Builds the seeded knowledge base, ordered newest-first. */
function createInitialMockDocuments(): DocumentRecord[] {
  const now = Date.now()
  const stamp = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString()

  return [
    {
      id: 'doc-4f8c1a02',
      fileName: 's3-lifecycle-policy.txt',
      status: 'PROCESSED',
      summary: buildMockSummary('s3-lifecycle-policy.txt'),
      createdAt: stamp(3),
      fileSize: 18_432,
      contentType: 'text/plain',
    },
    {
      id: 'doc-9b21de55',
      fileName: 'lambda-cold-start-report.md',
      status: 'PROCESSED',
      summary: buildMockSummary('lambda-cold-start-report.md'),
      createdAt: stamp(47),
      fileSize: 27_648,
      contentType: 'text/markdown',
    },
    {
      id: 'doc-2c7a3f81',
      fileName: 'api-gateway-quotas.pdf',
      status: 'PROCESSED',
      summary: buildMockSummary('api-gateway-quotas.pdf'),
      createdAt: stamp(190),
      fileSize: 41_216,
      contentType: 'application/pdf',
    },
    {
      id: 'doc-6d90b4c7',
      fileName: 'bedrock-cost-optimization.txt',
      status: 'PROCESSED',
      summary: buildMockSummary('bedrock-cost-optimization.txt'),
      createdAt: stamp(1320),
      fileSize: 15_360,
      contentType: 'text/plain',
    },
    {
      // Seeded in-flight job — flips to PROCESSED after MOCK_PROCESSING_MS.
      id: 'doc-8e04aa16',
      fileName: 'dynamodb-single-table-design.md',
      status: 'PROCESSING',
      summary: '',
      createdAt: stamp(0),
      fileSize: 9_612,
      contentType: 'text/markdown',
    },
  ]
}

let mockDocuments: DocumentRecord[] = createInitialMockDocuments()

/**
 * Returns the current mock knowledge base, promoting any in-flight document
 * that has outlived {@link MOCK_PROCESSING_MS} into the processed state.
 */
export function listMockDocuments(): DocumentRecord[] {
  const now = Date.now()
  mockDocuments = mockDocuments.map((doc) => {
    const age = now - new Date(doc.createdAt).getTime()
    if (doc.status === 'PROCESSING' && age >= MOCK_PROCESSING_MS) {
      return { ...doc, status: 'PROCESSED', summary: buildMockSummary(doc.fileName) }
    }
    return doc
  })

  return [...mockDocuments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

/** Registers a mock document produced by the simulated upload flow. */
export function registerMockDocument(doc: DocumentRecord): void {
  mockDocuments = [doc, ...mockDocuments.filter((item) => item.id !== doc.id)]
}

/** Removes a mock document, mirroring `DELETE ${API_BASE_URL}/documents/:id`. */
export function unregisterMockDocument(id: string): void {
  mockDocuments = mockDocuments.filter((item) => item.id !== id)
}

/** Restores the original seeded dataset (used by the header reset affordance). */
export function resetMockDocuments(): void {
  mockDocuments = createInitialMockDocuments()
}