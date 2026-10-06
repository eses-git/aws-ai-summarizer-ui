# AWS Serverless AI Document Summarizer — Console UI

A dark, technical control panel for the serverless document summarization pipeline
(API Gateway → Lambda → S3 → DynamoDB → Bedrock). Built with **React 19**, **TypeScript**,
**Vite 8** and **Tailwind CSS 4**, deployable to Vercel or Netlify as a static SPA.

## Layout

Strictly symmetrical two-column dashboard on desktop, stacked on mobile:

| Column | Component | Responsibility |
| --- | --- | --- |
| Left | `UploadCard` + `PipelineStatus` | Drag & drop ingest, two-step presigned upload, live pipeline telemetry |
| Right | `SummaryFeed` + `SummaryCard` | Searchable DynamoDB results feed, status badges, expand/collapse + copy summaries, per-card delete |
| Top | `Header`, `StatsBar` | API connection indicator, region/theme badges, pipeline metrics |

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — the UI runs without a backend
npm run dev
```

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_AWS_API_URL` | Base URL of the API Gateway stage, without a trailing slash |
| `VITE_USE_MOCK_API` | `true` forces the sandbox dataset, `false` disables mocking |
| `VITE_AWS_REGION` | Region label rendered in the header badges |

When `VITE_AWS_API_URL` is empty (or `VITE_USE_MOCK_API=true`), the app boots against an
in-browser mock backend in `src/lib/mockData.ts` so every screen renders and functions
before the stack exists.

## Backend contract

```text
POST  ${VITE_AWS_API_URL}/upload-url   { fileName, fileType } → { uploadUrl, documentId, key }
PUT   <presigned uploadUrl>            raw file body (Content-Type must match the signature)
GET   ${VITE_AWS_API_URL}/documents    → [ { documentId, fileName, status, summary, createdAt, fileSize } ]
DELETE ${VITE_AWS_API_URL}/documents/{id} → 200 OK (removes the DynamoDB item + S3 object)
```

Cards support inline **expand/collapse** of long summaries (`line-clamp-3` when collapsed)
and a **delete** action that issues `DELETE /documents/{id}`, then drops the record from
the feed's local state on a successful response.

`GET /documents` is normalised defensively: arrays, Lambda proxy envelopes
(`{ body: "{...}" }`), `documents`/`items`/`results`/`data` wrappers and the common
`docId`/`name`/`aiSummary`/`timestamp` field aliases are all accepted (see `src/lib/api.ts`).

The presigned `PUT` requires bucket CORS allowing the console origin:

```json
[
  {
    "AllowedOrigins": ["https://your-console.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run preview  # serve the production bundle
npm run lint     # ESLint
```

## Deployment

- **Vercel** — `vercel.json` pins the Vite preset, `dist` output and SPA rewrites.
- **Netlify** — `netlify.toml` + `public/_redirects` provide the same build and fallback.

Set `VITE_AWS_API_URL` in the project's environment settings before deploying.

---

## Original Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
