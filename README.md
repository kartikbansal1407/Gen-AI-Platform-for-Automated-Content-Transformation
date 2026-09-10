# Content Forge

SIH 26154 — Gen AI Platform for Automated Content Transformation (NTRO).

Transform operator-provided text, documents, images, video, URLs and prompts into one or more communication artefacts. This repository runs **Next.js 16, React 19, TypeScript, Tailwind and optional PostgreSQL**. It is a Node application, with `npm` as its entry point.

## Local development

Use Node 22+ and npm.

```bash
npm install
cp docs/environment.example .env.local
npm run dev
# Open http://localhost:3000
```

With no provider keys or database, development runs in clearly labeled demo mode and saves jobs in browser storage. Set `AI_PROVIDER=demo` to force demo generation. Open `/login`. When no access code is configured locally, enter any non-empty code; otherwise use the configured code. Production requires a configured code and does not accept arbitrary codes.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start

# Optional database: configure DATABASE_URL in .env.local first
npm run db:migrate

# Browser acceptance test
npx playwright install chromium
npm run test:e2e
```

The build script uses Next.js’s supported webpack mode; Turbopack failed in the evaluation environment during CSS compilation. Development retains the existing Next.js default.

Browser tests use an isolated `.next/e2e` build directory on port 3100, so a normal development server can remain running. The paced demo recorder uses `.next/demo` on port 3101.

## Workspace navigation

Dashboard → New Transformation → Documents → Workspace → Review Queue → History → Analytics → Settings. Each section has its own route and requires a signed session. Sign out ends the session. The main experience has no campaign, discovery, relationship, memory or platform-connection screens. Executive Summary is selected by default; LinkedIn/X remain optional deliverables under Additional publishing formats.

## Workflow and deliverables

Prepare your source to inspect extracted text, document metadata and warnings. Choose audience, tone, language, detail, objective and style; optionally override these for individual outputs. Select one or more outputs and generate. Results appear independently, with failures isolated. Inspect evidence, refine against the original source, copy/download individual outputs or export a ZIP. Workspace supports source inspection and refinement. Review Queue records approvals or requested changes with notes; refining an artefact returns it to pending review. History supports reopening and deletion. Documents lists saved source material, and Analytics shows actual job/output/review counts.

| Output | Package |
|---|---|
| LinkedIn Post | Professional post, hashtags, attribution and quality warnings |
| Twitter/X | Tweet or numbered 4–8 tweet thread, image alt text and score |
| Advisory | Classification, summary, background, assessment, recommendations and distribution |
| Infographic | 5–7 evidence-backed points, copy blocks, layout, icons/color guidance and CTA; optional generated image |
| Executive Summary | TL;DR, context, 3–5 findings, implications and next steps; 120/300/600-word targets |
| Video Package | Script, 6–8 storyboard scenes, transitions, narration, visuals and SRT/VTT; optional ElevenLabs audio |
| Presentation | 8–12 slides with speaker notes; Markdown deck and optional Presenton PPTX |

Demo templates quote source excerpts and flag evidence gaps. They do not claim successful translation or invent material to meet word targets. Video duration supports 30/60/90 seconds. Subtitle timings are estimated and require alignment to final audio.

## Configuration

Keep all `.env*` files private and uncommitted. The tracked `docs/environment.example` is the setup template; the ignored local `.env.example` is a convenience copy. Never put server secrets in `NEXT_PUBLIC_*` variables.

| Variable | Purpose |
|---|---|
| `CONTENT_FORGE_ACCESS_CODE` | Required production operator code; `ORBITA_ACCESS_CODE` is a compatibility alias |
| `DATABASE_URL` | Optional Postgres connection; apply migrations 001–003 |
| `DATABASE_SSL=true` | Enable verified TLS if your database requires it |
| `AI_PROVIDER` | `demo`, `gemini`, `openai`; otherwise choose an available key |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Live Gemini generation; existing model default retained |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Live OpenAI generation; existing model default retained |
| `GEMINI_IMAGE_MODEL`, `OPENAI_IMAGE_MODEL` | Optional image model overrides |
| `OPENAI_TRANSCRIPTION_MODEL` | Optional transcription model; default `whisper-1` |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL` | Optional narration audio; default model `eleven_multilingual_v2` |
| `PRESENTON_API_URL`, `PRESENTON_API_KEY` | Separately hosted Presenton base URL and bearer key |
| `INGEST_ALLOWED_HOSTS` | Optional comma-separated exact hostname allowlist |
| `TRUST_PROXY=true` | Trust a reverse proxy that overwrites forwarded IP headers; leave unset locally |

