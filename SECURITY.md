# Security

All `.env*` files, provider keys and access codes are private and must never be committed. Health responses expose configuration booleans, not secret values. Do not place server secrets in `NEXT_PUBLIC_*` variables.

## Access and data

This is a single-operator workspace, not a multi-tenant identity system. Set `CONTENT_FORGE_ACCESS_CODE` (legacy alias `ORBITA_ACCESS_CODE`) in production. Session cookies are HMAC-signed, expire after 30 days, and use HttpOnly, SameSite=Lax and production Secure attributes. Production without a code fails closed. Local demo also requires a signed session, obtained at `/login` with any non-empty code when none is configured. API mutations reject cross-origin browser requests.

Generation endpoints share ten requests per hour per IP; ingestion uses sixty. Trust forwarded headers only behind a proxy that overwrites them. Vercel's forwarded header is used on Vercel. Postgres stores shared limits when configured; process-local limits are for development only.

Job persistence uses parameterized SQL and transactions for source, artefact, audit and analytics writes. Audit records contain job/output IDs, mode and status, not provider credentials or full source text. History deletion cascades to artefacts/documents. Saved source documents, artefacts and review decisions are inspectable and deletable through History; Settings exports loaded workspace data. Signing out preserves browser data. Anyone with access to the browser profile can access its local data; apply workstation controls suitable for the source material. Source material goes to configured AI/media services when live generation is selected. Retention and provider selection remain operator decisions.

## Ingestion boundary

Structured schemas validate source bundles, controls and API bodies. The server reads bounded bodies and verifies actual file bytes, declared MIME and document/media signatures. Documents and media are at most 10 MB each; DOCX ZIP expansion is capped at 30 MB/2,000 entries. Unsupported/mismatched content is rejected. Unreadable PDFs/DOCX return explicit warnings and empty extracted text; binary bytes are never passed off as document text. HTML is parsed without executing scripts, styles, forms or embedded frames.

Only public HTTP(S) URLs on standard ports are fetched. Credentials, private/reserved/loopback/link-local addresses, IPv4-mapped private IPv6, and mixed public/private DNS results are blocked. An optional exact-host allowlist narrows access further. The resolved address is pinned to the connection to prevent DNS rebinding. Every redirect is independently validated, up to three hops. Eight-second deadlines and 2 MB page/10 MB media download limits apply. Do not use source URL ingestion to contact internal services. The operator-configured Presenton backend is a distinct trusted integration and may intentionally use a private address.

## Content and integrations

Source documents and previous drafts are untrusted data, not instructions. Prompts require source attribution and uncertainty flags. Structured output is validated before use; evidence span checks are signals for human review, not proof of semantic truth. Generated links are restricted to HTTP(S) in the UI. React escapes displayed content; raw source HTML is not rendered.

No CAPTCHA solving, anti-bot bypasses, account farming, fake engagement, mass messaging, automated comments, deceptive identities or automatic publishing. Integrations use official APIs. Presenton web search is disabled; its output must preserve supplied content. Missing/failed services keep script, narration, slide notes and Markdown available with warnings. Subtitle timings are estimates and must be reviewed against final audio.

Run dependency auditing and the automated checks before deployment; assess provider data policies and hosting upload/runtime limits for the actual environment.
