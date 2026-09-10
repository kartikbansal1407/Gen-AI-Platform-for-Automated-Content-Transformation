# Content workspace refactor — 10 September 2026

This change applies the subsequent user request to remove the social-presence experience and replace the sidebar with eight content-operation sections, plus a dedicated login page. It supersedes the PDF’s optional legacy navigation flag and the initial migration reports where they describe retained social screens.

## Requirement and file map

| Requirement | Files changed | Result |
|---|---|---|
| Replace sidebar; remove campaigns, discovery, people, relationships, opportunities, memory and platform settings | `src/frontend/components/content-forge-app.tsx`, `src/lib/product.ts` | Eight exact navigation labels: Dashboard, New Transformation, Documents, Workspace, Review Queue, History, Analytics, Settings. The shell no longer imports the legacy product UI or reads its feature flag. |
| Real section routes | `src/app/page.tsx`, `src/app/[section]/page.tsx` | Root redirects according to session; each section has a URL and server-side access check. Unknown sections return 404. |
| Dedicated login and logout flow | `src/app/login/page.tsx`, `src/frontend/components/sign-in.tsx`, `src/backend/auth.ts` | Access-code form with error/loading state, signed expiring sessions, protected local/demo workspace, navigation to Dashboard after login. Existing logout route clears the cookie. Malformed signatures are rejected safely. |
| Stop treating social platforms as primary concepts | `src/frontend/components/output-selector.tsx`, `transform-dashboard.tsx`, `controls-panel.tsx`, `src/app/api/health/route.ts` | Executive Summary is the default; LinkedIn/X are secondary choices under Additional publishing formats. Main communication objectives are Inform/Persuade/Alert/Mobilize/Brief. Health no longer advertises social platform configuration. All seven required output types remain supported. |
| Working Dashboard, Documents, Workspace and History | `src/frontend/components/product-views.tsx`, `src/frontend/hooks/use-jobs.ts`, `src/lib/product.ts`, `src/lib/browser-jobs.ts` | Actual stored jobs and metrics; source search/preview; source/configuration inspection; original-source refinement and export; history search/delete. Browser changes notify all workspace views. Database and browser history are merged. |
| Working Review Queue | `src/lib/product.ts`, `src/lib/job-types.ts`, `src/frontend/components/product-views.tsx`, `src/frontend/hooks/use-jobs.ts`, `src/backend/jobs.ts`, `src/app/api/jobs/[id]/route.ts` | Pending, approved and changes-requested states, notes, timestamps, warnings and artefact previews. Job-specific review links and status filters. Authenticated, bounded, schema-validated PATCH API with owner-scoped transactional writes and audit events. Refinement resets only the changed output; sibling approvals persist. |
| Replace social engagement analytics | `src/lib/product.ts`, `src/frontend/components/product-views.tsx` | Counts of transformations, generated formats, completion/partial/failure, review states and daily job activity. No social engagement metrics or fabricated history. |
| Focused Settings and responsive styling | `src/frontend/components/product-views.tsx`, `content-forge-app.tsx`, `src/frontend/hooks/use-theme.ts`, `src/app/globals.css` | Persistent light/dark theme, workspace JSON export, deletion instructions and session details; responsive navigation. No personal memory or social connections. |
| Current product/privacy/setup documentation | `README.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `src/app/privacy/page.tsx`, `docs/environment.example`, `docs/IMPLEMENTATION_MAP.md`, `docs/CHANGES.md`, this file | Documents current routes, access requirements, review API and data scope; removes obsolete product capability claims and legacy flag setup. Prior migration reports are marked as historical. |
| Verification and current evaluation assets | `src/backend/auth.test.ts`, `src/backend/reviews.test.ts`, `src/lib/product.test.ts`, `src/lib/review-api.test.ts`, `src/test/setup.ts`, `e2e/transform.spec.ts`, `playwright.config.ts`, `scripts/record-demo.mjs`, `docs/DEMO.md`, `docs/evaluation-deck.html`, generated PNG/WEBM/PDF assets | Session and review tests; all eight sections exercised in the browser. The browser server deliberately sets the old legacy flag true to verify it cannot reactivate old navigation. Recording script follows login and the new navigation. |

## Assumptions

- Login retains the repository’s single-operator access-code model. It does not introduce email/password registration or independent user accounts. Without a configured code, local demo accepts any non-empty code; production requires `CONTENT_FORGE_ACCESS_CODE` (existing alias supported).
- Documents is a searchable library of sources from saved transformations. Upload preparation remains in New Transformation; there is no separate pre-generation document store.
- Review approval records an operator decision and never publishes content. New and refined artefacts start pending. Previously saved artefacts without review metadata are also pending.
- Analytics reflects the loaded job set: latest 50 database jobs plus browser-only jobs (browser retention up to 20). It is not a lifetime reporting system.
- Existing legacy database records and compatibility APIs are retained. The requested removal applies to the main product experience; no user records or environment secrets were deleted.
- Reviews fit existing artefact JSON metadata and audit tables; this refactor needs no additional SQL migration.

## Validation

- `npm run lint`: pass, no warnings.
- `npm run typecheck`: pass.
- `npm test`: 67 tests pass across 11 files.
- `npm run build`: pass, including dynamic section and login routes.
- `npm run test:e2e`: two Chromium workflows pass. Coverage includes correct/incorrect login, exact sidebar, primary output defaults, PDF → three artefacts, ZIP, Documents, Workspace, approval note persistence across reload, refinement resetting review, operational analytics, theme persistence, workspace export, history deletion, logout, denied API/page access and mobile navigation.
- Initial browser failures were an exact theme-label lookup and a selector colliding with Next.js’s route announcer; the accessible label and test selector were corrected, then the complete suite passed.
- Database review transactions are contract-tested, including ownership scope, missing artefacts and rollback on audit failure. Live PostgreSQL/provider services were not exercised.

## Environment steps

For production, configure the operator access code, optional PostgreSQL and provider services as described in README. Existing database deployments need migrations 001–003; this task did not run a live migration or deploy the app. Local demo runs without these services after login. Browser data survives logout and can be deleted from History.