Presenton uses `POST /api/v1/ppt/presentation/generate` with web search disabled. A successful response must contain a downloadable path; otherwise the Markdown deck remains available. Follow its [official setup](https://github.com/presenton/presenton) and [API documentation](https://docs.presenton.ai/using-presenton-api). Live availability depends on installed service/model versions and credentials.

## Structure

```text
src/app/                  Next.js pages and API routes
src/frontend/components/  Workspace, login, ingestion, previews and review UI
src/agent/                Providers, ingestion, orchestration, seven output modules
src/lib/                  Job/export/format logic, URL and request guards
src/backend/              Auth, Postgres and transactional job persistence
src/shared/               Existing shared types and demo data
scripts/migrate.mjs       Canonical migration runner
db/migrations/           Additive SQL migrations 001–003
e2e/                      Browser acceptance test and synthetic PDF fixture
docs/                     Requirement map, change report and evaluation materials
```

The migration command loads `.env` and `.env.local` with the same precedence as the app. For a production-specific environment, run `NODE_ENV=production npm run db:migrate`.

The backend migration runner delegates to the root runner. The SQL mirror under `src/backend/db/migrations` remains for compatibility; execute migrations through npm.

## API

- `POST /api/ingest`: multipart `text`, `prompt`, `url`, `files`; returns source, parsed documents, preview and warnings. JSON source bundles also accepted.
- `POST /api/transform`: JSON `{source, controls, outputTypes, overrides?}` or multipart source fields plus JSON-encoded controls/outputTypes/overrides. Returns job, jobId, artefacts and status. `Accept: application/x-ndjson` streams artefact/failed/complete/error events.
- `POST /api/transform/batch`: compatibility alias. Existing `outputType` requests retain single-output response fields.
- `GET /api/jobs`, `GET /api/jobs/:id`, `DELETE /api/jobs/:id`: authenticated database history. Without Postgres the UI uses browser history.
- `PATCH /api/jobs/:id`: `{outputType, review: {status, note}}`, where status is `pending`, `approved` or `changes_requested`; updates the owned artefact and records an audit event. Browser-only decisions remain in local storage.
- `POST /api/assistant`: `{jobId, artefactType, instruction}` for stored jobs. Browser jobs additionally send original source, controls and previousArtefact. Legacy `{command}` is preserved.
- `POST /api/content`: deprecated legacy drafting endpoint; use transform for new integrations.
- `GET /api/health`: configuration booleans and database readiness; configuration does not imply a successful provider call.

## Limits and deployment

Up to 10 PDF/DOCX/TXT/MD documents (CSV compatibility retained), five PNG/JPEG/WEBP images and one MP4/WEBM video per job. Each file is at most 10 MB; aggregate multipart upload is at most 40 MB. Documents expose at most 50,000 parsed characters each. Scanned or protected PDFs may need pasted text. OCR/transcription require a live provider. Media is retained in job sources and never autoplayed.

URL ingestion uses an eight-second deadline, a 2 MB page limit, at most three redirects, and DNS/IP validation on each hop. Media downloads are limited to 10 MB. No scripts, CAPTCHA bypasses or automatic publishing.

Generation/refinement and legacy drafting share 10 requests/hour/IP; ingest/vision use 60/hour. Postgres supplies a shared limiter. Without it, the limiter is process-local: use Postgres for multi-instance deployment. Browser history retains up to 20 jobs; database history lists the latest 50. Browser storage quota errors leave previews available for download.

Vercel can host the app. Configure its environment and run database migrations from a trusted operator environment. Hosting request-body limits can be lower than the app's limits; use small files on Vercel or a Node host accepting the configured upload sizes. Larger hosted uploads need a separately configured object-storage workflow. Deploy Presenton separately. These instructions do not publish a deployment.

## Evaluation and validation

See [requirement map](docs/IMPLEMENTATION_MAP.md), [change report](docs/CHANGES.md), [workspace refactor](docs/WORKSPACE_REFACTOR.md), [architecture](ARCHITECTURE.md), [security](SECURITY.md), [five-slide deck](docs/evaluation-deck.html), and [demo instructions](docs/DEMO.md). Tests cover real PDF/DOCX parsing, validation, SSRF boundaries, all seven schemas, shared-source partial generation, exports, streaming and the browser workflow. Live providers and a real Postgres instance require separate environment validation.

## Troubleshooting database setup

If generation reports a database sign-in failure, replace placeholder credentials in `DATABASE_URL` with a working PostgreSQL connection. Migrations cannot fix an invalid database username or password. Then run `npm run db:migrate` to create the required tables, including `request_limits`.

For local development without PostgreSQL, leave `DATABASE_URL=` empty in the effective environment file and restart `npm run dev`. Generation uses the local rate limiter and browser job storage. Do not leave an example connection string configured. Missing schema and connection/authentication errors are reported separately.
