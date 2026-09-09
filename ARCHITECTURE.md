# Architecture — Content Forge (SIH PS 26154)

Next.js 16 App Router + TypeScript + Tailwind + pg + Gemini/OpenAI. Builds on Orbita MVP.

## Pipeline

Ingest (`src/lib/ingest/`) → Transform (`src/lib/transform/` orchestrator + prompt) → Outputs (`src/lib/outputs/` 7 generators) → API (`src/app/api/transform`, `/jobs`, `/health`, `/assistant`) → UI (`transform-dashboard` + legacy Orbita).

## Modules

- `src/lib/types.ts` — `SourceBundle`, `TransformControls`, `OutputType` (7), `Artefact`, `TransformResult`, `TransformationJob` + legacy `Platform`.
- `src/lib/ingest/` — `parse.ts` (PDF/DOCX/TXT ≤10MB), `url.ts` (SSRF guard, 8s timeout, no CAPTCHA bypass), `image.ts`/`video.ts` validators, `normalize.ts` (canonical bundle).
- `src/lib/outputs/` — `video` (ElevenLabs optional), `linkedin`, `twitter`, `advisory`, `infographic`, `summary`, `presentation` (Gemini `GEMINI_API_KEY` → 8–12 slides JSON; deterministic fallback when key missing).
- `src/lib/transform/index.ts` — `transformSource(bundle, controls)` via `Promise.allSettled` (partial success).
- `db/migrations/002_content_forge.sql` — `transformation_jobs`, `artefacts`, `source_documents`; fallback to localStorage without `DATABASE_URL`.

## API

- `POST /api/transform` — `{text, url, docs[], controls}` → `{jobId, sourceSummary, artefacts[]}` (Zod, multi-output).
- `GET /api/jobs`, `GET /api/jobs/:id` — history.
- `POST /api/assistant` — also supports refine `{jobId, artefactType, instruction}`.
- `GET /api/health` — `integrations.elevenlabs/presentation/ingestion` (`presentation` = `GEMINI_API_KEY` set).

## Security

Zod everywhere, file MIME/size checks, SSRF guard, no headless browser, secrets via `.env.local` (gitignored), audit via `audit_logs`.

## Deploy

Vercel; `npm run lint && typecheck && test && build`; `npm run db:migrate` when `DATABASE_URL` set.
