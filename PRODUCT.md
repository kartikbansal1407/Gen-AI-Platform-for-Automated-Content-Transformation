# Content Forge

SIH 26154 for NTRO: transform operator-submitted text, documents, images, videos, URLs and prompts into one or more communication artefacts.

## Workspace

| Section | Purpose |
|---|---|
| Dashboard | Actual transformation, artefact and review counts; recent work |
| New Transformation | Prepare a source, choose controls and outputs, generate |
| Documents | Search and inspect source material from saved jobs |
| Workspace | Reopen, refine and export deliverables |
| Review Queue | Inspect evidence; approve or request changes with notes |
| History | Search, reopen and delete saved transformations |
| Analytics | Job completion, output volume and review progress |
| Settings | Theme and workspace data export |

A dedicated `/login` page uses the existing operator access-code model. All workspace routes require a signed session. Local demo accepts any non-empty code only when none is configured; production requires a configured code. Sign out clears the session and preserves stored work.

Campaign, discovery, people, relationship, opportunity, personal-memory and social-platform management screens are removed from the main experience. The former legacy flag does not restore them. Existing stored records and compatibility APIs are retained without exposing these workflows in the shell.

## Generation

Audience, tone, language, detail level, communication objective and style are configurable per job and per output. Objectives are Inform, Persuade, Alert, Mobilize and Brief. Executive Summary is selected initially. Advisory, Infographic, Video Package and Presentation are primary choices; LinkedIn and Twitter/X remain optional publishing formats to satisfy the seven-output specification.

Generators live in `src/agent/outputs`; typed contracts and source-faithfulness checks remain shared. Every new or refined artefact starts pending review. Decisions persist with notes and a timestamp in browser storage or PostgreSQL artefact metadata. Approvals do not publish anything, and do not hide source warnings.

Documents reflects sources of saved transformations, rather than a separate upload store. Analytics counts loaded workspace jobs (up to 20 browser jobs and the latest 50 database jobs), not lifetime totals or social engagement. Missing provider keys produce explicitly labeled demo templates; live media and optional audio/PPTX require their configured services.
