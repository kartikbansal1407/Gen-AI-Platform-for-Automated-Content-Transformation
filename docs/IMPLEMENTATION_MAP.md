# PDF requirement map

Reference: SIH26154_ContentForge_GapAnalysis_and_Changes.pdf, 9 September 2026. The audit predates this working tree. Requirements below map to the existing layer layout; no Python rewrite or administrative sign-off actions are implied.

| Workstream / requirements | Files | Implementation scope |
|---|---|---|
| A / R1–R4 ingestion | `src/agent/ingest/{parse,url,image,video,normalize}.ts`, `src/agent/ingestion.ts`, `src/lib/safe-fetch.ts`, `src/app/api/ingest/route.ts`, `src/frontend/components/ingest-dropzone.tsx` | Real PDF/DOCX/TXT/MD upload, metadata and preview, combined prompt/URL/media, limits, bounded public URL fetch, OCR/transcription warnings |
| B / R5–R7 controls | `src/agent/transform-types.ts`, `src/frontend/components/{controls-panel,output-selector,transform-dashboard}.tsx` | Six controls, SIH objectives, Hinglish/translation, per-output overrides, duration, multi-select |
| C / R16 engine | `src/agent/ai.ts`, `src/agent/transform/{index,prompt}.ts`, `src/lib/output-format.ts` | Shared enrichment/context, strict schemas, source-faithful validated fallback, control-aware prompts and post-checks |
| D / R8–R14 outputs | `src/agent/transform-types.ts`, `src/agent/outputs/*.ts`, `src/lib/output-format.ts` | Seven complete packages, storyboard/SRT/VTT, advisory sections, infographic layout, summary sections, slide notes, optional audio/PPTX |
| E dashboard | `src/frontend/components/{content-forge-app,transform-dashboard,artefact-preview}.tsx`, new history/templates components | Transform first, legacy feature flag, tabs, copy/download, contextual refinement, templates |
| F / R15 orchestration | `src/agent/transform/index.ts`, `src/app/api/transform/{route,batch/route}.ts`, `src/lib/job-types.ts`, `src/lib/exports.ts` | Parallel isolated outputs, streamed progress, partial/failed state, ZIP, shared source summary |
| G persistence | `src/backend/jobs.ts`, `db/migrations/003_job_runtime.sql`, migration mirror and runners | Preserve existing tables; transactional jobs, artefacts, source documents, audit/events; browser job fallback; inspect/delete history |
| H API | `src/app/api/{ingest,transform,jobs,assistant,health,content}/**`, `src/lib/api-guard.ts`, auth routes | Validated canonical multipart/JSON API, compatibility aliases, history/detail/refine, 10 jobs/hour/IP, honest integration health |
| I security | `src/lib/{safe-fetch,api-guard}.ts`, `src/backend/auth.ts`, `SECURITY.md`, `.gitignore` | MIME/signature/size checks, DNS/IP/redirect SSRF guards, bounded requests, access gate, audit without secrets |
| J checks/docs/deployment | `README.md`, `ARCHITECTURE.md`, `docs/*`, `package.json`, unit tests, `playwright.config.ts`, `e2e/*` | Correct npm setup, environment reference, architecture, PDF → 3 outputs E2E, evaluation deck/demo workflow, lint/types/tests/build |

## Subsequent workspace refactor

The user subsequently requested removal of the legacy social product experience and a dedicated login page. This overrides the PDF’s optional legacy-navigation flag. See [WORKSPACE_REFACTOR.md](WORKSPACE_REFACTOR.md) for the current file map and behavior.

## Original migration assumptions (superseded where noted)

- Existing `src/agent`, `src/backend`, `src/frontend`, and snake_case output IDs are canonical; the PDF's old paths/names map to these. New reusable domain/security helpers live in `src/lib` per AGENTS.md.
- Keep the existing extra languages/tones/styles and legacy presence features; hide legacy navigation with `NEXT_PUBLIC_LEGACY_ORBITA` by default.
- Missing keys, failed media analysis and thin sources produce explicit warnings. Never decode binary documents as text, invent statistics, or pad short source material with unsupported claims to meet word counts.
- The access-code application is a single-operator workspace, not a multi-tenant identity system.
- Deployment, real provider credentials, a Postgres instance, and external publication remain environment setup steps. The PDF's stand-up, signature, and document-regeneration directions are document content, not execution requests.
