/// <reference types="vite/client" />

/**
 * Typed environment variables consumed through `import.meta.env`.
 * Declared here so the compiler understands the custom `VITE_*` keys.
 */
interface ImportMetaEnv {
  /** Base URL of the deployed API Gateway stage (no trailing slash). */
  readonly VITE_AWS_API_URL?: string
  /** Force the local mock backend on/off: `'true'` | `'false'`. */
  readonly VITE_USE_MOCK_API?: string
  /** AWS region label rendered inside the console header. */
  readonly VITE_AWS_REGION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}